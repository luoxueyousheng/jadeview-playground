/**
 * 用户偏好：音效、快捷键、主题、封面收缩状态。落在 localStorage 里，重开程序算数。
 *
 * 为什么用「模块级单例 + 订阅」而不是 React state：
 * `playSound()` 是模块级函数（`components/ui.tsx` 的共用 `Switch` 里直接调它），
 * 它需要一个**同步可读**的开关值。放在 React state 里就得把它一路当 prop 传下去，
 * 或者每次播放都去问 React 要——都不如直接读这里的一份。
 *
 * 界面侧要重新渲染时用 `usePrefs()`（`useSyncExternalStore`）订阅同一份数据。
 */

import { useSyncExternalStore } from "react";

import type { SoundName } from "./sound";
import { CAPSULE_VIEWS, normalizeCapsuleViews, type CapsuleView } from "./capsule";
import { normalizeCapsuleDock, type CapsuleDock } from "./capsuleDock";

/** 需要绑定快捷键的动作。 */
export type HotkeyAction = "applySet" | "add" | "bonus" | "lock" | "free";

/** 主题：跟随系统 / 固定深色 / 固定浅色。 */
export type ThemePref = "system" | "dark" | "light";
/**
 * 界面风格（皮肤）。
 *
 * 和 `theme`（深/浅）**正交**：皮肤管的是圆角、描边、材质、字重这套造型语言，
 * 深/浅管的是明暗色板。两者叠加成 2×2，不必为每种皮肤复制一套深色变量。
 * "classic" 是发行至今的默认外观，新皮肤默认关，老用户升级后界面不变。
 */
export type SkinPref = "classic" | "clay";

export interface Prefs {
  /** 每类音效各自的总开关 */
  sounds: Record<SoundName, boolean>;
  /** 动作 → 按键的 `KeyboardEvent.code`（用 code 而不是 key：小键盘数字不受输入法/布局影响） */
  hotkeys: Record<HotkeyAction, string>;
  theme: ThemePref;
  /** 界面风格；与明暗主题正交，见 `SkinPref` */
  skin: SkinPref;
  reduceMotion: boolean;
  colorWeakMode: boolean;
  capsuleRotation: boolean;
  capsuleViews: CapsuleView[];
  capsulePosition: CapsuleDock;
  /** 右下角落点的朝向：拖动时按"更靠哪条边"自动决定，这里只存结果 */
  capsuleCorner: "horizontal" | "vertical";
  /**
   * 总音量 0~1。
   *
   * 是**倍率**而不是绝对音量：各音效自己还有一套相对响度（开关音本来就该比启动音轻），
   * 最终音量 = 相对响度 × 这个值。默认满格，滑下来才会变轻。
   */
  volume: number;
  /**
   * 封面（标题栏）是不是收起的。
   *
   * 放这儿是为了**持久化**：用户把封面收起来腾地方，下次打开还是收着的，
   * 不用每次启动都手工再收一遍。
   */
  heroCollapsed: boolean;
  /**
   * 窗口变窄时自动收起侧栏、变宽时自动展开。
   *
   * 默认开启：窄窗口下侧栏占 180px，内容区会被挤到没法用；
   * 想要固定状态（比如一直收起）就在设置里关掉，之后手动切换即可。
   */
  sidebarAuto: boolean;
  /** 侧边栏是否收起为紧凑图标栏。 */
  sidebarCollapsed: boolean;
  /**
   * 记住上次停留的导航页面，下次启动直接回到那里。
   *
   * 默认关：导航页是**工作现场**，不是偏好；不开这个开关时程序永远从「常用」开始，
   * 和以前完全一致。记录本身放在另一个 key（见 `lastPage.ts`），
   * 关掉开关不会抹掉上次的位置，重新打开还能接着用。
   */
  rememberPage: boolean;
  /**
   * 是否在游戏窗口内显示灵动岛子窗口（仅是本机偏好）。
   *
   * **能不能真的用由功能 ID 决定**（服务端下发的功能清单里有没有 `dynamic-island`），
   * 以前靠"发行版隐藏"（`import.meta.env.DEV`），现在改成功能解锁——
   * 偏好照存，但功能未解锁时不会同步给宿主，设置里也不显示这一行。
   */
  dynamicIsland: boolean;
}

/**
 * 默认快捷键：小键盘的**符号键**（− + × ÷ .）。
 *
 * ⚠️ 不用数字键：游戏里把小键盘 1~9 全占了，按下去只会让人分不清"这个键到底是
 * 改钱还是动游戏"。选键逻辑：− / + 是相邻的两把"写金额"的键（修改金额 / 增加金额），
 * × 是「每次购买增加」（每买一次乘出一笔），÷ 是「购买免费」（把支出除掉），
 * . 是「余额锁定」（把余额定在这一点）。
 */
