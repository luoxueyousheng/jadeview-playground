import type { NativeWindow, RuntimeInfo, Snapshot } from "../../bridge";

/** 每个示例页共用的宿主上下文与动作。 */
export interface DemoProps {
  runtime: RuntimeInfo;
  window: NativeWindow;
  snapshot: Snapshot;
  refresh: () => Promise<void>;
  toast: (message: string, tone?: "info" | "error") => void;
}
