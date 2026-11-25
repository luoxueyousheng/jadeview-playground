"""Small NEXT C-API binding for requests, Window/WebView objects and arrays.

Start JadeView with JadeView_init and wait for app-ready before constructing
Window objects. Typed callback examples and initialization are in examples/next.
"""
from __future__ import annotations
import asyncio
import ctypes as C
import os
import time

ABI_VERSION = 0x00030003

class _AbiInfo(C.Structure):
    _fields_=[(name,C.c_uint32) for name in ("abi_version","pointer_bits","window_options_size","webview_settings_size")]

class _DeliveryInfo(C.Structure):
    _fields_=[("mode",C.c_uint32),("reason",C.c_uint32),("native_error_code",C.c_int32),("message",C.c_void_p)]

class _Result(C.Structure):
    _fields_=[("state",C.c_uint32),("error",C.c_int32),("object",C.c_uint32),("message",C.c_void_p)]
class _Ids(C.Structure):
    _fields_=[("ids",C.POINTER(C.c_uint32)),("count",C.c_size_t)]
class Bounds(C.Structure):
    _fields_=[(name,C.c_char_p) for name in ("x","y","width","height")]
    def __init__(self,x="0",y="0",width="100%",height="100%"):
        super().__init__(*(value.encode("utf-8") for value in (x,y,width,height)))

class ResourceOptions(C.Structure):
    _fields_=[("mode",C.c_uint32)]

class ResourceCapabilities(C.Structure):
    _fields_=[(name,C.c_uint32) for name in ("supported_modes","native_requires_private_view",
        "native_requires_permanent","native_requires_dedicated_profile","native_registered","native_pending_cleanup")]
    @property
    def native_available(self):return bool(self.supported_modes & 2)

class WebViewSettings(C.Structure):
    _fields_=[("struct_size",C.c_uint32),("abi_version",C.c_uint32),("autoplay",C.c_int32),("background_throttling",C.c_int32),("allow_right_click",C.c_int32),
        ("user_agent",C.c_char_p),("preload_js",C.c_char_p),("allow_fullscreen",C.c_int32),
        ("postmessage_allowed_origins",C.c_char_p),("cors_allowed_origins",C.c_char_p),("password_autofill",C.c_int32),
        ("form_autofill",C.c_int32),("incognito",C.c_int32),("disable_clipboard",C.c_int32),
        ("proxy_url",C.c_char_p),("focused",C.c_int32),("profile_name",C.c_char_p),
        ("devtools",C.c_int32),("zoom_factor",C.c_double),("background_color",C.c_char_p)]
    def __init__(self,**values):
        super().__init__()
        self.struct_size,self.abi_version=C.sizeof(type(self)),ABI_VERSION
        self.allow_right_click=self.allow_fullscreen=self.focused=1
        fields=dict(self._fields_)
        for name,value in values.items():
            if name not in fields: raise TypeError(f"Unknown WebView setting: {name}")
            setattr(self,name,value.encode("utf-8") if isinstance(value,str) and fields[name] is C.c_char_p else value)

class WindowOptions(C.Structure):
    """NEXT window creation options. noframe=True uses the existing frameless path."""
    _fields_=[("struct_size",C.c_uint32),("abi_version",C.c_uint32),("title",C.c_char_p),("width",C.c_int32),("height",C.c_int32),
        ("resizable",C.c_int32),("noframe",C.c_int32),("title_bar_style",C.c_char_p),
        ("transparent",C.c_int32),("background_color",C.c_char_p),
        ("always_on_top",C.c_int32),("theme",C.c_char_p)]+[(name,C.c_int32) for name in
        ("maximized","maximizable","minimizable","x","y","min_width","min_height",
         "max_width","max_height","fullscreen","focus","hide_window","use_page_icon",
         "skip_taskbar","no_activate")]+[("background_material",C.c_char_p),
         ("titlebar_back",C.c_int32),("titlebar_refresh",C.c_int32),("titlebar_icon",C.c_int32)]
    def __init__(self,**values):
        super().__init__()
        self.struct_size,self.abi_version=C.sizeof(type(self)),ABI_VERSION
        self.width,self.height=800,600
        self.resizable=self.maximizable=self.minimizable=self.focus=1
        self.titlebar_back=self.titlebar_refresh=self.titlebar_icon=1
        self.x=self.y=-1
        fields=dict(self._fields_)
        for name,value in values.items():
            if name not in fields:raise TypeError(f"Unknown window option: {name}")
            setattr(self,name,value.encode("utf-8") if isinstance(value,str) and fields[name] is C.c_char_p else value)


