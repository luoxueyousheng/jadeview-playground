/**
 * 主题落地。
 *
 * 设置里能选「跟随系统 / 深色 / 浅色」，但 CSS **只认一个 `data-theme` 属性**
 * （见 `style.css` 里 `:root[data-theme="dark"]` 那段注释）。
 * 所以「跟随系统」得由这里解析成具体的 light / dark 再落到属性上 ——
 * 好处是深色令牌只有一份，不用同时维护媒体查询和属性选择器两套。
 */

import { useEffect, useRef, useState } from "react";

import { hasBridge, jade } from "../bridge";
import { getPrefs, subscribePrefs, type SkinPref, type ThemePref } from "./prefs";
import { applyDocumentTheme } from "./themeTransition";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** 「跟随系统」在当前系统下应该落到哪个主题。 */
export function resolveTheme(pref: ThemePref): "dark" | "light" {
  if (pref === "dark" || pref === "light") {
    return pref;
  }
  return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

export function resolveHostTheme(theme: string | null | undefined): "dark" | "light" {
  const normalized = theme?.toLowerCase();
  if (normalized === "dark" || normalized === "light") return normalized;
  return resolveTheme("system");
}

function isHostManagedWindow(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("example") || document.body.classList.contains("is-pane");
}

/**
 * 把明暗主题和界面风格一起落到 `<html>`。
 *
 * `data-skin` 与 `data-theme` 正交（皮肤 × 明暗），但都放在同一个 "committing" 窗口里改：
 * 主样式里不少元素带 `background-color` 过渡，不抑制的话换皮肤那一下会全站渐隐渐现，
 * 和 View Transition 的圆形揭示叠在一起很脏。
 */
function apply(hostManaged: boolean): void {
  const root = document.documentElement;
  const skin = getPrefs().skin;
  const committing = root.hasAttribute("data-theme-committing");
  root.setAttribute("data-theme-committing", "");
  try {
    if (!hostManaged) {
      applyDocumentTheme(resolveTheme(getPrefs().theme));
    }
    if (skin === "clay") root.dataset.skin = "clay";
    else delete root.dataset.skin;
  } finally {
    if (!committing) root.removeAttribute("data-theme-committing");
  }
}

/** 启动时调一次：主窗口主题跟随用户偏好与系统，示例/子视图窗口由宿主下发主题。 */
export function startThemeSync(): void {
  const hostManaged = isHostManagedWindow();
  if (hostManaged) {
    const urlTheme = new URLSearchParams(window.location.search).get("theme");
    if (urlTheme) {
      applyDocumentTheme(resolveHostTheme(urlTheme));
    }
  }
  apply(hostManaged);
  let preference: ThemePref = getPrefs().theme;
  let skin: SkinPref = getPrefs().skin;
  subscribePrefs(() => {
    const next = getPrefs();
    if (next.theme === preference && next.skin === skin) return;
    preference = next.theme;
    skin = next.skin;
    apply(hostManaged);
  });
  // 系统切深色/浅色时，只有「跟随系统」才需要跟上
  window.matchMedia?.(DARK_QUERY).addEventListener("change", () => {
    if (!hostManaged && getPrefs().theme === "system") {
      apply(false);
    }
  });
}

/**
 * 示例窗口 / 子 WebView 的主题同步：
 * - 首帧读取 URL 参数 `?theme=`
 * - 运行期订阅宿主 `playground.theme` IPC（零延迟即时同步，跨独立 Profile 也有效）
 * - 快照里的 `windowTheme` 发生变化时同步兜底，并处理 `"System"` 跟随系统变化
 */
export function useHostWindowTheme(
  windowId: number | undefined,
  snapshotTheme: string | undefined,
  refresh?: () => Promise<void>,
): void {
  const [hostTheme, setHostTheme] = useState<string>(() => {
    const urlTheme = new URLSearchParams(window.location.search).get("theme");
    return urlTheme ?? "System";
  });
  const lastSnapshotTheme = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!snapshotTheme) return;
    if (snapshotTheme !== lastSnapshotTheme.current) {
      lastSnapshotTheme.current = snapshotTheme;
      setHostTheme(snapshotTheme);
    }
  }, [snapshotTheme]);

  useEffect(() => {
    if (!hasBridge()) return;
    return jade().on("playground.theme", (payload) => {
      if (!payload || typeof payload !== "object") return;
      const data = payload as { windowId?: number; theme?: string };
      if (typeof data.theme !== "string") return;
      if (windowId !== undefined && data.windowId !== undefined && data.windowId !== windowId) return;
      lastSnapshotTheme.current = data.theme;
      setHostTheme(data.theme);
      if (refresh) void refresh();
    });
  }, [windowId, refresh]);

  useEffect(() => {
    applyDocumentTheme(resolveHostTheme(hostTheme));
    if (hostTheme.toLowerCase() !== "system") return;
    const media = window.matchMedia?.(DARK_QUERY);
    if (!media) return;
    const sync = () => applyDocumentTheme(resolveHostTheme("System"));
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [hostTheme]);
}
