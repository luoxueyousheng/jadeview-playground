import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
HOSTS_DIR = ROOT / "hosts"
REQUIRED_HOST_FIELDS = {
    "id": str,
    "language": str,
    "displayName": str,
    "version": str,
    "entry": str,
    "requirements": list,
    "devCommand": str,
    "runCommand": str,
    "capabilities": list,
    "supportedExamples": (str, list),
    "unsupportedExamples": dict,
}


class MultiLanguageHostTests(unittest.TestCase):
    """校验所有合入 PR 的多语言宿主目录结构与前端语言模块注册规范。"""

    def test_shared_assets_exist(self):
        self.assertTrue((ROOT / "assets" / "playground.png").is_file())

    def test_host_template_exists(self):
        self.assertTrue((HOSTS_DIR / "_template" / "host.json").is_file())
        self.assertTrue((HOSTS_DIR / "_template" / "README.md").is_file())
        self.assertTrue((ROOT / "web" / "src" / "hosts" / "languages" / "_template.ts").is_file())

    def test_every_registered_host_directory_matches_pr_spec(self):
        host_dirs = [
            path for path in HOSTS_DIR.iterdir()
            if path.is_dir() and not path.name.startswith(("_", ".")) and path.name != "__pycache__"
        ]
        self.assertGreaterEqual(len(host_dirs), 1)
        for host_dir in host_dirs:
            with self.subTest(host=host_dir.name):
                self.assertRegex(host_dir.name, r"^[a-z][a-z0-9_-]*$")
                manifest_path = host_dir / "host.json"
                readme_path = host_dir / "README.md"
                self.assertTrue(manifest_path.is_file(), f"缺少 {manifest_path}")
                self.assertTrue(readme_path.is_file(), f"缺少 {readme_path}")

                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                self.assertEqual(manifest.get("id"), host_dir.name)
                for key, expected_type in REQUIRED_HOST_FIELDS.items():
                    self.assertIn(key, manifest, f"{manifest_path} 缺少必填字段 {key}")
                    self.assertIsInstance(manifest[key], expected_type, f"{key} 类型不正确")

                entry_path = ROOT / manifest["entry"]
                self.assertTrue(entry_path.exists(), f"入口文件不存在: {entry_path}")

                frontend_mod = manifest.get("frontendModule")
                if frontend_mod:
                    mod_path = ROOT / frontend_mod
                    self.assertTrue(mod_path.is_file(), f"声明的前端语言模块不存在: {mod_path}")
                    content = mod_path.read_text(encoding="utf-8")
                    self.assertRegex(content, rf'id:\s*"{re.escape(host_dir.name)}"')


if __name__ == "__main__":
    unittest.main()
