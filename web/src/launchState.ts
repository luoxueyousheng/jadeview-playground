/**
 * 「打开窗口」参数的状态：表单值、持久化、恢复默认。
 *
 * 单独抽出来是因为参数会在多个样例块里出现（创建窗口、标题栏、窗口标志），
 * 每块都要同一套读写逻辑，不能各写一遍。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearDraft,
  defaultDraft,
  readDraft,
  toLaunch,
  writeDraft,
  type LaunchDraft,
  type LaunchOptions,
  type LaunchTheme,
} from "./launch";

export interface LaunchState {
  draft: LaunchDraft;
  options: LaunchOptions;
  update: (patch: Partial<LaunchDraft>) => void;
  reset: () => void;
}

export function useLaunchState(kind: string, theme: LaunchTheme, win11: boolean, keepActiveBackdrop: boolean): LaunchState {
  const [draft, setDraft] = useState<LaunchDraft>(() => readDraft(kind, theme, win11, keepActiveBackdrop));

  const latest = useRef(draft);
  const saveTimer = useRef<number | undefined>(undefined);
  const prevMainTheme = useRef(theme);

  useEffect(() => {
    if (prevMainTheme.current === theme) return;
    prevMainTheme.current = theme;
    setDraft((current) => {
      if (current.themeCustomized) return current;
      const next = { ...current, theme };
      latest.current = next;
      return next;
    });
  }, [theme]);

  const save = useCallback(() => {
    if (saveTimer.current === undefined) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    writeDraft(kind, latest.current);
  }, [kind]);

  useEffect(() => {
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [save]);

  const update = useCallback(
    (patch: Partial<LaunchDraft>) => {
      latest.current = { ...latest.current, ...patch };
      setDraft(latest.current);
      // A drag emits many changes and the draft may include a large LOGO.
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(save, 180);
    },
    [save],
  );

  const reset = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    clearDraft(kind);
    latest.current = defaultDraft(kind, theme, win11);
    setDraft(latest.current);
  }, [kind, theme, win11]);

  return { draft, options: toLaunch(kind, draft), update, reset };
}
