import { animate, motion, MotionConfig, useMotionValue, useReducedMotion, useTransform, type MotionStyle } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { api, type RuntimeInfo, type Snapshot } from "./bridge";
import { ToastHost } from "./components/ToastHost";
import { WindowChrome, type Breadcrumb } from "./components/WindowChrome";
import { GroupIcons, IconAbout, IconOverview } from "./components/NavIcons";
import { Nav, type NavItem } from "./components/Nav";
import { Empty } from "./components/primitives";
import { EXAMPLES, NAV_GROUPS } from "./data/catalog";
import { setSidebarCollapsed, setTheme, usePrefs, type ThemePref } from "./lib/prefs";
import { LAYOUT, SLIDE } from "./lib/motion";
import { useHostWindowTheme } from "./lib/theme";
import { Detail } from "./pages/Detail";
import { ExamplePage, GroupPage } from "./pages/GroupPage";
import { AboutPage, Overview } from "./pages/Overview";
import { DEFAULT_PATH, exampleOfPath, groupOfPath, groupPath } from "./routing/routes";
import { useRuntime } from "./runtime";
import { usePlaygroundSlots, type NavGroupSlot } from "./slots";
import { useToasts } from "./toast";
import { useExampleLauncher, type Launcher } from "./useExamples";

function buildNavItems(
  customGroups?: NavGroupSlot[],
  customExamples?: Record<string, { title: string }>,
): ReadonlyArray<NavItem> {
  const allGroups = [...NAV_GROUPS, ...(customGroups ?? [])];
  const allExamples = { ...EXAMPLES, ...customExamples };
  return [
    { id: "overview", path: DEFAULT_PATH, label: "概览", icon: <IconOverview /> },
    ...allGroups.map((group) => {
      const iconKey = "icon" in group ? group.icon : group.id;
      const Icon = GroupIcons[iconKey as keyof typeof GroupIcons] ?? GroupIcons.windowing;
      return {
        id: group.id,
        path: groupPath(group.id),
        label: group.label,
        icon: <Icon />,
        children: group.items.map((kind) => ({ id: kind, label: allExamples[kind]?.title ?? kind })),
      };
    }),
    { id: "about", path: "/about", label: "关于", icon: <IconAbout /> },
  ];
}

export default function App() {
  const { reduceMotion } = usePrefs();
  const systemReduceMotion = useReducedMotion();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const example = params.get("example");
  const material = params.get("surface") === "material" || example === "theme" || example === "overlay";

  // 有材质（或本身就是透明底的示例）时，页面不能铺不透明底色，否则材质被盖住。
  // 宿主在 URL 里带上 `surface=material`：这一帧画之前就知道要不要透明，不会闪。
  useLayoutEffect(() => {
    document.documentElement.dataset.surface = material ? "material" : "app";
  }, [material]);

  return (
    <MotionConfig reducedMotion={reduceMotion || systemReduceMotion ? "always" : "never"}>
      {example ? (
        <ExampleWindow kind={example} />
      ) : (
        <HashRouter>
          <MainWindow material={material} />
        </HashRouter>
      )}
    </MotionConfig>
  );
}

const SIDEBAR_WIDTH = 228;
const SIDEBAR_RAIL_WIDTH = 56;
const NARROW_SIDEBAR_QUERY = "(max-width: 640px)";

