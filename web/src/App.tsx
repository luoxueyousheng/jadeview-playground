import { MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { setTheme, usePrefs } from "./lib/prefs";
import { resolveTheme } from "./lib/theme";
import { Detail } from "./pages/Detail";
import { ExamplePage, GroupPage } from "./pages/GroupPage";
import { AboutPage, Overview } from "./pages/Overview";
import { DEFAULT_PATH, exampleOfPath, groupOfPath, groupPath } from "./routing/routes";
import { useRuntime } from "./runtime";
import { useToasts } from "./toast";
import { useExampleLauncher, type Launcher } from "./useExamples";

/** 一级分组 + 二级示例；两级都是路径，不直接建窗口。 */
const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: "overview", path: DEFAULT_PATH, label: "概览", icon: <IconOverview /> },
  ...NAV_GROUPS.map((group) => {
    const Icon = GroupIcons[group.id as keyof typeof GroupIcons];
    return {
      id: group.id,
      path: groupPath(group.id),
      label: group.label,
      icon: <Icon />,
      children: group.items.map((kind) => ({ id: kind, label: EXAMPLES[kind]?.title ?? kind })),
    };
  }),
  { id: "about", path: "/about", label: "关于", icon: <IconAbout /> },
];

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

function MainWindow({ material }: { material: boolean }) {
  const { runtime, snapshot, error, refresh } = useRuntime();
  const { toasts, toast } = useToasts();
  const launcher = useExampleLauncher(refresh, toast);
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const activeGroup = groupOfPath(location.pathname);
  const activeExample = exampleOfPath(location.pathname);
  const openKinds = useMemo(
    () => new Set((snapshot?.windows ?? []).map((item) => item.kind)),
    [snapshot],
  );

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
        updates = updates.then(() => active ? api.windowStyle(runtime.windowId, "theme", { value: theme }) : undefined)
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
  }, [material, runtime]);

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
          <Route path="/overview" element={<Overview query={query} />} />
          <Route path="/groups/:groupId" element={<GroupRoute />} />
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
    <div className="app pg-app pg-app--main">
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

      <WindowChrome title="JadeView Playground" variant="overlay"
        breadcrumb={titlebarBreadcrumb(activeGroup, activeExample)}>
        <TitlebarSearch query={query} onSearch={search} />
      </WindowChrome>
      <div className="view view--wide">
        <aside className="side" aria-label="示例导航">
          <div className="side__inner">
            <Nav
              items={NAV_ITEMS}
              activePath={location.pathname}
              activeGroup={activeGroup}
              activeExample={activeExample}
              onNavigate={(path) => navigate(path)}
              openKinds={openKinds}
              footer={<ThemeButton />}
            />
          </div>
        </aside>

        <div className="shell">
          <main className="panel panel--routes" id="main-content" tabIndex={-1}>{body}</main>
        </div>
      </div>

      <ToastHost toasts={toasts} />
    </div>
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

function titlebarBreadcrumb(groupId: string | null, kind: string | null): Breadcrumb | undefined {
  const group = NAV_GROUPS.find((item) => item.id === groupId);
  if (!group) return;
  const groupCrumb = { id: group.id, label: group.label };
  if (!kind) {
    return { depth: 1, items: [{ id: "overview", label: "示例", to: DEFAULT_PATH }, groupCrumb] };
  }
  return { depth: 2, items: [
    { ...groupCrumb, to: groupPath(group.id) },
    { id: kind, label: EXAMPLES[kind].title },
  ] };
}

function GroupRoute() {
  const { groupId = "" } = useParams();
  return <GroupPage group={groupId} />;
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

  const window = snapshot?.windows.find((item) => item.id === runtime?.windowId) ?? null;
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

function ThemeButton() {
  const { theme } = usePrefs();
  const [systemDark, setSystemDark] = useState(() => resolveTheme("system") === "dark");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const dark = theme === "dark" || (theme === "system" && systemDark);

  const label = dark ? "切换到浅色外观" : "切换到深色外观";

  return (
    <button type="button" className="pg-theme" title={label} aria-label={label} onClick={() => setTheme(dark ? "light" : "dark")}>
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="8" cy="8" r="3.1" />
            <path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1" />
          </>
        ) : (
          <path d="M13.2 10.2A5.6 5.6 0 0 1 5.8 2.8a5.6 5.6 0 1 0 7.4 7.4Z" />
        )}
      </svg>
      <span className="app-tabs__label">{dark ? "浅色外观" : "深色外观"}</span>
    </button>
  );
}
