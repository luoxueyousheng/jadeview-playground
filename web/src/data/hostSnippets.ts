import type { HostDescriptor } from "../bridge";
import type { LaunchOptions } from "../launch";
import type { CodeLanguage, ExampleMeta } from "./catalog";

export type SnippetMap = Partial<Record<string, string>>;

const customSnippets: Record<string, SnippetMap> = {};

/** 动态注册多语言参考代码片段，供 `web/src/hosts/languages/*.ts` 或自定义插槽调用 */
export function registerLanguageSnippets(kind: string, snippets: SnippetMap): void {
  customSnippets[kind] = { ...customSnippets[kind], ...snippets };
}

/** 宿主 language 标识到代码标签页名称的标准化映射 */
export function normalizeLanguageLabel(language?: string): string | undefined {
  if (!language) return undefined;
  const key = language.trim().toLowerCase();
  const map: Record<string, CodeLanguage> = {
    c: "C",
    "c++": "C++",
    cpp: "C++",
    cxx: "C++",
    go: "Go",
    golang: "Go",
    rust: "Rust",
    rs: "Rust",
    python: "Python",
    py: "Python",
    javascript: "JavaScript",
    js: "JavaScript",
    typescript: "TypeScript",
    ts: "TypeScript",
    csharp: "C#",
    "c#": "C#",
    cs: "C#",
  };
  return map[key] ?? language;
}

export function buildDynamicSnippets(
  kind: string,
  options: LaunchOptions,
  effectiveTheme: string,
): SnippetMap | null {
  if (kind === "splash") {
    const lightSplash = effectiveTheme === "Light";
    const background = options.splashBackground ?? (lightSplash ? "#f5f7f6" : "#172622");
    const foreground = options.splashForeground ?? (lightSplash ? "#237b61" : "#66d6ae");
    const bgHex = background.slice(1).toUpperCase();
    const fgHex = foreground.slice(1).toUpperCase();
    const logoPath = options.splashLogo ? `"assets/playground.png"` : "";

    const pyLogo = options.splashLogoData
      ? 'logo_data=Path("logo.png").read_bytes(),  # 正方形 PNG'
      : `logo_path=${options.splashLogo ? '"assets/playground.png"' : "None"},`;
    const pyImport = options.splashLogoData ? "from pathlib import Path\n" : "";

    return {
      Python: `${pyImport}from jadeview_next import SplashOptions, WindowFeatures, WindowOptions

# 启动画面只作用于新建窗口，minimum_ms 的单位为毫秒。
features = WindowFeatures(splash=SplashOptions(
    minimum_ms=${options.splashDuration},
    ${pyLogo}
    # 颜色使用 0xAARRGGBB，依次是画面背景和加载动效。
    background_color=0xFF${bgHex},
    accent_color=0xFF${fgHex},
))
window = runtime.create_window("https://jade.run",
    options=WindowOptions(theme="${effectiveTheme}"), features=features)`,
      Go: `features := jade.WindowFeatures{
\tSplash: &jade.SplashOptions{
\t\tMinimumMs:       ${options.splashDuration},
\t\tLogoPath:        ${logoPath ? logoPath : `""`},
\t\tBackgroundColor: 0xFF${bgHex},
\t\tAccentColor:     0xFF${fgHex},
\t},
}
win, err := runtime.CreateWindow("https://jade.run", jade.WindowOptions{
\tTheme: "${effectiveTheme}",
}, features)`,
      Rust: `let features = WindowFeatures {
    splash: Some(SplashOptions {
        minimum_ms: ${options.splashDuration},
        logo_path: ${logoPath ? `Some(${logoPath})` : "None"},
        background_color: 0xFF${bgHex},
        accent_color: 0xFF${fgHex},
    }),
    ..Default::default()
};
let window = runtime.create_window("https://jade.run", WindowOptions {
    theme: "${effectiveTheme}",
    ..Default::default()
}, features)?;`,
      C: `// 在 features.splash 中传入启动画面配置后创建窗口
JadeSplashOptions splash = {
    .minimum_ms = ${options.splashDuration},
    .logo_path = ${logoPath ? logoPath : "NULL"},
    .background_color = 0xFF${bgHex},
    .accent_color = 0xFF${fgHex},
};
features.splash = &splash;
create_webview_window(url, 0, &options, &settings, &features);`,
    };
  }

  if (kind === "flags") {
    const x = options.x ?? -1;
    const y = options.y ?? -1;
    return {
      Python: `from jadeview_next import WindowFeatures, WindowOptions

# 内容保护与位置保存作为窗口扩展功能传入。
features = WindowFeatures(
    content_protection=${options.contentProtection ? "True" : "False"},
    auto_save_state=${options.autoSaveState ? "True" : "False"},  # 按窗口 ID 保存位置
)
window = runtime.create_window("https://jade.run",
    options=WindowOptions(width=${options.width}, height=${options.height},
                          x=${x}, y=${y},
                          resizable=${options.resizable ? 1 : 0},
                          always_on_top=${options.topmost ? 1 : 0},
                          maximized=${options.maximized ? 1 : 0}),
    features=features)`,
      Go: `features := jade.WindowFeatures{
\tContentProtection: ${options.contentProtection},
\tAutoSaveState:     ${options.autoSaveState},
}
win, err := runtime.CreateWindow("https://jade.run", jade.WindowOptions{
\tWidth:       ${options.width},
\tHeight:      ${options.height},
\tX:           ${x},
\tY:           ${y},
\tResizable:   ${options.resizable},
\tAlwaysOnTop: ${options.topmost},
\tMaximized:   ${options.maximized},
}, features)`,
      Rust: `let features = WindowFeatures {
    content_protection: ${options.contentProtection},
    auto_save_state: ${options.autoSaveState},
    ..Default::default()
};
let window = runtime.create_window("https://jade.run", WindowOptions {
    width: ${options.width},
    height: ${options.height},
    x: ${x},
    y: ${y},
    resizable: ${options.resizable},
    always_on_top: ${options.topmost},
    maximized: ${options.maximized},
    ..Default::default()
}, features)?;`,
      C: `options.width = ${options.width};
options.height = ${options.height};
options.x = ${x};
options.y = ${y};
options.resizable = ${options.resizable ? 1 : 0};
options.always_on_top = ${options.topmost ? 1 : 0};
options.maximized = ${options.maximized ? 1 : 0};
features.content_protection = ${options.contentProtection ? 1 : 0};
features.auto_save_state = ${options.autoSaveState ? 1 : 0};
create_webview_window(url, 0, &options, &settings, &features);`,
    };
  }

  return null;
}

