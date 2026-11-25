import { useState } from "react";

import { api } from "../../bridge";
import { Button, Segmented } from "../../components/controls";
import { Card, Code, Foot, Group, Hint, Readout, Row } from "../../components/primitives";
import type { DemoProps } from "./types";

const POLICIES = [
  { value: "0", label: "浏览器默认" },
  { value: "1", label: "允许" },
  { value: "-1", label: "拒绝" },
];

/** 权限决策：策略写入宿主，随后由用户点击触发一次真实请求。 */
export function PermissionsDemo({ toast }: DemoProps) {
  const [policy, setPolicy] = useState("0");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const change = async (next: string) => {
    setPolicy(next);
    try {
      await api.permission(Number(next));
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    }
  };

  const camera = async () => {
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // 示例只验证授权结果，立即释放相机轨道。
      stream.getTracks().forEach((track) => track.stop());
      setResult("已取得摄像头权限，媒体轨道已停止");
    } catch (error) {
      setResult(`摄像头请求失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const location = async () => {
    setBusy(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
      );
      setResult({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (error) {
      setResult(`地理位置请求失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Group title="权限处理器">
        <Card>
          <Row label="权限决策">
            <Segmented label="权限决策" value={policy} options={POLICIES} onChange={(next) => void change(next)} />
          </Row>
          <Foot>
            <Button busy={busy} onClick={() => void camera()}>请求摄像头</Button>
            <Button busy={busy} onClick={() => void location()}>请求地理位置</Button>
          </Foot>
          <Row label="结果" stack>
            <Code>{result === null ? "尚未请求" : JSON.stringify(result, null, 2)}</Code>
          </Row>
        </Card>
        <Hint>策略只影响后续请求；设备权限仍然只在用户主动点击后请求，摄像头成功后会立刻停止轨道。</Hint>
      </Group>

      <Group title="会话隔离">
        <Card>
          <Row label="独立 Profile" hint="布局示例的「新视图配置」里可以勾选">
            <Readout>localStorage 与共享会话互不相通</Readout>
          </Row>
          <Row label="无痕模式" hint="关闭视图即丢弃数据">
            <Readout>不落盘，退出后不保留</Readout>
          </Row>
          <Foot>
            资源媒体、权限测试与 Linux 本地 HTTPS 视图默认使用独立 Profile；
            Windows 上的普通视图共享当前环境。
          </Foot>
        </Card>
      </Group>
    </>
  );
}
