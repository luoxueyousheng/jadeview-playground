/** 界面上各种"给人看"的格式化。纯函数，不碰 DOM，React 里直接当字符串用。 */

/** 余额加上千分位，方便和游戏里对眼睛。 */
export function formatAmount(raw: string | null): string {
  if (raw === null || raw === "") {
    return "—";
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return raw;
  }
  return numeric.toLocaleString("en-US");
}

/**
 * 把输入框里的金额文本剥成纯数字：千分位逗号（半角/全角）、下划线和空白都去掉。
 *
 * 界面上金额是**带逗号显示**的（下拉选入的就是 `1,000,000` 这种格式，见 `formatAmount`），
 * 但这个格式只给人看——**校验和提交前必须过这里**，否则 `Number("1,000,000")` 是 NaN。
 * 宿主侧解析时同样会剥（`InputValue::parse` 去掉 `,` `_` 和空格），两边保持一致。
 */
export function cleanAmountInput(raw: string): string {
  return raw.replace(/[,\uFF0C_\s]/g, "");
}

/**
 * 金额的口语化说法：`1234567` → 「约 123.46 万」，`100000000` → 「1 亿」（整数不再写「约」）。
 *
 * 精确数字已经用千分位显示在余额上了，这一行只帮人一眼看出「多大」——
 * 一串零数到头也未必有概念。不到 1 万就没有缩写的必要，返回空串（那行不显示）。
 */
export function formatAmountSpoken(raw: string | null): string {
  if (raw === null || raw === "") {
    return "";
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? "-" : "";
  /** 最多两位小数，并去掉无意义的尾随 0（1.00 → 1，123.40 → 123.4）。 */
  const trim = (value: number) => value.toFixed(2).replace(/\.?0+$/, "");
  /**
   * 「约」只在**真的舍掉了低位**时才写。
   *
   * 判据：把缩写后的数字还原回原值，对得上就是精确值——1 亿就是 1 亿，
   * 说成「约 1 亿」反而是错的（用户就是拿这个整数来问的）。
   */
  const unit = (value: number, divisor: number, name: string) => {
    const text = trim(value / divisor);
    const exact = Math.round(Number(text) * divisor) === Math.round(value);
    return `${exact ? "" : "约 "}${sign}${text} ${name}`;
  };
  if (abs >= 100_000_000) {
    return unit(abs, 100_000_000, "亿");
  }
  if (abs >= 10_000) {
    return unit(abs, 10_000, "万");
  }
  return "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index] ?? "GB"}`;
}

/** 秒数 → 「时:分:秒」（不足 1 小时省略小时段，如 4:05 / 1:02:03） */
export function formatDuration(totalSecs: number): string {
  const secs = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/**
 * 剩余时间口语化：分钟粒度。
 *
 * 精确到秒的预估没有意义——扫描速率本来就在变，数字只会来回跳，
 * 反而让人怀疑是不是卡住了。按分钟说，读起来稳当也更像人话。
 */
export function formatEta(secs: number): string {
  if (secs < 60) {
    return "不到 1 分钟";
  }
  const minutes = Math.round(secs / 60);
  return minutes <= 1 ? "约 1 分钟" : `约 ${minutes} 分钟`;
}

/**
 * 版本号展示：宿主给的是三段式（`0.5.0`，Cargo 只认这种），
 * 最后一个 `.0` 对玩家没意义：`1.0.0` 显示成 `v1.0`，`0.5.0` 显示成 `v0.5`。
 */
export function formatVersion(raw: string): string {
  return `v${raw.replace(/\.0$/, "")}`;
}

/** 异常 → 一句人话。 */
export function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
