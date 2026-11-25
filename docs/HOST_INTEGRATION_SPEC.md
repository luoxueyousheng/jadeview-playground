# JadeView Playground 跨语言宿主集成规范

本文档定义 `web/` React 前端与任意编程语言宿主（**Python、Go、Rust、C/C++、C#、Node.js** 等）之间的通信协议、页面启动约定、多语言代码展示与前端插槽扩展接口。

遵循本规范的任意语言宿主，均可直接复用 `web/dist` 构建产物驱动完整的 Playground UI，无需修改前端源码。

---

## 1. 仓库目录与多语言 PR 结构规范

所有编程语言的宿主实现均统一放置于仓库根目录 `hosts/<lang>/` 下，共享前端 `web/`、静态资源 `assets/` 与动态库 `runtime/`；多语言目录与 PR 提交流程详见 [hosts/README.md](../hosts/README.md) 与 [CONTRIBUTING.md](../CONTRIBUTING.md)。

```text
jadeview-next-playground/
├── assets/playground.png                  # 跨语言共享图标/LOGO
├── hosts/
│   ├── _template/                         # 新语言宿主复制模板
│   ├── python/                            # Python 参考宿主（含 host.json + README.md）
│   └── <lang>/                            # PR 新增：Go / Rust / C# / C++ 等宿主源码
├── runtime/                               # 共享 JadeView.dll / libJadeView.so
└── web/
    └── src/hosts/languages/<lang>.ts      # PR 新增：该语言代码片段/API文档/插槽（Vite 自动发现）
```

## 2. 架构概览

```text
+-------------------------------------------------------------------+
|  任意语言宿主 (Go / Rust / Python / C / C# / Node.js + JadeView)    |
|  - 加载 web/dist 静态资源 (jade://... 或 dev URL)                   |
|  - 注册 IPC 通道 (默认 "playground") 并按 action 分发请求           |
|  - 通过 send_ipc_message 向受信任 WebView 推送事件与状态快照          |
+---------------------------------+---------------------------------+
                                  | window.jade.invoke / on
                                  v
+-------------------------------------------------------------------+
|  React Frontend (web/)                                            |
|  - bridge.ts: Host-agnostic RPC & HostDescriptor 协商             |
|  - hostSnippets.ts: 多语言参考代码映射 & 自动跟随宿主语言标签页       |
|  - slots.tsx: 标题栏 / 侧边栏 / 概览页 / 关于页 / 自定义示例插槽     |
+-------------------------------------------------------------------+
```

---

## 2. 页面 URL 参数与初始主题

宿主创建主窗口与示例窗口时，通过 URL Query 参数向前端传递初始上下文：

| 页面 | 参数 | 说明 |
| --- | --- | --- |
| `index.html` | `theme=light \| dark` | 初始主题提示，首屏渲染前同步 `data-theme`，避免白屏或闪烁 |
| `index.html` | `example=<kind>` | 存在时以独立示例窗口（`ExampleWindow`）模式渲染；缺省时为主控制台 |
| `index.html` | `surface=material` | 当窗口启用 Mica / Acrylic / Tabbed 等透明材质时必传，避免页面铺设不透明背景遮挡材质 |
| `index.html` / `pane.html` | `channel=<name>` | 可选。覆盖默认 IPC 通道名 `"playground"`（也可在注入脚本里设置 `window.__JADE_PLAYGROUND_CHANNEL__`） |
| `pane.html` | `label`, `theme`, `profile` | 多 WebView 工作区子视图参数，由宿主创建 Pane 时拼接 |

---

## 3. IPC 通道与安全边界

### 3.1 通道与请求/响应包格式

- 默认通道名：`"playground"`（可通过 `?channel=` 或 `window.__JADE_PLAYGROUND_CHANNEL__` 覆写）。
- 前端请求格式：`{ "action": "<action_name>", ...params }`
- 宿主统一回包格式（JSON 对象或 JSON 字符串）：

```json
{ "ok": true, "result": ... }
```

失败时返回：

```json
{ "ok": false, "error": "人类可读的错误说明" }
```

### 3.2 信任校验（推荐实现）

由于 `window.jade.invoke` 会对页面脚本暴露，**宿主的 `playground` IPC 处理器必须做来源鉴权**：
- 仅允许由宿主显式记录的受信任 `sourceId`（主窗口 + 内部 `pane.html` + `example` 窗口的受控 WebView）调用管理类动作。
- 若页面通过 `webpopup`（`window.open`）等打开第三方网页，第三方 WebView **不得**通过 `playground` 通道操控宿主窗口或读写文件/剪贴板。

---

## 4. `hello` 握手与 `HostDescriptor`

页面挂载后首先调用 `{ "action": "hello" }`，宿主返回 `RuntimeInfo`：

