/** 示例编号 → 页面组件。只有需要页面的示例才在这里登记（空窗口由宿主直接创建）。 */

import type { ComponentType } from "react";

import { EventsDemo, IpcDemo } from "./comm";
import { ResourcesDemo } from "./data";
import { LayoutDemo } from "./layout";
import { ContextMenuDemo, MenubarDemo } from "./menus";
import { PermissionsDemo } from "./session";
import { ClipboardDemo, DialogsDemo, RuntimeDemo, StorageDemo, TrayDemo } from "./system";
import { SplashDemo } from "./splash";
import type { DemoProps } from "./types";
import { WebPopupDemo } from "./webPopup";
import { DwmDemo, FlagsDemo, FramelessDemo, HiddenDemo, OverlayDemo, ThemeDemo } from "./window";

export const DEMOS: Record<string, ComponentType<DemoProps>> = {
  dwm: DwmDemo,
  overlay: OverlayDemo,
  hidden: HiddenDemo,
  frameless: FramelessDemo,
  theme: ThemeDemo,
  flags: FlagsDemo,
  layout: LayoutDemo,
  resources: ResourcesDemo,
  ipc: IpcDemo,
  events: EventsDemo,
  dialogs: DialogsDemo,
  tray: TrayDemo,
  clipboard: ClipboardDemo,
  storage: StorageDemo,
  runtime: RuntimeDemo,
  permissions: PermissionsDemo,
  menubar: MenubarDemo,
  contextmenu: ContextMenuDemo,
  splash: SplashDemo,
  webpopup: WebPopupDemo,
};
