"""The additional public C API used by the playground; no JadeView internals."""
from __future__ import annotations
import ctypes as C
import json
import os
import time
from .sdk import Runtime, Bounds, WindowOptions, WindowFeatures, WebViewSettings, JadeViewError

CALLBACK = C.WINFUNCTYPE if os.name == "nt" else C.CFUNCTYPE
U32, U64, I32, TXT = C.c_uint32, C.c_uint64, C.c_int32, C.c_char_p

class Event(C.Structure):
    _fields_ = [("event_type", U32), ("source_kind", U32), ("source_id", U64),
        ("window_id", U32), ("webview_id", U32), ("sequence", U64),
        ("request_id", U64), ("flags", U32), ("state", U32), ("error_code", I32),
        ("name", TXT), ("data", C.c_void_p), ("data_size", C.c_size_t)]

class ObjectState(C.Structure):
    _fields_ = [(name, U32 if name != "error_code" else I32) for name in
        ("kind", "state", "parent_window_id", "default_webview_id", "error_code")]

class MountCapabilities(C.Structure):
    _fields_ = [("backend", U32)] + [(name, I32) for name in
        ("available", "read_only", "caches_plaintext_to_disk", "original_archive_prefix")]

class Notification(C.Structure):
    _fields_ = [("summary", TXT), ("body", TXT), ("icon", TXT), ("timeout", I32),
        ("button1", TXT), ("button2", TXT), ("text3", TXT), ("action", TXT)]

EVENT_CALLBACK = CALLBACK(None, C.POINTER(Event), C.c_void_p)
IPC_CALLBACK = CALLBACK(C.c_void_p, U32, TXT)
PERMISSION_CALLBACK = CALLBACK(I32, U32, TXT)

def encode(value: str) -> bytes:
    return value.encode("utf-8")

