/** 颜色换算：颜色选择器与测试共用，避免两处各写一份产生偏差。 */

export type RGB = { r: number; g: number; b: number };
export type HSV = { h: number; s: number; v: number };
export type RGBA = RGB & { a: number };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** 接受 #RGB / #RGBA / #RRGGBB / #RRGGBBAA，统一返回 0–255 的分量。 */
export function parseHex(input: string): RGBA | null {
  const raw = input.trim().replace(/^#/, "");
  const hex = raw.length === 3 || raw.length === 4
    ? raw.split("").map((char) => char + char).join("")
    : raw;
  if (hex.length !== 6 && hex.length !== 8) return null;
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  const byte = (at: number) => parseInt(hex.slice(at, at + 2), 16);
  return { r: byte(0), g: byte(2), b: byte(4), a: hex.length === 8 ? byte(6) : 255 };
}

/** 固定输出 8 位 #RRGGBBAA，让透明度在界面和宿主之间都有一致的表示。 */
export function toHex({ r, g, b }: RGB, alpha: number): string {
  const byte = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}${byte(alpha)}`;
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? delta / max : 0, v: max };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const sector = Math.floor((h % 360) / 60);
  const parts = [
    [c, x, 0], [x, c, 0], [0, c, x],
    [0, x, c], [x, 0, c], [c, 0, x],
  ];
  const [r = 0, g = 0, b = 0] = parts[sector] ?? [0, 0, 0];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}
