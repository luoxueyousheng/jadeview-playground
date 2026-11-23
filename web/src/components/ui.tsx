/** 几个到处复用的小件。类名与旧版 `style.css` 完全一致，样式不用跟着改。 */

import { useEffect, useRef, useState, type InputHTMLAttributes, type RefObject } from "react";

import { playSound } from "../lib/sound";

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function InfoHint({ text }: { text: string }) {
  return <button type="button" className="info-hint" title={text} aria-label={text}>
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" /><path d="M10 9v5" /><circle cx="10" cy="6.2" r=".8" fill="currentColor" stroke="none" />
    </svg>
  </button>;
}

export function Pill({ text, tone }: { text: string; tone: "ok" | "warn" | "idle" }) {
  return (
    <span className={`pill pill--${tone}`}>
      <span className="pill__dot" />
      {text}
    </span>
  );
}

/** 开关（配色与动画都在 CSS 里；`lead` = 放在一行最左边的那一种）。 */
export function Switch({
  checked,
  disabled,
  title,
  label,
  lead = false,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  /**
   * 悬停提示 + 无障碍名。
   *
   * 行内已经有文字说明、再挂一遍同一句话就是噪音，那种情况用 `label`：
   * 只给读屏一个名字，不弹气泡。
   */
  title?: string;
  /** 只作无障碍名（读屏），不产生悬停提示 */
  label?: string;
  lead?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={lead ? "switch switch--lead" : "switch"} title={title}>
      <input
        type="checkbox"
        role="switch"
        aria-label={label ?? title ?? "开关"}
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.checked;
          // 开关音。放在这个共用组件里，所有开关（消费补贴 / 两个游戏配置）
          // 就自动都有了，不必每个调用点各写一遍。
          playSound(next ? "open" : "close");
          onChange(next);
        }}
      />
      <span className="switch__track" aria-hidden="true" />
    </label>
  );
}

/**
 * 「锁定当前余额」的锁形按钮。
 *
 * 锁定时将后续账目金额归零，余额保持在点击锁定时的数值；解锁后恢复正常记账。
 * 锁定不读取金额输入框，也不会主动修改当前余额。
 *
 * 它原来还带一个塞进输入框凹槽的 `compact` 小尺寸——「余额锁定」抽成独立一行后
 * 没人再用小尺寸了，只留这一种。
 */
