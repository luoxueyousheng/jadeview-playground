/**
 * 宿主桥接层（Host-agnostic）。
 *
 * 本前端可搭配任意编程语言的 JadeView 宿主（Python / Rust / Go / C / C# / Node.js 等）。
 * 默认通过 `window.jade.invoke(channel, { action, ...参数 })` 与宿主通信，
 * 回包统一为 `{ ok, result, error }`；也可通过 `registerHostTransport()` 注入自定义传输层。
 */

import type { LaunchOptions } from "./launch";
import type { TitlebarColors } from "./lib/titlebarStyle";

export interface Pane {
  id: number;
  label: string;
  parentId: number;
  state: number;
  visible: boolean;
  profile: string;
  bounds: string[];
}

export interface NativeWindow {
  id: number;
  kind: string;
  state: number;
  webviewIds: number[];
  theme: string;
  material: string;
  frameless: boolean;
  style: string;
  topmost: boolean;
  resizable: boolean;
  protected: boolean;
  fullscreen: boolean;
  components: Record<string, boolean>;
  titlebarHeight?: number;
  titlebarColors?: TitlebarColors;
  /** 创建时用的参数（宿主在 `spawn` 里回填），老窗口可能没有。 */
  title?: string;
  width?: number;
  height?: number;
  /** -1 表示当时交给系统决定。 */
  x?: number;
  y?: number;
  maximized?: boolean;
  splashDuration?: number | null;
  menuBarVisible?: boolean;
  customMenubar?: boolean;
  customContextMenu?: boolean;
}

export interface Snapshot {
  panes: Pane[];
  windows: NativeWindow[];
  controllerId: number;
  windowId: number;
  appWindowId: number;
  theme: string;
}

/**
 * 宿主在 `hello` 中返回的多语言描述信息（可选字段，向下兼容旧宿主）。
 * 任意编程语言宿主均可通过它向前端声明身份、能力边界、启动命令与示例代码。
 */
export interface HostDescriptor {
  /** 宿主语言标识，如 "python" | "rust" | "go" | "c" | "cpp" | "csharp" | "nodejs" */
  language: string;
  /** 展示名称，如 "Python 3.12" / "Rust (wry/jadeview)" / "Go 1.23" */
  name?: string;
  /** 宿主或语言绑定库版本 */
  version?: string;
  /** 宿主开发启动命令（在「关于」页展示） */
  launchCommand?: string;
  /** 宿主仓库或文档链接 */
  repository?: string;
  /** 宿主声明支持的动作或能力清单；缺省时默认支持全部基础能力 */
  capabilities?: string[];
  /** 不支持的示例映射：`{ [kind]: "不支持原因" }` */
  unsupportedExamples?: Record<string, string>;
  /** 宿主注入的示例代码覆盖：`{ [exampleKind]: { [languageLabel]: code } }` */
  codeSnippets?: Record<string, Record<string, string>>;
}

export interface RuntimeInfo {
  sourceId: number;
  windowId: number;
  version: string;
  engine: string;
  platform: string;
  win11: boolean;
  keepActiveBackdrop: boolean;
  pointerBits: number;
  snapshot: Snapshot;
  /** 多语言宿主描述信息（由宿主在 `hello` 中返回，缺省时前端回退为通用展示） */
  host?: HostDescriptor;
}

export interface NativeEvent {
  index: number;
  name: string;
  timeNs: string;
  sourceId?: string;
  sourceKind?: number;
  windowId?: number;
  webviewId?: number;
  sequence?: string;
  requestId?: string;
  state?: number;
  error?: number;
  data?: unknown;
}

export interface MenuSelection {
  name: "menu-command" | "context-menu-click";
  item_id: string;
  webview_id?: number;
  window_id?: number;
}

export interface ResourceInfo {
  url: string;
  name: string;
  bytes: number;
  delivery: {
    mode: "native" | "controlled";
    reason: number;
    native_error_code: number;
    message: string;
  };
  capabilities: unknown;
}

export interface DialogResult {
  canceled?: boolean;
  filePaths?: string[];
  filePath?: string;
  response?: number;
}

export interface Jade {
  invoke(channel: string, payload: unknown, options?: { timeout: number }): Promise<unknown>;
  invokeBatch(commands: { command: string; payload: unknown }[]): Promise<unknown[]>;
  on(name: string, callback: (payload: unknown) => void): () => void;
  dialog: {
    showOpenDialog(options: object): Promise<DialogResult>;
    showSaveDialog(options: object): Promise<DialogResult>;
    showMessageBox(options: object): Promise<DialogResult>;
  };
}

declare global {
  interface Window {
    jade?: Jade;
    __JADE_PLAYGROUND_CHANNEL__?: string;
  }
}

interface Response<T> {
  ok: boolean;
  result: T;
  error?: string;
}

let customTransport: Jade | null = null;

/**
 * 预留插槽：允许自定义宿主前端适配层替换默认 `window.jade` 传输对象
 * （例如 WebSocket 远程调试桥、测试替身或自定义通道包装）。
 */
