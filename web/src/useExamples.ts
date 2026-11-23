/**
 * 打开示例窗口的动作。
 *
 * 列表与二级页面共用这一份实现，避免两处各写一遍 toast / 刷新。
 * `reopen` 用于「按新参数重开」：先关掉旧窗口再按新参数建一个，中间不让提示条闪两次。
 */

import { useCallback, useState } from "react";

import { api } from "./bridge";
import { EXAMPLES } from "./data/catalog";
import type { LaunchOptions } from "./launch";

export interface Launcher {
  /** 正在创建（或重开）的示例 kind。 */
  busy: string | null;
  open: (kind: string, options?: LaunchOptions) => void;
  reopen: (kind: string, windowId: number, options?: LaunchOptions) => void;
  focus: (windowId: number) => Promise<void>;
  close: (windowId: number) => Promise<void>;
  attach: (windowId: number) => void;
}

export function useExampleLauncher(
  refresh: () => Promise<void>,
  toast: (message: string, kind?: "ok" | "error") => void,
): Launcher {
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    (kind: string, task: () => Promise<unknown>, note: string) => {
      setBusy(kind);
      void task()
        .then(() => refresh())
        .then(() => toast(note))
        .catch((error: unknown) => toast(error instanceof Error ? error.message : String(error), "error"))
        .finally(() => setBusy(null));
    },
    [refresh, toast],
  );

  const open = useCallback(
    (kind: string, options?: LaunchOptions) => {
      const title = EXAMPLES[kind]?.title ?? kind;
      run(kind, () => api.openExample(kind, options), `已打开「${title}」`);
    },
    [run],
  );

  const reopen = useCallback(
    (kind: string, windowId: number, options?: LaunchOptions) => {
      const title = EXAMPLES[kind]?.title ?? kind;
      run(
        kind,
        async () => {
          await api.windowClose(windowId);
          await api.openExample(kind, options);
        },
        `已按新参数重开「${title}」`,
      );
    },
    [run],
  );

  const focus = useCallback(async (windowId: number) => {
    try {
      await api.windowFocus(windowId);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    }
  }, [toast]);

  const close = useCallback(
    async (windowId: number) => {
      try {
        await api.windowClose(windowId);
        await refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error), "error");
      }
    },
    [refresh, toast],
  );

  const attach = (windowId: number) =>
    run("empty", () => api.windowAttach(windowId), "WebView 已挂载");

  return { busy, open, reopen, focus, close, attach };
}
