export const CAPSULE_VIEWS = [
  { id: "growth", label: "公司成长" },
  { id: "balance", label: "公司资金" },
  { id: "speed", label: "模拟速度" },
  { id: "music", label: "正在播放" },
] as const;

export type CapsuleView = typeof CAPSULE_VIEWS[number]["id"];

export function normalizeCapsuleViews(value: unknown): CapsuleView[] {
  if (!Array.isArray(value)) return CAPSULE_VIEWS.map(view => view.id);
  const views = CAPSULE_VIEWS.filter(view => value.includes(view.id)).map(view => view.id);
  return views.length ? views : ["growth"];
}

/** A shuffled deck covers every available view once; round boundaries never repeat a view. */
export function capsuleDeck(views: readonly CapsuleView[], previous: CapsuleView,
  random: () => number = Math.random): CapsuleView[] {
  const deck = [...new Set(views)];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  if (deck.length > 1 && deck[0] === previous) [deck[0], deck[1]] = [deck[1]!, deck[0]!];
  return deck;
}

/**
 * 胶囊上的金额缩写：`59558400` → `{ value: "5955.84", unit: "万" }`。
 *
 * `fractionDigits` 是**缩放后**保留的小数位：
 * - 展开态用 2 位（宽度够）；
 * - 竖起态只有 36px 宽，调用方传 0 —— 小数放不下，与其被裁成半截数字，
 *   不如直接取整，单位（万/亿）仍然说明量级。
 */
export function capsuleBalance(raw: string, fractionDigits = 2): { value: string; unit: string } {
  const amount = Number(raw);
  const absolute = Math.abs(amount);
  const [divisor, unit] = absolute >= 100_000_000 ? [100_000_000, "亿"]
    : absolute >= 10_000 ? [10_000, "万"] : absolute >= 1000 ? [1000, "千"] : [1, "元"];
  const digits = divisor === 1 ? 0 : fractionDigits;
  const value = (amount / divisor).toFixed(digits).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return { value, unit };
}
