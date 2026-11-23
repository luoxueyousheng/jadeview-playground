import type { CodeLanguage } from "./catalog";

export interface ApiReference {
  signature: string;
  summary: string;
  details?: string;
}

export const API_REFERENCE: Readonly<Record<string, ApiReference>> = {
  set_titlebar_components: {
    signature: "int32_t set_titlebar_components(window_id, back, refresh, icon, minimize, maximize)",
    summary: "配置原生标题栏的返回、刷新、图标、最小化和最大化组件。",
    details: "各开关使用 1 或 0。返回按钮还取决于当前视图是否有可回退的历史。返回 1 表示调用已接受。",
  },
  set_window_frame: {
    signature: "int32_t set_window_frame(window_id, title_bar_style)",
    summary: "设置标题栏采用默认、覆盖层或隐藏样式。",
    details: '窗口边框在创建时设置。样式可用 "default"、"BarOverlay"、"hidden"。返回 1 表示调用已接受。',
  },
  set_titlebar_style: {
    signature: "int32_t set_titlebar_style(window_id, height, background, foreground, button_bg, hover_bg, hover_fg)",
    summary: "配置原生标题栏高度、前景色，以及按钮常态和悬浮配色。",
    details: "高度使用逻辑像素。-1 保留当前高度，0 恢复默认，20–100 指定高度。颜色传 NULL 保留当前值，传空字符串恢复主题默认值。",
  },
  minimize_window: {
    signature: "int32_t minimize_window(uint32_t window_id)",
    summary: "最小化指定窗口，适合绑定到自绘标题栏的最小化按钮。",
    details: "window_id 是窗口 ID。返回 1 表示调用已接受。",
  },
  toggle_maximize_window: {
    signature: "int32_t toggle_maximize_window(uint32_t window_id)",
    summary: "在普通和最大化状态间切换。",
    details: "重复点击自绘标题栏上的同一个按钮即可最大化或还原。返回 1 表示调用已接受。",
  },
  close_window: {
    signature: "int32_t close_window(uint32_t window_id)",
    summary: "请求关闭窗口，其所属 WebView 会随窗口销毁。",
    details: "返回 1 表示已提交关闭请求。收到 window-closed 时再从宿主窗口列表移除。",
  },
  window_options_default: {
    signature: "int32_t window_options_default(WebViewWindowOptions* out, size_t capacity)",
    summary: "为调用方填充当前 ABI 的窗口选项默认值。",
    details: "out 指向可写结构体，capacity 通常传 sizeof(*out)。返回 JADE_OK 时再覆盖示例需要的字段。",
  },
  create_window: {
    signature: "uint32_t create_window(parent_window_id, options, features)",
    summary: "创建一个空的原生窗口。",
    details: "父窗口 ID 为 0 时创建顶层窗口。options 和 features 可传 NULL。返回非零窗口 ID 表示请求已接受。",
  },
  create_webview_window: {
    signature: "uint32_t create_webview_window(url, parent_window_id, options, webview_settings, features)",
    summary: "一次创建原生窗口并挂载默认 WebView。",
    details: "扩展功能通过 features 传入。返回非零窗口 ID 表示已受理，界面就绪后再做依赖窗口句柄的操作。",
  },
  create_webview: {
    signature: "uint32_t create_webview(const char* url, const WebViewSettings* settings)",
    summary: "创建逻辑 WebView 并返回视图 ID。",
    details: "settings 可传 NULL。单独创建时还要挂载到窗口，浏览器实例会在挂载阶段分配。",
  },
  add_webview_to_window: {
    signature: "uint64_t add_webview_to_window(window_id, webview_id, bounds)",
    summary: "把逻辑 WebView 挂载到指定窗口。",
    details: "bounds 可以描述位置和大小。返回异步请求 ID，0 表示未受理。挂载成功后可设为默认视图。",
  },
  set_default_webview: {
    signature: "int32_t set_default_webview(uint32_t window_id, uint32_t webview_id)",
    summary: "将已挂载的视图设为窗口的默认 WebView。",
    details: "窗口的返回和刷新按钮会作用于默认视图。成功状态遵循该 C 接口的 JADE_OK 约定。",
  },
  add_webview: {
    signature: "Window.add_webview(url, bounds=None, settings=None) -> WebView",
    summary: "在已有窗口中创建并挂载一个原生 WebView。",
    details: "bounds 接收 Bounds，settings 可指定独立 Profile。返回的 WebView 持有自己的 ID。",
  },
  Bounds: {
    signature: 'Bounds(x="0", y="0", width="100%", height="100%")',
    summary: "用四个表达式描述原生 WebView 的几何位置。",
    details: '百分比相对于客户区，px 是固定逻辑像素。可组合为 "50%-4px"，让子视图随缩放重新布局。',
  },
  WebViewSettings: {
    signature: "WebViewSettings(profile_name=None, incognito=0, ...)",
    summary: "配置新 WebView 的会话和浏览行为。",
    details: "profile_name 分隔会话数据，incognito=1 请求无痕模式。C 结构体先通过 webview_settings_default 初始化。",
  },
  webview_settings_default: {
    signature: "int32_t webview_settings_default(WebViewSettings* out, size_t capacity)",
    summary: "用当前 ABI 的默认值初始化 WebView 设置结构体。",
    details: "capacity 应为实际缓冲区容量。成功后可改 profile_name 等字段。",
  },
  set_bounds: {
    signature: "WebView.set_bounds(bounds: Bounds) -> Request",
    summary: "改变已挂载 WebView 的位置或大小。",
    details: "异步请求能在宿主使用 wait 等待应用。应在挂载完成后调用。",
  },
  wait: {
    signature: "Request.wait(timeout=35) -> str",
    summary: "等待异步请求完成，成功时返回请求结果。",
    details: "SDK 在终态释放请求句柄。失败会抛出 JadeViewError，超时会抛出 TimeoutError。",
  },
  set_window_theme: {
    signature: "int32_t set_window_theme(uint32_t window_id, const char* theme)",
    summary: "为窗口指定 Dark、Light 或 System 主题。",
    details: "System 跟随系统外观。页面主题可以独立设置，应用可将两者同步。返回 1 表示调用已接受。",
  },
  set_window_backdrop: {
    signature: "int32_t set_window_backdrop(uint32_t window_id, const char* material)",
    summary: "选择窗口背景材料，例如 mica、micaAlt 或 acrylic。",
    details: "添加 _keepActive 可在失焦时保留 Windows 原生材质。窗口、WebView 和页面背景需要透明。",
  },
  set_window_size: {
    signature: "int32_t set_window_size(uint32_t window_id, int32_t width, int32_t height)",
    summary: "按逻辑像素请求调整窗口宽高。",
    details: "窗口最小与最大尺寸会继续约束结果。返回 1 表示调用已接受。",
  },
  set_window_always_on_top: {
    signature: "int32_t set_window_always_on_top(uint32_t window_id, int32_t enabled)",
    summary: "开启或关闭窗口置顶。",
    details: "enabled 为 1 时置顶，0 时恢复正常层级。返回 1 表示调用已接受。",
  },
  set_window_resizable: {
    signature: "int32_t set_window_resizable(uint32_t window_id, int32_t enabled)",
    summary: "允许或禁止用户调整窗口尺寸。",
    details: "enabled 为 1 时允许拖动边缘缩放。返回 1 表示调用已接受。",
  },
  set_content_protection: {
    signature: "int32_t set_content_protection(uint32_t window_id, int32_t enabled)",
    summary: "配置窗口的屏幕捕获保护。",
    details: "创建时可传 WindowFeatures.content_protection，创建后用此方法切换。具体捕获行为取决于平台。",
  },
  WindowOptions: {
    signature: "WindowOptions(title=..., width=..., height=..., theme=..., ...)",
    summary: "描述窗口的初始尺寸、样式、标题和位置。",
    details: "窗口扩展功能通过单独的 WindowFeatures 传入。尺寸和位置以逻辑像素表示。",
  },
  WindowFeatures: {
    signature: "WindowFeatures(content_protection=False, auto_save_state=False, splash=None)",
    summary: "创建窗口时传入可选功能，包括内容保护、位置保存和启动画面。",
    details: "同一运行时可以为不同窗口提供不同配置。启动画面通过 SplashOptions 设置。",
  },
  SplashOptions: {
    signature: "SplashOptions(logo_path=None, logo_data=None, background_color=0, accent_color=0, minimum_ms=0)",
    summary: "配置 Windows 窗口的启动画面。",
    details: "logo_data 优先于 logo_path。颜色为 0xAARRGGBB，minimum_ms 指定最短显示时长（毫秒）。",
  },
  resource: {
    signature: "WebView.resource(path, native=None, ttl_seconds=None) -> Resource",
    summary: "为当前 WebView 注册本地文件并生成可访问的资源 URL。",
    details: "ttl_seconds 用秒指定有效期。保留 Resource 到预览结束，再调用 close() 注销。",
  },
  delivery_info: {
    signature: "Resource.delivery_info -> dict",
    summary: "查询已注册资源的实际交付方式。",
    details: "结果包含 mode、reason、native_error_code 等字段，可查看走原生交付还是受控模式以及回退原因。",
  },
  invoke: {
    signature: "window.jade.invoke(channel, payload) -> Promise",
    summary: "调用宿主已注册的 IPC 通道，等待一条响应。",
    details: "channel 对应宿主注册名称，payload 应为可序列化数据。Playground 的 echo 会原样返回 value。",
  },
  invokeBatch: {
    signature: "window.jade.invokeBatch([{ command, payload }, ...]) -> Promise<Array>",
    summary: "向宿主提交一批 IPC 请求。",
    details: "每项包含目标 command 与 payload。用返回数组中的对应项处理结果。",
  },
  on_app_event: {
    signature: "uint64_t on_app_event(event_type, callback, user_data)",
    summary: "订阅运行时或应用范围的事件。",
    details: "event_type 传 JADE_EVENT_ALL 时接收该范围内所有事件。返回订阅 ID，失败为 0。",
  },
  on_window_event: {
    signature: "uint64_t on_window_event(window_id, event_type, callback, user_data)",
    summary: "订阅某个窗口的事件，例如 menu-command 和 window-closed。",
    details: "事件通过回调交付。需要在回调返回后使用数据时，在回调内先复制。",
  },
  on_webview_event: {
    signature: "uint64_t on_webview_event(webview_id, event_type, callback, user_data)",
    summary: "订阅某个 WebView 的导航、加载、销毁等事件。",
    details: "返回订阅 ID。通过 unsubscribe_event 取消。",
  },
  unsubscribe_event: {
    signature: "uint64_t unsubscribe_event(uint64_t subscription_id)",
    summary: "取消事件订阅。",
    details: "等待返回的异步请求完成后，再销毁事件回调引用的宿主对象。",
  },
  showOpenDialog: {
    signature: "window.jade.dialog.showOpenDialog(options) -> Promise<{ canceled, filePaths }>",
    summary: "打开系统文件或目录选择器。",
    details: "properties 可选择 openFile、openDirectory 或 multiSelections。用户取消时当前值应保留。",
  },
  showSaveDialog: {
    signature: "window.jade.dialog.showSaveDialog(options) -> Promise<{ canceled, filePath }>",
    summary: "让用户选择保存位置和文件名。",
    details: "defaultPath 可指定初始路径或文件名。宿主拿到有效路径后再负责写文件。",
  },
  showMessageBox: {
    signature: "window.jade.dialog.showMessageBox(options) -> Promise<{ response }>",
    summary: "显示系统消息框，并获得用户点击的按钮。",
    details: "buttons 按显示顺序传入，response 为按钮下标。",
  },
  tray_create: {
    signature: "uint32_t tray_create(void)",
    summary: "创建系统托盘图标。",
    details: "返回托盘 ID，0 表示失败。应用在不再使用时调用 tray_destroy 释放。",
  },
  tray_set_tooltip: {
    signature: "int32_t tray_set_tooltip(uint32_t tray_id, const char* text)",
    summary: "设置鼠标悬停在托盘图标上时显示的文字。",
    details: "tray_id 来自 tray_create，text 为 UTF-8。",
  },
  tray_destroy: {
    signature: "int32_t tray_destroy(uint32_t tray_id)",
    summary: "移除系统托盘图标。",
    details: "销毁后宿主应清除保存的 ID，重新启用时创建新的托盘。",
  },
  jade_menu_popup: {
    signature: "int32_t jade_menu_popup(window_id, items, item_count, position)",
    summary: "在指定位置弹出由宿主提供的菜单。",
    details: "items 是菜单项数组，position 传 NULL 时使用鼠标位置。返回 1 表示已入队，选中自定义项后派发 menu-command。",
  },
  show_notification: {
    signature: "int32_t show_notification(const NotificationParams* params)",
    summary: "向系统通知中心提交一条通知。",
    details: "params 指向填好的标题、正文等参数。呈现效果受系统通知设置影响。",
  },
  clipboard_read_text: {
    signature: "int32_t clipboard_read_text(char* buffer, int32_t buffer_size)",
    summary: "读取系统剪贴板中的 UTF-8 纯文本。",
    details: "buffer_size 指缓冲区容量（字节）。缓冲区由调用方提供。",
  },
  clipboard_write_text: {
    signature: "int32_t clipboard_write_text(const char* text)",
    summary: "将 UTF-8 文本写入系统剪贴板。",
    details: "text 为结束于空字符的字符串，应用应检查调用结果。",
  },
  yaml_set: {
    signature: "int32_t yaml_set(file_name, key_path, value)",
    summary: "在应用数据目录的 YAML 文件中写入一个值。",
    details: "key_path 可用点号访问嵌套键。Playground 将原始数据序列化为 JSON 后存为字符串。",
  },
  yaml_get: {
    signature: "int32_t yaml_get(file_name, key_path, buffer, buffer_size)",
    summary: "将 YAML 指定键的值读入缓冲区。",
    details: "buffer_size 为字节数。传 NULL 与 0 可查询所需容量，提供足够容量后再取值。",
  },
  jadeview_version: {
    signature: "int32_t jadeview_version(char* buffer, size_t capacity)",
    summary: "查询正在运行的 JadeView 版本。",
    details: "使用调用方提供的 UTF-8 缓冲区。可用它确认宿主加载了预期的库版本。",
  },
  get_webview_version: {
    signature: "int32_t get_webview_version(char* buffer, size_t capacity)",
    summary: "查询当前系统使用的 WebView 引擎版本。",
    details: "排查网页兼容性时可同时记录 JadeView 与 WebView 引擎的版本。",
  },
  get_displays_info: {
    signature: "int32_t get_displays_info(char* buffer, size_t capacity)",
    summary: "读取显示器、工作区和缩放信息的 JSON。",
    details: "使用调用方提供的缓冲区。需要更丰富的数据时应预留足够字节。",
  },
  getLocale: {
    signature: "int32_t getLocale(char* buffer, size_t capacity)",
    summary: "读取宿主环境的区域语言。",
    details: "将 UTF-8 结果写入调用方缓冲区。",
  },
  set_webview_permission_handler: {
    signature: "int32_t set_webview_permission_handler(PermissionCallback callback)",
    summary: "为 WebView 发起的权限请求注册宿主回调。",
    details: "回调接收来源视图 ID 与请求描述。返回 1 允许，-1 拒绝，0 使用浏览器默认策略。",
  },
  build_from_template: {
    signature: "Menu.build_from_template(runtime, template) -> Menu",
    summary: "根据 Python 字典模板构建本地菜单。",
    details: "菜单栏的顶层项使用 submenu。复选状态由宿主维护，收到 menu-command 后可重新构建。",
  },
  set_menu: {
    signature: "Window.set_menu(menu: Menu | None) -> int",
    summary: "将菜单安装到当前窗口。",
    details: "传 None 隐藏菜单栏。菜单项的选择通过 menu-command 返回 item_id。",
  },
  subscribe: {
    signature: 'Native.subscribe(kind, identity, callback) -> int',
    summary: "Playground 宿主封装的事件订阅方法。",
    details: '例如 kind="window" 时用窗口 ID 监听菜单事件。callback 接收复制后的 Python 字典。',
  },
  set_context_menu: {
    signature: "WebView.set_context_menu(items) -> int",
    summary: "替换指定 WebView 的自绘右键菜单。",
    details: "role 绑定复制等内置动作；带 id 的自定义项派发 context-menu-click。菜单模板会在调用时复制。",
  },
  clear_context_menu: {
    signature: "WebView.clear_context_menu() -> int",
    summary: "移除自定义模板，并恢复 JadeView 根据页面内容生成的右键菜单。",
    details: "作用范围为当前 WebView。",
  },
};

const PYTHON_CREATE_WINDOW: ApiReference = {
  signature: 'Runtime.create_window(url="about:blank", profile=None, options=None, settings=None, *, features=None) -> Window',
  summary: "创建原生窗口并挂载默认 WebView，返回 Python Window 对象。",
  details: "profile 与 settings 二选一。通过 features 传入 WindowFeatures。窗口返回 ID 后才开始异步创建，后续操作可等待就绪事件。",
};

const C_WEBVIEW_SETTINGS: ApiReference = {
  signature: "struct WebViewSettings",
  summary: "描述新 WebView 的会话、权限相关选项和浏览行为。",
  details: "先用 webview_settings_default 初始化结构体，再设置 profile_name 或 incognito 等字段。",
};

export function getApiReference(name: string, language: CodeLanguage): ApiReference | undefined {
  if (name === "create_window" && language === "Python") return PYTHON_CREATE_WINDOW;
  if (name === "WebViewSettings" && language === "C") return C_WEBVIEW_SETTINGS;
  return Object.hasOwn(API_REFERENCE, name) ? API_REFERENCE[name] : undefined;
}
