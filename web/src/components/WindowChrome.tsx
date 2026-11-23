/**
 * 页面自绘的窗口横条。
 *
 * 主窗口的 BarOverlay 标题栏负责显示标题和提供拖拽区，窗口按钮由 JadeView 提供。
 * 示例窗口可独立显示无边框按钮，或为覆盖层留出空间。
 */

import { AnimatePresence, LayoutGroup, motion, useIsPresent, useReducedMotionConfig, type Variants } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { api } from "../bridge";
import "./window-chrome.css";

type Crumb = { id: string; label: string; to?: string };
export type Breadcrumb = { depth: number; items: readonly Crumb[] };

const breadcrumbMotion: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 14 }),
  active: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -9 }),
};

export function WindowChrome({
  title,
  variant,
  windowId,
  breadcrumb,
  children,
}: {
  title: string;
  variant: "bar" | "spacer" | "overlay";
  /** 仅用于右上角的等宽读数，可缺省（覆盖层示例在快照到达前就要占位）。 */
  windowId?: number;
  breadcrumb?: Breadcrumb;
  children?: ReactNode;
}) {
  if (variant === "spacer") {
    return <div className="pg-chrome pg-chrome--spacer" aria-hidden="true" />;
  }
  if (variant === "overlay") {
    return (
      <header className="pg-chrome pg-chrome--overlay" jade-region-drag="">
        <div className="pg-chrome__brand">
          <img className="pg-chrome__icon" src="./favicon.ico" width="16" height="16" alt="" draggable={false} />
          <ChromeBreadcrumb title={title} breadcrumb={breadcrumb} />
        </div>
        {children}
        <div className="pg-chrome__end" />
      </header>
    );
  }
  return (
    <div className="pg-chrome" jade-region-drag="">
      <span className="pg-chrome__title">{title}</span>
      <div className="pg-chrome__actions" jade-region-no-drag="">
        <ChromeButton label="最小化" onClick={() => void api.childAction("minimize")}>
          <path d="M3 8h10" />
        </ChromeButton>
        <ChromeButton label="最大化" onClick={() => void api.childAction("maximize")}>
          <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.4" />
        </ChromeButton>
        <ChromeButton label="关闭" danger onClick={() => void api.childAction("close")}>
          <path d="M4 4l8 8M12 4l-8 8" />
        </ChromeButton>
      </div>
      <span className="pg-chrome__id mono" aria-hidden="true">
        {windowId ?? ""}
      </span>
    </div>
  );
}

function ChromeBreadcrumb({ title, breadcrumb }: { title: string; breadcrumb?: Breadcrumb }) {
  const reduceMotion = useReducedMotionConfig();
  const depth = breadcrumb?.depth ?? 0;
  const previousDepth = useRef(depth);
  const direction = depth < previousDepth.current ? -1 : 1;
  useLayoutEffect(() => {
    previousDepth.current = depth;
  }, [depth]);
  const items = breadcrumb?.items ?? [{ id: "app-title", label: title }];

  return (
    <nav className="pg-breadcrumb" aria-label="当前位置">
      <LayoutGroup>
        <ol className="pg-breadcrumb__list">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            {items.map((item, index) => (
              <motion.li key={item.id} className="pg-breadcrumb__part" custom={direction}
                layout={reduceMotion ? false : "position"} variants={breadcrumbMotion}
                initial={reduceMotion ? false : "enter"} animate="active" exit={reduceMotion ? undefined : "exit"}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.2, 0.75, 0.25, 1] }}>
                {index > 0 ? <span className="pg-chevron" aria-hidden="true" /> : null}
                <CrumbLabel item={item} root={!breadcrumb} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </LayoutGroup>
    </nav>
  );
}

function CrumbLabel({ item, root }: { item: Crumb; root: boolean }) {
  const present = useIsPresent();
  return item.to ? (
    <Link to={item.to} inert={!present} jade-region-no-drag="" title={item.label}>{item.label}</Link>
  ) : (
    <span className={root ? "pg-chrome__title" : undefined} inert={!present}
      aria-current={root ? undefined : "page"} title={item.label}>{item.label}</span>
  );
}

function ChromeButton({
  label,
  children,
  danger = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={danger ? "pg-chrome__btn pg-chrome__btn--close" : "pg-chrome__btn"}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