class Native(Runtime):
    def __init__(self, path):
        super().__init__(path)
        self.callbacks = []
        signatures = {
            "JadeView_init": ([I32, TXT, TXT, TXT, TXT, I32], I32),
            "jadeview_exit_wait": ([U32], I32),
            "jadeview_version": ([C.c_void_p, C.c_size_t], I32),
            "get_webview_version": ([C.c_void_p, C.c_size_t], I32),
            "on_app_event": ([U32, EVENT_CALLBACK, C.c_void_p], U64),
            "on_window_event": ([U32, U32, EVENT_CALLBACK, C.c_void_p], U64),
            "on_webview_event": ([U32, U32, EVENT_CALLBACK, C.c_void_p], U64),
            "register_ipc_handler": ([TXT, IPC_CALLBACK], I32),
            "jade_on": ([TXT, IPC_CALLBACK], U32),
            "jade_text_create": ([TXT], C.c_void_p),
            "set_protocol_service_path": ([TXT, C.c_void_p, C.c_size_t, I32], I32),
            "create_window": ([U32, C.POINTER(WindowOptions), C.POINTER(WindowFeatures)], U32),
            "create_webview": ([TXT, C.POINTER(WebViewSettings)], U32),
            "add_webview_to_window": ([U32, U32, C.POINTER(Bounds)], U64),
            "set_default_webview": ([U32, U32], I32),
            "get_window_state": ([U32, C.POINTER(ObjectState)], I32),
            "get_webview_state": ([U32, C.POINTER(ObjectState)], I32),
            "set_webview_visible": ([U32, I32], U64), "focus_webview": ([U32], U64),
            "reload_webview": ([U32], U64),
            "recreate_webview": ([U32, TXT, C.POINTER(WebViewSettings)], U64),
            "get_webview_url": ([U32, C.c_void_p, I32], I32),
            "webview_go_back": ([U32], I32), "webview_go_forward": ([U32], I32),
            "set_webview_zoom": ([U32, C.c_double], I32),
            "open_devtools": ([U32], I32), "close_devtools": ([U32], I32),
            "send_ipc_message": ([U32, TXT, TXT], I32),
            "close_window": ([U32], I32), "minimize_window": ([U32], I32),
            "toggle_maximize_window": ([U32], I32), "set_window_focus": ([U32], I32),
            "set_window_visible": ([U32, I32], I32), "set_window_fullscreen": ([U32, I32], I32),
            "set_window_theme": ([U32, TXT], I32), "set_window_title": ([U32, TXT], I32),
            "set_window_background_color": ([U32, TXT], I32),
            "set_window_backdrop": ([U32, TXT], I32),
            "set_window_resizable": ([U32, I32], I32),
            "set_window_always_on_top": ([U32, I32], I32),
            "set_window_skip_taskbar": ([U32, I32], I32),
            "set_window_no_activate": ([U32, I32], I32),
            "set_content_protection": ([U32, I32], I32),
            "set_window_size": ([U32, I32, I32], I32),
            "set_window_position": ([U32, I32, I32], I32),
            "set_window_progress": ([U32, I32, I32], I32),
            "set_titlebar_style": ([U32, I32] + [TXT] * 5, I32),
            "is_windows_11": ([], I32),
            "get_displays_info": ([C.c_void_p, C.c_size_t], I32),
            "getLocale": ([C.c_void_p, C.c_size_t], I32),
            "getPath": ([TXT, C.c_void_p, C.c_size_t], I32),
            "clipboard_read_text": ([C.c_void_p, I32], I32),
            "clipboard_write_text": ([TXT], I32),
            "show_notification": ([C.POINTER(Notification)], I32),
            "tray_create": ([], U32), "tray_destroy": ([U32], I32),
            "tray_set_tooltip": ([U32, TXT], I32),
            "set_webview_permission_handler": ([PERMISSION_CALLBACK], I32),
            "yaml_set": ([TXT, TXT, TXT], I32),
            "yaml_get": ([TXT, TXT, C.c_void_p, C.c_size_t], I32),
            "get_japk_mount_capabilities": ([C.POINTER(MountCapabilities)], I32),
        }
        for name, (arguments, result) in signatures.items():
            function = getattr(self.lib, name)
            function.argtypes, function.restype = arguments, result

    def accepted(self, name, *args):
        return self._accepted(getattr(self.lib, name)(*args))

    def zero(self, name, *args):
        code = getattr(self.lib, name)(*args)
        if code:
            raise JadeViewError(code, self.error_text())
        return code

    def error_text(self):
        pointer = self.lib.jade_last_error_message()
        try:
            return C.string_at(pointer).decode("utf-8") if pointer else "operation failed"
        finally:
            if pointer:
                self.lib.jade_text_free(pointer)

    def text(self, name, *prefix):
        buffer = C.create_string_buffer(65536)
        result = getattr(self.lib, name)(*prefix, buffer, len(buffer))
        if result <= 0:
            raise JadeViewError(self.lib.jade_last_error_code(), self.error_text())
        return buffer.value.decode("utf-8")

    def wait_ready(self, kind, identity, timeout=30):
        deadline = time.monotonic() + timeout
        while True:
            state = ObjectState()
            self.zero("get_" + kind + "_state", identity, C.byref(state))
            if state.state == 4:
                return state
            if state.state >= 5:
                raise JadeViewError(state.error_code, kind + " did not become ready")
            if time.monotonic() >= deadline:
                raise TimeoutError(kind + " creation remains pending")
            time.sleep(.01)

    def request(self, name, *args):
        from .sdk import Request
        return Request(self, getattr(self.lib, name)(*args)).wait()

    def subscribe(self, kind, identity, callback):
        @EVENT_CALLBACK
        def receive(pointer, _user):
            value = pointer.contents
            # Native event buffers are borrowed only for the duration of this call.
            body = C.string_at(value.data, value.data_size).decode("utf-8", "replace")
            try:
                payload = json.loads(body)
            except (ValueError, TypeError):
                payload = body
            callback({"name": value.name.decode("utf-8"), "sourceKind": value.source_kind,
                "sourceId": str(value.source_id), "windowId": value.window_id,
                "webviewId": value.webview_id, "sequence": str(value.sequence),
                "requestId": str(value.request_id), "state": value.state,
                "error": value.error_code, "replayed": bool(value.flags & 1), "data": payload})
        self.callbacks.append(receive)
        args = (0, receive, None) if kind == "app" else (identity, 0, receive, None)
        return self._accepted(getattr(self.lib, "on_" + kind + "_event")(*args))