class SplashOptions(C.Structure):
    """Optional per-window startup splash. Colors use 0xAARRGGBB."""

    _fields_ = [
        ("struct_size", C.c_uint32), ("abi_version", C.c_uint32), ("flags", C.c_uint32),
        ("logo_path", C.c_char_p), ("logo_data", C.c_void_p), ("logo_data_size", C.c_size_t),
        ("background_color", C.c_uint32), ("accent_color", C.c_uint32),
        ("minimum_ms", C.c_uint32),
    ]

    def __init__(self, *, logo_path=None, logo_data=None, background_color=0, accent_color=0,
                 minimum_ms=0, enabled=True):
        super().__init__()
        if not 0 <= minimum_ms <= 0xFFFFFFFF:
            raise ValueError("minimum_ms must fit in an unsigned 32-bit integer")
        self.struct_size, self.abi_version = C.sizeof(type(self)), ABI_VERSION
        self.flags = 0 if enabled else 1
        self.background_color, self.accent_color = background_color, accent_color
        self.minimum_ms = minimum_ms
        if logo_path is not None:
            self.logo_path = os.fsdecode(logo_path).encode("utf-8")
        if logo_data is not None:
            data = bytes(logo_data)
            self._logo_buffer = C.create_string_buffer(data)
            self.logo_data = C.cast(self._logo_buffer, C.c_void_p)
            self.logo_data_size = len(data)


class WindowFeatures(C.Structure):
    """Optional window behavior, passed separately at creation."""

    _fields_ = [
        ("struct_size", C.c_uint32), ("abi_version", C.c_uint32),
        ("content_protection", C.c_int32), ("auto_save_state", C.c_int32),
        ("splash", C.POINTER(SplashOptions)),
    ]

    def __init__(self, *, content_protection=False, auto_save_state=False, splash=None):
        super().__init__()
        self.struct_size, self.abi_version = C.sizeof(type(self)), ABI_VERSION
        self.content_protection = content_protection
        self.auto_save_state = auto_save_state
        if splash is not None:
            self.splash = C.pointer(splash)


class JadeViewError(RuntimeError):
    def __init__(self,code,message):super().__init__(f"JadeView {code}: {message}");self.code=code

class _MenuIcon(C.Structure):
    _fields_ = [("icon_path", C.c_char_p), ("icon_data", C.c_void_p),
                ("icon_data_size", C.c_size_t), ("icon_codepoint", C.c_uint32)]


def _menu_icon(item, buffers):
    codepoint = item.get("icon_codepoint", 0)
    data = item.get("icon_data")
    if not codepoint and data is not None:
        data = bytes(data)
        buffer = C.create_string_buffer(data)
        buffers.append(buffer)
        return _MenuIcon(None, C.cast(buffer, C.c_void_p), len(data), 0)
    path = item.get("icon_path")
    return _MenuIcon(str(path).encode("utf-8") if path else None, None, 0, int(codepoint or 0))


class _MenuItem(C.Structure):
    _fields_ = [(field, C.c_char_p) for field in ("id", "parent_id", "label", "accelerator")] + [
        ("kind", C.c_uint32), ("flags", C.c_uint32), ("icon", _MenuIcon),
    ]

