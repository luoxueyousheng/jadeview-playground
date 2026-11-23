/**
 * 主题切换的「圆形揭示」。
 *
 * 为什么只能用 View Transitions：要让"新界面在圆内、旧界面在圆外"，必须**同时存在
 * 两份渲染结果**。单份 DOM 做不到——纯色圆盘铺开只是遮罩，不是揭示。
 * 浏览器只有在 View Transition 期间才会为旧画面留一张合成器快照。
 *
 * 两个关键坑（上一版就是踩了第一个）：
 *   1. **不要在回调里 await**。`startViewTransition` 的回调会一直挂着等 Promise，
 *      「等两帧让 React 提交」会变成几十上百毫秒的卡顿，看起来就是"点了没反应"。
 *      这里改成在回调里**同步**改 `<html data-theme>`，React 之后自己追平；
 *   2. `transition.ready` 可能永远不 resolve（内核支持 API 但快照失败）。
 *      所以挂了超时兜底：到点还没 ready 就当作没有过渡，界面已经是新主题，不会卡。
 */

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

export type ThemeSwitchOrigin = { x: number; y: number };

export function applyDocumentTheme(theme: "dark" | "light"): void {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  // Commit surfaces and text together before View Transition captures the new frame.
  const committing = root.hasAttribute("data-theme-committing");
  root.setAttribute("data-theme-committing", "");
  try {
    root.dataset.theme = theme;
    void root.offsetWidth;
  } finally {
    if (!committing) root.removeAttribute("data-theme-committing");
  }
}

/** 主题偏好是否解析为深色（`system` 跟随系统） */
export function resolvesDark(theme: string): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * 以 `origin` 为圆心扩散到整窗。
 *
 * @param apply 真正落主题的回调（更新偏好 / 通知宿主的都放这里）
 * @param reducedMotion 为真时直接切换，不做过渡
 */
export function revealTheme(
  theme: string,
  apply: () => void,
  options: { origin?: ThemeSwitchOrigin; reducedMotion?: boolean } = {},
): void {
  const doc = document as DocumentWithViewTransition;
  const start = doc.startViewTransition;

  /**
   * 真正把主题落到 DOM 上。
   *
   * **所有分支都必须走它**——包括降级分支。
   * 之前的 bug：降级（减弱动效 / 不支持 API）只调了 `apply()`，
   * 而标题栏那颗临时切换按钮的 `apply` 只更新 React 状态、不碰 `data-theme`，
   * 于是"开了减弱动效后按钮点了没反应"。设置面板没暴露这个问题，
   * 只是因为它的 `apply` 会走 `onTheme` 让上层去落主题。
   */
  const applyTheme = () => {
    applyDocumentTheme(resolvesDark(theme) ? "dark" : "light");
    apply();
  };

  /*
   * 生效主题没变就别动画。
   *
   * 典型场景：「跟随系统」下系统本来就是深色，用户再点「深色」——
   * 偏好值变了、**画面一点没变**。这时播扩散只是空转，用户看到的是
   * "闪了一下但什么都没发生"。所以这里比的是**当前生效的深浅**，不是偏好字符串。
   */
  const alreadyDark = document.documentElement.dataset.theme === "dark";
  if (alreadyDark === resolvesDark(theme)) {
    applyTheme();
    return;
  }

  if (options.reducedMotion || typeof start !== "function") {
    applyTheme();
    return;
  }

  const x = options.origin?.x ?? window.innerWidth / 2;
  const y = options.origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const clip = (r: number) => `circle(${r}px at ${x}px ${y}px)`;

  let transition: ViewTransitionLike;
  try {
    transition = start.call(doc, () => {
      /*
       * 同步落地：View Transition 拍"新画面"的时机就在这个回调返回之后，
       * 所以主题必须在这里已经生效——不能等 React 的 setState 渲染。
       * React 那边随后会写同样的值，不会产生第二次跳变。
       */
      applyTheme();
    });
  } catch {
    // 内核报错（例如正处在另一个过渡里）：退化成直接切换，同样要走 applyTheme
    applyTheme();
    return;
  }
  /*
   * 兜底：`ready` 迟迟不来（快照失败/被取消）时不要留下半截状态。
   * 界面此时已经是新主题，用户最多是"没有动画"，而不是"点了没反应"。
   */
  const guard = window.setTimeout(() => {
    /* 只清理计时器；过渡自己会结束 */
  }, 1200);

  transition.ready
    .then(() => {
      window.clearTimeout(guard);
      document.documentElement.animate(
        {
          // 三段：先在点击处停一个小圆，方向看得清，再扩散满屏
          clipPath: [clip(0), clip(140), clip(radius)],
        },
        {
          duration: 620,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      window.clearTimeout(guard);
    });
}
