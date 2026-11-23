/**
 * 音效。
 *
 * 四个音就在 `src/assets/` 里，和封面图一样由 Vite 打包进 dist
 * （发布时再被 build.rs 内嵌进 exe），不需要任何额外配置：
 *
 * | 名字 | 用在哪 |
 * |---|---|
 * | `start` | 程序启动（拿到游戏信息、界面出来之后）——**跳掉开头 1 秒** |
 * | `tip` | 底部提示条 |
 * | `open` / `close` | 开关打开 / 关闭 |
 *
 * ## 只有一个播放通道
 *
 * **全局只有一个 `Audio` 实例**，放新音时直接接管（上一声立刻停）。
 *
 * 为什么不是"一个音一个播放器"：那样两个音会**同时响**——而界面上这种事很常见
 * （拨开关会同时触发开关音和紧随其后的提示音）。靠"隔多久内不播另一个"去躲，
 * 是治标；只有一个通道，物理上就不可能重叠。
 */

import closeUrl from "../assets/close.mp3";
import openUrl from "../assets/open.mp3";
import startUrl from "../assets/start.mp3";
import tipUrl from "../assets/tip.mp3";
import { getPrefs } from "./prefs";

export type SoundName = "start" | "tip" | "open" | "close";

const SOURCES: Record<SoundName, string> = {
  start: startUrl,
  tip: tipUrl,
  open: openUrl,
  close: closeUrl,
};

/**
 * 各音效的**相对响度**（启动音 = 1）。
 *
 * 开关音本来就不该和启动音一样响——这类动作一天要拨很多次，太亮会很烦。
 * 最终音量 = 这里的相对值 × 设置里的总音量（默认 0.5，也就是和加音量设置之前完全一致）。
 */
const RELATIVE: Record<SoundName, number> = {
  start: 1,
  tip: 0.9,
  open: 0.68,
  close: 0.68,
};

/**
 * 各音效**从第几秒开始放**。
 *
 * 启动音砍掉开头 1 秒——那段是引子，直接进正题更干脆。
 */
const START_AT: Record<SoundName, number> = {
  start: 1,
  tip: 0,
  open: 0,
  close: 0,
};

/** 唯一的播放通道。 */
let player: HTMLAudioElement | null = null;

/** 当前挂在这条通道上的音（换音才重设 src，同一个音重播只是倒回去重放）。 */
let current: SoundName | null = null;

/**
 * 开关音之后多久内不放提示音（毫秒）。
 *
 * 现在只有一个通道，所以这不是为了防重叠，而是**别把开关音掐断**：
 * 拨开关必然紧接着弹一条提示（"变速已开启"…），提示音一进来就把开关音切了，
 * 听起来是"响了一半就没了"。这段时间里提示音让位。
 *
 * 取 1000ms 是因为「每次购买增加」要等宿主把注入装好才回结果，比别的慢得多。
 * **报错的提示音不受限制**（见 `force`）——那种消息必须听得见。
 */
const TIP_QUIET_AFTER_SWITCH = 1000;

let lastSwitchSoundAt = Number.NEGATIVE_INFINITY;

/**
 * 播一个音效。
 *
 * `force` = 无视"开关音之后的静默窗口"，只给**报错提示**用。
 */
export function playSound(name: SoundName, force = false): void {
  // 用户在设置里关掉了这一类音效 → 直接不响
  if (!getPrefs().sounds[name]) {
    return;
  }
  const now = performance.now();
  if (name === "tip" && !force && now - lastSwitchSoundAt < TIP_QUIET_AFTER_SWITCH) {
    return;
  }
  player ??= new Audio();
  if (name === "open" || name === "close") {
    lastSwitchSoundAt = now;
  }

  if (current !== name) {
    // 起点用 URL 片段 `#t=N` 交给浏览器，而不是靠下面的 `currentTime` 赋值：
    // **首次播放时媒体还没加载完，给 currentTime 赋值会抛**（见下面的 catch），
    // 那样"跳过开头 1 秒"就悄悄失效了。片段是加载时就生效的，不看加载状态。
    const from = START_AT[name];
    player.src = from > 0 ? `${SOURCES[name]}#t=${from}` : SOURCES[name];
    current = name;
  }
  // 音量每次都读：设置里拖滑杆要立刻听到变化，不能只在换音时才设
  player.volume = Math.min(1, RELATIVE[name] * getPrefs().volume);
  // 同一个音重复触发要回到**它自己的起点**（不是 0：启动音的起点是第 1 秒）
  try {
    player.currentTime = START_AT[name];
  } catch {
    // 还没加载好时赋值会抛；这个活儿已经由上面的 url 片段兜住了
  }
  // 音效不该影响任何流程：放不出来（比如还没解码完、被自动播放策略拦下）就算了
  void player.play().catch(() => {});
}
