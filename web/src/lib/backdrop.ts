/**
 * 窗口背景材质的**首帧提示**。
 *
 * 真源在宿主：它建窗时就要按上次的选择决定用亚克力还是铺不透明基底，改的时候也走 IPC
 * （DWM 材质前端碰不到）。这里在 localStorage 留一份**只为首帧服务**的副本——
 * 否则启动那一下页面还是透明的，模拟云母模式会先透出桌面、等状态回来才变实。
 *
 * 两侧的取值必须一致：宿主用 `Acrylic` / `Solid`，Solid 是模拟云母的基底，保留原偏好格式。
 */

export type Backdrop = "Acrylic" | "Solid";

const KEY = "tf3mm.backdrop";

/**
 * 把背景材质落到页面上。
 *
 * 雾色 → 在 `<html>` 上打 `data-backdrop="solid"`，CSS 据此混合品牌色基底和雾面纹理；
 * 亚克力 → **去掉这个属性**，页面保持透明，系统毛玻璃才透得出来。
 */
export function applyBackdrop(value: Backdrop): void {
  const root = document.documentElement;
  if (value === "Acrylic") {
    delete root.dataset.backdrop;
  } else {
    root.dataset.backdrop = "solid";
  }
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // 存不了就算了：这只影响下一次启动的第一帧，功能本身不受影响
  }
}

/** 启动时按上次的值先铺一帧（拿不到就不动，等宿主的状态回来再说）。 */
export function startBackdropSync(): void {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "Acrylic" || raw === "Solid") applyBackdrop(raw);
  } catch {
    // 隐私模式 / 存储被禁：忽略
  }
}
