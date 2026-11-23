import threading
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from host.app import Playground


class IndependentWindowTests(unittest.TestCase):
    def setUp(self):
        self.app = Playground.__new__(Playground)
        self.app.main_window, self.app.controller = 1, 101
        self.app.dev_origin = None
        self.app.windows = {1: {"kind": "main"}, 2: {"kind": "layout"}, 3: {"kind": "layout"}}
        self.app.controllers = {1: 101, 2: 201, 3: 301}
        self.app.panes = {
            202: {"windowId": 2, "bounds": ["0", "0", "1px", "1px"]},
            203: {"windowId": 2, "bounds": ["0", "0", "1px", "1px"]},
            302: {"windowId": 3, "bounds": ["0", "0", "1px", "1px"]},
        }
        self.app.context = threading.local()
        self.app.context.source_id, self.app.context.window_id = 201, 2
        self.app.native = SimpleNamespace(lib=SimpleNamespace(
            get_webview_parent_window_id=lambda identity: identity // 100))
        self.app.trusted = {101, 201, 301, *self.app.panes}
        self.app.stopped = threading.Event()
        self.app.menu_selections = {}
        self.app.lock = threading.RLock()
        self.app.record = Mock()

    def test_example_can_only_control_its_own_window_and_views(self):
        self.assertEqual(self.app.owned_window(None), 2)
        self.assertEqual(self.app.owned_view(202), 202)
        with self.assertRaises(PermissionError):
            self.app.owned_window(3)
        with self.assertRaises(PermissionError):
            self.app.owned_view(302)
        with self.assertRaises(ValueError):
            self.app.owned_view(201)

    def test_launcher_can_manage_other_example_windows(self):
        self.app.context.source_id, self.app.context.window_id = 101, 1
        self.assertEqual(self.app.owned_window(3), 3)

    def test_relayout_does_not_touch_another_example(self):
        operations = []

        def view(_native, identity):
            return SimpleNamespace(set_bounds=lambda bounds: (
                operations.append(identity) or SimpleNamespace(wait=lambda: None)))

        other_bounds = self.app.panes[302]["bounds"].copy()
        with patch("host.app.WebView", side_effect=view):
            self.app.layout({"mode": "columns", "rect": {
                "x": 260, "y": 120, "width": 800, "height": 500,
                "viewportWidth": 1100, "viewportHeight": 700}})
        self.assertEqual(operations, [202, 203])
        self.assertEqual(self.app.panes[302]["bounds"], other_bounds)

    def test_example_close_keeps_application_alive(self):
        self.app.on_event({"name": "window-closed", "windowId": 2})
        self.assertFalse(self.app.stopped.is_set())
        self.assertIn(3, self.app.windows)
        self.assertNotIn(2, self.app.controllers)
        self.app.on_event({"name": "window-closed", "windowId": 1})
        self.assertTrue(self.app.stopped.is_set())

    def test_windows_reuses_profile_except_when_isolation_is_required(self):
        self.app.is_windows, self.app.next_profile = True, 0
        first = self.app.settings().profile_name
        self.assertIsNone(first)
        self.assertEqual(self.app.settings().profile_name, first)
        isolated = [self.app.settings(dedicated=True).profile_name,
            self.app.settings({"incognito": 1}).profile_name,
            self.app.settings({"background_throttling": 1}).profile_name]
        self.assertEqual(len(set(isolated)), 3)
        self.assertNotIn(first, isolated)

    def test_linux_local_views_keep_exclusive_profiles(self):
        self.app.is_windows, self.app.next_profile = False, 0
        self.assertNotEqual(self.app.settings().profile_name, self.app.settings().profile_name)


if __name__ == "__main__":
    unittest.main()
