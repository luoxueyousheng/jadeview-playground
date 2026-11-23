import type { SampleField } from "../launch";
import { webPopupSource } from "./webPopup";

export type CodeLanguage = "C" | "JavaScript" | "Python";

export interface ExampleMeta {
  kind: string;
  title: string;
  group: string;
  /** 图标键。页面层映射到 `NavIcons` 的实际图形，catalog 不直接依赖组件。 */
  icon: string;
  /** 一句话说清这个窗口演示什么（详情页与窗口页共用）。 */
  summary: string;
  /** 详情页的三条要点。 */
  points: string[];
  /** 在示例页显示的接口用法。 */
  api: string;
  language: CodeLanguage;
}

export interface NavGroup {
  id: string;
  label: string;
  items: string[];
}

export const NAV_GROUPS: NavGroup[] = [
  { id: "windowing", label: "窗口与标题栏", items: ["dwm", "overlay", "hidden", "frameless", "theme", "flags", "splash", "webpopup"] },
  { id: "layout", label: "布局与视图", items: ["layout", "empty"] },
  { id: "data", label: "资源与数据", items: ["resources"] },
  { id: "communication", label: "通讯与事件", items: ["ipc", "events"] },
  { id: "system", label: "系统集成", items: ["dialogs", "tray", "clipboard", "storage", "runtime"] },
  { id: "permissions", label: "权限与会话", items: ["permissions"] },
  { id: "menus", label: "菜单", items: ["menubar", "contextmenu"] },
];

