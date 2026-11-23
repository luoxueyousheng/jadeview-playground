import type { ReactNode } from "react";

import { Checkbox } from "./Checkbox";
import { SegmentedControl } from "./SegmentedControl";
import { Select as ListSelect } from "./Select";
import { Slider } from "./Slider";
import { Switch as Toggle, Spinner, TextField } from "./ui";

export function Input({
  value,
  onChange,
  placeholder,
  disabled,
  label,
  type = "text",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  type?: "text" | "number";
}) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      type={type}
      aria-label={label ?? placeholder}
    />
  );
}

/** 带行标签的输入框：示例页里"一个标签 + 一个输入框"的场景用它。 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  clearable,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
}) {
  return (
    <div className="pg-field">
      <span className="pg-field__label">{label}</span>
      <TextField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        clearable={clearable}
        aria-label={label}
      />
    </div>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}) {
  return (
    <textarea
      className="pg-textarea"
      value={value}
      rows={rows}
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      spellCheck={false}
      jade-allow-contextmenu=""
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  title,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  title?: string;
}) {
  return <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} title={title} />;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean; title?: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <SegmentedControl
      label={label}
      value={value}
      options={options.map((option) => ({ ...option, disabled: disabled || option.disabled }))}
      onChange={(next) => onChange(next)}
    />
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  minWidth,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean; title?: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
  minWidth?: number;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <span className="pg-select" style={minWidth ? { minWidth } : undefined}>
      <ListSelect
        items={options.map(({ value: itemValue, label: itemLabel }) => ({ value: itemValue, label: itemLabel }))}
        value={value}
        label={current?.label ?? "请选择"}
        disabled={disabled}
        title={label}
        onPick={(next) => onChange(next as T)}
      />
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  busy = false,
  disabled = false,
  icon,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "plain" | "danger" | "default";
  busy?: boolean;
  disabled?: boolean;
  icon?: "plus" | "sliders";
  title?: string;
}) {
  const className = ["btn", variant === "primary" ? "btn--primary" : "", variant === "plain" ? "btn--plain" : "", variant === "danger" ? "btn--danger" : "", busy ? "btn--busy" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={className} disabled={disabled || busy} title={title} onClick={onClick}>
      {busy ? <Spinner /> : icon ? <ButtonIcon name={icon} /> : null}
      {children}
    </button>
  );
}

function ButtonIcon({ name }: { name: "plus" | "sliders" }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" aria-hidden="true">
      {name === "plus" ? <path d="M8 3.2v9.6M3.2 8h9.6" /> : (
        <>
          <path d="M2.5 5h11M2.5 11h11" />
          <circle cx="6" cy="5" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="10" cy="11" r="1.8" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="pg-range">
      <span className="pg-range__label">{label}</span>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} aria-label={label} />
      <span className="pg-range__value mono">
        {value}
        {suffix}
      </span>
    </div>
  );
}

/** 复选：给需要"多选组合"的示例页用。 */
export function Check({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Checkbox checked={checked} onChange={onChange} disabled={disabled}>
      {children}
    </Checkbox>
  );
}
