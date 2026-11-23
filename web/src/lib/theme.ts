/**
 * 主题落地。
 *
 * 设置里能选「跟随系统 / 深色 / 浅色」，但 CSS **只认一个 `data-theme` 属性**
 * （见 `style.css` 里 `:root[data-theme="dark"]` 那段注释）。
 * 所以「跟随系统」得由这里解析成具体的 light / dark 再落到属性上 ——
 * 好处是深色令牌只有一份，不用同时维护媒体查询和属性选择器两套。
 */

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

/**
 * 把明暗主题和界面风格一起落到 `<html>`。
 *
 * `data-skin` 与 `data-theme` 正交（皮肤 × 明暗），但都放在同一个 "committing" 窗口里改：
 * 主样式里不少元素带 `background-color` 过渡，不抑制的话换皮肤那一下会全站渐隐渐现，
 * 和 View Transition 的圆形揭示叠在一起很脏。
 */
function apply(): void {
  const root = document.documentElement;
  const skin = getPrefs().skin;
  const committing = root.hasAttribute("data-theme-committing");
  root.setAttribute("data-theme-committing", "");
  try {
    applyDocumentTheme(resolveTheme(getPrefs().theme));
    if (skin === "clay") root.dataset.skin = "clay";
    else delete root.dataset.skin;
  } finally {
    if (!committing) root.removeAttribute("data-theme-committing");
  }
}

/** 启动时调一次：主题落到 `<html>` 上，并在「跟随系统」时一直跟着系统走。 */
export function startThemeSync(): void {
  apply();
  let preference: ThemePref = getPrefs().theme;
  let skin: SkinPref = getPrefs().skin;
  subscribePrefs(() => {
    const next = getPrefs();
    if (next.theme === preference && next.skin === skin) return;
    preference = next.theme;
    skin = next.skin;
    apply();
  });
  // 系统切深色/浅色时，只有「跟随系统」才需要跟上
  window.matchMedia?.(DARK_QUERY).addEventListener("change", () => {
    if (getPrefs().theme === "system") {
      apply();
    }
  });
}
