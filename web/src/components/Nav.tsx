import { AnimatePresence, LayoutGroup, motion, useIsPresent, useReducedMotionConfig, type Transition } from "motion/react";
import { useEffect, useId, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

import { SLIDE } from "../lib/motion";
import { examplePath } from "../routing/routes";

const COMPACT_NAV = "(max-width: 640px)";
const IMMEDIATE: Transition = { duration: 0 };
const SUBMENU_TRANSITION: Transition = { duration: 0.19, ease: [0.2, 0, 0, 1] };

function subscribeToCompactNav(onChange: () => void) {
  const query = window.matchMedia(COMPACT_NAV);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readCompactNav() {
  return window.matchMedia(COMPACT_NAV).matches;
}

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
  footer,
}: {
  items: ReadonlyArray<NavItem>;
  activePath: string;
  activeGroup: string | null;
  activeExample: string | null;
  onNavigate: (path: string) => void;
  openKinds: ReadonlySet<string>;
  footer?: ReactNode;
}) {
  const groupId = useId();
  const compact = useSyncExternalStore(subscribeToCompactNav, readCompactNav);
  const reduceMotion = useReducedMotionConfig();
  const transition = reduceMotion ? IMMEDIATE : SUBMENU_TRANSITION;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  );

  // 通过搜索或浏览器历史直接进入示例时，也显示它所属的分组。
  useEffect(() => {
    if (!activeGroup) return;
    setExpanded((current) => (current.has(activeGroup) ? current : new Set([...current, activeGroup])));
  }, [activeExample, activeGroup]);

  const activate = (item: NavItem, open: boolean) => {
    if (!compact && item.children?.length) {
      setExpanded((current) => {
        const next = new Set(current);
        if (open && activePath === item.path) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    }
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
      <motion.div className="app-tabs-scroll" layoutScroll>
        <LayoutGroup id={groupId}>
          <nav className="app-tabs" aria-label="示例分组" onKeyDown={move}>
            {items.map((item) => {
              const children = compact ? undefined : item.children;
              const open = !!children?.length && expanded.has(item.id);
              const current = activePath === item.path;
              const selected = current || (!open && activeGroup === item.id);
              const submenuId = `${groupId}-${item.id}`;
              return (
                <div className="pg-nav-group" key={item.id}>
                  <button type="button" className="app-tabs__tab" title={item.label} aria-label={item.label}
                    aria-current={current ? "page" : undefined}
                    aria-expanded={children?.length ? open : undefined}
                    aria-controls={children?.length ? submenuId : undefined}
                    data-selected={selected || undefined}
                    onClick={() => activate(item, open)}>
                    {selected ? <SelectionIndicator reduceMotion={reduceMotion} /> : null}
                    <span className="app-tabs__icon">{item.icon}</span>
                    <span className="app-tabs__label">{item.label}</span>
                    {children?.length ? (
                      <motion.svg className="app-tabs__chevron" viewBox="0 0 12 12" width="12" height="12" fill="none"
                        initial={false} animate={{ rotate: open ? 180 : 0 }} transition={transition}
                        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m3 4.5 3 3 3-3" />
                      </motion.svg>
                    ) : null}
                  </button>
                  {children?.length ? (
                    <div id={submenuId} className="pg-sub" inert={!open}>
                      <AnimatePresence initial={false}>
                        {open ? (
                          <Submenu key="submenu" items={children} activeExample={activeExample}
                            openKinds={openKinds} onNavigate={onNavigate} reduceMotion={reduceMotion} />
                        ) : null}
                      </AnimatePresence>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </LayoutGroup>
      </motion.div>
      {footer ? <div className="app-tabs-footer">{footer}</div> : null}
    </div>
  );
}

function SelectionIndicator({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.span className="app-tabs__indicator" layoutId={reduceMotion ? undefined : "nav-selection"}
      initial={false} transition={reduceMotion ? IMMEDIATE : SLIDE} aria-hidden="true" />
  );
}

function Submenu({ items, activeExample, openKinds, onNavigate, reduceMotion }: {
  items: readonly NavChild[];
  activeExample: string | null;
  openKinds: ReadonlySet<string>;
  onNavigate: (path: string) => void;
  reduceMotion: boolean | null;
}) {
  const present = useIsPresent();
  return (
    <motion.div
      initial={{ height: 0, overflow: "hidden" }}
      animate={{ height: "auto", transitionEnd: { overflow: "visible" } }}
      exit={{ height: 0, overflow: "hidden", transition: reduceMotion ? IMMEDIATE : { ...SUBMENU_TRANSITION, overflow: IMMEDIATE } }}
      transition={reduceMotion ? IMMEDIATE : SUBMENU_TRANSITION}>
      <div className="pg-sub__items">
        {items.map((child) => {
          const selected = present && child.id === activeExample;
          const opened = openKinds.has(child.id);
          return (
            <button key={child.id} type="button" className="pg-sub__item"
              aria-current={selected ? "page" : undefined}
              data-selected={selected || undefined}
              title={opened ? `${child.label}（窗口已打开）` : child.label}
              onClick={() => onNavigate(examplePath(child.id))}>
              {selected ? <SelectionIndicator reduceMotion={reduceMotion} /> : null}
              <span className="app-tabs__label">{child.label}</span>
              {opened ? <span className="pg-sub__dot"><span className="sr-only">窗口已打开</span></span> : null}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