export const DEFAULT_PREFS: Prefs = {
  sounds: { start: true, tip: true, open: true, close: true },
  hotkeys: {
    applySet: "NumpadSubtract",
    add: "NumpadAdd",
    bonus: "NumpadMultiply",
    lock: "NumpadDecimal",
    free: "NumpadDivide",
  },
  theme: "system",
  skin: "classic",
  reduceMotion: false,
  colorWeakMode: false,
  capsuleRotation: true,
  capsuleViews: CAPSULE_VIEWS.map(view => view.id),
  capsulePosition: "sidebar",
  capsuleCorner: "horizontal",
  volume: 1,
  // 默认展开：封面是这程序的门面，第一次跑总该让用户看见
  heroCollapsed: false,
  // 自动展开默认开：拉宽窗口时把侧栏带回来
  sidebarAuto: true,
  sidebarCollapsed: false,
  // 默认关：不开启时行为和以前一样，永远从「常用」开始
  rememberPage: false,
  dynamicIsland: false,
  // 日志默认关：用户端用不着，排查问题时才在设置里打开
};

const STORAGE_KEY = "tf3mm.prefs";

/** localStorage 读写都包一层：拿不到（隐私模式、存储被禁）就用默认值，不能让界面挂掉。 */
function readStored(): Partial<Prefs> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
  } catch {
    return {};
  }
}

function writeStored(prefs: Prefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 存不下就只在这次运行里生效，不打扰用户
  }
}

/**
 * 和默认值合并。
 *
 * 必须逐项合：以后新增音效或快捷键时，老用户存的那份里没有这些字段，
 * 直接用会把新项读成 undefined（开关显示不出来、快捷键失效）。
 * 另外顺带做一次「旧默认键 → 符号键」的迁移，见下面那段 if。
 */
function normalize(stored: Partial<Prefs>): Prefs {
  const rawVolume = typeof stored.volume === "number" ? stored.volume : DEFAULT_PREFS.volume;
  const theme: ThemePref =
    stored.theme === "dark" || stored.theme === "light" ? stored.theme : DEFAULT_PREFS.theme;
  const hotkeys = { ...DEFAULT_PREFS.hotkeys, ...(stored.hotkeys ?? {}) };
  // 迁移：四把键**整套**还停在 0.5.x 数字默认键的（= 从没录过快捷键）→ 升级成符号键，
  // 否则升级了程序的人还留着和游戏冲突的数字键。只要录过其中一个，整组都不碰。
  if (
    hotkeys.applySet === "Numpad1" &&
    hotkeys.add === "Numpad4" &&
    hotkeys.bonus === "Numpad2" &&
    hotkeys.free === "Numpad3"
  ) {
    hotkeys.applySet = DEFAULT_PREFS.hotkeys.applySet;
    hotkeys.add = DEFAULT_PREFS.hotkeys.add;
    hotkeys.bonus = DEFAULT_PREFS.hotkeys.bonus;
    hotkeys.free = DEFAULT_PREFS.hotkeys.free;
    // 余额锁定的数字默认键只存在于没发布的开发版，一并升级
    if (hotkeys.lock === "Numpad5") {
      hotkeys.lock = DEFAULT_PREFS.hotkeys.lock;
    }
  }
  return {
    sounds: { ...DEFAULT_PREFS.sounds, ...(stored.sounds ?? {}) },
    hotkeys,
    theme,
    // 只认这两个值；老配置里没这个字段时回落默认外观
    skin: stored.skin === "clay" ? "clay" : "classic",
    reduceMotion: stored.reduceMotion === true,
    colorWeakMode: stored.colorWeakMode === true,
    capsuleRotation: stored.capsuleRotation !== false,
    capsuleViews: normalizeCapsuleViews(stored.capsuleViews),
    capsulePosition: normalizeCapsuleDock(stored.capsulePosition),
  capsuleCorner: stored.capsuleCorner === "vertical" ? "vertical" : "horizontal",
    // 夹紧：手改 localStorage 塞进 5 这种值也不该把音量弄炸
    volume: Math.min(1, Math.max(0, rawVolume)),
    // 严格比 true：老用户存的那份里没这个字段（undefined），当展开处理
    heroCollapsed: stored.heroCollapsed === true,
    // 没存过 = 开（默认行为）；只有明确存成 false 才关
    sidebarAuto: stored.sidebarAuto !== false,
    sidebarCollapsed: stored.sidebarCollapsed === true,
    // 没存过 = 关：老用户升级后行为不变，要记住页面得自己去设置里打开
    rememberPage: stored.rememberPage === true,
    // 只存偏好；是否生效由服务端功能清单（dynamic-island）决定，见 App 里的同步逻辑
    dynamicIsland: stored.dynamicIsland === true,
    // 同理：没存过 = 关
  };
}

