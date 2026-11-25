import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";

import { api } from "../../bridge";
import { Button, Range, Segmented, Select, Switch } from "../../components/controls";
import { Card, Code, Foot, Group, Readout, Row } from "../../components/primitives";
import { SLIDE } from "../../lib/motion";
import type { DemoProps } from "./types";

const MODES = [
  { value: "columns", label: "左右" },
  { value: "rows", label: "上下" },
  { value: "grid", label: "网格" },
];

const PANE_ACTIONS = [
  ["focus", "聚焦"],
  ["visible", "显隐"],
  ["reload", "刷新"],
  ["recreate", "重建"],
  ["devtools", "DevTools"],
  ["destroy", "销毁"],
] as const;

/**
 * 多 WebView 工作区。
 *
 * 关键约束：`workspace` 必须稳定留在首屏——原生 WebView 的 bounds 直接由它的
 * `getBoundingClientRect()` 换算，一旦这块元素被挤出窗口，视图就整块跑到窗口外面。
 * 所以这个页面用整屏 flex：工具条 + 工作区占满剩余高度，高级控件收进右侧检查器
 * （检查器把工作区挤窄，ResizeObserver 随之重排），不往下堆内容。
 */
export function LayoutDemo({ runtime, snapshot, refresh, toast }: DemoProps) {
  const panes = snapshot.panes;
  const reduceMotion = useReducedMotionConfig();
  const workspace = useRef<HTMLDivElement>(null);
  const lastKey = useRef("");
  const timer = useRef(0);
  const autoAdded = useRef(false);

  const [mode, setMode] = useState("columns");
  const [ratio, setRatio] = useState(50);
  const [selected, setSelected] = useState<number | null>(panes[0]?.id ?? null);
  const [inspector, setInspector] = useState(false);
  const [code, setCode] = useState<string[][]>([]);
  const [busy, setBusy] = useState(false);
  const [scriptResult, setScriptResult] = useState("");

  const [detached, setDetached] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [isolated, setIsolated] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [contextMenu, setContextMenu] = useState(true);
  const [zoom, setZoom] = useState("1");
  const [agent, setAgent] = useState("");
  const [throttling, setThrottling] = useState("0");

  const [bounds, setBounds] = useState(["0", "0", "50%-20px", "100%"]);
  const [url, setUrl] = useState("https://example.com");
  const [paneZoom, setPaneZoom] = useState("1");
  const [script, setScript] = useState("document.title");

  const current = panes.find((pane) => pane.id === selected) ?? panes[0] ?? null;

  const applyLayout = useCallback(async () => {
    const element = workspace.current;
    if (!element || !snapshot.panes.length) return;
    // 以客户区内的实际 DOM 位置作为原生 WebView 的布局基准。
    const rect = element.getBoundingClientRect();
    if (rect.width < 64 || rect.height < 64) return;
    const payload = {
      mode,
      ratio: ratio / 100,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      },
    };
    const key = JSON.stringify(payload) + snapshot.panes.map((pane) => pane.id).join();
    if (key === lastKey.current) return;
    lastKey.current = key;
    try {
      const cells = await api.layout(payload);
      setCode(cells);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    }
  }, [mode, ratio, snapshot.panes, toast]);

  const queueLayout = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void applyLayout(), 90);
  }, [applyLayout]);

  useEffect(() => {
    void api.panesVisible(true).catch(() => {});
  }, []);

  useEffect(() => {
    lastKey.current = "";
    void applyLayout();
  }, [applyLayout]);

  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const observer = new ResizeObserver(queueLayout);
    observer.observe(element);
    window.addEventListener("resize", queueLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", queueLayout);
      window.clearTimeout(timer.current);
    };
  }, [queueLayout]);

  useEffect(() => {
    if (!panes.some((pane) => pane.id === selected)) setSelected(panes[0]?.id ?? null);
  }, [panes, selected]);

  const addPane = useCallback(
    async (count = 1) => {
      setBusy(true);
      try {
        for (let index = 0; index < count; index++) {
          await api.addPane({
            settings: {
              incognito: Number(incognito),
              autoplay: Number(autoplay),
              allow_right_click: Number(contextMenu),
              devtools: 1,
              zoom_factor: Number(zoom) || 1,
              user_agent: agent || null,
              background_throttling: Number(throttling),
            },
            detached,
            isolatedProfile: isolated,
          });
        }
        lastKey.current = "";
        await refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error), "error");
      } finally {
        setBusy(false);
      }
    },
    [agent, autoplay, contextMenu, detached, incognito, isolated, refresh, throttling, toast, zoom],
  );

  useEffect(() => {
    if (panes.length || autoAdded.current) return;
    autoAdded.current = true;
    void addPane(2);
  }, [panes.length, addPane]);

  const act = async (operation: string) => {
    if (!current) return toast("请先创建一个视图", "error");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { id: current.id, operation };
      if (operation === "navigate") payload.url = url;
      if (operation === "zoom") payload.zoom = Number(paneZoom) || 1;
      if (operation === "script") payload.script = script;
      const result = await api.paneAction(payload);
      if (typeof result === "string") {
        setScriptResult(result || "（空结果）");
      } else {
        lastKey.current = "";
        await refresh();
        queueLayout();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const applyBounds = async () => {
    if (!current) return toast("请先创建一个视图", "error");
    setBusy(true);
    try {
      await api.customBounds(current.id, bounds);
      setCode(bounds.map((value, index) => [index === 0 ? "x" : index === 1 ? "y" : index === 2 ? "width" : "height", value]));
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="layout-demo">
      <div className="layout-toolbar">
        <Segmented label="布局方式" value={mode} options={MODES} onChange={setMode} />
        <Select
          label="当前视图"
          value={current ? String(current.id) : ""}
          onChange={(next) => setSelected(Number(next))}
          options={
            panes.length
              ? panes.map((pane) => ({ value: String(pane.id), label: `${pane.label} · ${pane.profile}` }))
              : [{ value: "", label: "尚无视图" }]
          }
          minWidth={180}
        />
        <Button variant="primary" busy={busy} icon="plus" onClick={() => void addPane(1)}>
          添加视图
        </Button>
        <Range label="分栏比例" value={ratio} min={15} max={85} onChange={setRatio} suffix="%" />
        <Button
          variant={inspector ? "primary" : "default"}
          icon="sliders"
          onClick={() => setInspector((open) => !open)}
          title="视图操作与高级配置"
        >
          高级
        </Button>
      </div>

      <div className="layout-body">
        <div className="workspace" ref={workspace} data-workspace="">
          {!panes.length ? (
            <div className="workspace__empty">
              <strong>原生视图工作区</strong>
              <span>点击「添加视图」创建真实的 WebView。</span>
            </div>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {inspector ? (
            <motion.aside
              className="inspector"
              aria-label="视图操作与高级配置"
              initial={{ opacity: 0, x: reduceMotion ? 0 : 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : 14 }}
              transition={reduceMotion ? { duration: 0 } : SLIDE}
            >
              <Group title="当前视图" note={current ? `WebView ${current.id}` : "未选择"}>
                <Card>
                  <Row label="操作" stack>
                    <div className="btn-row">
                      {PANE_ACTIONS.map(([operation, label]) => (
                        <Button
                          key={operation}
                          busy={busy}
                          variant={operation === "destroy" ? "danger" : "default"}
                          onClick={() => void act(operation)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </Row>
                  {panes.map((pane) => (
                    <div className="pane-item" key={pane.id}>
                      <strong>{pane.label}</strong>
                      <span>{pane.profile}</span>
                      <Readout>{pane.bounds.join(" ")}</Readout>
                    </div>
                  ))}
                </Card>
              </Group>

              <Group title="新视图配置">
                <Card>
                  <Row label="分步创建" hint="先建视图，再挂载到窗口">
                    <Switch checked={detached} label="分步创建" onChange={setDetached} />
                  </Row>
                  <Row label="无痕模式">
                    <Switch checked={incognito} label="无痕模式" onChange={setIncognito} />
                  </Row>
                  <Row label="独立 Profile">
                    <Switch checked={isolated} label="独立 Profile" onChange={setIsolated} />
                  </Row>
                  <Row label="允许自动播放">
                    <Switch checked={autoplay} label="允许自动播放" onChange={setAutoplay} />
                  </Row>
                  <Row label="允许右键菜单">
                    <Switch checked={contextMenu} label="允许右键菜单" onChange={setContextMenu} />
                  </Row>
                  <Row label="初始缩放">
                    <input type="number" min={0.25} max={5} step={0.1} value={zoom} onChange={(event) => setZoom(event.target.value)} />
                  </Row>
                  <Row label="User Agent" hint="留空使用引擎默认值">
                    <input type="text" value={agent} placeholder="可选" onChange={(event) => setAgent(event.target.value)} />
                  </Row>
                  <Row label="后台定时器">
                    <Select
                      label="后台定时器"
                      value={throttling}
                      onChange={setThrottling}
                      options={[
                        { value: "0", label: "默认" },
                        { value: "1", label: "关闭节流", disabled: runtime.platform !== "Windows" },
                      ]}
                    />
                  </Row>
                  <Foot>
                    <Button variant="primary" busy={busy} icon="plus" onClick={() => void addPane(1)}>
                      用这份配置创建
                    </Button>
                  </Foot>
                </Card>
              </Group>

              <Group title="坐标表达式">
                <Card>
                  {["X", "Y", "宽度", "高度"].map((label, index) => (
                    <Row key={label} label={label}>
                      <input
                        type="text"
                        value={bounds[index] ?? ""}
                        onChange={(event) => {
                          const next = [...bounds];
                          next[index] = event.target.value;
                          setBounds(next);
                        }}
                      />
                    </Row>
                  ))}
                  <Foot>
                    <Button busy={busy} onClick={() => void applyBounds()}>
                      应用到当前视图
                    </Button>
                  </Foot>
                </Card>
              </Group>

              <Group title="导航与脚本">
                <Card>
                  <Row label="URL">
                    <input type="text" value={url} onChange={(event) => setUrl(event.target.value)} />
                  </Row>
                  <Row label="导航" stack>
                    <div className="btn-row">
                      <Button busy={busy} onClick={() => void act("navigate")}>载入</Button>
                      <Button busy={busy} onClick={() => void act("back")}>后退</Button>
                      <Button busy={busy} onClick={() => void act("forward")}>前进</Button>
                    </div>
                  </Row>
                  <Row label="缩放">
                    <input type="number" min={0.25} max={5} step={0.1} value={paneZoom} onChange={(event) => setPaneZoom(event.target.value)} />
                    <Button busy={busy} onClick={() => void act("zoom")}>应用</Button>
                  </Row>
                  <Row label="JavaScript" stack>
                    <textarea className="pg-textarea" value={script} onChange={(event) => setScript(event.target.value)} rows={3} />
                    <Button busy={busy} onClick={() => void act("script")}>执行脚本</Button>
                  </Row>
                  <Row block>
                    <Code>{scriptResult || "—"}</Code>
                  </Row>
                </Card>
              </Group>

              <Group title="布局结果">
                <Card>
                  <Row block>
                    <Code>
                      {code.length
                        ? JSON.stringify(
                            code.map((cell, index) => ({
                              webviewId: panes[index]?.id ?? 0,
                              x: cell[0],
                              y: cell[1],
                              width: cell[2],
                              height: cell[3],
                            })),
                            null,
                            2,
                          )
                        : "调整窗口大小或添加视图后，这里显示宿主算出的坐标。"}
                    </Code>
                  </Row>
                </Card>
              </Group>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
