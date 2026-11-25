"""Run the local Vite server for the lifetime of a Playground debug session."""

from contextlib import contextmanager
from http.client import HTTPConnection, HTTPException
from pathlib import Path
import shutil
import socket
import subprocess
import time
from urllib.parse import urlsplit

HOST = "127.0.0.1"
PORT = 5173


def dev_origin(url):
    parsed = urlsplit(url)
    if (parsed.scheme != "http" or parsed.hostname not in ("localhost", HOST, "::1")
            or parsed.username is not None or parsed.password is not None
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment):
        raise ValueError("调试地址应为本机 HTTP 地址，例如 http://localhost:5173")
    port = parsed.port
    host = "[::1]" if parsed.hostname == "::1" else parsed.hostname
    return f"http://{host}" + (f":{port}" if port is not None and port != 80 else "")


def wait_for_vite(origin, process):
    address = urlsplit(origin)
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        if process is not None and process.poll() is not None:
            raise RuntimeError(f"Vite 启动失败，退出码 {process.returncode}")
        connection = HTTPConnection(address.hostname, address.port, timeout=0.5)
        try:
            connection.request("GET", "/index.html")
            response = connection.getresponse()
            if response.status == 200 and b"/@vite/client" in response.read(128 * 1024):
                return
        except (OSError, HTTPException):
            pass
        finally:
            connection.close()
        time.sleep(0.15)
    raise RuntimeError(f"调试地址未就绪：{origin}/index.html。请确认它提供 Playground 的 Vite 页面。")


@contextmanager
def vite_frontend(root: Path, url):
    if url:
        origin = dev_origin(url)
        wait_for_vite(origin, None)
        yield origin, None
        return

    node = shutil.which("node")
    vite = root / "node_modules/vite/bin/vite.js"
    if not node or not vite.is_file():
        raise RuntimeError("请安装 Node.js，并在项目目录执行 npm ci")
    origin = f"http://{HOST}:{PORT}"
    with socket.socket() as probe:
        try:
            probe.bind((HOST, PORT))
        except OSError as error:
            raise RuntimeError(f"调试端口 {PORT} 已占用。若已启动 Vite，可用 --dev {origin} 连接。") from error

    process = subprocess.Popen(
        [node, str(vite), "--host", HOST, "--port", str(PORT), "--strictPort"],
        cwd=root,
    )
    try:
        wait_for_vite(origin, process)
        yield origin, process
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
