export const TITLEBAR_COLORS = [
  ["background_color", "标题栏背景", "#202020", "#f3f3f3"],
  ["foreground_color", "标题栏前景", "#f5f5f5", "#202020"],
  ["button_background_color", "按钮背景", "#ffffff10", "#00000010"],
  ["button_hover_background_color", "按钮悬浮背景", "#ffffff20", "#00000020"],
  ["button_hover_foreground_color", "按钮悬浮前景", "#ffffff", "#101010"],
] as const;

export type TitlebarColors = Partial<Record<(typeof TITLEBAR_COLORS)[number][0], string>>;

export interface TitlebarStyle {
  height: number;
  colors: TitlebarColors;
}

export function parseTitlebarHeight(input: string): number | null {
  const height = Number(input);
  return input.trim() && Number.isInteger(height) && (height === 0 || (height >= 20 && height <= 100))
    ? height : null;
}

export function readTitlebarColors(value: unknown): TitlebarColors {
  if (!value || typeof value !== "object") return {};
  const stored = value as Record<string, unknown>;
  const colors: TitlebarColors = {};
  for (const [key] of TITLEBAR_COLORS) {
    const color = stored[key];
    if (typeof color === "string" && /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color)) colors[key] = color;
  }
  return colors;
}
