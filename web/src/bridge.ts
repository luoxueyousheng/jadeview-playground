/**
 * 宿主桥接层。
 *
 * 页面由 Python 宿主通过 JadeView 的自定义协议提供，所有能力都走 `jade.invoke`：
 * 请求体是 `{ action, ...参数 }`，回包统一是 `{ ok, result, error }`。
 * 这里只做「拆包 + 类型标注」，不放业务判断。
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
  }
}

interface Response<T> {
  ok: boolean;
  result: T;
  error?: string;
}

export function hasBridge(): boolean {
  return typeof window !== "undefined" && !!window.jade;
}

export function jade(): Jade {
  if (!window.jade) throw new Error("请通过 Python 宿主打开此页面（python run.py）");
  return window.jade;
}

export async function rpc<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const response = await jade().invoke("playground", { action, ...data });
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
  storageSave: (value: unknown) => rpc<boolean>("storage.save", { value }),
  storageRead: () => rpc<unknown>("storage.read"),
};
