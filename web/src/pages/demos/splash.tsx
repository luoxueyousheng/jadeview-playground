import { Card, Group, Readout, Row } from "../../components/primitives";
import type { DemoProps } from "./types";

/** 宿主在建窗时设置启动画面，前端在覆盖层背后加载完成后自然可见。 */
export function SplashDemo({ window }: DemoProps) {
  return (
    <Group title="启动画面已结束">
      <Card>
        <Row label="配置的最短显示时间"><Readout>{window.splashDuration ?? 0} ms</Readout></Row>
        <Row label="再次体验" hint="回到启动器调整参数，再点「重新运行」。" />
      </Card>
    </Group>
  );
}