```jsonc
{
  "sourceId": 101,
  "windowId": 1,
  "version": "0.2.0",
  "engine": "132.0.2957.127",
  "platform": "Windows",
  "win11": true,
  "keepActiveBackdrop": true,
  "pointerBits": 64,
  "snapshot": {
    "windows": [],
    "panes": [],
    "controllerId": 101,
    "windowId": 1,
    "appWindowId": 1,
    "theme": "Dark"
  },
  "host": {
    "language": "go",
    "name": "Go 1.23 (jadeview-go)",
    "version": "0.2.0",
    "launchCommand": "go run ./cmd/playground",
    "repository": "https://github.com/tuyangJs/jadeview-playground",
    "capabilities": ["window", "ipc", "clipboard"],
    "unsupportedExamples": {
      "tray": "当前 Go 示例宿主的托盘回调尚未接入。"
    },
    "codeSnippets": {
      "dwm": {
        "Go": "jade.SetTitlebarComponents(windowID, true, true, true, true, true)"
      }
    }
  }
}
```

### `HostDescriptor` 字段说明（全部为可选，缺省时前端自动回退）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `language` | `string` | 宿主语言标识，如 `"python"` / `"go"` / `"rust"` / `"c"` / `"cpp"` / `"csharp"`。前端会在参考代码卡片中自动选中对应语言标签页 |
| `name` | `string` | 展示在「概览」徽章与「关于」页的宿主名称（例如 `"Go 1.23"`） |
| `version` | `string` | 宿主或语言绑定库版本号 |
| `launchCommand` | `string` | 若非空，在「关于」页展示“从命令行启动”命令卡片；编译型二进制宿主可直接省略 |
| `repository` | `string` | 展示在「关于」页的 GitHub / 源码仓库链接 |
| `capabilities` | `string[]` | 声明宿主能力清单；`hasCapability(runtime, cap)` 可供示例组件或插件判断 |
| `unsupportedExamples` | `Record<string, string>` | `{ [kind]: "不支持原因" }`。命中时示例启动按钮自动禁用并在底部展示原因说明 |
| `codeSnippets` | `Record<string, Record<string, string>>` | 宿主运行时注入或覆盖某示例的参考代码：`{ [kind]: { [Language]: code } }` |

---

## 5. 全量 `action` 清单

### 5.1 生命周期与窗口控制
| `action` | 请求参数 | 返回 `result` | 说明 |
| --- | --- | --- | --- |
| `hello` | — | `RuntimeInfo` | 初始化握手与宿主描述信息 |
| `snapshot` | — | `Snapshot` | 获取当前所有窗口、Pane 与主题状态 |
| `frontend.background` | `{ color: "#rrggbb" }` | `boolean` | 同步原生窗口背景色，消除拖拽/缩放边缘闪烁 |
| `frontend.ready` | `{ elapsedNs: number }` | `boolean` | 通知宿主首帧可交互耗时 |
| `example.open` | `{ example: string, options?: LaunchOptions }` | `Snapshot` | 打开或复用指定 `kind` 的示例窗口 |
| `window.components` | `{ id: number, back, refresh, icon, min, max }` | `boolean` | 设置标题栏原生按钮开关 |
| `window.style` | `{ id: number, operation: string, ... }` | `boolean` | 切换 `theme` / `backdrop` / `frameless` / `titlebar` / `resizable` / `topmost` / `fullscreen` 等 |
| `window.focus` | `{ id: number }` | `number` | 激活并前置指定示例窗口 |
| `window.close` | `{ id: number }` | `number` | 关闭指定示例窗口 |
| `window.attach` | `{ id: number }` | `Snapshot` | 为 `empty` 空窗口挂载默认 WebView |
| `child.action` | `{ operation: string }` | `number` | 子窗口自定义标题栏按钮动作（`minimize` / `maximize` / `close`） |
| `nav.state` | — | `{ canGoBack: boolean, canGoForward: boolean }` | 查询当前 WebView 历史栈状态 |
| `nav.go` | `{ direction: "back" \| "forward" }` | `boolean` | 控制当前 WebView 后退 / 前进 |

### 5.2 多 WebView 工作区（Layout）
| `action` | 请求参数 | 返回 `result` |
| --- | --- | --- |
| `pane.add` | `{ label?, url?, profile?, bounds? }` | `Snapshot` |
| `layout` | `{ kind, gap?, bounds? ... }` | `string[][]` |
| `layout.custom` | `{ id: number, bounds: string[] }` | `Snapshot` |
| `panes.visible` | `{ visible: boolean }` | `boolean` |
| `pane.action` | `{ operation, id?, ... }` | `Snapshot \| string` |

