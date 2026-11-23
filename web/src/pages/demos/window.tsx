import { useState } from "react";

import { api } from "../../bridge";
import { ColorPicker } from "../../components/ColorPicker";
import { Button, Select, Switch } from "../../components/controls";
import { TitlebarStyleFields } from "../../components/TitlebarStyleFields";
import { materialOptions } from "../../launch";
import { parseTitlebarHeight, type TitlebarColors } from "../../lib/titlebarStyle";
import { Badge, Card, Code, Foot, Group, Hint, Readout, Row } from "../../components/primitives";
import type { DemoProps } from "./types";

const COMPONENTS = [
  ["back", "返回"],
  ["refresh", "刷新"],
  ["icon", "窗口图标"],
  ["minimize", "最小化"],
  ["maximize", "最大化"],
] as const;

/**
 * 标题栏组件开关。默认 DWM 标题栏与 BarOverlay 读同一份配置；
 * 覆盖层没有窗口图标，所以那一项在 overlay 示例里禁用。
 */
/** 用窗口快照填充组件状态，切换后由宿主更新实际的原生标题栏。 */
export function TitlebarComponents({ runtime, window, refresh, toast, noIcon = false }: DemoProps & { noIcon?: boolean }) {
  const [busy, setBusy] = useState(false);
  const flags = window.components;

  const update = async (name: string, next: boolean) => {
    setBusy(true);
    try {
      await api.windowComponents(window.id, { ...flags, [name]: next });
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        {COMPONENTS.map(([name, label]) => {
          const disabled = busy || (noIcon && name === "icon");
          return (
            <Row key={name} label={label} hint={noIcon && name === "icon" ? "覆盖层标题栏没有窗口图标" : undefined}>
              <Switch
                checked={!!flags[name]}
                disabled={disabled}
                label={label}
                onChange={(next) => void update(name, next)}
              />
            </Row>
          );
        })}
        <Foot>
          {runtime.platform === "Windows"
            ? "开关即时生效；返回按钮随页面历史出现，刷新按钮随加载状态更新。"
            : "当前平台不支持系统标题栏组件，开关只记录状态。"}
        </Foot>
      </Card>
    </>
  );
}

/** DWM 默认标题栏示例：组件、样式和一段可回退的历史。 */
export function DwmDemo(props: DemoProps) {
  const { runtime, snapshot, window, refresh, toast } = props;
  const [height, setHeight] = useState(() => String(window.titlebarHeight ?? 0));
  const [colors, setColors] = useState<TitlebarColors>(() => window.titlebarColors ?? {});
  const [applying, setApplying] = useState(false);
  const heightDip = parseTitlebarHeight(height);

  const applyStyle = async () => {
    if (heightDip === null) return;
    setApplying(true);
    try {
      await api.windowStyle(window.id, "titlebar-style", { height: heightDip, colors });
      await refresh();
      toast("标题栏样式已应用");
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setApplying(false);
    }
  };

  const history = (() => {
    const url = new URL(location.href);
    url.searchParams.set("step", String(Date.now()));
    return url.pathname + url.search;
  })();

  return (
    <>
      <Group title="标题栏组件">
        <TitlebarComponents {...props} />
      </Group>

      {runtime.platform === "Windows" && (
        <Group title="标题栏样式">
          <Card className="pg-titlebar-style">
            <TitlebarStyleFields height={height} colors={colors} theme={window.theme} disabled={applying}
              onHeightChange={setHeight} onColorsChange={setColors} />
            <Foot>
              <Button variant="primary" busy={applying} disabled={heightDip === null} onClick={() => void applyStyle()}>
                应用样式
              </Button>
            </Foot>
          </Card>
        </Group>
      )}

      <Group title="导航历史">
        <Card>
          <Row label="载入下一页" hint="页面会重新加载，标题栏的返回按钮随之出现">
            <a className="btn" href={history} target="_top">
              载入
            </a>
          </Row>
          <Row label="当前窗口" stack block>
            <Code>
              {JSON.stringify(
                snapshot.windows.map((item) => ({
                  windowId: item.id,
                  type: item.kind,
                  webviewIds: item.webviewIds,
                })),
                null,
                2,
              )}
            </Code>
          </Row>
        </Card>
        <Hint>
          本窗口使用系统默认标题栏（Window {window.id}）。切换组件时，右侧按钮由 DWM 绘制，
          左侧返回 / 刷新由运行库合成。
        </Hint>
      </Group>
    </>
  );
}

/** BarOverlay 覆盖层示例：组件开关 + 覆盖层样式。 */
export function OverlayDemo(props: DemoProps) {
  const { window, toast, refresh } = props;
  const [height, setHeight] = useState("40");
  const [color, setColor] = useState("#f4f6fb");
  const [buttonBg, setButtonBg] = useState("#ffffff10");
  const [hover, setHover] = useState("#ffffff20");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      await api.windowStyle(window.id, "overlay", {
        height: Number(height) || 40,
        color,
        button_bg: buttonBg,
        hover,
      });
      await refresh();
      toast("覆盖层样式已应用");
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Group title="覆盖层样式">
        <Card>
          <Row label="高度" hint="逻辑像素">
            <input
              type="number"
              min={20}
              max={120}
              value={height}
              onChange={(event) => setHeight(event.target.value)}
            />
          </Row>
          <Row label="图标颜色">
            <ColorPicker label="图标颜色" value={color} onChange={setColor} />
          </Row>
          <Row label="按钮背景" hint="常态">
            <ColorPicker label="按钮背景" value={buttonBg} onChange={setButtonBg} />
          </Row>
          <Row label="悬浮背景">
            <ColorPicker label="悬浮背景" value={hover} onChange={setHover} />
          </Row>
          <Foot>
            <Button variant="primary" busy={busy} onClick={() => void apply()}>
              应用覆盖层样式
            </Button>
            <span className="row__spacer" />
            <Badge>BarOverlay</Badge>
          </Foot>
        </Card>
      </Group>

      <Group title="标题栏组件">
        <TitlebarComponents {...props} noIcon />
      </Group>
    </>
  );
}