export function registerHostTransport(transport: Jade | null): void {
  customTransport = transport;
}

export function getPlaygroundChannel(): string {
  if (typeof window === "undefined") return "playground";
  const fromQuery = new URLSearchParams(window.location.search).get("channel")?.trim();
  return fromQuery || window.__JADE_PLAYGROUND_CHANNEL__ || "playground";
}

export function hasBridge(): boolean {
  return Boolean(customTransport) || (typeof window !== "undefined" && !!window.jade);
}

export function jade(): Jade {
  if (customTransport) return customTransport;
  if (!window.jade) throw new Error("请通过 JadeView 宿主程序打开此页面");
  return window.jade;
}

export function hasCapability(runtime: RuntimeInfo | null | undefined, capability: string): boolean {
  const list = runtime?.host?.capabilities;
  if (!list) return true;
  return list.includes(capability);
}

export function getExampleSupport(
  runtime: RuntimeInfo | null | undefined,
  kind: string,
): { supported: boolean; reason?: string } {
  const hostReason = runtime?.host?.unsupportedExamples?.[kind];
  if (hostReason) return { supported: false, reason: hostReason };
  if ((kind === "splash" || kind === "webpopup") && runtime?.platform !== "Windows") {
    return { supported: false, reason: "此示例需要 Windows。" };
  }
  return { supported: true };
}

export async function rpc<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const response = await jade().invoke(getPlaygroundChannel(), { action, ...data });
  const result: Response<T> = typeof response === "string" ? JSON.parse(response) : (response as Response<T>);
  if (!result.ok) throw new Error(result.error || "宿主操作失败");
  return result.result;
}

/** 以 `action` 为单位收拢宿主命令，调用点只关心参数。 */
export const api = {
  hello: () => rpc<RuntimeInfo>("hello"),
  frontendBackground: (color: string) => rpc<boolean>("frontend.background", { color }),
  frontendReady: (elapsedNs: number) => rpc<boolean>("frontend.ready", { elapsedNs }),
  snapshot: () => rpc<Snapshot>("snapshot"),
  openExample: (example: string, options?: LaunchOptions) =>
    rpc<Snapshot>("example.open", { example, options }),
  events: (after: number) => rpc<NativeEvent[]>("events", { after }),

  addPane: (payload: Record<string, unknown>) => rpc<Snapshot>("pane.add", payload),
  layout: (payload: Record<string, unknown>) => rpc<string[][]>("layout", payload),
  customBounds: (id: number, bounds: string[]) => rpc<Snapshot>("layout.custom", { id, bounds }),
  panesVisible: (visible: boolean) => rpc<boolean>("panes.visible", { visible }),
  paneAction: (payload: Record<string, unknown>) => rpc<Snapshot | string>("pane.action", payload),

  windowComponents: (id: number, flags: Record<string, boolean>) =>
    rpc<boolean>("window.components", { id, ...flags }),
  windowStyle: (id: number, operation: string, data: Record<string, unknown> = {}) =>
    rpc<boolean>("window.style", { id, operation, ...data }),
  windowFocus: (id: number) => rpc<number>("window.focus", { id }),
  windowClose: (id: number) => rpc<number>("window.close", { id }),
  windowAttach: (id: number) => rpc<Snapshot>("window.attach", { id }),
  childAction: (operation: string) => rpc<number>("child.action", { operation }),

  echo: (value: unknown) =>
    rpc<{ value: unknown; utf8Bytes: number; webviewId: number; receivedNs: string }>("echo", { value }),
  message: (target: number, text: string) => rpc<{ targets: number[] }>("message", { target, text }),

  resourceOpen: (path: string) => rpc<ResourceInfo>("resource.open", { path }),
  resourceClose: (url: string) => rpc<boolean>("resource.close", { url }),
  mediaReport: (value: unknown) => rpc<boolean>("media.report", { value }),
  permission: (value: number) => rpc<boolean>("permission", { value }),
  menuInstall: () => rpc<boolean>("menu.install"),
  menuSelection: () => rpc<MenuSelection | null>("menu.selection"),
  contextMenu: (values: { mode: "default" | "sample" }) =>
    rpc<boolean>("context.configure", values),
  clipboardRead: () => rpc<string>("clipboard.read"),
  clipboardWrite: (text: string) => rpc<number>("clipboard.write", { text }),
  notification: (text: string) => rpc<number>("notification", { text }),
  tray: (enabled: boolean) => rpc<boolean>("tray", { enabled }),
  system: () =>
    rpc<{ displays: unknown; locale: string; paths: Record<string, string>; mount: unknown }>("system"),
  openExternal: (url: string) => rpc<boolean>("external.open", { url }),
  navState: () => rpc<{ canGoBack: boolean; canGoForward: boolean }>("nav.state"),
  navGo: (direction: "back" | "forward") => rpc<boolean>("nav.go", { direction }),
  storageSave: (value: unknown) => rpc<boolean>("storage.save", { value }),
  storageRead: () => rpc<unknown>("storage.read"),
};