### 5.3 通讯、事件与系统集成
| `action` | 请求参数 | 返回 `result` |
| --- | --- | --- |
| `events` | `{ after: number }` | `NativeEvent[]` |
| `echo` | `{ value: unknown }` | `{ value, utf8Bytes, webviewId, receivedNs }` |
| `message` | `{ target: number, text: string }` | `{ targets: number[] }` |
| `resource.open` | `{ path: string }` | `ResourceInfo` |
| `resource.close` | `{ url: string }` | `boolean` |
| `media.report` | `{ value: unknown }` | `boolean` |
| `permission` | `{ value: number }` | `boolean` |
| `menu.install` | — | `boolean` |
| `menu.selection` | — | `MenuSelection \| null` |
| `context.configure` | `{ mode: "default" \| "sample" }` | `boolean` |
| `clipboard.read` | — | `string` |
| `clipboard.write` | `{ text: string }` | `number` |
| `notification` | `{ text: string }` | `number` |
| `tray` | `{ enabled: boolean }` | `boolean` |
| `system` | — | `{ displays, locale, paths, mount }` |
| `external.open` | `{ url: string }` | `boolean`（宿主仅允许 `http://` / `https://` 使用系统浏览器打开） |
| `storage.save` | `{ value: unknown }` | `boolean` |
| `storage.read` | — | `unknown` |

---

## 6. 宿主主动推送事件（`window.jade.on`）

宿主可通过 `send_ipc_message` 向页面推送以下内置事件通道：

- `playground:snapshot`：窗口列表、Pane 或全局主题变化时推送最新 `Snapshot`，避免轮询延迟。
- `playground:event`：`NativeEvent` 增量推送，供「事件查看器」实时刷新。
- `playground:message`：跨 WebView 消息广播 `{ from, target, text }`。

---

## 7. 前端预留插槽（Slots）与扩展点

对于需要在现有 UI 上追加语言专属功能、入口按钮或自定义示例页的集成方，前端在以下模块预留了强类型插槽：

### 7.1 UI 组件插槽：`web/src/slots.tsx`

可通过 `registerPlaygroundSlots(...)` 或在页面加载前向 `window.__JADE_PLAYGROUND_SLOTS__` 注入扩展：

| 插槽键 | 挂载位置 | 参数上下文 |
| --- | --- | --- |
| `titlebarActions` | 主窗口标题栏搜索框右侧 | `{ runtime }` |
| `sidebarHeader` | 侧边栏导航列表顶部 | `{ runtime, collapsed }` |
| `sidebarFooterBeforeTheme` | 侧边栏底部主题切换器上方 | `{ runtime, collapsed }` |
| `overviewHeroExtra` | 概览页 Hero 区域下方 | `{ runtime }` |
| `aboutHostRows` | 「关于」页宿主信息卡片追加行 | `{ runtime }` -> `{ label, value }[]` |
| `customNavGroups` | 追加侧边栏一级分组 `{ id, label, icon, items }` | — |
| `customExamples` | 注册新示例元数据 `Record<string, ExampleMeta>` | — |
| `customDemos` | 注册新示例交互面板 `Record<string, ComponentType<DemoSlotProps>>` | `{ runtime, theme }` |

示例（前端定制入口）：

```tsx
import { registerPlaygroundSlots } from "./slots";

registerPlaygroundSlots({
  aboutHostRows: ({ runtime }) => [
    { label: "绑定库", value: runtime.host?.name ?? "Custom Host" },
  ],
  customNavGroups: [
    { id: "go-extra", label: "Go 专属扩展", icon: "ipc", items: ["goroutine-ipc"] },
  ],
  customExamples: {
    "goroutine-ipc": {
      kind: "goroutine-ipc",
      title: "Goroutine 并发调用",
      group: "Go 专属扩展",
      icon: "ipc",
      summary: "验证 Go 宿主并发 goroutine 向 WebView 推送消息的顺序性。",
      points: ["无锁通道派发", "UI 线程安全同步"],
      language: "Go",
      api: "// Go 示例代码...",
    },
  },
});
```

### 7.2 传输层与通道插槽：`web/src/bridge.ts`

- `registerHostTransport(transport: Jade | null)`：可替换默认 `window.jade`（适用于远程 WebSocket 桥接、单测 Mock 或特殊语言胶水层）。
- `getPlaygroundChannel()`：依次读取 `?channel=`、`window.__JADE_PLAYGROUND_CHANNEL__`，默认 `"playground"`。

### 7.3 多语言参考代码与语言模块自动注册：`web/src/hosts/`

- **推荐方式（PR 零冲突）**：新增 `web/src/hosts/languages/<lang>.ts`（参考 `_template.ts`），`web/src/hosts/index.ts` 通过 `import.meta.glob("./languages/*.ts", { eager: true })` 在前端启动时自动注册其中的 `snippets`、`apiReference` 与 `slots`，无需修改任何共享注册文件。
- 也可通过 `registerLanguageSnippets(kind, { Go, Rust, Python, C, ... })`、`registerApiReference(language, entries)` 或在宿主 `hello.host.codeSnippets` 中动态下发。
- `SourceCode` 组件已内置 `c / cpp / go / rust / python / javascript / typescript / csharp` 语法高亮，并自动优先选中与 `hello.host.language` 一致的标签页。
