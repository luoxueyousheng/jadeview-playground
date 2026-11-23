/**
 * 顶部提示条。宿主那边的 toast 是"自己会消失"的那种，这里同样自动回收。
 *
 * ## 同一条提示重复触发时
 *
 * 控制器那边**不会新增第二条**（见 `controller.ts` 的 `toast()`），只把同一条的
 * `bump` 加一、并把它的消失时间重置。这里负责把这件事**演出来**：
 * `bump` 一变就在原位抖一下 —— 既补上了"不再叠一条"留下的空档，
 * 也告诉用户"刚才那下是有反应的"。
 *
 * ## 出入场
 *
 * 入场从标题栏下方落下、出场往回升上去再淡掉，**位移方向对称**。
 * 入库用弹簧（阻尼比 ≈ 0.87、响应约 0.36s）：这是 iOS 弹层的参数区间 ——
 * 快、收得干净、不晃。出场比入场短（0.2s）且走缓动：要消失的东西不该拖。
 *
 * ## 入场动画为什么从 CSS 挪到了 motion
 *
 * 原来 `.toast` 上挂着 `animation: toast-in`，那条关键帧动的也是 `transform`。
 * motion 抖动用的是 `transform: translateX(...)` —— 两者会打架：
 * **CSS 动画运行期间会压过 inline 的 transform**，于是刚弹出 0.22 秒内撞上重复触发，
 * 那一下抖动会被整个吃掉。而"连点按钮"恰恰就发生在这段时间里。
 * 现在整套 transform（入场 + 抖动 + 出场）都归 motion 排，不再有先后之争。
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotionConfig, type Transition } from "motion/react";

import type { Toast } from "../toast";

/** 抖动幅度（px）。只做横向：纵向容易和"飘下来/升上去"挤在一起看混。 */
const SHAKE = [0, -6, 6, -4, 4, -2, 0];

/** 出入场的位移（px）：从标题栏下方落下、往标题栏方向收回，方向对称。 */
const OFFSET = 14;

/** 入场：阻尼比 ≈ 0.87、响应 ≈ 0.36s —— 快、收得干净、不晃。 */
const ENTER: Transition = { type: "spring", stiffness: 300, damping: 30, mass: 1 };
/** 出场：比入场短，走缓动（要消失的东西不该拖）。 */
const EXIT: Transition = { duration: 0.2, ease: [0.32, 0.72, 0, 1] };

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    // 读屏可达：新的提示要主动播报，但不能打断用户正在读的内容 → polite
    <div className="toast-host" role="status" aria-live="polite" aria-atomic="false">
      {/* 有 AnimatePresence 才跑得出场动画：列表里少了谁，它先留着把 exit 演完再摘 */}
      <AnimatePresence>
        {toasts.map((item) => (
          <ToastItem key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ item }: { item: Toast }) {
  const reduceMotion = useReducedMotionConfig();
  const controls = useAnimationControls();
  /** 上一次见到的 bump。**刻意不放进 state**：它只用来判断"要不要抖"，不该引起重渲染。 */
  const seenBump = useRef(item.bump);

  // 入场：只在挂载时跑一次
  useEffect(() => {
    controls.stop();
    void controls.start({ opacity: 1, y: 0, x: 0 }, reduceMotion ? { duration: 0 } : ENTER);
  }, [controls, reduceMotion]);

  // 重复触发：原位抖一下
  useEffect(() => {
    if (item.bump === seenBump.current) {
      return;
    }
    seenBump.current = item.bump;
    if (reduceMotion) return;
    void controls.start({ x: SHAKE }, { duration: 0.42, ease: "easeInOut" });
  }, [item.bump, controls, reduceMotion]);

  return (
    <motion.div
      className={`toast toast--${item.kind}`}
      // `position` 而不是整体 layout：只跟着兄弟的进出挪位，不参与缩放，
      // 免得文字在动画里被拉变形。没有它的话，上面一条被收走时其余的会"啪"地跳下去。
      layout="position"
      initial={{ opacity: 0, y: reduceMotion ? 0 : -OFFSET }}
      animate={controls}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -OFFSET, transition: EXIT }}
    >
      {item.message}
    </motion.div>
  );
}