export function LockButton({
  on,
  disabled,
  title,
  onClick,
}: {
  on: boolean;
  disabled?: boolean;
  /** 覆盖默认提示（例如被 Pro 锁住时说清"为什么点不动"）。 */
  title?: string;
  onClick: () => void;
}) {
  // 关闭态点下去"会顶掉谁"要写进提示：锁定与逐笔功能（消费补贴 / 购买免费）
  // 共用同一个游戏账目 hook，开一边宿主会把另一边收掉——不说清就是"另一个开关自己灭了"。
  const label =
    title ??
    (on
      ? "余额锁定：已开启（点击解锁）"
      : "余额锁定：关闭（点击锁定当前余额；会关闭「消费补贴 / 购买免费」）");
  return (
    <button
      type="button"
      className={`btn btn--icon lock${on ? " lock--on" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        width={17}
        height={17}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        {/* 开锁：锁梁向右上方敞开；闭锁：锁梁扣回锁体（Feather 图标的标准画法） */}
        <path d={on ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"} />
      </svg>
    </button>
  );
}

/**
 * 全局唯一的文本编辑框。
 *
 * 外观（填充、0.5px 内描边、6px 圆角、焦点环、禁用淡化）**只在 `style.css` 的
 * `input[type="text"]` 里定义一份**；这个组件只管结构，免得每个页面各写一份
 * `<input>` 再各自补样式。搜索框那种"有内容时右侧出 ×"的场景加 `clearable`。
 */
export function TextField({
  value,
  onChange,
  clearable = false,
  inputRef,
  className,
  ...input
}: {
  value: string;
  onChange: (next: string) => void;
  /** 有内容时右侧显示清除按钮（点完清空并回焦） */
  clearable?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** 加在外层 `.field` 上，用于个别场景的宽度/布局 */
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const localInput = useRef<HTMLInputElement>(null);
  const fieldInput = inputRef ?? localInput;
  return (
    <div className={`field${clearable ? " field--clearable" : ""}${className ? ` ${className}` : ""}`}>
      <input
        {...input}
        ref={fieldInput}
        aria-label={input["aria-label"] ?? (input["aria-labelledby"] ? undefined : input.placeholder)}
        className="field__input"
        type={input.type ?? "text"}
        // 默认关拼写检查：这些格子里填的是金额、激活码、搜索词，红波浪线只会碍事
        spellCheck={input.spellCheck ?? false}
        value={value}
        /* `jade-allow-contextmenu`：全局禁了右键，输入框要留着——粘贴金额 / 激活码全靠它 */
        jade-allow-contextmenu=""
        onChange={(event) => onChange(event.target.value)}
      />
      {clearable && value ? (
        <button type="button" className="field__clear" aria-label={`清除${input["aria-label"] ?? input.placeholder ?? "输入内容"}`} title="清除"
          onClick={() => { onChange(""); fieldInput.current?.focus(); }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
        </button>
      ) : null}
    </div>
  );
}

/**
 * 数字步进器：`− [ 100 ] ＋`。
 *
 * 全站只有这一个实现——城市容量、玩家声誉这些"微调一个整数"的地方都用它，
 * 样式在 `style.css` 的 `.stepper` 里。
 */
export function NumberStepper({
  value,
  onChange,
  disabled,
  label,
  suffix = "",
  min = 0,
  max = 1_000_000_000,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** 无障碍名称，也是两个按钮 aria-label 的前缀 */
  label: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(() => String(value));
  const draftRef = useRef(draft);
  const lastValid = useRef(value);
  const lastValue = useRef(value);
  useEffect(() => {
    if (Object.is(value, lastValue.current)) return;
    lastValue.current = value;
    if (!Number.isFinite(value)) return;
    lastValid.current = value;
    // Preserve what the user typed (for example, a trailing decimal point) when
    // the parent echoes the parsed value back. External changes still replace it.
    if (Number(draftRef.current) !== value) {
      const next = String(value);
      draftRef.current = next;
      setDraft(next);
    }
  }, [value]);

  const updateDraft = (next: string) => {
    draftRef.current = next;
    setDraft(next);
    const parsed = next.trim() === "" ? Number.NaN : Number(next);
    if (Number.isFinite(parsed)) lastValid.current = parsed;
    onChange(Number.isFinite(parsed) ? parsed : Number.NaN);
  };
  const clamp = (next: number) =>
    onChange(Math.max(min, Math.min(max, Math.trunc(Number.isFinite(next) ? next : min))));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__button" disabled={disabled || !Number.isFinite(value) || value <= min}
        aria-label={`${label}减一`} onClick={() => clamp(value - 1)}>−</button>
      <input type="text" inputMode="decimal" disabled={disabled}
        role="spinbutton" aria-valuemin={min} aria-valuemax={max}
        aria-valuenow={Number.isFinite(value) ? value : undefined}
        aria-valuetext={Number.isFinite(value) ? `${value}${suffix}` : undefined}
        aria-label={label} value={draft}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault(); clamp((Number.isFinite(value) ? value : lastValid.current) + (event.key === "ArrowUp" ? 1 : -1));
          }
        }}
        onChange={event => updateDraft(event.target.value)}
        onBlur={() => {
          const typed = Number(draftRef.current);
          /*
           * 失焦时把值夹进 [min, max]：
           * 这样"敲成 6066666"不会留一个越界的草稿在框里，也不用等提交才报错。
           * 空值或非数字才回退到上一次合法值。
           */
          const bounded = draftRef.current.trim() !== "" && Number.isFinite(typed)
            ? Math.max(min, Math.min(max, Math.trunc(typed))) : null;
          if (bounded !== null) {
            if (bounded !== typed) { draftRef.current = String(bounded); setDraft(String(bounded)); }
            lastValid.current = bounded; lastValue.current = bounded;
            if (bounded !== value) onChange(bounded);
            return;
          }
          const restored = lastValid.current;
          draftRef.current = String(restored);
          setDraft(String(restored));
          lastValue.current = restored;
          onChange(restored);
        }} />
      {suffix ? <span className="stepper__suffix">{suffix}</span> : null}
      <button type="button" className="stepper__button" disabled={disabled || !Number.isFinite(value) || value >= max}
        aria-label={`${label}加一`} onClick={() => clamp(value + 1)}>＋</button>
    </div>
  );
}

export function ChevronIcon() {
  return (
    <svg
      className="select__chevron"
      viewBox="0 0 12 12"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4.8 6 7.8l3-3" />
    </svg>
  );
}
