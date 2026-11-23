/**
 * 运行库状态：主窗口与每个示例窗口共用。
 *
 * 宿主在窗口创建完成前不会应答 `snapshot`，所以 `hello` 用有限重试等它；
 * 拿到之后每 2 秒刷新一次快照（窗口开关、主题、尺寸都会变）。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { api, type RuntimeInfo, type Snapshot } from "./bridge";

const HELLO_RETRY = 25;
const HELLO_DELAY = 160;
const POLL_MS = 2000;

export interface RuntimeState {
  runtime: RuntimeInfo | null;
  snapshot: Snapshot | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRuntime(): RuntimeState {
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();
    const connect = async (attempt: number): Promise<void> => {
      try {
        const info = await api.hello();
        if (cancelled) return;
        setRuntime(info);
        setSnapshot(info.snapshot);
        setError(null);
        void api.frontendReady(Math.round((performance.now() - started) * 1e6)).catch(() => {});
      } catch (cause) {
        if (cancelled) return;
        if (attempt + 1 >= HELLO_RETRY) {
          setError(cause instanceof Error ? cause.message : String(cause));
          return;
        }
        window.setTimeout(() => void connect(attempt + 1), HELLO_DELAY);
      }
    };
    void connect(0);
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api.snapshot();
      if (alive.current) setSnapshot(next);
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    if (!runtime) return;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [runtime, refresh]);

  return { runtime, snapshot, error, refresh };
}

/** 当前窗口在快照里的记录；主窗口没有 `?example=` 时就是主窗口自己。 */
export function currentWindow(snapshot: Snapshot | null, windowId: number | undefined) {
  if (!snapshot || windowId === undefined) return snapshot?.windows[0] ?? null;
  return snapshot.windows.find((item) => item.id === windowId) ?? null;
}