/** 无标题栏窗口：只切标题栏样式；系统边框是独立示例，不在这里来回切。 */
export function HiddenDemo({ window, refresh, toast }: DemoProps) {
  const [style, setStyle] = useState(window.style === "default" ? "hidden" : window.style);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      await api.windowStyle(window.id, "frame", { style });
      await refresh();
      toast(`标题栏已切换为 ${style}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title="标题栏样式">
      <Card>
        <Row label="标题栏样式">
          <Select
            label="标题栏样式"
            value={style}
            onChange={setStyle}
            options={[
              { value: "default", label: "default（系统标题栏）" },
              { value: "BarOverlay", label: "BarOverlay（覆盖层）" },
              { value: "hidden", label: "hidden（隐藏）" },
            ]}
          />
        </Row>
        <Foot>
          <Button variant="primary" busy={busy} onClick={() => void apply()}>
            应用样式
          </Button>
          <span className="row__spacer" />
          <Readout>{window.style}</Readout>
        </Foot>
      </Card>
      <Hint>
        hidden 与 BarOverlay 下，顶部横条是本页提供的拖拽区：最小化、最大化、关闭按钮由页面调用
        child.action 完成，拖动横条则移动窗口。
      </Hint>
    </Group>
  );
}

/** 展示无边框窗口的创建结果。 */
export function FramelessDemo({ window }: DemoProps) {
  return (
    <Group title="窗口信息">
      <Card>
        <Row label="当前边框">
          <Readout>{window.frameless ? "无边框" : "有边框"}</Readout>
        </Row>
        <Row label="窗口 ID">
          <Readout>{window.id}</Readout>
        </Row>
      </Card>
    </Group>
  );
}

/** 主题与背景材料。 */
export function ThemeDemo({ runtime, window, refresh, toast }: DemoProps) {
  const [busy, setBusy] = useState(false);

  const change = async (operation: "theme" | "material", value: string) => {
    setBusy(true);
    try {
      await api.windowStyle(window.id, operation, { value });
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title="外观">
      <Card>
        <Row label="主题">
          <Select
            label="主题"
            value={window.theme}
            disabled={busy}
            onChange={(next) => void change("theme", next)}
            options={[
              { value: "System", label: "跟随系统" },
              { value: "Dark", label: "深色" },
              { value: "Light", label: "浅色" },
            ]}
          />
        </Row>
        <Row label="背景材料" hint={runtime.win11 ? "透出桌面壁纸与系统模糊" : "需要 Windows 11"}>
          <Select
            label="背景材料"
            value={window.material}
            disabled={busy || !runtime.win11}
            onChange={(next) => void change("material", next)}
            options={materialOptions(runtime.keepActiveBackdrop)}
          />
        </Row>
        <Foot>失焦保留需要 Windows 11 22H2 或更新版本，以及与宿主进程架构匹配的 Windows App Runtime 1.8。</Foot>
      </Card>
    </Group>
  );
}

/** 窗口标志与尺寸。 */
export function FlagsDemo({ window, refresh, toast }: DemoProps) {
  const [width, setWidth] = useState("1080");
  const [height, setHeight] = useState("740");
  const [busy, setBusy] = useState(false);

  const change = async (name: "topmost" | "resizable" | "protected" | "fullscreen", next: boolean) => {
    setBusy(true);
    try {
      await api.windowStyle(window.id, name, { value: next });
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const resize = async () => {
    setBusy(true);
    try {
      await api.windowStyle(window.id, "size", { width: Number(width), height: Number(height) });
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    ["topmost", "窗口置顶", "始终显示在其它窗口之上"],
    ["resizable", "可调整大小", "关闭后拖动边缘不再改变尺寸"],
    ["protected", "内容保护", "阻止截屏与录屏抓取窗口内容"],
    ["fullscreen", "全屏", "铺满当前显示器"],
  ] as const;

  return (
    <>
      <Group title="窗口标志">
        <Card>
          {rows.map(([name, label, hint]) => (
            <Row key={name} label={label} hint={hint}>
              <Switch
                checked={Boolean(window[name])}
                disabled={busy}
                label={label}
                onChange={(next) => void change(name, next)}
              />
            </Row>
          ))}
        </Card>
      </Group>

      <Group title="窗口尺寸">
        <Card>
          <Row label="宽度" hint="逻辑像素，320–7680">
            <input type="number" value={width} onChange={(event) => setWidth(event.target.value)} />
          </Row>
          <Row label="高度" hint="逻辑像素，240–4320">
            <input type="number" value={height} onChange={(event) => setHeight(event.target.value)} />
          </Row>
          <Foot>
            <Button variant="primary" busy={busy} onClick={() => void resize()}>
              设置尺寸
            </Button>
          </Foot>
        </Card>
      </Group>
    </>
  );
}