export const EXAMPLES: Record<string, ExampleMeta> = {
  dwm: {
    kind: "dwm", title: "标题栏组件", group: "窗口与标题栏", icon: "dwm",
    summary: "开关默认 DWM 标题栏的组件，并调节高度和配色。",
    points: [
      "组件开关同时作用于默认标题栏与 BarOverlay 覆盖层",
      "返回按钮随页面历史出现，刷新按钮随加载状态更新",
      "切换后立即生效，不需要重建窗口",
    ],
    language: "C",
    api: "// 使用已就绪的窗口 ID。顺序为返回、刷新、图标、最小化、最大化。\nset_titlebar_components(window_id, 1, 1, 1, 1, 1);\n\n// 高度为 20–100 逻辑像素，传 0 恢复默认。\n// 依次设置标题栏背景、前景、按钮背景、按钮悬浮背景和悬浮前景。\n// 颜色支持 #RRGGBB / #RRGGBBAA。传空字符串跟随主题，传 NULL 保留当前颜色。\nset_titlebar_style(window_id, 42, \"#202020\", \"#f5f5f5\",\n                   \"\", \"#ffffff20\", \"#ffffff\");",
  },
  overlay: {
    kind: "overlay", title: "覆盖层标题栏", group: "窗口与标题栏", icon: "overlay",
    summary: "BarOverlay 覆盖层标题栏：调节高度、图标色、按钮常态与悬浮背景，并开关标题栏组件。",
    points: [
      "覆盖层与默认标题栏共用同一套组件开关，但没有窗口图标",
      "按钮常态背景与悬浮背景可以分别设置，颜色接受 #RRGGBBAA",
      "高度按逻辑像素设置，返回 / 刷新按钮随之自适应",
    ],
    language: "C",
    api: "// 0 保留窗口边框，BarOverlay 由网页绘制标题栏主体。\nset_window_frame(window_id, \"BarOverlay\");\n\n// 拖拽区域由页面的 jade-region-drag 标记，交互控件用 jade-region-no-drag。\n// 高度使用逻辑像素。各颜色传 NULL 时采用主题默认值。\nset_titlebar_style(window_id, 40, NULL, NULL,\n                   \"#ffffff10\", \"#ffffff20\", NULL);",
  },
  hidden: {
    kind: "hidden", title: "无标题栏窗口", group: "窗口与标题栏", icon: "hidden",
    summary: "隐藏系统标题栏，改由页面自己提供拖拽区与最小化 / 最大化 / 关闭按钮。",
    points: [
      "建窗时可选 default / BarOverlay / hidden 三种标题栏样式",
      "无边框是独立参数，与标题栏样式分别设置",
      "拖动顶部横条移动窗口，右侧按钮直接调用窗口命令",
    ],
    language: "C",
    api: "// 隐藏系统标题栏，保留窗口边框。\nset_window_frame(window_id, \"hidden\");\n\n// 在网页的标题区域使用 jade-region-drag。\n// 将下面的调用分别绑定到自绘的三个窗口按钮。\n/* 最小化 */ minimize_window(window_id);\n/* 最大化或还原 */ toggle_maximize_window(window_id);\n/* 关闭 */ close_window(window_id);",
  },
  frameless: {
    kind: "frameless", title: "无边框窗口", group: "窗口与标题栏", icon: "hidden",
    summary: "创建时不带系统边框与标题栏，页面自行提供拖拽区和窗口按钮。",
    points: [
      "通过创建选项设置无边框",
      "拖动顶部横条移动窗口，右侧按钮直接调用窗口命令",
      "窗口仍支持缩放、置顶与内容保护",
    ],
    language: "C",
    api: "// 创建无边框窗口时初始化窗口选项，并设置 noframe。\nstruct WebViewWindowOptions options;\nwindow_options_default(&options, sizeof(options));\noptions.noframe = 1;\n// 第二个参数 0 表示无父窗口。两个 NULL 分别使用默认视图设置和窗口功能。\ncreate_webview_window(url, 0, &options, NULL, NULL);",
  },
  theme: {
    kind: "theme", title: "主题与背景材料", group: "窗口与标题栏", icon: "theme",
    summary: "切换窗口明暗主题，并在 Windows 11 上应用 Mica、Mica Alt 或 Acrylic 背景材料。",
    points: [
      "主题可选 Dark / Light / System，System 跟随系统设置",
      "窗口与 WebView 都从创建起使用透明底，材质才不会被页面盖住",
      "背景材料仅在 Windows 11 及以上生效",
    ],
    language: "C",
    api: "// 为已就绪的窗口设置主题，可用 System、Dark 或 Light。\nset_window_theme(window_id, \"Light\");\n\n// 窗口、WebView 和页面背景透明时可看见材质。\n// 保留原生 Mica Alt 外观，窗口失焦时仍显示。\nset_window_backdrop(window_id, \"micaAlt_keepActive\");",
  },
  flags: {
    kind: "flags", title: "窗口标志与尺寸", group: "窗口与标题栏", icon: "flags",
    summary: "设置置顶、可缩放、内容保护与全屏标志，并按逻辑像素直接调整窗口宽高。",
    points: [
      "每个标志即时作用于当前窗口，开关状态来自宿主快照",
      "内容保护可阻止截屏与录屏抓取窗口内容",
      "尺寸取值限制在 320×240 到 7680×4320 之间",
    ],
    language: "C",
    api: "// 这些参数可在窗口已经显示后修改。尺寸使用逻辑像素。\nset_window_always_on_top(window_id, 1);\nset_window_resizable(window_id, 1);\nset_window_size(window_id, 1000, 720);\n\n// 0 关闭内容保护。创建时启用可设置 JadeWindowFeatures。\nset_content_protection(window_id, 0);",
  },
  layout: {
    kind: "layout", title: "多 WebView 工作区", group: "布局与视图", icon: "layout",
    summary: "在一个原生窗口里创建并排列多个真实 WebView，验证独立生命周期、父子 ID 与坐标表达式。",
    points: [
      "每个视图拥有独立 ID、导航历史与 Profile",
      "布局用百分比与 px 混合表达式，窗口缩放时由宿主重算",
      "支持分步创建再挂载、重建、显隐与销毁",
    ],
    language: "Python",
    api: "from jadeview_next import Bounds, WebViewSettings\n\n# window 是已就绪的窗口。Bounds 使用 x、y、宽、高四个表达式。\n# 百分比随客户区变化，px 用来保留固定间距。\nleft = window.add_webview(\"about:blank\", Bounds(\"0\", \"0\", \"50%-4px\", \"100%\"),\n                          WebViewSettings(profile_name=\"left\"))\nright = window.add_webview(\"about:blank\", Bounds(\"50%+4px\", \"0\", \"50%-4px\", \"100%\"),\n                           WebViewSettings(profile_name=\"right\"))\n\n# 调整实际的原生 WebView。wait 会等待请求完成并释放请求句柄。\nleft.set_bounds(Bounds(\"0\", \"0\", \"40%-4px\", \"100%\")).wait()\nright.set_bounds(Bounds(\"40%+4px\", \"0\", \"60%-4px\", \"100%\")).wait()",
  },
  empty: {
    kind: "empty", title: "独立窗口", group: "布局与视图", icon: "hidden",
    summary: "先创建一个不含任何 WebView 的空窗口，再单独挂载视图，观察 Window 与 WebView 的分离生命周期。",
    points: [
      "空窗口没有默认视图，创建后窗口本身就是空的",
      "在启动页点「挂载 WebView」就能把视图挂上去",
      "Window 与 WebView 的 ID、状态相互独立",
    ],
    language: "C",
    api: "// 使用默认参数创建空窗口。该调用不会创建默认 WebView。\nuint32_t window_id = create_window(0, NULL, NULL);\n\n// 创建逻辑视图后将它挂载到窗口。NULL bounds 表示填满客户区。\nuint32_t view_id = create_webview(\"about:blank\", NULL);\nuint64_t attach = add_webview_to_window(window_id, view_id, NULL);\n\n// attach 是请求 ID。挂载成功后再将这个视图设为默认视图。\n// 请在宿主的请求完成回调中调用 set_default_webview(window_id, view_id)。",
  },
  resources: {
    kind: "resources", title: "资源注册与预览", group: "资源与数据", icon: "resources",
    summary: "把本地文件注册为页面可访问的 HTTPS 资源，检查交付方式、响应头与 Range 请求。",
    points: [
      "符合条件时优先走原生交付，否则回退到受控模式",
      "图片、音频、视频可以直接在页面内预览",
      "HEAD 与 Range 请求用来验证缓存与断点行为",
    ],
    language: "Python",
    api: "# 资源 URL 绑定到当前 webview。将它交给该视图的 img、video 或 fetch。\nresource = webview.resource(\"media/logo.png\", ttl_seconds=300)\nprint(resource.url)\n\n# 在有效期内可查询实际交付模式和回退原因。\nprint(resource.delivery_info)\n\n# 页面结束预览时调用 resource.close() 注销 URL。",
  },
  ipc: {
    kind: "ipc", title: "IPC 请求与响应", group: "通讯与事件", icon: "ipc",
    summary: "测量宿主与 WebView 之间的请求往返，验证批量调用与跨视图消息广播。",
    points: [
      "invoke 支持按正文大小测量往返耗时",
      "invokeBatch 一次提交多条命令",
      "消息可广播到所有本地视图，或发送给指定 ID",
    ],
    language: "JavaScript",
    api: "// 在 JadeView 的 WebView 中执行。playground 已由 Python 宿主注册。\nconst reply = await window.jade.invoke(\"playground\", {\n  action: \"echo\",\n  value: \"你好，JadeView\",\n});\nconsole.log(reply);\n\n// 一次提交两个请求。每项分别指定宿主通道和参数。\nconst replies = await window.jade.invokeBatch([\n  { command: \"playground\", payload: { action: \"echo\", value: 1 } },\n  { command: \"playground\", payload: { action: \"echo\", value: 2 } },\n]);\nconsole.log(replies);",
  },
  events: {
    kind: "events", title: "事件查看器", group: "通讯与事件", icon: "events",
    summary: "独立观察所有示例窗口与 WebView 的真实事件，包含来源 ID、请求 ID、序列号与错误码。",
    points: [
      "事件按来源类型与 Window / WebView ID 分类",
      "支持按事件名称实时筛选",
      "异步请求结果可以查询状态并释放",
    ],
    language: "C",
    api: "// on_event 按 JadeEventCallback 签名实现。回调结束后事件内的指针失效。\n// 需要异步保存事件时，在回调内复制名称与数据。\nuint64_t app_sub = on_app_event(JADE_EVENT_ALL, on_event, NULL);\nuint64_t win_sub = on_window_event(window_id, JADE_EVENT_ALL, on_event, NULL);\nuint64_t view_sub = on_webview_event(webview_id, JADE_EVENT_ALL, on_event, NULL);\n\n// 停止监听时分别取消订阅。释放 user_data 前等待取消请求完成。\nunsubscribe_event(app_sub);\nunsubscribe_event(win_sub);\nunsubscribe_event(view_sub);",
  },
  dialogs: {
    kind: "dialogs", title: "原生对话框", group: "系统集成", icon: "dialogs",
    summary: "调用系统原生的打开文件、保存路径与消息框对话框，结果原样回传页面。",
    points: [
      "对话框由操作系统绘制，不经过页面渲染",
      "多选、默认路径与按钮组按参数生效",
      "返回值直接以 JSON 显示，便于核对字段",
    ],
    language: "JavaScript",
    api: "// openFile 选择文件，multiSelections 允许一次选择多个。\nconst opened = await window.jade.dialog.showOpenDialog({\n  properties: [\"openFile\", \"multiSelections\"],\n});\nif (!opened.canceled) console.log(opened.filePaths);\n\n// 保存对话框返回路径。真正写入文件由宿主负责。\nconst saved = await window.jade.dialog.showSaveDialog({ defaultPath: \"example.txt\" });\nif (!saved.canceled) console.log(saved.filePath);\n\n// response 是按钮的下标。\nconst answer = await window.jade.dialog.showMessageBox({\n  type: \"info\", message: \"确认继续？\", buttons: [\"确定\", \"取消\"],\n});\nconsole.log(answer.response);",
  },
  tray: {
    kind: "tray", title: "通知与托盘", group: "系统集成", icon: "tray",
    summary: "发送系统通知并创建托盘图标；托盘右键会弹出多级菜单。",
    points: [
      "通知走系统通知中心，行为由系统策略决定",
      "托盘事件通过 tray-event 回传，菜单命令通过 menu-command 回传",
      "菜单支持子菜单、分隔线与快捷键标注",
    ],
    language: "C",
    api: "// 启用托盘时创建图标，再设置鼠标悬停提示。退出时用 tray_destroy 释放。\nuint32_t tray_id = tray_create();\nif (tray_id) tray_set_tooltip(tray_id, \"JadeView Playground\");\n\n// 收到 tray-event 的 right-click 时再调用此行。position 为 NULL 使用鼠标位置。\njade_menu_popup(window_id, items, item_count, NULL);\n// 选择自定义项后，menu-command 会返回 item_id。\n\n// 通知使用独立的系统 API。params 指向填好的 NotificationParams。\nshow_notification(&params);",
  },
  clipboard: {
    kind: "clipboard", title: "剪贴板", group: "系统集成", icon: "clipboard",
    summary: "读取与写入系统剪贴板的纯文本内容，不依赖浏览器的剪贴板权限。",
    points: [
      "读写由宿主的 C API 完成",
      "不触发浏览器的权限提示，也不需要页面处于焦点",
      "写入后可以直接在其它程序里粘贴验证",
    ],
    language: "C",
    api: "// 输入、输出都是 UTF-8 文本。缓冲区容量用字节数表示。\nclipboard_write_text(\"你好，JadeView\");\n\nchar buffer[1024] = {0};\nint32_t result = clipboard_read_text(buffer, sizeof(buffer));\n// 成功后使用 buffer。失败时可通过 jade_last_error_message 获取原因。",
  },
  storage: {
    kind: "storage", title: "YAML 持久化", group: "系统集成", icon: "storage",
    summary: "把示例值写入应用数据目录下的 YAML 文件，再读回来验证持久化路径。",
    points: [
      "数据落在当前应用的数据目录",
      "值按 JSON 序列化后存放，读回时还原类型",
      "可用于验证数据目录权限与多窗口共享",
    ],
    language: "C",
    api: "// 文件相对于 JadeView 的应用数据目录。点号用于访问 YAML 的嵌套键。\nyaml_set(\"playground.yaml\", \"example.value\", \"{\\\"enabled\\\":true}\");\n\n// 读回的是字符串。示例将其解析成 JSON 来恢复原始数据类型。\nchar buffer[256] = {0};\nif (yaml_get(\"playground.yaml\", \"example.value\", buffer, sizeof(buffer)) == 1) {\n    // 交给应用的 JSON 解析器。\n}",
  },
  runtime: {
    kind: "runtime", title: "运行环境", group: "系统集成", icon: "runtime",
    summary: "查看运行库版本、平台、显示器、路径与语言等环境信息。",
    points: [
      "信息由宿主一次性采集，页面只负责展示",
      "显示器信息包含工作区与缩放比例",
      "可用于排查 ABI、位数与路径差异",
    ],
    language: "C",
    api: "// 这些查询接收调用方提供的 UTF-8 缓冲区。读取结果后再复用缓冲区。\njadeview_version(buffer, capacity);  // JadeView 版本\nget_webview_version(buffer, capacity);  // 当前系统的 WebView 引擎\nget_displays_info(buffer, capacity);  // 显示器、工作区和缩放等 JSON 信息\ngetLocale(buffer, capacity);  // 系统语言",
  },
  permissions: {
    kind: "permissions", title: "权限决策", group: "权限与会话", icon: "permissions",
    summary: "控制摄像头与地理位置请求的处理策略，并在点击后真实请求一次设备权限。",
    points: [
      "权限处理器可设为浏览器默认、允许或拒绝",
      "设备权限只在用户主动点击后请求",
      "摄像头测试成功后立即停止媒体轨道",
    ],
    language: "C",
    api: "// id 是发起请求的视图，request 是该次请求的描述。\n// 返回 1 允许，-1 拒绝，0 交还浏览器。\nint32_t JADEVIEW_CALL on_permission(int32_t id, const char* request) {\n    // 实际应用按 WebView ID 和请求类型决定策略。\n    return 0;\n}\nset_webview_permission_handler(on_permission);\n\n// 创建视图时指定会话配置，挂载后页面才能主动请求设备权限。\nstruct WebViewSettings settings;\nwebview_settings_default(&settings, sizeof(settings));\nsettings.profile_name = \"permission-example\";\ncreate_webview(\"about:blank\", &settings);",
  },
  menubar: {
    kind: "menubar", title: "原生菜单栏", group: "菜单", icon: "menubar",
    summary: "打开窗口体验默认菜单栏，或安装自定义菜单查看点击事件。",
    points: ["默认菜单包括编辑、视图、窗口和帮助", "自定义项派发 menu-command"],
    language: "Python",
    api: `from jadeview_next import Menu

# runtime 和 window 已由 Playground 宿主初始化。
checked = True

def update_menu():
    # 菜单栏顶层必须是子菜单。菜单项 ID 会出现在点击回调里。
    menu = Menu.build_from_template(runtime, [
        {"label": "示例", "submenu": [
            {"id": "sample.hello", "label": "发送事件"},
            {"type": "separator"},
            {"id": "sample.checked", "label": "复选示例",
             "type": "checkbox", "checked": checked},
        ]},
    ])
    window.set_menu(menu)

def on_window_event(event):
    global checked
    if event["name"] == "menu-command" and event["data"]["item_id"] == "sample.checked":
        # 应用保存勾选状态，并用新模板更新菜单栏。
        checked = not checked
        update_menu()

# 宿主初始化完成后，订阅此窗口的事件并设置初始菜单。
runtime.subscribe("window", window.id, on_window_event)
update_menu()`,
  },
  contextmenu: {
    kind: "contextmenu", title: "网页右键菜单", group: "菜单", icon: "menubar",
    summary: "右键试用图片和字体图标、复制等内置动作，以及带点击事件的自定义菜单项。",
    points: ["模板按 WebView 设置", "自定义项派发 context-menu-click"],
    language: "Python",
    api: `# 给当前 WebView 设置菜单。字体路径应指向包含 U+2605 的字体。
webview.set_context_menu([
    {"id": "context.image", "label": "PNG 图标", "icon_path": "host/assets/playground.png"},
    {"id": "context.glyph", "label": "字体图标",
     "icon_path": font_path, "icon_codepoint": 0x2605},
    {"kind": "separator"},
    # 内置角色仍由 JadeView 执行，会按当前页面内容判断能否使用。
    {"role": "copy"},
    {"role": "selectAll"},
    # 自定义项由宿主接收 context-menu-click，再按 item_id 处理。
    {"id": "context.action", "label": "发送自定义事件"},
])

# 需要恢复系统生成的菜单时调用 webview.clear_context_menu()。`,
  },
  splash: {
    kind: "splash", title: "窗口启动画面", group: "窗口与标题栏", icon: "flags",
    summary: "在 Windows 上新建一个带启动画面的窗口，可调整最短显示时间、主题，并选择本地正方形图片作为 LOGO。",
    points: ["在创建窗口时通过 WindowFeatures 配置", "可传 PNG/ICO 路径或二进制数据"],
    language: "C",
    api: "// options、settings 和 features 是已经初始化的创建参数。\n// 在 features.splash 里设置启动画面，再创建带 WebView 的窗口。\ncreate_webview_window(url, 0, &options, &settings, &features);",
  },
  webpopup: {
    kind: "webpopup", title: "网页弹窗", group: "窗口与标题栏", icon: "dwm",
    summary: "通过 window.open 打开 JadeView 自绘弹窗，可设置网页地址和初始尺寸。",
    points: ["默认打开 JadeView 官网", "弹窗保持与发起页面的通讯关系"],
    language: "JavaScript",
    api: webPopupSource(),
  },
};

export const SAMPLE_FIELDS: Record<string, ReadonlyArray<SampleField>> = {
  dwm: ["size"],
  overlay: ["size", "material", "theme"],
  hidden: ["size"],
  frameless: ["size", "frameless"],
  theme: ["material", "theme"],
  flags: ["size", "position", "flags"],
  empty: ["title", "size"],
  splash: ["splash", "theme"],
};

export function sampleFields(kind: string): ReadonlyArray<SampleField> {
  return SAMPLE_FIELDS[kind] ?? [];
}

export function navGroupOf(kind: string): NavGroup | undefined {
  return NAV_GROUPS.find((group) => group.items.includes(kind));
}