/** 聚合某示例在当前宿主下的所有语言代码片段（基础 -> 模块注册表 -> 动态/自定义扩展 -> 宿主注入） */
export function resolveExampleSnippets(
  kind: string,
  baseLanguage: string,
  baseCode: string,
  host?: HostDescriptor,
  metaSnippets?: SnippetMap,
): Record<string, string> {
  const merged: Record<string, string> = {};
  if (baseCode) {
    merged[baseLanguage] = baseCode;
  }
  const extra = customSnippets[kind];
  if (extra) {
    for (const [lang, code] of Object.entries(extra)) {
      if (code) merged[lang] = code;
    }
  }
  if (metaSnippets) {
    for (const [lang, code] of Object.entries(metaSnippets)) {
      if (code) merged[lang] = code;
    }
  }
  const hostOverrides = host?.codeSnippets?.[kind];
  if (hostOverrides) {
    for (const [lang, code] of Object.entries(hostOverrides)) {
      if (code) {
        const label = normalizeLanguageLabel(lang) ?? lang;
        merged[label] = code;
      }
    }
  }
  return merged;
}

export function resolvePreferredLanguage(
  availableLanguages: string[],
  hostLanguage?: string,
  fallback?: string,
): string {
  const normalizedHost = normalizeLanguageLabel(hostLanguage);
  if (normalizedHost && availableLanguages.includes(normalizedHost)) {
    return normalizedHost;
  }
  if (fallback && availableLanguages.includes(fallback)) {
    return fallback;
  }
  return availableLanguages[0] ?? fallback ?? "C";
}

export type HostExampleMeta = Pick<ExampleMeta, "kind" | "language" | "api" | "snippets">;