let current: Prefs = normalize(readStored());
const listeners = new Set<() => void>();
const syncStored = (event: StorageEvent) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  current = normalize(readStored());
  for (const listener of listeners) listener();
};
window.addEventListener("storage", syncStored);
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener("storage", syncStored));

function commit(next: Prefs): void {
  current = next;
  writeStored(next);
  for (const listener of listeners) {
    listener();
  }
}

/** 当前偏好。**同步可读**，音效播放那边每次都会问它。 */
export function getPrefs(): Prefs {
  return current;
}

/** 订阅变更（给 `useSyncExternalStore` 用）。 */
export function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSoundEnabled(name: SoundName, on: boolean): void {
  commit({ ...current, sounds: { ...current.sounds, [name]: on } });
}

export function setHotkey(action: HotkeyAction, code: string): void {
  commit({ ...current, hotkeys: { ...current.hotkeys, [action]: code } });
}

export function setTheme(theme: ThemePref): void {
  commit({ ...current, theme });
}

/** 切换界面风格；真正落到 DOM 上由 `theme.ts` 的订阅负责（和 data-theme 一起同步）。 */
export function setSkin(skin: SkinPref): void {
  commit({ ...current, skin });
}

export function setReducedMotion(enabled: boolean): void {
  commit({ ...current, reduceMotion: enabled });
}

export function setColorWeakMode(enabled: boolean): void {
  commit({ ...current, colorWeakMode: enabled });
}

export function setCapsuleRotation(enabled: boolean): void {
  commit({ ...current, capsuleRotation: enabled });
}

export function setCapsuleView(view: CapsuleView, enabled: boolean): void {
  const views = CAPSULE_VIEWS.filter(item => item.id === view ? enabled : current.capsuleViews.includes(item.id))
    .map(item => item.id);
  if (views.length) commit({ ...current, capsuleViews: views });
}

export function setCapsuleCorner(next: "horizontal" | "vertical"): void {
  commit({ ...current, capsuleCorner: next });
}

export function setCapsulePosition(position: CapsuleDock): void {
  commit({ ...current, capsulePosition: normalizeCapsuleDock(position) });
}

/** 记下封面的收起状态（小白条点一下就会调它）。 */
export function setHeroCollapsed(collapsed: boolean): void {
  commit({ ...current, heroCollapsed: collapsed });
}


/** 自动展开侧栏：变宽时自动展开，变窄始终收起。 */
export function setSidebarAuto(enabled: boolean): void {
  commit({ ...current, sidebarAuto: enabled });
}
export function setSidebarCollapsed(collapsed: boolean): void {
  commit({ ...current, sidebarCollapsed: collapsed });
}
/** 记住上次停留的导航页面（记录写在 `lastPage.ts` 的独立 key 里）。 */
export function setRememberPage(enabled: boolean): void {
  commit({ ...current, rememberPage: enabled });
}
/** 灵动岛作为游戏窗口子窗口显示；偏好保存在本机。 */
export function setDynamicIslandEnabled(enabled: boolean): void {
  commit({ ...current, dynamicIsland: enabled });
}

export function setVolume(volume: number): void {
  commit({ ...current, volume: Math.min(1, Math.max(0, volume)) });
}

/** 恢复默认（设置抽屉里那个「恢复默认」按钮）。 */
export function resetPrefs(): void {
  commit({ ...DEFAULT_PREFS, sounds: { ...DEFAULT_PREFS.sounds }, hotkeys: { ...DEFAULT_PREFS.hotkeys } });
}

/**
 * 订阅偏好的 React 钩子。
 *
 * `getServerSnapshot` 也传 `getPrefs`：这个应用没有 SSR，但参数是必填的，
 * 而且传同一个引用能保证快照稳定（`useSyncExternalStore` 要求同一份数据返回同一个对象，
 * 否则每次渲染都会重来一遍）。
 */
export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
}

// ---------------------------------------------------------------- 按键显示

/** `KeyboardEvent.code` → 人话。 */
const KEY_LABELS: Record<string, string> = {
  Numpad0: "小键盘 0",
  Numpad1: "小键盘 1",
  Numpad2: "小键盘 2",
  Numpad3: "小键盘 3",
  Numpad4: "小键盘 4",
  Numpad5: "小键盘 5",
  Numpad6: "小键盘 6",
  Numpad7: "小键盘 7",
  Numpad8: "小键盘 8",
  Numpad9: "小键盘 9",
  NumpadAdd: "小键盘 +",
  NumpadSubtract: "小键盘 −",
  NumpadMultiply: "小键盘 ×",
  NumpadDivide: "小键盘 ÷",
  NumpadDecimal: "小键盘 .",
  NumpadEnter: "小键盘 Enter",
  Space: "空格",
  Enter: "回车",
  Tab: "Tab",
  Backspace: "退格",
  Escape: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Backquote: "`",
  Minus: "−",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
};

