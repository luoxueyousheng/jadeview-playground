import { useLayoutEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotionConfig as useReducedMotion } from "motion/react";

/** Native checkbox semantics with a shared iOS-style animated presentation. */
export function Checkbox({ checked, onChange, children, disabled = false, className = "", title, indeterminate = false, "aria-label": ariaLabel }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
  title?: string;
  indeterminate?: boolean;
  "aria-label"?: string;
}) {
  const reducedMotion = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { if (input.current) input.current.indeterminate = indeterminate; }, [indeterminate, checked]);
  return <motion.label className={`checkbox ${className}`} data-disabled={disabled || undefined} title={title}
    initial={false} whileTap={disabled || reducedMotion ? undefined : "pressed"}>
    <input ref={input} className="checkbox__input" type="checkbox" checked={checked} disabled={disabled}
      aria-label={ariaLabel} aria-checked={indeterminate ? "mixed" : undefined}
      onChange={event => onChange(event.target.checked)} />
    <motion.span className="checkbox__box" aria-hidden="true" initial={false}
      variants={{ pressed: { scale: 0.88 } }}
      transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut", scale: { type: "spring", stiffness: 540, damping: 30 } }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" focusable="false">
        <motion.path d="m2.7 6.1 2.2 2.3 4.5-4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          initial={false} animate={{ pathLength: checked && !indeterminate ? 1 : 0, opacity: checked && !indeterminate ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : checked ? 0.2 : 0.13, ease: "easeOut" }} />
        <motion.path d="M3 6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          initial={false} animate={{ pathLength: indeterminate ? 1 : 0, opacity: indeterminate ? 1 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }} />
      </svg>
    </motion.span>
    {children != null ? <span className="checkbox__label">{children}</span> : null}
  </motion.label>;
}
