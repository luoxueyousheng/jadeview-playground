import { useId, type MouseEvent } from "react";
import { LayoutGroup, motion, useReducedMotionConfig } from "motion/react";
import { SLIDE } from "../lib/motion";

export function SegmentedControl<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean; title?: string }>;
  onChange: (value: T, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const id = useId();
  const reduceMotion = useReducedMotionConfig();
  return <LayoutGroup id={id}>
    <div className="segmented" role="group" aria-label={label}>
      {options.map(option => <button key={option.value} type="button" className="segmented__item"
        aria-pressed={value === option.value} disabled={option.disabled} title={option.title}
        onClick={event => { if (value !== option.value) onChange(option.value, event); }}>
        {value === option.value && <motion.span className="segmented__indicator" layoutId="selection"
          initial={false} transition={reduceMotion ? { duration: 0 } : SLIDE} aria-hidden="true" />}
        <span className="segmented__label">{option.label}</span>
      </button>)}
    </div>
  </LayoutGroup>;
}
