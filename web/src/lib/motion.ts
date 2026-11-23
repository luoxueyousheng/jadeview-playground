import type { Transition } from "motion/react";

/** Shared with the existing bottom sheet: gentle spring and iOS fade. */
export const SLIDE: Transition = { type: "spring", stiffness: 210, damping: 26, mass: 1 };
/**
 * 给 `useSpring` 用的尺寸曲线（与 SLIDE 同手感）。
 *
 * 为什么尺寸要另走 spring：motion 的 `layout` 动画在**横向拖窗口时被官方屏蔽**
 * （"Animations don't work during window resize"），所以响应式宽度只能靠动画数值本身。
 */
export const SIZE_SPRING = { stiffness: 210, damping: 26, mass: 1 };
export const FADE: Transition = { duration: 0.28, ease: [0.32, 0.72, 0, 1] };
/** 宽窄布局切换时轻柔的交叉淡化，避免封面与标题栏像闪现一样替换。 */
export const SWAP: Transition = { duration: 0.24, ease: [0.32, 0.72, 0, 1] };

/** 气泡轻微滞后、加速追赶，最后半像素利落收住；连续移动时保留当前速度。 */
export const FOLLOW = { stiffness: 520, damping: 40, mass: 0.85, restDelta: 0.5, restSpeed: 12 };
/** 尖尾跟随气泡本身，比气泡再慢一拍，停下后缓缓回正。 */
export const FOLLOW_TAIL = { stiffness: 260, damping: 30, mass: 1, restDelta: 0.05, restSpeed: 0.5 };
/**
 * 跨断点的位移与尺寸：**iOS 那种"快起、稳稳收住"**的曲线。
 *
 * 为什么不用原来自定义的那条 `ease: [0.32, 0.72, 0, 1]`：
 * 那条起步很冲、尾段拖得很长，跨度大时最后几十像素几乎是挪过去的，看着"不丝滑"。
 * iOS 的手感来自**临界阻尼的弹簧**：没有回弹（bounce: 0），但收尾干脆、不拖尾。
 * `visualDuration` 是感知时长（不是物理周期），0.38s 在桌面窗口上刚好——
 * 再长就黏，再短就"跳"。
 */
export const LAYOUT: Transition = { type: "spring", visualDuration: 0.38, bounce: 0 };