class _ContextMenuItem(C.Structure):
    _fields_ = [
        ("struct_size", C.c_uint32),
        ("id", C.c_char_p), ("parent_id", C.c_char_p), ("label", C.c_char_p),
        ("accelerator", C.c_char_p), ("role", C.c_char_p),
        ("kind", C.c_uint32), ("flags", C.c_uint32), ("icon", _MenuIcon),
    ]

_CONTEXT_MENU_KINDS = {
    "normal": 0, "command": 0, "submenu": 1, "separator": 2,
    "checkbox": 3, "toggle": 3, "radio": 4,
}

class _MenuPosition(C.Structure):
    _fields_ = [("x", C.c_int32), ("y", C.c_int32)]

class Menu:
    def __init__(self, runtime, rows, icon_buffers=()):
        self.runtime = runtime
        self._rows = (_MenuItem * len(rows))(*rows)
        self._icon_buffers = tuple(icon_buffers)

    @classmethod
    def build_from_template(cls, runtime, template):
        kinds = {"normal": 0, "submenu": 1, "separator": 2, "checkbox": 3, "radio": 4}
        rows = []
        icon_buffers = []

        def append(items, parent=None, depth=0):
            if depth > 3:
                raise ValueError("Menus support at most three submenu levels")
            for item in items:
                if len(rows) >= 512:
                    raise ValueError("Menus support at most 512 items")
                kind = kinds[item.get("type", "submenu" if "submenu" in item else "normal")]
                key = item.get("id", f"menu-item-{len(rows)}").encode("utf-8")
                flags = int(not item.get("enabled", True)) | (int(item.get("checked", False)) << 1)
                label = item.get("label", "").encode("utf-8")
                accelerator = item.get("accelerator", "").encode("utf-8")
                icon = _menu_icon(item, icon_buffers)
                rows.append(_MenuItem(key, parent, label, accelerator, kind, flags, icon))
                if kind == 1:
                    append(item["submenu"], key, depth + 1)

        append(template)
        return cls(runtime, rows, icon_buffers)

    def popup(self, window=None, *, x=None, y=None):
        if (x is None) != (y is None):
            raise ValueError("Pass both x and y, or omit both")
        if window is not None and window.runtime is not self.runtime:
            raise ValueError("The menu and window must belong to the same runtime")
        point = None if x is None else _MenuPosition(x, y)
        return self.runtime._accepted(self.runtime.lib.jade_menu_popup(
            0 if window is None else window.id,
            self._rows, len(self._rows), None if point is None else C.byref(point),
        ))

