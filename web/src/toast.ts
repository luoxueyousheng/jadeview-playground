/**
 * 顶部提示的状态。
 *
 * 结构与 TF3 的 `controller.Toast` 完全一致（`id / message / kind / bump`），
 * 这样 `components/ToastHost.tsx` 可以原样使用，只把类型来源换到本地。
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface Toast {
  id: number;
  message: string;
  kind: "ok" | "error";
  /** 同一条提示被重复触发的次数；重复时不新增一条，只把它 +1（ToastHost 靠它重播抖动）。 */
  bump: number;
}

const LIFETIME: Record<Toast["kind"], number> = { ok: 3200, error: 7000 };
const MAX_VISIBLE = 3;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const drop = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.filter((item) => item.id !== id));
  }, []);

  const arm = useCallback(
    (id: number, kind: Toast["kind"]) => {
      const previous = timers.current.get(id);
      if (previous !== undefined) window.clearTimeout(previous);
      timers.current.set(
        id,
        window.setTimeout(() => drop(id), LIFETIME[kind]),
      );
    },
    [drop],
  );

  const push = useCallback(
    (message: string, kind: Toast["kind"] = "ok") => {
      const text = message.trim();
      if (!text) return;
      setToasts((list) => {
        const existing = list.find((item) => item.message === text && item.kind === kind);
        if (existing) {
          arm(existing.id, kind);
          return list.map((item) => (item.id === existing.id ? { ...item, bump: item.bump + 1 } : item));
        }
        const id = nextId.current++;
        arm(id, kind);
        return [...list, { id, message: text, kind, bump: 0 }].slice(-MAX_VISIBLE);
      });
    },
    [arm],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  return { toasts, toast: push, dismiss: drop };
}
