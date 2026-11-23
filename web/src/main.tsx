import { createRoot } from "react-dom/client";
import { useLayoutEffect } from "react";

import "overlayscrollbars/styles/overlayscrollbars.css";
import "./style.css";
import "./playground.css";
import App from "./App";
import { startThemeSync } from "./lib/theme";
import { usePrefs } from "./lib/prefs";

const host = document.getElementById("root");
if (!host) {
  throw new Error("缺少挂载点 #root");
}

// 主题先落到 <html data-theme> 再渲染；「跟随系统」由 lib/theme 持续订阅。
startThemeSync();

/**
 * 不开 StrictMode：示例里的 effect 会真的去创建视图、订阅事件，开发环境跑两遍
 * 会让「添加视图」变成建两个，现场和发行版不一致。
 */
function DesktopApp() {
  const { reduceMotion, colorWeakMode } = usePrefs();
  useLayoutEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduceMotion);
    document.documentElement.toggleAttribute("data-color-weak", colorWeakMode);
  }, [reduceMotion, colorWeakMode]);
  return <App />;
}

createRoot(host).render(<DesktopApp />);
