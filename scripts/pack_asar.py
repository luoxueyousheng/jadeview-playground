"""Create an ordinary uncompressed ASAR of the built frontend."""
from __future__ import annotations
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]

def pack(source: Path, destination: Path):
    if not (source / "index.html").is_file():
        raise ValueError("Run npm run build first")
    tree: dict = {"files": {}}
    entries = []
    offset = 0
    for path in sorted(source.rglob("*")):
        if path.is_symlink():
            raise ValueError("ASAR demo does not follow symlinks")
        if not path.is_file():
            continue
        parts = path.relative_to(source).parts
        parent = tree
        for part in parts[:-1]:
            parent = parent["files"].setdefault(part, {"files": {}})
        size = path.stat().st_size
        parent["files"][parts[-1]] = {"size": size, "offset": str(offset)}
        entries.append(path)
        offset += size
    header = json.dumps(tree, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    padding = b"\0" * ((-len(header)) % 4)
    header_pickle = struct.pack("<II", 4 + len(header) + len(padding), len(header)) + header + padding
    size_pickle = struct.pack("<II", 4, len(header_pickle))
    with destination.open("wb") as output:
        output.write(size_pickle)
        output.write(header_pickle)
        for path in entries:
            with path.open("rb") as content:
                while block := content.read(1024 * 1024):
                    output.write(block)

if __name__ == "__main__":
    target = ROOT / "playground.asar"
    pack(ROOT / "web/dist", target)
    print(target)