function subscribeNarrowSidebar(onChange: () => void) {
  const query = window.matchMedia(NARROW_SIDEBAR_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readNarrowSidebar() {
  return window.matchMedia(NARROW_SIDEBAR_QUERY).matches;
}

function MainWindow({ material }: { material: boolean }) {
  const { runtime, snapshot, error, refresh } = useRuntime();
  const slots = usePlaygroundSlots();
  const { toasts, toast } = useToasts();
  const launcher = useExampleLauncher(refresh, toast);
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, reduceMotion } = usePrefs();
  const systemReduceMotion = useReducedMotion();
  const reducedMotion = reduceMotion || Boolean(systemReduceMotion);
  const narrowSidebar = useSyncExternalStore(subscribeNarrowSidebar, readNarrowSidebar);
  const effectiveCollapsed = narrowSidebar || sidebarCollapsed;
  const [query, setQuery] = useState("");
  const [navState, setNavState] = useState({ canGoBack: false, canGoForward: false });
  const navItems = useMemo(
    () => buildNavItems(slots.customNavGroups, slots.customExamples),
    [slots.customNavGroups, slots.customExamples],
  );
  const allGroups = useMemo(
    () => [...NAV_GROUPS, ...(slots.customNavGroups ?? [])],
    [slots.customNavGroups],
  );
  const activeGroup = groupOfPath(location.pathname) ?? allGroups.find((group) =>
    location.pathname === groupPath(group.id) || group.items.some((kind) => location.pathname === `/examples/${kind}`),
  )?.id ?? null;
  const activeExample = exampleOfPath(location.pathname);
  const openKinds = useMemo(
    () => new Set((snapshot?.windows ?? []).map((item) => item.kind)),
    [snapshot],
  );

  const sideWidth = useMotionValue(effectiveCollapsed ? SIDEBAR_RAIL_WIDTH : SIDEBAR_WIDTH);
  const sideWidthCss = useTransform(sideWidth, (value) => `${value}px`);
  const sidebarExpansion = useTransform(sideWidth, [SIDEBAR_RAIL_WIDTH, SIDEBAR_WIDTH], [0, 1]);
  const sideSettled = useRef(false);

  useLayoutEffect(() => {
    const target = effectiveCollapsed ? SIDEBAR_RAIL_WIDTH : SIDEBAR_WIDTH;
    if (!sideSettled.current || reducedMotion) {
      sideSettled.current = true;
      sideWidth.set(target);
      return;
    }
    const control = animate(sideWidth, target, LAYOUT);
    return () => control.stop();
  }, [effectiveCollapsed, reducedMotion, sideWidth]);

  const syncNavState = useCallback(async () => {
    if (!runtime) return;
    try {
      const next = await api.navState();
      setNavState(next);
    } catch {
      // 窗口关闭中或尚未就绪时忽略
    }
  }, [runtime]);

  useEffect(() => {
    if (!runtime) return;
    void syncNavState();
    const timer = window.setTimeout(() => void syncNavState(), 80);
    return () => window.clearTimeout(timer);
  }, [runtime, location.key, location.pathname, location.hash, syncNavState]);

  const navigateHistory = async (direction: "back" | "forward") => {
    if (!runtime) return;
    try {
      await api.navGo(direction);
      window.setTimeout(() => void syncNavState(), 60);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : String(cause), "error");
    }
  };

  useEffect(() => {
    if (location.pathname !== DEFAULT_PATH) setQuery("");
  }, [location.pathname]);

  const search = (value: string) => {
    setQuery(value);
    if (location.pathname !== DEFAULT_PATH) navigate(DEFAULT_PATH);
  };

  useEffect(() => {
    if (!runtime) return;
    const root = document.documentElement;
    let active = true;
    let queued = "";
    let queuedTheme = "";
    let updates: Promise<unknown> = Promise.resolve();
    const sync = () => {
      // CSS is the source of truth for the color exposed during window resizing.
      const theme = root.dataset.theme === "dark" ? "Dark" : "Light";
      if (queuedTheme !== theme) {
        queuedTheme = theme;
        updates = updates
          .then(() => active ? api.windowStyle(runtime.windowId, "theme", { value: theme }) : undefined)
          .then(() => active ? refresh() : undefined)
          .catch((error: unknown) => console.error("无法同步标题栏主题", error));
      }
      const color = material ? "" : getComputedStyle(root).getPropertyValue("--window").trim();
      if (color && color !== queued) {
        queued = color;
        updates = updates.then(() => active ? api.frontendBackground(color) : undefined)
          .catch((error: unknown) => console.error("无法同步窗口底色", error));
      }
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const hot = import.meta.hot;
    hot?.on("vite:afterUpdate", sync);
    sync();
    return () => {
      active = false;
      observer.disconnect();
      hot?.off("vite:afterUpdate", sync);
    };
  }, [material, runtime, refresh]);

  const body = (() => {
    if (error) {
      return (
        <div className="route-scroll">
          <Empty title="连不上宿主" detail={error} />
        </div>
      );
    }
    if (!runtime || !snapshot) {
      return (
        <div className="route-scroll">
          <Empty title="正在连接宿主…" />
        </div>
      );
    }
    return (
      <div className="pg-page-host">
        <Routes key={location.pathname}>
          <Route path="/overview" element={<Overview query={query} openKinds={openKinds} runtime={runtime} />} />
          <Route path="/groups/:groupId" element={<GroupRoute openKinds={openKinds} />} />
          <Route
            path="/examples/:kind"
            element={<ExampleRoute runtime={runtime} snapshot={snapshot} launcher={launcher} />}
          />
          <Route path="/about" element={<AboutPage runtime={runtime} />} />
          <Route path="*" element={<Navigate replace to={DEFAULT_PATH} />} />
        </Routes>
      </div>
    );
  })();

  return (
    <motion.div
      className={effectiveCollapsed ? "app pg-app pg-app--main pg-app--nav-collapsed" : "app pg-app pg-app--main"}
      style={{ "--side-width": sideWidthCss, "--sidebar-expansion": sidebarExpansion } as MotionStyle}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳到主要内容
      </a>

      <WindowChrome
        title="JadeView Playground"
        variant="overlay"
        breadcrumb={titlebarBreadcrumb(activeGroup, activeExample, slots.customNavGroups, slots.customExamples)}
        leading={
          <div className="pg-chrome__nav" jade-region-no-drag="">
            <button
              type="button"
              className="pg-chrome__tool"
              disabled={narrowSidebar}
              title={effectiveCollapsed ? "展开侧边栏" : "收起侧边栏"}
              aria-label={effectiveCollapsed ? "展开侧边栏" : "收起侧边栏"}
              aria-expanded={!effectiveCollapsed}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.35"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2.5" width="12" height="11" rx="2" />
                <path d="M5.5 2.5v11" />
              </svg>
            </button>
            <button
              type="button"
              className="pg-chrome__tool"
              title="后退"
              aria-label="后退"
              disabled={!runtime || !navState.canGoBack}
              onClick={() => void navigateHistory("back")}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.45"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 3.5 5.5 8 10 12.5" />
              </svg>
            </button>
            <button
              type="button"
              className="pg-chrome__tool"
              title="前进"
              aria-label="前进"
              disabled={!runtime || !navState.canGoForward}
              onClick={() => void navigateHistory("forward")}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.45"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          </div>
        }
      >
        <TitlebarSearch query={query} onSearch={search} />
        {runtime && slots.titlebarActions ? slots.titlebarActions({ runtime }) : null}
      </WindowChrome>
      <div className="view view--wide">
        <motion.aside className="side" aria-label="示例导航">
          <div className="side__inner">
            <Nav
              items={navItems}
              activePath={location.pathname}
              activeGroup={activeGroup}
              activeExample={activeExample}
              onNavigate={(path) => navigate(path)}
              openKinds={openKinds}
              collapsed={effectiveCollapsed}
              header={runtime && slots.sidebarHeader ? slots.sidebarHeader({ runtime, collapsed: effectiveCollapsed }) : undefined}
              footerTop={runtime && slots.sidebarFooterBeforeTheme ? slots.sidebarFooterBeforeTheme({ runtime, collapsed: effectiveCollapsed }) : undefined}
              footer={<ThemeButton compact={effectiveCollapsed} reducedMotion={reducedMotion} />}
            />
          </div>
        </motion.aside>

        <div className="shell">
          <main className="panel panel--routes" id="main-content" tabIndex={-1}>{body}</main>
        </div>
      </div>

      <ToastHost toasts={toasts} />
    </motion.div>
  );
}

function TitlebarSearch({ query, onSearch }: { query: string; onSearch: (query: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const clear = () => {
    onSearch("");
    input.current?.focus();
  };

  return (
    <form className="pg-search" role="search" jade-region-no-drag=""
      onSubmit={(event) => event.preventDefault()}>
      <input ref={input} type="search" aria-label="搜索示例或 API" placeholder="搜索示例或 API"
        value={query} onChange={(event) => onSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && query) {
            event.preventDefault();
            clear();
          }
        }} />
      {query ? (
        <button type="button" aria-label="清除搜索" onClick={clear}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
            strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
        </button>
      ) : (
        <svg className="pg-search__glyph" viewBox="0 0 16 16" width="15" height="15" fill="none"
          stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true">
          <circle cx="6.6" cy="6.6" r="4" /><path d="m9.5 9.5 3.5 3.5" />
        </svg>
      )}
    </form>
  );
}

function titlebarBreadcrumb(
  groupId: string | null,
  kind: string | null,
  customGroups?: NavGroupSlot[],
  customExamples?: Record<string, { title: string }>,
): Breadcrumb | undefined {
  const allGroups = [...NAV_GROUPS, ...(customGroups ?? [])];
  const allExamples = { ...EXAMPLES, ...customExamples };
  const group = allGroups.find((item) => item.id === groupId);
  if (!group) return;
  const groupCrumb = { id: `group:${group.id}`, label: group.label };
  if (!kind) {
    return { depth: 1, items: [{ id: "overview", label: "示例", to: DEFAULT_PATH }, groupCrumb] };
  }
  return { depth: 2, items: [
    { ...groupCrumb, to: groupPath(group.id) },
    { id: `example:${kind}`, label: allExamples[kind]?.title ?? kind },
  ] };
}

function GroupRoute({ openKinds }: { openKinds: ReadonlySet<string> }) {
  const { groupId = "" } = useParams();
  return <GroupPage group={groupId} openKinds={openKinds} />;
}

function ExampleRoute({
  runtime, snapshot, launcher,
}: { runtime: RuntimeInfo; snapshot: Snapshot; launcher: Launcher }) {
  const { kind = "" } = useParams();
  return <ExamplePage kind={kind} runtime={runtime} snapshot={snapshot} launcher={launcher} />;
}

function ExampleWindow({ kind }: { kind: string }) {
  const { runtime, snapshot, error, refresh } = useRuntime();
  const { toasts, toast } = useToasts();
  const meta = EXAMPLES[kind];
  const window = snapshot?.windows.find((item) => item.id === runtime?.windowId) ?? null;

  useHostWindowTheme(runtime?.windowId, window?.theme ?? snapshot?.theme, refresh);

  const content = (() => {
    if (error) {
      return (
        <div className="route-scroll">
          <Empty title="连不上宿主" detail={error} />
        </div>
      );
    }
    if (!runtime || !snapshot) {
      return (
        <div className="route-scroll">
          <Empty title="正在连接宿主…" />
        </div>
      );
    }
    return (
      <Detail
        kind={kind}
        runtime={runtime}
        snapshot={snapshot}
        refresh={refresh}
        toast={(message, tone) => toast(message, tone === "error" ? "error" : "ok")}
      />
    );
  })();

  // 以窗口实际使用的标题栏样式为准：启动参数里可以改，不能只看示例 kind。
  const style = window?.style ?? (kind === "overlay" ? "BarOverlay"
    : kind === "hidden" || kind === "frameless" ? "hidden" : "default");
  const needsBar = style === "hidden";
  const overlay = style === "BarOverlay";

  return (
    <div className={needsBar ? "app pg-app pg-app--single pg-app--frameless" : "app pg-app pg-app--single"}>
      <div className="view view--wide">
        <div className="shell">
          <main className="panel panel--routes">
            {needsBar || overlay ? (
              <div className="pg-window">
                <WindowChrome
                  title={meta ? `${meta.title} · JadeView` : "JadeView"}
                  variant={needsBar ? "bar" : "spacer"}
                  windowId={window?.id}
                />
                <div className="pg-window__body">{content}</div>
              </div>
            ) : (
              content
            )}
          </main>
        </div>
      </div>
      <ToastHost toasts={toasts} />
    </div>
  );
}

const THEME_TABS: ReadonlyArray<{ value: ThemePref; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "dark", label: "深色" },
  { value: "light", label: "浅色" },
];