class Runtime:
    def __init__(self,path):
        self.lib=(C.WinDLL if os.name=="nt" else C.CDLL)(str(path))
        try:
            probe=self.lib.jade_get_abi_info
        except AttributeError as exc:
            raise RuntimeError("This DLL predates the versioned NEXT ABI; update DLL and SDK together") from exc
        probe.argtypes=[C.POINTER(_AbiInfo),C.c_size_t];probe.restype=C.c_int32
        info=_AbiInfo()
        if (probe(C.byref(info),C.sizeof(info)) != 0
            or (info.abi_version,info.pointer_bits) != (ABI_VERSION,C.sizeof(C.c_void_p)*8)
            or info.window_options_size < C.sizeof(WindowOptions)
            or info.webview_settings_size < C.sizeof(WebViewSettings)):
            raise RuntimeError("JadeView DLL/SDK ABI or architecture mismatch")
        u32,u64=C.c_uint32,C.c_uint64
        signatures={
            "create_webview_window":([C.c_char_p,u32,C.c_void_p,C.c_void_p,C.POINTER(WindowFeatures)],u32),
            "get_default_webview":([u32],u32),"get_webview_parent_window_id":([u32],u32),
            "set_window_frame":([u32,C.c_char_p],C.c_int32),
            "set_titlebar_components":([u32,C.c_int32,C.c_int32,C.c_int32,C.c_int32,C.c_int32],C.c_int32),
            "set_titlebar_style":([u32,C.c_int32]+[C.c_char_p]*5,C.c_int32),
            "add_webview":([u32,C.c_char_p,C.c_void_p,C.POINTER(Bounds)],u32),
            "set_webview_bounds":([u32,C.POINTER(Bounds)],u64),
            "navigate_webview":([u32,C.c_char_p],u64),"execute_webview_script":([u32,C.c_char_p],u64),
            "destroy_webview":([u32],u64),"get_window_webviews":([u32,C.POINTER(_Ids)],C.c_int32),
            "free_webview_id_array":([C.POINTER(_Ids)],None),
            "get_request_result":([u64,C.POINTER(_Result)],C.c_int32),
            "free_request_result":([C.POINTER(_Result)],None),"release_request":([u64],C.c_int32),
            "jade_last_error_code":([],C.c_int32),"jade_last_error_message":([],C.c_void_p),
            "jade_text_free":([C.c_void_p],None),
            "register_resource_ex":([C.c_char_p,u32,u32,C.POINTER(ResourceOptions),C.c_void_p,C.c_size_t],C.c_int32),
            "register_resource":([C.c_char_p,u32,u32,C.c_void_p,C.c_size_t],C.c_int32),
            "get_resource_delivery_info":([C.c_char_p,u32,C.POINTER(_DeliveryInfo),C.c_size_t],C.c_int32),
            "free_resource_delivery_info":([C.POINTER(_DeliveryInfo)],None),
            "get_resource_delivery_mode":([C.c_char_p,u32,C.POINTER(u32)],C.c_int32),
            "unregister_resource":([C.c_char_p],C.c_int32),
            "get_resource_capabilities":([u32,C.POINTER(ResourceCapabilities)],C.c_int32),
        }
        for name,(args,result) in signatures.items():
            fn=getattr(self.lib,name);fn.argtypes=args;fn.restype=result
        items = C.POINTER(_MenuItem)
        menu_signatures = {
            "jade_menu_popup": ([u32, items, u32, C.POINTER(_MenuPosition)], C.c_int32),
            "jade_set_application_menu": ([items, u32], C.c_int32),
            "jade_window_set_menu": ([u32, items, u32], C.c_int32),
            "jade_webview_set_context_menu": ([u32, C.POINTER(_ContextMenuItem), u32], C.c_int32),
            "jade_webview_clear_context_menu": ([u32], C.c_int32),
        }
        for name, (args, result) in menu_signatures.items():
            fn = getattr(self.lib, name, None)
            if fn is not None:
                fn.argtypes, fn.restype = args, result

    def _accepted(self,value):
        if value:return value
        ptr=self.lib.jade_last_error_message()
        try:message=C.string_at(ptr).decode("utf-8") if ptr else "operation rejected"
        finally:
            if ptr:self.lib.jade_text_free(ptr)
        raise JadeViewError(self.lib.jade_last_error_code(),message)
    def create_window(self,url="about:blank",profile=None,options=None,settings=None,*,features=None):
        if profile is not None:
            if settings is not None: raise ValueError("Use either profile or settings")
            settings=WebViewSettings(profile_name=profile)
        window_id = self.lib.create_webview_window(
            url.encode(), 0, C.byref(options) if options is not None else None,
            C.byref(settings) if settings is not None else None,
            C.byref(features) if features is not None else None,
        )
        return Window(self, self._accepted(window_id))

    def set_application_menu(self, menu):
        rows = self._menu_rows(menu)
        return self._accepted(self.lib.jade_set_application_menu(rows, len(rows) if rows is not None else 0))

    def _menu_rows(self, menu):
        if menu is None:
            return None
        if menu.runtime is not self:
            raise ValueError("The menu must belong to this runtime")
        return menu._rows

