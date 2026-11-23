import { TITLEBAR_COLORS, type TitlebarColors } from "../lib/titlebarStyle";
import { ColorPicker } from "./ColorPicker";
import { Segmented } from "./controls";
import { Row } from "./primitives";

// 预设同时设置各状态的文字和按钮颜色，保证自定义底色下仍然清晰。
const PRESETS = {
  theme: {},
  white: {
    background_color: "#ffffff", foreground_color: "#202020", button_background_color: "#00000000",
    button_hover_background_color: "#00000018", button_hover_foreground_color: "#101010",
  },
  black: {
    background_color: "#000000", foreground_color: "#f5f5f5", button_background_color: "#ffffff00",
    button_hover_background_color: "#ffffff26", button_hover_foreground_color: "#ffffff",
  },
  blue: {
    background_color: "#005fb8", foreground_color: "#ffffff", button_background_color: "#ffffff00",
    button_hover_background_color: "#ffffff2e", button_hover_foreground_color: "#ffffff",
  },
} satisfies Record<string, TitlebarColors>;

const PRESET_OPTIONS = [
  { value: "theme", label: "跟随主题" },
  { value: "white", label: "纯白" },
  { value: "black", label: "纯黑" },
  { value: "blue", label: "蓝色" },
] as const;

export function TitlebarStyleFields({
  height, colors, theme, disabled, onHeightChange, onColorsChange,
}: {
  height: string;
  colors: TitlebarColors;
  theme: string;
  disabled?: boolean;
  onHeightChange: (height: string) => void;
  onColorsChange: (colors: TitlebarColors) => void;
}) {
  const dark = theme === "Dark"
    || (theme === "System" && globalThis.matchMedia("(prefers-color-scheme: dark)").matches);
  const preset = PRESET_OPTIONS.find(({ value }) => {
    const palette: TitlebarColors = PRESETS[value];
    return TITLEBAR_COLORS.every(([key]) => (colors[key]?.toLowerCase() ?? "") === (palette[key] ?? ""));
  })?.value;

  return <>
    <Row label="配色预设">
      <Segmented label="配色预设" value={preset ?? ""} options={PRESET_OPTIONS} disabled={disabled}
        onChange={(value) => { if (value) onColorsChange(PRESETS[value]); }} />
    </Row>
    <Row label="标题栏高度" hint="20–100 逻辑像素，0 恢复默认">
      <input aria-label="标题栏高度" type="number" min={0} max={100} step={1} value={height}
        disabled={disabled} onChange={(event) => onHeightChange(event.target.value)} />
    </Row>
    {TITLEBAR_COLORS.map(([key, label, darkColor, lightColor]) => {
      const color = colors[key];
      return <Row key={key} label={label}>
        <ColorPicker label={label} value={color || (dark ? darkColor : lightColor)} disabled={disabled}
          isDefault={!color} onReset={() => onColorsChange({ ...colors, [key]: "" })}
          onChange={(value) => onColorsChange({ ...colors, [key]: value })} />
      </Row>;
    })}
  </>;
}
