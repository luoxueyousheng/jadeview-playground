import { parseTitlebarHeight, readTitlebarColors, type TitlebarColors, type TitlebarStyle } from "./lib/titlebarStyle";

type SystemMaterial = "mica" | "micaAlt" | "acrylic";
export type Material = "default" | SystemMaterial | `${SystemMaterial}_keepActive`;
export type LaunchTheme = "System" | "Dark" | "Light";
export type LaunchStyle = "default" | "BarOverlay" | "hidden";

const MATERIAL_OPTIONS: ReadonlyArray<{ value: Material; label: string }> = [
  { value: "default", label: "无" },
  { value: "mica", label: "Mica" },
  { value: "micaAlt", label: "Mica Alt" },
  { value: "acrylic", label: "Acrylic" },
];

const KEEP_ACTIVE_MATERIAL_OPTIONS: typeof MATERIAL_OPTIONS = [
  { value: "mica_keepActive", label: "Mica（失焦保留）" },
  { value: "micaAlt_keepActive", label: "Mica Alt（失焦保留）" },
  { value: "acrylic_keepActive", label: "Acrylic（失焦保留）" },
];

export function materialOptions(keepActiveBackdrop: boolean) {
  return keepActiveBackdrop
    ? [...MATERIAL_OPTIONS, ...KEEP_ACTIVE_MATERIAL_OPTIONS]
    : MATERIAL_OPTIONS;
}

export const THEME_OPTIONS: ReadonlyArray<{ value: LaunchTheme; label: string }> = [
  { value: "System", label: "跟随系统" },
  { value: "Dark", label: "深色" },
  { value: "Light", label: "浅色" },
];

export const STYLE_OPTIONS: ReadonlyArray<{ value: LaunchStyle; label: string }> = [
  { value: "default", label: "系统标题栏" },
  { value: "BarOverlay", label: "覆盖层" },
  { value: "hidden", label: "隐藏" },
];

export type SampleField = "title" | "size" | "position" | "frameless" | "resizable" | "material" | "theme" | "flags" | "splash";

/** 与宿主 `spawn` 的校验区间保持一致。 */
export const SIZE_LIMITS = { minWidth: 480, maxWidth: 3840, minHeight: 360, maxHeight: 2160 };

/** 表单状态：数字留成字符串，清空表示「交给系统」。 */
export interface SplashLogoImage {
  name: string;
  png: string;
}

export interface LaunchDraft {
  splashLogoImage: SplashLogoImage | null;
  splashDuration: string;
  splashBackground: string | null;
  splashForeground: string | null;
  title: string;
  width: string;
  height: string;
  x: string;
  y: string;
  material: Material;
  theme: LaunchTheme;
  themeCustomized?: boolean;
  style: LaunchStyle;
  titlebarHeight: string;
  titlebarColors: TitlebarColors;
  /** 无边框是独立参数，与标题栏样式分开设置。 */
  frameless: boolean;
  resizable: boolean;
  topmost: boolean;
  maximized: boolean;
  contentProtection: boolean;
  autoSaveState: boolean;
  splashLogo: boolean;
}

/** 提交给宿主的形状。 */
export interface LaunchOptions {
  splashLogoData: string | null;
  splashDuration: number;
  splashBackground: string | null;
  splashForeground: string | null;
  title: string;
  width: number;
  height: number;
  x: number | null;
  y: number | null;
  material: Material;
  theme?: LaunchTheme;
  style: LaunchStyle;
  titlebarStyle?: TitlebarStyle;
  frameless: boolean;
  resizable: boolean;
  topmost: boolean;
  maximized: boolean;
  contentProtection: boolean;
  autoSaveState: boolean;
  splashLogo: boolean;
}

/** 默认尺寸：布局示例要更宽，和宿主原来的取值一致。 */
export function defaultSize(kind: string): { width: number; height: number } {
  return kind === "layout" ? { width: 1280, height: 820 } : { width: 1060, height: 820 };
}

/** 覆盖层示例的标题栏样式就是它要演示的东西，页面上不给改。 */
export function fixedStyle(kind: string): LaunchStyle | null {
  if (kind === "dwm") return "default";
  if (kind === "overlay") return "BarOverlay";
  if (kind === "hidden" || kind === "frameless") return "hidden";
  return null;
}

function defaultMaterial(kind: string, win11: boolean): Material {
  return kind === "overlay" && win11 ? "mica" : "default";
}

export function defaultDraft(kind: string, theme: LaunchTheme, win11: boolean): LaunchDraft {
  const size = defaultSize(kind);
  return {
    title: "",
    width: String(size.width),
    height: String(size.height),
    x: "",
    y: "",
    material: defaultMaterial(kind, win11),
    theme,
    themeCustomized: false,
    style: fixedStyle(kind) ?? (kind === "hidden" || kind === "frameless" ? "hidden" : "default"),
    titlebarHeight: "0",
    titlebarColors: {},
    frameless: kind === "frameless",
    resizable: true,
    topmost: false,
    maximized: false,
    contentProtection: false,
    autoSaveState: false,
    splashLogo: true,
    splashLogoImage: null,
    splashDuration: "1400",
    splashBackground: null,
    splashForeground: null,
  };
}