function ThemeButton({ compact, reducedMotion }: { compact: boolean; reducedMotion: boolean }) {
  const { theme } = usePrefs();
  const transition = reducedMotion ? { duration: 0 } : SLIDE;

  return (
    <div
      className={compact ? "pg-theme-tabs pg-theme-tabs--compact" : "pg-theme-tabs"}
      role="tablist"
      aria-label="主题外观"
      aria-orientation={compact ? "vertical" : "horizontal"}
    >
      {THEME_TABS.map((item) => {
        const selected = theme === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            className="pg-theme-tab"
            aria-selected={selected}
            aria-label={item.label}
            title={item.label}
            data-selected={selected || undefined}
            onClick={() => {
              if (!selected) setTheme(item.value);
            }}
          >
            {selected ? (
              <motion.span
                className="pg-theme-tab__indicator"
                layoutId={reducedMotion ? undefined : "theme-tab-indicator"}
                initial={false}
                transition={transition}
                aria-hidden="true"
              />
            ) : null}
            <span className="pg-theme-tab__icon">
              <ThemeTabIcon value={item.value} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ThemeTabIcon({ value }: { value: ThemePref }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.45"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {value === "system" ? (
        <>
          <rect x="2" y="2.6" width="12" height="8.8" rx="1.6" />
          <path d="M5.5 13.6h5M8 11.4v2.2" />
        </>
      ) : value === "dark" ? (
        <path d="M13.2 10.2A5.6 5.6 0 0 1 5.8 2.8a5.6 5.6 0 1 0 7.4 7.4Z" />
      ) : (
        <>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.6v1.4M8 13v1.4M1.6 8H3M13 8h1.4M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1" />
        </>
      )}
    </svg>
  );
}
