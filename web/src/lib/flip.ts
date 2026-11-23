/**
 * 自写 FLIP 用的**布局**盒子。
 *
 * ⚠️ 必须用 `offsetLeft/Top/Width/Height`，**不能**用 `getBoundingClientRect()`：
 * rect 是**视觉**盒子，包含当前 transform。FLIP 动画进行中再测量会拿到"动画中间态"，
 * 下一次补间的起点就错了——表现是元素先飞到莫名其妙的位置，再飞回来。
 * `offset*` 是布局值，不受 transform 影响，前后两帧相减才是真实位移。
 *
 * 官方推荐这种场景直接用 `layout` prop；这里自写是因为 motion 在**横向拖窗口时
 * 刻意屏蔽了 layout 动画**（性能取舍），详见 style.css 与组件里的注释。
 */
export interface LayoutBox { left: number; top: number; width: number; height: number }

export function layoutBox(node: HTMLElement): LayoutBox {
  return { left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight };
}

/** 位移/缩放是否小到不用补间（亚像素抖动不该启动动画）。 */
export function boxChanged(from: LayoutBox, to: LayoutBox): boolean {
  return Math.abs(from.left - to.left) > 0.5 || Math.abs(from.top - to.top) > 0.5
    || Math.abs(from.width / Math.max(to.width, 1) - 1) > 0.01
    || Math.abs(from.height / Math.max(to.height, 1) - 1) > 0.01;
}