/** 修饰键的固定顺序：录制、匹配、显示三处共用，保证存下来的串能被直接比较。 */
const MODIFIER_ORDER = ["Ctrl", "Shift", "Alt", "Win"] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

/** 当前事件按下的修饰键（顺序固定）。 */
function modifiersOf(event: KeyboardEvent): Modifier[] {
  const mods: Modifier[] = [];
  if (event.ctrlKey) {
    mods.push("Ctrl");
  }
  if (event.shiftKey) {
    mods.push("Shift");
  }
  if (event.altKey) {
    mods.push("Alt");
  }
  if (event.metaKey) {
    mods.push("Win");
  }
  return mods;
}

/** 把 `Ctrl+Shift+KeyK` 拆成修饰键列表与主键码（老数据没有修饰键，列表为空）。 */
function splitCode(code: string): { mods: string[]; base: string } {
  const parts = code.split("+");
  const base = parts.pop() ?? "";
  return { mods: parts, base };
}

/** 主键码 → 人话。 */
function keyLabel(base: string): string {
  const known = KEY_LABELS[base];
  if (known) {
    return known;
  }
  if (base.startsWith("Key")) {
    return base.slice(3);
  }
  if (base.startsWith("Digit")) {
    return base.slice(5);
  }
  return base;
}

export function formatKeyCode(code: string): string {
  if (!code) {
    return "未设置";
  }
  const { mods, base } = splitCode(code);
  return [...mods, keyLabel(base)].join(" + ");
}

/** 小键盘那几种杂键的短写。 */
const NUMPAD_SHORT: Record<string, string> = {
  Add: "+",
  Subtract: "−",
  Multiply: "×",
  Divide: "÷",
  Decimal: ".",
  Enter: "⏎",
};

/**
 * 极短写法，给界面上的键帽胶囊用。
 *
 * 小键盘数字就写「1」，**不要加任何符号**：先前用了 `⌗`（U+2317，
 * 本意是"视图数据方块"），结果字体里渲染出来是个怪模怪样的双竖线，
 * 完全不像键盘——键帽本来就只是个盒子，里面放键名就够了。
 * 「这是小键盘上的键」由 `title` 和设置里写的完整叫法（「小键盘 1」）交代。
 */
export function formatKeyCodeShort(code: string): string {
  if (!code) {
    return "—";
  }
  const { mods, base } = splitCode(code);
  const short = base.startsWith("Numpad")
    ? NUMPAD_SHORT[base.slice(6)] ?? base.slice(6)
    : keyLabel(base);
  return [...mods, short].join("+");
}

/**
 * 修饰键本身不能当快捷键（单按一个 Shift 没意义），录制时要忽略掉。
 * 另外 CapsLock / NumLock 这类锁定键也一并排除——它们常常被误按。
 */
const NOT_A_HOTKEY = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "CapsLock",
  "NumLock",
  "ScrollLock",
  "ContextMenu",
  "PrintScreen",
  "Pause",
]);

/**
 * 从按键事件里取出可用的快捷键码；不是一个能用的键就返回 `null`。
 *
 * 组合键会编码成 `Ctrl+Shift+KeyK`：纯修饰键按下时返回 `null`（继续等主键），
 * 主键按下时把当时按住的修饰键按固定顺序拼在前面。
 */
export function keyCodeFromEvent(event: KeyboardEvent): string | null {
  if (!event.code || NOT_A_HOTKEY.has(event.code)) {
    return null;
  }
  return [...modifiersOf(event), event.code].join("+");
}

/**
 * 事件是否命中某个快捷键码：主键相同、修饰键也**必须一模一样**。
 *
 * 精确比对而不是"包含"：单键 `KeyK` 不该被 `Ctrl+K` 触发（否则会和游戏/输入框
 * 的常见组合冲突），`Ctrl+K` 也不接受多按一个 Shift。
 */
export function matchesHotkey(event: KeyboardEvent, code: string): boolean {
  if (!code) {
    return false;
  }
  const { mods, base } = splitCode(code);
  if (event.code !== base) {
    return false;
  }
  const pressed = modifiersOf(event);
  return pressed.length === mods.length && mods.every((mod) => pressed.includes(mod as Modifier));
}

/**
 * 是不是正在录制快捷键。
 *
 * 录制时按下的那个键是要被**录进去**的，绝不能被全局快捷键当成"触发"——
 * 否则你想把「修改金额」改成小键盘 3，一按下去就先改了一次金额。
 * 两边都在 window 上监听，靠监听顺序去分先后不可靠，所以用一个显式开关。
 */
let recordingHotkey = false;

export function setRecordingHotkey(value: boolean): void {
  recordingHotkey = value;
}

export function isRecordingHotkey(): boolean {
  return recordingHotkey;
}
