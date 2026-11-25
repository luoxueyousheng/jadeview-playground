import { Fragment, useRef, useState, type ReactNode } from "react";

import type { HostDescriptor, NativeWindow } from "../bridge";
import type { CodeLanguage } from "../data/catalog";
import { buildDynamicSnippets, resolveExampleSnippets, type SnippetMap } from "../data/hostSnippets";
import { useLaunchState } from "../launchState";
import { ColorPicker } from "./ColorPicker";
import { Button, Select, Switch } from "./controls";
import { SourceCode } from "./SourceCode";
import { TitlebarStyleFields } from "./TitlebarStyleFields";
import { TextField } from "./ui";
import { Card, Foot, Group } from "./primitives";
import { ExamplePoints } from "../pages/GroupPage";
import { materialOptions, THEME_OPTIONS, type LaunchTheme, type SampleField } from "../launch";
import type { Launcher } from "../useExamples";

type SplashLogoMode = "default" | "custom" | "hidden";

export function WindowSample({
  kind, source, sourceLanguage, customSnippets, points = [], fields, defaultTitle, isWindows, win11, keepActiveBackdrop, theme, window, launcher, supported, host, unsupportedReason,
}: {
  kind: string;
  source: string;
  sourceLanguage: CodeLanguage;
  customSnippets?: SnippetMap;
  points?: ReadonlyArray<string>;
  fields: ReadonlyArray<SampleField>;
  defaultTitle: string;
  isWindows: boolean;
  win11: boolean;
  keepActiveBackdrop: boolean;
  theme: LaunchTheme;
  window: NativeWindow | null;
  launcher: Launcher;
  supported: boolean;
  host?: HostDescriptor;
  unsupportedReason?: string | null;
}) {
  const { draft, options, update, reset } = useLaunchState(kind, theme, win11, keepActiveBackdrop);
  const showTitlebarStyle = kind === "dwm" && isWindows;
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoMode: SplashLogoMode = !draft.splashLogo ? "hidden"
    : draft.splashLogoImage ? "custom" : "default";

  const chooseLogoMode = (mode: SplashLogoMode) => {
    setLogoError("");
    if (mode === "custom") {
      logoInput.current?.click();
      return;
    }
    update({ splashLogo: mode === "default", splashLogoImage: null });
  };

  const loadLogo = async (file: File) => {
    setLogoBusy(true);
    setLogoError("");
    try {
      const image = await createImageBitmap(file).catch(() => {
        throw new Error("无法读取图片。请选择 PNG、JPEG 或 WebP 等图片文件。");
      });
      try {
        if (image.width !== image.height) {
          throw new Error(`请选择宽高相同的图片。当前图片为 ${image.width} × ${image.height}。`);
        }

        // 把用户选中的图片统一转成小体积 PNG，发送给宿主。
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.min(image.width, 512);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("无法处理图片，请重新选择。");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = canvas.toDataURL("image/png").split(",")[1];
        if (!png) throw new Error("无法转换为 PNG，请重新选择。");
        update({ splashLogo: true, splashLogoImage: { name: file.name, png } });
      } finally {
        image.close();
      }
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : String(error));
    } finally {
      setLogoBusy(false);
    }
  };

  const run = () => {
    if (window) launcher.reopen(kind, window.id, options);
    else launcher.open(kind, options);
  };

  const effectiveTheme = options.theme ?? theme;
  const lightSplash = effectiveTheme === "Light";
  const background = options.splashBackground ?? (lightSplash ? "#f5f7f6" : "#172622");
  const foreground = options.splashForeground ?? (lightSplash ? "#237b61" : "#66d6ae");
  const dynamicSnippets = buildDynamicSnippets(kind, options, effectiveTheme);
  const baseCode = dynamicSnippets?.Python ?? source;
  const baseLanguage = dynamicSnippets ? "Python" : sourceLanguage;
  const snippets = resolveExampleSnippets(
    kind,
    baseLanguage,
    baseCode,
    host,
    dynamicSnippets ?? customSnippets,
  );
  const canRun = supported && !unsupportedReason;

  const resizableSwitch = (
    <div className="pg-param__switch">
      <Switch
        label="可调整边框"
        checked={draft.resizable}
        onChange={(value) => update({ resizable: value })}
      />
      <span className="pg-param__state">{draft.resizable ? "允许调整" : "固定边框"}</span>
    </div>
  );

  const params: Record<SampleField, ReactNode> = {
    resizable: (
      <div className="pg-param" key="resizable">
        <span className="pg-param__label">可调整边框</span>
        {resizableSwitch}
      </div>
    ),
    title: (
      <div className="pg-param" key="title">
        <span className="pg-param__label">窗口标题</span>
        <TextField
          value={draft.title}
          onChange={(value) => update({ title: value })}
          placeholder={defaultTitle}
          aria-label="窗口标题"
        />
      </div>
    ),
    size: (
      <div className="pg-param" key="size">
        <span className="pg-param__label">窗口尺寸</span>
        <div className="pg-pair">
          <div className="pg-num">
            <TextField
              value={draft.width}
              onChange={(value) => update({ width: value })}
              inputMode="numeric"
              placeholder="宽"
              aria-label="窗口宽度"
            />
          </div>
          <span className="pg-pair__x" aria-hidden="true">
            ×
          </span>
          <div className="pg-num">
            <TextField
              value={draft.height}
              onChange={(value) => update({ height: value })}
              inputMode="numeric"
              placeholder="高"
              aria-label="窗口高度"
            />
          </div>
        </div>
      </div>
    ),
    position: (
      <div className="pg-param" key="position">
        <span className="pg-param__label">窗口位置</span>
        <div className="pg-pair">
          <div className="pg-num">
            <TextField
              value={draft.x}
              onChange={(value) => update({ x: value })}
              inputMode="numeric"
              placeholder="X"
              aria-label="窗口左边距"
            />
          </div>
          <div className="pg-num">
            <TextField
              value={draft.y}
              onChange={(value) => update({ y: value })}
              inputMode="numeric"
              placeholder="Y"
              aria-label="窗口上边距"
            />
          </div>
        </div>
        <p className="pg-param__note">留空由系统决定</p>
      </div>
    ),
    frameless: (
      <div className="pg-param" key="frameless">
        <span className="pg-param__label">无边框</span>
        <div className="pg-param__switch">
          <Switch checked={draft.frameless} onChange={(value) => update({ frameless: value })} label="无边框" />
          <span className="pg-param__state">{draft.frameless ? "已开启" : "已关闭"}</span>
        </div>
      </div>
    ),
    material: (
      <div className="pg-param" key="material">
        <span className="pg-param__label">背景材料</span>
        <div className="pg-select">
          <Select
            label="背景材料"
            value={draft.material}
            options={materialOptions(keepActiveBackdrop)}
            disabled={!win11}
            onChange={(value) => update({ material: value })}
          />
        </div>
        {win11 ? null : <p className="pg-param__note">需要 Windows 11</p>}
      </div>
    ),
    theme: (
      <div className="pg-param" key="theme">
        <span className="pg-param__label">深浅主题</span>
        <div className="pg-select">
          <Select
            label="深浅主题"
            value={draft.theme}
            options={THEME_OPTIONS}
            onChange={(value) => update({ theme: value, themeCustomized: true })}
          />
        </div>
      </div>
    ),
    splash: (
      <Fragment key="splash">
        <label className="pg-param" key="splash-duration">
          <span className="pg-param__label">最短显示时间（毫秒）</span>
          <input className="pg-native-input" type="number" min="0" max="5000" step="100"
            value={draft.splashDuration} onChange={(event) => update({ splashDuration: event.target.value })} />
        </label>
        <div className="pg-param" key="splash-logo">
          <span className="pg-param__label">LOGO</span>
          <Select
            label="启动画面 LOGO"
            value={logoMode}
            options={[
              { value: "default", label: "使用默认 LOGO" },
              { value: "custom", label: "选择本地图片…" },
              { value: "hidden", label: "隐藏 LOGO" },
            ]}
            onChange={chooseLogoMode}
            disabled={logoBusy || !supported}
          />
          <input ref={logoInput} hidden type="file" accept="image/*" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void loadLogo(file);
          }} />
          {logoError ? (
            <p className="pg-param__note pg-logo-error" role="alert">{logoError}</p>
          ) : logoMode === "custom" && draft.splashLogoImage ? (
            <div className="pg-logo-preview">
              <img src={`data:image/png;base64,${draft.splashLogoImage.png}`} alt="" width={28} height={28} />
              <span>{draft.splashLogoImage.name}</span>
            </div>
          ) : (
            <p className="pg-param__note">本地图片需为 1:1。</p>
          )}
        </div>
        <div className="pg-param" key="splash-bg">
          <span className="pg-param__label">背景色</span>
          <ColorPicker label="启动画面背景色" value={background} allowAlpha={false}
            disabled={!supported} onChange={(value) => update({ splashBackground: value })} />
        </div>
        <div className="pg-param" key="splash-fg">
          <span className="pg-param__label">前景色</span>
          <ColorPicker label="启动画面前景色" value={foreground} allowAlpha={false}
            disabled={!supported} onChange={(value) => update({ splashForeground: value })} />
          <p className="pg-param__note">用于加载动画。</p>
        </div>
      </Fragment>
    ),
    flags: (
      <div className="pg-flags-grid" key="flags">
        <div className="pg-flag-tile">
          <span className="pg-param__label">始终置顶</span>
          <Switch checked={draft.topmost} onChange={(value) => update({ topmost: value })} label="始终置顶" />
        </div>
        <div className="pg-flag-tile">
          <span className="pg-param__label">可调整边框</span>
          <Switch checked={draft.resizable} onChange={(value) => update({ resizable: value })} label="可调整边框" />
        </div>
        <div className="pg-flag-tile">
          <span className="pg-param__label">启动即最大化</span>
          <Switch
            checked={draft.maximized}
            onChange={(value) => update({ maximized: value })}
            label="启动即最大化"
          />
        </div>
        <div className="pg-flag-tile">
          <span className="pg-param__label">内容保护</span>
          <Switch
            checked={draft.contentProtection}
            onChange={(value) => update({ contentProtection: value })}
            label="内容保护"
          />
        </div>
      </div>
    ),
  };

  return (
    <>
      <Group>
        <Card>
          <div className="pg-launch-bar">
            {window ? <span className="pg-launch-state"><span aria-hidden="true" />窗口已打开</span> : null}
            <Button variant="primary" busy={launcher.busy === kind}
              disabled={!canRun || logoBusy || (showTitlebarStyle && !options.titlebarStyle)} onClick={run}>
              {window ? "重新运行" : "运行示例"}
            </Button>
            {window ? (
              <>
                <Button onClick={() => void launcher.focus(window.id)}>显示窗口</Button>
                <Button variant="plain" onClick={() => void launcher.close(window.id)}>关闭窗口</Button>
                {kind === "empty" && window.webviewIds.length === 0 ? (
                  <Button onClick={() => launcher.attach(window.id)}>挂载 WebView</Button>
                ) : null}
              </>
            ) : null}
          </div>
          {unsupportedReason ? (
            <Foot>{unsupportedReason}</Foot>
          ) : !supported ? (
            <Foot>此示例需要 Windows。</Foot>
          ) : null}
          {fields.length ? (
            <div className="pg-launch-options">
              {fields.map((field) => params[field])}
              <button type="button" className="btn btn--plain pg-param__reset" disabled={logoBusy} onClick={() => { setLogoError(""); reset(); }}>恢复默认</button>
            </div>
          ) : null}
        </Card>
      </Group>
      {showTitlebarStyle && (
        <Group title="标题栏样式">
          <Card className="pg-titlebar-style">
            <TitlebarStyleFields height={draft.titlebarHeight} colors={draft.titlebarColors} theme={effectiveTheme}
              onHeightChange={(titlebarHeight) => update({ titlebarHeight })}
              onColorsChange={(titlebarColors) => update({ titlebarColors })} />
          </Card>
        </Group>
      )}
      {points.length ? <ExamplePoints points={points} /> : null}
      <Group title="参考代码">
        <Card className="pg-source">
          <SourceCode
            code={baseCode}
            language={baseLanguage}
            snippets={snippets}
            preferredLanguage={host?.language}
          />
        </Card>
      </Group>
    </>
  );
}