class Resource:
    """Keep until consumers detach. close() raises on BUSY and can be retried."""
    def __init__(self,runtime,url,webview_id=0):self.runtime=runtime;self.url=url;self.webview_id=webview_id;self.closed=False
    @property
    def mode(self):
        mode=C.c_uint32()
        if self.runtime.lib.get_resource_delivery_mode(self.url.encode(),self.webview_id,C.byref(mode)):
            self.runtime._accepted(0)
        return "native" if mode.value==1 else "controlled"
    @property
    def delivery_info(self):
        """Actual route and original fallback reason; valid while registered."""
        value=_DeliveryInfo();lib=self.runtime.lib
        code=lib.get_resource_delivery_info(self.url.encode(),self.webview_id,C.byref(value),C.sizeof(value))
        if code:raise JadeViewError(code,"resource delivery information unavailable")
        try:
            return {"mode":"native" if value.mode==1 else "controlled", "reason":value.reason,
                    "native_error_code":value.native_error_code,
                    "message":C.string_at(value.message).decode("utf-8") if value.message else ""}
        finally:lib.free_resource_delivery_info(C.byref(value))
    def close(self):
        if not self.closed:
            self.runtime._accepted(self.runtime.lib.unregister_resource(self.url.encode()))
            self.closed=True
    def __enter__(self):return self
    def __exit__(self,*_):self.close()

class Request:
    def __init__(self,runtime,id):self.runtime=runtime;self.id=runtime._accepted(id);self._finished=False;self._value=None;self._error=None
    def poll(self):
        if self._finished:
            if self._error:raise self._error
            return True,self._value
        out=_Result();lib=self.runtime.lib
        code=lib.get_request_result(self.id,C.byref(out))
        if code:raise JadeViewError(code,"request is unknown or expired")
        try:
            if out.state<3:return False,None
            value=C.string_at(out.message).decode("utf-8") if out.message else ""
            if out.error:
                self._error=JadeViewError(out.error,value)
                raise self._error
            self._value=value;return True,value
        finally:
            terminal=out.state>=3;lib.free_request_result(C.byref(out))
            if terminal:lib.release_request(self.id);self._finished=True
    def wait(self,timeout=35):
        deadline=time.monotonic()+timeout
        while True:
            ready,value=self.poll()
            if ready:return value
            if time.monotonic()>=deadline:raise TimeoutError("JadeView request remains pending")
            time.sleep(.01)
    async def _wait_async(self):
        while True:
            ready,value=self.poll()
            if ready:return value
            await asyncio.sleep(.01)
    def __await__(self):return self._wait_async().__await__()

class Window:
    def __init__(self,runtime,id):self.runtime=runtime;self.id=id
    def set_menu(self, menu):
        rows = self.runtime._menu_rows(menu)
        return self.runtime._accepted(self.runtime.lib.jade_window_set_menu(
            self.id, rows, len(rows) if rows is not None else 0,
        ))
    def set_titlebar_style(self,height=-1,*,background_color=None,foreground_color=None,
            button_background_color=None,
            button_hover_background_color=None,button_hover_foreground_color=None):
        """Windows default/BarOverlay style. None keeps a color; '' resets it.

        Height -1 keeps, 0 resets, and 20–100 sets the height in DIP.
        Foreground colors the title and button glyphs.
        """
        colors=(background_color,foreground_color,button_background_color,
            button_hover_background_color,button_hover_foreground_color)
        return self.runtime._accepted(self.runtime.lib.set_titlebar_style(self.id,height,
            *(value.encode('utf-8') if value is not None else None for value in colors)))
    def set_frame(self,title_bar_style="default"):
        return self.runtime._accepted(self.runtime.lib.set_window_frame(self.id,title_bar_style.encode("utf-8")))
    def set_titlebar_components(self,back=True,refresh=True,icon=True,minimize=True,maximize=True):
        """Windows: navigation, default-caption icon visibility and Minimize/Maximize (0/1)."""
        return self.runtime._accepted(self.runtime.lib.set_titlebar_components(
            self.id,int(back),int(refresh),int(icon),int(minimize),int(maximize)))
    @property
    def default_webview(self):
        id=self.runtime.lib.get_default_webview(self.id)
        return WebView(self.runtime,id) if id else None
    @property
    def webviews(self):
        ids=_Ids();code=self.runtime.lib.get_window_webviews(self.id,C.byref(ids))
        if code:raise JadeViewError(code,"cannot query Window WebViews")
        try:return [WebView(self.runtime,ids.ids[i]) for i in range(ids.count)]
        finally:self.runtime.lib.free_webview_id_array(C.byref(ids))
    def add_webview(self,url="about:blank",bounds=None,settings=None):
        id=self.runtime.lib.add_webview(self.id,url.encode(),C.byref(settings) if settings is not None else None,C.byref(bounds) if bounds is not None else None)
        return WebView(self.runtime,self.runtime._accepted(id))

