from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FrontendStructureTests(unittest.TestCase):
    """前端改成 React 之后，最少要守住三件事：入口存在、示例目录与宿主对得上、每个示例都有页面。"""

    def test_entry_pages_mount_the_react_root(self):
        for page in ("index.html", "pane.html"):
            text = (ROOT / "web" / page).read_text(encoding="utf-8")
            self.assertIn('id="root"', text, page)
            self.assertIn('type="module"', text, page)
            self.assertIn("./src/", text, page)

    def test_every_catalog_example_is_a_window_the_host_accepts(self):
        host = (ROOT / "hosts" / "python" / "app.py").read_text(encoding="utf-8")
        titles = host[host.index("titles = {"):]
        kinds = set(re.findall(r'"(\w+)": "', titles[:titles.index("}")]))
        examples = set(re.findall(r"^  (\w+): \{$", self.catalog(), re.M))
        self.assertTrue(examples)
        self.assertFalse(examples - kinds, examples - kinds)

    def test_every_example_has_a_page(self):
        registry = (ROOT / "web" / "src" / "pages" / "demos" / "registry.tsx").read_text(encoding="utf-8")
        examples = set(re.findall(r"^  (\w+): \{$", self.catalog(), re.M))
        wired = set(re.findall(r"^  (\w+): \w+,$", registry, re.M))
        # empty 示例建的是没有视图的空窗口，宿主不会加载任何页面。
        missing = examples - wired - {"empty"}
        self.assertFalse(missing, missing)

    def catalog(self):
        return (ROOT / "web" / "src" / "data" / "catalog.ts").read_text(encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
