import type { ComponentProps } from "react";

type SliderProps = Omit<ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "className" | "min" | "max" | "step" | "children"
> & {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

/** 原生 range 接收输入，滑块位置直接使用当前值。 */
export function Slider({ min, max, step = 1, value, disabled, onChange, className, ...inputProps }: SliderProps) {
  const bounded = Math.max(min, Math.min(max, value));
  const progress = max > min ? (bounded - min) / (max - min) : 0;

  return <div className={`slider${className ? ` ${className}` : ""}`} data-disabled={!!disabled}>
    <span className="slider__track" aria-hidden="true" />
    <span className="slider__rail" aria-hidden="true">
      <span className="slider__fill" style={{ width: `calc(10px + ${progress * 100}%)` }} />
      <span className="slider__thumb" style={{ left: `${progress * 100}%` }} />
    </span>
    <input {...inputProps} className="slider__range" type="range" min={min} max={max} step={step}
      value={bounded} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
  </div>;
}