class WebView:
    def __init__(self,runtime,id):self.runtime=runtime;self.id=id
    @property
    def parent(self):
        id=self.runtime.lib.get_webview_parent_window_id(self.id)
        return Window(self.runtime,id) if id else None
    def set_context_menu(self, items):
        """Replace the page right-click menu. Items with a role run the
        corresponding action. Custom items emit context-menu-click with their
        id. Pass None or [] to restore the automatic menu."""
        rows=[]
        icon_buffers=[]
        for item in items or []:
            if not isinstance(item, dict):
                raise TypeError("context menu items must be dicts")
            if "native_name" in item:
                raise ValueError("native_name was merged into role; use the unified role from the context-menu item table")
            kind=item.get("kind",0)
            if isinstance(kind,str):
                try:
                    kind=_CONTEXT_MENU_KINDS[kind.lower()]
                except KeyError:
                    raise ValueError(f"Unknown context menu kind: {kind}") from None
            flags=int(item.get("flags",0))
            if item.get("disabled"): flags|=1
            if item.get("checked"): flags|=2
            row=_ContextMenuItem()
            row.struct_size=C.sizeof(_ContextMenuItem)
            for field in ("id","parent_id","label","accelerator","role"):
                value=item.get(field)
                if value is not None:
                    setattr(row,field,str(value).encode("utf-8"))
            row.kind=kind;row.flags=flags;row.icon=_menu_icon(item, icon_buffers)
            rows.append(row)
        array=(_ContextMenuItem*len(rows))(*rows) if rows else None
        return self.runtime._accepted(self.runtime.lib.jade_webview_set_context_menu(
            self.id,array,len(rows)))
    def clear_context_menu(self):
        return self.runtime._accepted(self.runtime.lib.jade_webview_clear_context_menu(self.id))
    def set_bounds(self,bounds):return Request(self.runtime,self.runtime.lib.set_webview_bounds(self.id,C.byref(bounds)))
    def navigate(self,url):return Request(self.runtime,self.runtime.lib.navigate_webview(self.id,url.encode()))
    def evaluate(self,script):return Request(self.runtime,self.runtime.lib.execute_webview_script(self.id,script.encode()))
    def destroy(self):return Request(self.runtime,self.runtime.lib.destroy_webview(self.id))
    @property
    def resource_capabilities(self):
        result=ResourceCapabilities()
        code=self.runtime.lib.get_resource_capabilities(self.id,C.byref(result))
        if code:self.runtime._accepted(0)
        return result
    def resource(self,path,native=None,ttl_seconds=None):
        ttl=(0xffffffff if native is True else 0) if ttl_seconds is None else ttl_seconds
        output=C.create_string_buffer(2048)
        if native is None:
            result=self.runtime.lib.register_resource(os.fsencode(path),self.id,ttl,output,len(output))
        else:
            options=ResourceOptions(1 if native else 0)
            result=self.runtime.lib.register_resource_ex(os.fsencode(path),self.id,ttl,C.byref(options),output,len(output))
        self.runtime._accepted(result)
        return Resource(self.runtime,output.value.decode(),self.id)
