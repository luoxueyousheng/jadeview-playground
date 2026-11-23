import { createRoot } from "react-dom/client";
import { MotionConfig, useReducedMotion } from "motion/react";

import "overlayscrollbars/styles/overlayscrollbars.css";
import "./style.css";
import "./playground.css";
import { Pane } from "./pages/Pane";
import { startThemeSync } from "./lib/theme";
import { getPrefs, usePrefs } from "./lib/prefs";

const host = document.getElementById("root");
if (!host) throw new Error("缺少挂载点 #root");

startThemeSync();

function PaneSurface() {
  const { reduceMotion } = usePrefs();
  const systemReduceMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion={reduceMotion || systemReduceMotion ? "always" : "never"}>
      <Pane />
    </MotionConfig>
  );
}

// 首帧先把当前偏好的减弱动效落到 <html>，和主窗口保持一致
document.documentElement.dataset.reducedMotion = String(getPrefs().reduceMotion);

createRoot(host).render(<PaneSurface />);
