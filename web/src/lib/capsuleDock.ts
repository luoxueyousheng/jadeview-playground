/**
 * 状态胶囊的停靠点。
 *
 * 顺序 = 键盘（Ctrl+M 后用方向键）循环的先后顺序，也大致是视觉上从上到下、从左到右。
 * 新增停靠点**只能追加**、不能重排：`prefs.capsulePosition` 存的是 id，老用户升级后
 * 位置不能变。（`normalizeCapsuleDock` 会把不认识的值退回 `sidebar`。）
 *
 * 每个停靠点都要在界面里有一个**锚点元素**（见 `MovableCapsule` 的 `useCapsuleAnchors`）：
 * 胶囊本身是 `position: fixed` 单独渲染的，靠量锚点的矩形决定自己停在哪。
 */
export const CAPSULE_DOCKS = [
  { id: "sidebar-top", label: "侧栏顶部" },
  { id: "sidebar", label: "侧栏底部" },
  { id: "titlebar-left", label: "标题栏左侧" },
  { id: "titlebar-center", label: "标题栏居中" },
  { id: "titlebar-right", label: "标题栏右侧" },
  { id: "panel-corner", label: "内容区右下" },
  { id: "panel-corner-tall", label: "内容区右侧" },
] as const;
export type CapsuleDock = typeof CAPSULE_DOCKS[number]["id"];
export interface DockRect { id: CapsuleDock; x: number; y: number; width: number; height: number }

/** 停靠点的固定高度（侧栏那两个会随侧栏收起变高，见 `MovableCapsule`）。 */
export const CAPSULE_DOCK_HEIGHT = 40;
/** 标题栏里胶囊的实际高度：标题栏 42 − 上下各 2px 的空隙。 */
export const CAPSULE_FLAT_HEIGHT = 38;
/** 侧栏收成窄条时胶囊改竖排，多出来的高度。 */
export const CAPSULE_DOCK_EXTRA = 34;
/** 右下角「竖向槽位」的高度：40 + 34（与侧栏窄条一致）。 */
export const CAPSULE_TALL_HEIGHT = CAPSULE_DOCK_HEIGHT + CAPSULE_DOCK_EXTRA;
/**
 * 拖动中的默认尺寸。
 *
 * 不能直接沿用"停靠时的宽度"：侧栏窄条里的胶囊只有 40px 宽，
 * 拖起来后一旦离开落点，宽度回到 40 而内容还是横排 → 挤成一团。
 * 拖起来统一成一条标准横排尺寸，预览形态都从这个基准出发。
 */
export const CAPSULE_DRAG_WIDTH = 168;

export function normalizeCapsuleDock(value: unknown): CapsuleDock {
  return CAPSULE_DOCKS.find(dock => dock.id === value)?.id ?? "sidebar";
}

export function nearestCapsuleDock(rects: readonly DockRect[], x: number, y: number): CapsuleDock | null {
  /*
   * 先看"指针落在哪个框里"，再退回"离哪个中心近"。
   *
   * 右下角的横向（168×40）与竖向（40×74）两个框是**叠在同一个角**上的：
   * 只按中心距判断时，横向的框大、中心更靠左，贴着角落松手反而会选中横向——
   * 于是竖向的虚线框看着落空了。落在框内时取**面积更小**的那个，
   * 竖向框就会优先命中。
   */
  const inside = rects.filter(rect => x >= rect.x && x <= rect.x + rect.width
    && y >= rect.y && y <= rect.y + rect.height);
  if (inside.length > 0) {
    const smallest = inside.reduce((best, rect) =>
      rect.width * rect.height < best.width * best.height ? rect : best);
    return smallest.id;
  }
  let best: CapsuleDock | null = null;
  let distance = Infinity;
  for (const rect of rects) {
    const dx = Math.abs(x - (rect.x + rect.width / 2));
    const dy = Math.abs(y - (rect.y + rect.height / 2));
    if (dx > rect.width / 2 + 28 || dy > rect.height / 2 + 28) continue;
    const score = dx * dx + dy * dy;
    if (score < distance) { best = rect.id; distance = score; }
  }
  return best;
}
