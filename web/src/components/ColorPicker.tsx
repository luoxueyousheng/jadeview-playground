/**
 * 带透明度通道的颜色选择器。
 *
 * 原生 `input[type=color]` 既不支持 alpha，弹层样式也改不了，所以这里自绘：
 * SV 面板 + 色相 / 透明度滑条 + 可手输的 #RRGGBBAA。外观沿用 TF3 的控件材质，
 * 弹层挂到 `body`（卡片会被每 2s 的状态轮询重建，留在行内会被一起换掉）。
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import type { HSV } from "../lib/color";
import { hsvToRgb, parseHex, rgbToHsv, toHex } from "../lib/color";
import { FADE } from "../lib/motion";
import { Slider } from "./Slider";
import { ChevronIcon } from "./ui";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function ColorPicker({ value, onChange, label, disabled = false, allowAlpha = true, isDefault = false, onReset }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  allowAlpha?: boolean;
  isDefault?: boolean;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [selection, setSelection] = useState<{ color: string; hsv: HSV } | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, shown: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const reduceMotion = useReducedMotionConfig();

  const current = parseHex(value) ?? { r: 255, g: 255, b: 255, a: 255 };
  // Keep the exact HSV edit, including 360° at the right edge. RGB alone
  // cannot distinguish 0° from 360°, or represent a hue for gray.
  const hsv = selection?.color === value ? selection.hsv : rgbToHsv(current);
  const hue = hsvToRgb({ h: hsv.h, s: 1, v: 1 });
  const opaque = `rgb(${Math.round(current.r)}, ${Math.round(current.g)}, ${Math.round(current.b)})`;
  const shown = open && !disabled;

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  useLayoutEffect(() => {
    if (!shown) return;
    const trigger = triggerRef.current?.getBoundingClientRect();
    const pop = popRef.current?.getBoundingClientRect();
    if (!trigger || !pop) return;
    const below = trigger.bottom + 6;
    const top = below + pop.height <= window.innerHeight - 8
      ? below : Math.max(8, trigger.top - 6 - pop.height);
    setPos({
      top,
      left: clamp(trigger.left, 8, Math.max(8, window.innerWidth - pop.width - 8)),
      shown: true,
    });
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const close = () => setOpen(false);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus({ preventScroll: true }); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [shown]);

  const commit = (next: HSV, alpha: number) => {
    const rgba = toHex(hsvToRgb(next), alpha);
    const color = allowAlpha ? rgba : rgba.slice(0, 7);
    setSelection({ color, hsv: next });
    if (isDefault || color !== value) onChange(color);
  };

  const moveField = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    commit({
      ...hsv,
      s: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      v: 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1),
    }, current.a);
  };

  const submitDraft = (input: string) => {
    const parsed = parseHex(input);
    setDraft(value);
    if (parsed) commit(rgbToHsv(parsed), parsed.a);
  };

  const hueColor = `rgb(${Math.round(hue.r)}, ${Math.round(hue.g)}, ${Math.round(hue.b)})`;
  const vars = {
    "--cp-hue": hueColor,
    "--cp-opaque": opaque,
    "--cp-current": value,
    "--cp-thumb-hue": toHex(hue, 255),
  } as CSSProperties;

  const triggerValue = isDefault ? "跟随主题" : value;
  return <>
    <button ref={triggerRef} type="button" className="cp-trigger" disabled={disabled}
      title={triggerValue} aria-label={`${label}，当前 ${triggerValue}`} aria-haspopup="dialog" aria-expanded={shown}
      onClick={() => setOpen((previous) => !previous)}>
      <span className="cp-trigger__swatch" style={{ backgroundColor: value }} />
      <span className={isDefault ? "cp-trigger__hex" : "cp-trigger__hex mono"}>{triggerValue}</span>
      <ChevronIcon />
    </button>
    {typeof document !== "undefined" && createPortal(<AnimatePresence>
      {shown && <motion.div ref={popRef} className="cp-pop" role="dialog" aria-label={label}
        style={{ ...vars, top: pos.top, left: pos.left, visibility: pos.shown ? "visible" : "hidden" }}
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={reduceMotion ? { duration: 0 } : FADE}>
        <div className="cp__field" role="slider" tabIndex={0} aria-label="饱和度与明度"
          aria-valuetext={`饱和度 ${Math.round(hsv.s * 100)}%，明度 ${Math.round(hsv.v * 100)}%`}
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, var(--cp-hue))` }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            moveField(event);
          }}
          onPointerMove={(event) => { if (dragging.current) moveField(event); }}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.1 : 0.02;
            const next = event.key === "ArrowLeft" ? { ...hsv, s: clamp(hsv.s - step, 0, 1) }
              : event.key === "ArrowRight" ? { ...hsv, s: clamp(hsv.s + step, 0, 1) }
                : event.key === "ArrowUp" ? { ...hsv, v: clamp(hsv.v + step, 0, 1) }
                  : event.key === "ArrowDown" ? { ...hsv, v: clamp(hsv.v - step, 0, 1) }
                    : null;
            if (next) { event.preventDefault(); event.stopPropagation(); commit(next, current.a); }
          }}>
          <span className="cp__field-cursor"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: `var(--cp-current)` }} />
        </div>

        <div className="cp__row">
          <span className="cp__row-label">色相</span>
          <Slider className="cp__hue" min={0} max={360} value={Math.round(hsv.h)}
            aria-label="色相" onChange={(next) => commit({ ...hsv, h: next }, current.a)} />
        </div>
        {allowAlpha ? (
          <div className="cp__row">
            <span className="cp__row-label">透明</span>
            <Slider className="cp__alpha" min={0} max={255} value={current.a}
              aria-label="透明度" onChange={(next) => commit(hsv, next)} />
            <span className="cp__alpha-value mono">{Math.round(current.a / 255 * 100)}%</span>
          </div>
        ) : null}
        <div className="cp__row cp__row--hex">
          <input type="text" className="cp__hex mono" value={draft} spellCheck={false} autoComplete="off"
            aria-label="颜色值" onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => {
              if (!onReset || event.currentTarget.value !== value) submitDraft(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); submitDraft(event.currentTarget.value); }
            }} />
        </div>
        {onReset && (
          <div className="cp__row">
            <button type="button" className="btn btn--plain" disabled={isDefault} onClick={() => {
              setSelection(null);
              onReset();
              setOpen(false);
              triggerRef.current?.focus({ preventScroll: true });
            }}>跟随主题</button>
          </div>
        )}
      </motion.div>}
    </AnimatePresence>, document.body)}
  </>;
}
