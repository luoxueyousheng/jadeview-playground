/**
 * 颜色换算的往返验证。直接导入组件用的同一份 lib，避免测试里另写一份算法。
 * 运行：node --experimental-strip-types tests/test_color.mjs
 */

import assert from "node:assert/strict";
import { hsvToRgb, parseHex, rgbToHsv, toHex } from "../web/src/lib/color.ts";

const hexCases = [
  ["#fff", { r: 255, g: 255, b: 255, a: 255 }],
  ["#abc", { r: 170, g: 187, b: 204, a: 255 }],
  ["#abcd", { r: 170, g: 187, b: 204, a: 221 }],
  ["#f4f6fb", { r: 244, g: 246, b: 251, a: 255 }],
  ["#ffffff10", { r: 255, g: 255, b: 255, a: 16 }],
  ["f0f8ff80", { r: 240, g: 248, b: 255, a: 128 }],
];
for (const [input, expected] of hexCases) {
  assert.deepEqual(parseHex(input), expected, `解析 ${input}`);
}
for (const bad of ["", "#12", "#12345", "#1234567", "#gggggg", "#123456789"]) {
  assert.equal(parseHex(bad), null, `拒绝 ${bad}`);
}

assert.equal(toHex({ r: 255, g: 255, b: 255 }, 255), "#ffffffff");
assert.equal(toHex({ r: 0, g: 0, b: 0 }, 0), "#00000000");
assert.equal(toHex({ r: 255, g: 255, b: 255 }, 16), "#ffffff10");

const roundTrip = ["#ff0000ff", "#00ff00ff", "#0000ffff", "#ffffffff", "#000000ff", "#80808080", "#f4f6fb40"];
for (const hex of roundTrip) {
  const rgba = parseHex(hex);
  assert.ok(rgba, hex);
  const rgb = hsvToRgb(rgbToHsv(rgba));
  const actual = toHex(rgb, rgba.a);
  assert.equal(actual, hex, `${hex} 经 HSV 往返后应保持`);
}

const sectors = [
  [0, { r: 255, g: 0, b: 0 }],
  [60, { r: 255, g: 255, b: 0 }],
  [120, { r: 0, g: 255, b: 0 }],
  [180, { r: 0, g: 255, b: 255 }],
  [240, { r: 0, g: 0, b: 255 }],
  [300, { r: 255, g: 0, b: 255 }],
  [360, { r: 255, g: 0, b: 0 }],
];
for (const [h, expected] of sectors) {
  const rgb = hsvToRgb({ h, s: 1, v: 1 });
  assert.ok(Math.abs(rgb.r - expected.r) < 1 && Math.abs(rgb.g - expected.g) < 1 && Math.abs(rgb.b - expected.b) < 1,
    `色相 ${h} 应为 ${toHex(expected, 255)}，实际 ${toHex(rgb, 255)}`);
}

console.log(`颜色换算：${hexCases.length + 6 + roundTrip.length + sectors.length} 项通过`);