const KEY_PREFIX = "pg.launch.";

function pick<T extends string>(value: unknown, allowed: ReadonlyArray<{ value: T }>, fallback: T): T {
  return allowed.some((item) => item.value === value) ? (value as T) : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readSplashColor(value: unknown): string | null {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

/** 读出该示例上次用的参数；没存过、或存的东西不合法时回到默认值。 */
export function readDraft(kind: string, theme: LaunchTheme, win11: boolean, keepActiveBackdrop: boolean): LaunchDraft {
  const base = defaultDraft(kind, theme, win11);
  let stored: unknown = null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + kind);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  if (!stored || typeof stored !== "object") return base;
  const record = stored as Record<string, unknown>;
  // 将旧版 Playground 已保存的 Mica 配置切到原生失焦模式。
  let material = record.material;
  if (material === "mica_live") material = "mica_keepActive";
  if (material === "micaAlt_live") material = "micaAlt_keepActive";
  const fixed = fixedStyle(kind);
  const logo = record.splashLogoImage as Partial<SplashLogoImage> | null | undefined;

  const keepStoredTheme = record["themeCustomized"] === true && (kind === "theme" || kind === "overlay" || kind === "splash");
  return {
    title: text(record["title"], base.title),
    width: text(record["width"], base.width),
    height: text(record["height"], base.height),
    x: text(record["x"], base.x),
    y: text(record["y"], base.y),
    material: win11 ? pick(material, materialOptions(keepActiveBackdrop), base.material) : base.material,
    theme: keepStoredTheme ? pick(record["theme"], THEME_OPTIONS, base.theme) : base.theme,
    themeCustomized: keepStoredTheme,
    style: fixed ?? base.style,
    titlebarHeight: text(record.titlebarHeight, base.titlebarHeight),
    titlebarColors: readTitlebarColors(record.titlebarColors),
    frameless: flag(record["frameless"], base.frameless),
    resizable: flag(record["resizable"], base.resizable),
    topmost: flag(record["topmost"], base.topmost),
    maximized: flag(record["maximized"], base.maximized),
    contentProtection: flag(record["contentProtection"], base.contentProtection),
    autoSaveState: flag(record["autoSaveState"], base.autoSaveState),
    splashLogo: flag(record["splashLogo"], base.splashLogo),
    splashLogoImage: typeof logo?.name === "string" && typeof logo.png === "string"
      ? { name: logo.name, png: logo.png } : null,
    splashDuration: text(record["splashDuration"], base.splashDuration),
    splashBackground: readSplashColor(record.splashBackground),
    splashForeground: readSplashColor(record.splashForeground),
  };
}

export function writeDraft(kind: string, draft: LaunchDraft): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + kind, JSON.stringify(draft));
  } catch {
    // 存不下就算了：参数只影响下一次打开，不值得为它报错。
  }
}

export function clearDraft(kind: string): void {
  try {
    window.localStorage.removeItem(KEY_PREFIX + kind);
  } catch {
    // 同上。
  }
}

function clampInt(input: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(input.trim(), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function optionalInt(input: string, limit = 20000): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value)) return null;
  return Math.min(limit, Math.max(-limit, value));
}

/** 收成宿主能直接用的形状：越界值夹到边界，空值表示「交给系统」。 */
export function toLaunch(kind: string, draft: LaunchDraft): LaunchOptions {
  const size = defaultSize(kind);
  const titlebarHeight = kind === "dwm" ? parseTitlebarHeight(draft.titlebarHeight) : null;
  const sendsTheme = kind === "theme" || kind === "overlay" || kind === "splash";
  return {
    title: draft.title.trim().slice(0, 120),
    width: clampInt(draft.width, size.width, SIZE_LIMITS.minWidth, SIZE_LIMITS.maxWidth),
    height: clampInt(draft.height, size.height, SIZE_LIMITS.minHeight, SIZE_LIMITS.maxHeight),
    x: optionalInt(draft.x),
    y: optionalInt(draft.y),
    material: draft.material,
    ...(sendsTheme ? { theme: draft.theme } : {}),
    style: fixedStyle(kind) ?? draft.style,
    titlebarStyle: titlebarHeight === null ? undefined : { height: titlebarHeight, colors: draft.titlebarColors },
    frameless: draft.frameless,
    resizable: draft.resizable,
    topmost: draft.topmost,
    maximized: draft.maximized,
    contentProtection: draft.contentProtection,
    autoSaveState: draft.autoSaveState,
    splashLogo: draft.splashLogo,
    splashLogoData: draft.splashLogo ? draft.splashLogoImage?.png ?? null : null,
    splashDuration: clampInt(draft.splashDuration, 1400, 0, 5000),
    splashBackground: draft.splashBackground,
    splashForeground: draft.splashForeground,
  };
}

/** 宿主回报的主题是普通字符串，转成下拉能用的值。 */
export function asLaunchTheme(value: string): LaunchTheme {
  return value === "Dark" || value === "Light" ? value : "System";
}

