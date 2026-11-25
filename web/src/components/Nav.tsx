import { AnimatePresence, animate, motion, useMotionValue, useReducedMotionConfig, useTransform, type Transition } from "motion/react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { FADE, LAYOUT } from "../lib/motion";
import { examplePath } from "../routing/routes";

const IMMEDIATE: Transition = { duration: 0 };
const INDICATOR_HEIGHT = 16;
const MAX_INDICATOR_HEIGHT = 38;
const LEAD_SPRING: Transition = { type: "spring", stiffness: 620, damping: 42, mass: 0.72 };
const TRAIL_SPRING: Transition = { type: "spring", stiffness: 440, damping: 36, mass: 0.86, delay: 0.018 };
const LEFT_SPRING: Transition = { type: "spring", stiffness: 480, damping: 36 };

export interface NavChild {
  id: string;
  label: string;
}

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: ReactNode;
  children?: ReadonlyArray<NavChild>;
}

export function Nav({
  items,
  activePath,
  activeGroup,
  activeExample,
  onNavigate,
  openKinds,
  collapsed = false,
  header,
  footerTop,
  footer,
}: {
  items: ReadonlyArray<NavItem>;
  activePath: string;
  activeGroup: string | null;
  activeExample: string | null;
  onNavigate: (path: string) => void;
  openKinds: ReadonlySet<string>;
  collapsed?: boolean;
  header?: ReactNode;
  footerTop?: ReactNode;
  footer?: ReactNode;
}) {
  const groupId = useId();
  const reduceMotion = useReducedMotionConfig();
  const layoutTransition = reduceMotion ? IMMEDIATE : LAYOUT;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  );
  const [flyout, setFlyout] = useState<{ item: NavItem; anchor: HTMLElement } | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // 通过搜索或浏览器历史直接进入示例时，也显示它所属的分组。
  useEffect(() => {
    if (!activeGroup) return;
    setExpanded((current) => (current.has(activeGroup) ? current : new Set([...current, activeGroup])));
  }, [activeExample, activeGroup]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== undefined) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setFlyout(null);
    }, 160);
  }, [clearCloseTimer]);

  const openFlyout = useCallback((item: NavItem, anchor: HTMLElement) => {
    clearCloseTimer();
    if (!collapsed || !item.children?.length) {
      setFlyout(null);
      return;
    }
    setFlyout({ item, anchor });
  }, [clearCloseTimer, collapsed]);

  useEffect(() => {
    if (!collapsed) {
      clearCloseTimer();
      setFlyout(null);
    }
  }, [collapsed, clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (!flyout) return;
    const close = () => setFlyout(null);
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!flyoutRef.current?.contains(target) && !flyout.anchor.contains(target)) close();
    };
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [flyout]);

  // Windows 11 NavigationView 激活条：前缘先到、尾端延迟追赶，移动时适度拉长尾部。
  const indicatorTop = useMotionValue(0);
  const indicatorBottom = useMotionValue(INDICATOR_HEIGHT);
  const indicatorLeft = useMotionValue(0);
  const movingDownRef = useRef(true);
  const indicatorY = useTransform(
    [indicatorTop, indicatorBottom],
    ([top, bottom]: number[]) =>
      movingDownRef.current ? Math.max(top, bottom - MAX_INDICATOR_HEIGHT) : top,
  );
  const indicatorHeight = useTransform(
    [indicatorTop, indicatorBottom],
    ([top, bottom]: number[]) => Math.min(MAX_INDICATOR_HEIGHT, Math.max(INDICATOR_HEIGHT, bottom - top)),
  );
  const [indicatorVisible, setIndicatorVisible] = useState(false);
  const indicatorTarget = useRef<{ key: string; top: number; left: number } | null>(null);
  const indicatorAnimations = useRef<Array<{ stop: () => void }>>([]);

  const stopIndicatorAnimations = useCallback(() => {
    for (const anim of indicatorAnimations.current) anim.stop();
    indicatorAnimations.current = [];
  }, []);

  useEffect(() => () => stopIndicatorAnimations(), [stopIndicatorAnimations]);

  const activeTargetKey = `${activePath}|${activeGroup ?? ""}|${activeExample ?? ""}|${collapsed}|${[...expanded].sort().join(",")}`;

  const measureSelected = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return null;
    const target = nav.querySelector<HTMLElement>('[data-selected="true"]');
    if (!target) return null;
    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = targetRect.top - navRect.top + (targetRect.height - INDICATOR_HEIGHT) / 2;
    return {
      top,
      bottom: top + INDICATOR_HEIGHT,
      left: targetRect.left - navRect.left,
    };
  }, []);

  useLayoutEffect(() => {
    const rect = measureSelected();
    if (!rect) {
      setIndicatorVisible(false);
      indicatorTarget.current = null;
      return;
    }
    setIndicatorVisible(true);
    const previous = indicatorTarget.current;
    indicatorTarget.current = { key: activeTargetKey, top: rect.top, left: rect.left };

    if (!previous || reduceMotion) {
      stopIndicatorAnimations();
      indicatorTop.set(rect.top);
      indicatorBottom.set(rect.bottom);
      indicatorLeft.set(rect.left);
      return;
    }

    const delta = rect.top - previous.top;
    if (Math.abs(delta) < 1 && Math.abs(rect.left - previous.left) < 1) {
      return;
    }

    stopIndicatorAnimations();
    const movingDown = delta >= 0;
    movingDownRef.current = movingDown;
    const topAnim = animate(indicatorTop, rect.top, movingDown ? TRAIL_SPRING : LEAD_SPRING);
    const bottomAnim = animate(indicatorBottom, rect.bottom, movingDown ? LEAD_SPRING : TRAIL_SPRING);
    const leftAnim = animate(indicatorLeft, rect.left, LEFT_SPRING);
    indicatorAnimations.current = [topAnim, bottomAnim, leftAnim];
  }, [activeTargetKey, indicatorBottom, indicatorLeft, indicatorTop, measureSelected, reduceMotion, stopIndicatorAnimations]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const rect = measureSelected();
      if (!rect) return;
      const target = indicatorTarget.current;
      if (target && Math.abs(rect.top - target.top) < 1 && Math.abs(rect.left - target.left) < 1) {
        return;
      }
      indicatorTarget.current = { key: target?.key ?? "", top: rect.top, left: rect.left };
      stopIndicatorAnimations();
      indicatorTop.set(rect.top);
      indicatorBottom.set(rect.bottom);
      indicatorLeft.set(rect.left);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [indicatorBottom, indicatorLeft, indicatorTop, measureSelected, stopIndicatorAnimations]);

  const activate = (item: NavItem, open: boolean) => {
    if (!collapsed && item.children?.length) {
      setExpanded((current) => {
        const next = new Set(current);
        if (open && activePath === item.path) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    }
    setFlyout(null);
    onNavigate(item.path);
  };

  const move = (event: KeyboardEvent<HTMLElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const visible = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"))
      .filter((button) => !button.closest("[inert]") && button.getClientRects().length > 0);
    const current = visible.findIndex((button) => button === event.target);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 : current + step;
    if (current < 0 || !visible[next]) return;
    event.preventDefault();
    visible[next].focus();
  };

  return (
    <div className="app-tabs-shell">
      {header ? <div className="app-tabs-header">{header}</div> : null}
      <motion.div className="app-tabs-scroll" layoutScroll onScroll={() => setFlyout(null)}>
        <nav ref={navRef} className="app-tabs" aria-label="示例分组" onKeyDown={move}>
          {indicatorVisible ? (
            <motion.span
              className="app-tabs__indicator"
              aria-hidden="true"
              style={{
                x: indicatorLeft,
                y: indicatorY,
                height: indicatorHeight,
              }}
            />
          ) : null}
          {items.map((item) => {
            const hasSubmenu = !!item.children?.length;
            const open = hasSubmenu && !collapsed && expanded.has(item.id);
            const current = activePath === item.path;
            const selected = current || (!open && activeGroup === item.id);
            const submenuId = `${groupId}-${item.id}`;
            return (
              <div className="pg-nav-group" key={item.id}>
                <button type="button" className="app-tabs__tab"
                  title={collapsed && !hasSubmenu ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={current ? "page" : undefined}
                  aria-expanded={hasSubmenu && !collapsed ? open : undefined}
                  aria-haspopup={collapsed && hasSubmenu ? "menu" : undefined}
                  aria-controls={hasSubmenu ? submenuId : undefined}
                  data-selected={selected ? "true" : undefined}
                  onPointerEnter={(event) => {
                    if (collapsed && hasSubmenu) openFlyout(item, event.currentTarget);
                    else if (collapsed) scheduleClose();
                  }}
                  onPointerLeave={() => {
                    if (collapsed && hasSubmenu) scheduleClose();
                  }}
                  onFocus={(event) => {
                    if (collapsed && hasSubmenu) openFlyout(item, event.currentTarget);
                  }}
                  onClick={() => activate(item, open)}>
                  <span className="app-tabs__icon">{item.icon}</span>
                  <motion.span
                    className="app-tabs__label"
                    initial={false}
                    animate={{ opacity: collapsed ? 0 : 1 }}
                    transition={layoutTransition}
                  >
                    {item.label}
                  </motion.span>
                  {hasSubmenu ? (
                    <motion.span
                      className="app-tabs__chevron"
                      aria-hidden="true"
                      initial={false}
                      animate={{
                        opacity: collapsed ? 0 : 1,
                        rotate: open ? 180 : 0,
                      }}
                      transition={layoutTransition}
                    >
                      <svg viewBox="0 0 12 12" width="12" height="12" fill="none"
                        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 4.5 3 3 3-3" />
                      </svg>
                    </motion.span>
                  ) : null}
                </button>
                {hasSubmenu ? (
                  <motion.div
                    id={submenuId}
                    className="pg-sub"
                    inert={!open}
                    aria-hidden={!open}
                    initial={false}
                    data-clip={!open || undefined}
                    animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                    transition={layoutTransition}
                  >
                    <Submenu
                      items={item.children!}
                      activeExample={activeExample}
                      openKinds={openKinds}
                      onNavigate={onNavigate}
                      open={open}
                    />
                  </motion.div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </motion.div>
      {footerTop || footer ? (
        <div className="app-tabs-footer">
          {footerTop}
          {footer}
        </div>
      ) : null}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {collapsed && flyout && flyout.item.children?.length ? (
            <CompactFlyout
              key={flyout.item.id}
              ref={flyoutRef}
              item={flyout.item}
              anchor={flyout.anchor}
              activeExample={activeExample}
              openKinds={openKinds}
              reduceMotion={reduceMotion}
              onPointerEnter={clearCloseTimer}
              onPointerLeave={scheduleClose}
              onNavigate={(path) => {
                setFlyout(null);
                onNavigate(path);
              }}
            />
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function CompactFlyout({
  ref,
  item,
  anchor,
  activeExample,
  openKinds,
  reduceMotion,
  onPointerEnter,
  onPointerLeave,
  onNavigate,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  item: NavItem;
  anchor: HTMLElement;
  activeExample: string | null;
  openKinds: ReadonlySet<string>;
  reduceMotion: boolean | null;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onNavigate: (path: string) => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, shown: false });

  useLayoutEffect(() => {
    const popup = ref.current;
    if (!popup || !anchor.isConnected) return;
    const rect = anchor.getBoundingClientRect();
    const popRect = popup.getBoundingClientRect();
    const left = Math.min(rect.right + 8, Math.max(8, window.innerWidth - popRect.width - 8));
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - popRect.height - 8));
    setPos({ top, left, shown: true });
  }, [anchor, item.id, ref]);

  return (
    <motion.div
      ref={ref}
      className="pg-nav-flyout"
      role="menu"
      aria-label={item.label}
      style={{ top: pos.top, left: pos.left, visibility: pos.shown ? "visible" : "hidden" }}
      initial={reduceMotion ? false : { opacity: 0, x: -8, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8, scale: 0.98 }}
      transition={reduceMotion ? IMMEDIATE : FADE}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button type="button" className="pg-nav-flyout__head" onClick={() => onNavigate(item.path)}>
        <span>{item.label}</span>
      </button>
      <div className="pg-nav-flyout__items">
        {item.children?.map((child) => {
          const selected = child.id === activeExample;
          const opened = openKinds.has(child.id);
          return (
            <button
              key={child.id}
              type="button"
              role="menuitem"
              className="pg-nav-flyout__item"
              data-selected={selected ? "true" : undefined}
              onClick={() => onNavigate(examplePath(child.id))}
            >
              {selected ? <span className="pg-nav-flyout__indicator" aria-hidden="true" /> : null}
              <span className="app-tabs__label">{child.label}</span>
              {opened ? <span className="pg-sub__dot"><span className="sr-only">窗口已打开</span></span> : null}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function Submenu({ items, activeExample, openKinds, onNavigate, open }: {
  items: readonly NavChild[];
  activeExample: string | null;
  openKinds: ReadonlySet<string>;
  onNavigate: (path: string) => void;
  open: boolean;
}) {
  return (
    <div className="pg-sub__items">
      {items.map((child) => {
        const selected = open && child.id === activeExample;
        const opened = openKinds.has(child.id);
        return (
          <button key={child.id} type="button" className="pg-sub__item"
            aria-current={selected ? "page" : undefined}
            data-selected={selected ? "true" : undefined}
            title={opened ? `${child.label}（窗口已打开）` : child.label}
            onClick={() => onNavigate(examplePath(child.id))}>
            <span className="app-tabs__label">{child.label}</span>
            {opened ? <span className="pg-sub__dot"><span className="sr-only">窗口已打开</span></span> : null}
          </button>
        );
      })}
    </div>
  );
}
