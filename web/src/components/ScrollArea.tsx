import { createElement, forwardRef, useImperativeHandle, useLayoutEffect, useRef, type HTMLAttributes, type RefObject } from "react";
import { motion } from "motion/react";
import { OverlayScrollbars } from "overlayscrollbars";

/** 保留原滚动元素，不增加内容包装层，原有定位、原生滚动事件和 ref 均继续有效。 */
export function useScrollbars<T extends HTMLElement>(target: RefObject<T | null>, enabled = true) {
  useLayoutEffect(() => {
    const element = target.current;
    if (!element || !enabled) return;
    const instance = OverlayScrollbars({ target: element, elements: { viewport: element }, scrollbars: { slot: element } }, {
      overflow: { x: "hidden", y: "scroll" },
      scrollbars: {
        theme: "os-theme-qiling", autoHide: "move", autoHideDelay: 800,
        autoHideSuspend: false, dragScroll: true, clickScroll: "instant",
      },
    });
    return () => instance.destroy();
  }, [target, enabled]);
}

type ScrollAreaProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "ul" | "section";
  enabled?: boolean;
};

export const ScrollArea = forwardRef<HTMLElement, ScrollAreaProps>(function ScrollArea({ as = "div", enabled = true, ...props }, ref) {
  const element = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => element.current!, []);
  useScrollbars(element, enabled);
  return createElement(as, { ...props, ref: element, "data-scroll-area": enabled ? "" : undefined,
    "data-overlayscrollbars-initialize": enabled ? "" : undefined });
});

export const MotionScrollArea = motion.create(ScrollArea);
