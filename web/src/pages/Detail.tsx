/**
 * 示例窗口的页面。
 *
 * 窗口由宿主按 `index.html?example=<kind>` 打开，这里按 kind 取对应组件。
 * 只有「多 WebView 工作区」占满整块面板（它自己量 `#workspace` 的坐标），
 * 其余示例走标准的 `Page` 滚动容器。
 */

import type { RuntimeInfo, Snapshot } from "../bridge";
import { Empty, Page, PageHead } from "../components/primitives";
import { EXAMPLES } from "../data/catalog";
import { DEMOS } from "./demos/registry";
import type { DemoProps } from "./demos/types";

export function Detail({
  kind,
  runtime,
  snapshot,
  refresh,
  toast,
}: {
  kind: string;
  runtime: RuntimeInfo;
  snapshot: Snapshot;
  refresh: () => Promise<void>;
  toast: (message: string, tone?: "info" | "error") => void;
}) {
  const meta = EXAMPLES[kind];
  const Demo = DEMOS[kind];
  const window = snapshot.windows.find((item) => item.id === runtime.windowId);

  const props: DemoProps | null = window ? { runtime, window, snapshot, refresh, toast } : null;

  // 布局示例要自己占满面板：它的工作区坐标必须来自真实 WebView 容器。
  if (kind === "layout" && Demo && props) {
    return (
      <div className="pg-flush">
        <Demo {...props} />
      </div>
    );
  }

  return (
    <Page>
      <PageHead title={meta?.title ?? kind} />

      {Demo && props ? <Demo {...props} /> : <Empty title="此示例没有网页内容" />}
    </Page>
  );
}
