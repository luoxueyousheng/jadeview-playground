import { useEffect, useState } from "react";

import { api, type MenuSelection } from "../../bridge";
import { Button, Switch } from "../../components/controls";
import { Card, Code, Foot, Group, Row } from "../../components/primitives";
import type { DemoProps } from "./types";

function useMenuSelection() {
  const [selection, setSelection] = useState<MenuSelection | null>(null);
  useEffect(() => {
    let active = true;
    let timer: number;
    const read = async () => {
      try {
        const result = await api.menuSelection();
        if (active) setSelection(result);
      } catch {
        // The example window may be closing while the request is in flight.
      } finally {
        if (active) timer = window.setTimeout(() => void read(), 400);
      }
    };
    void read();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);
  return selection;
}

function MenuResult() {
  const selection = useMenuSelection();
  return (
    <Row label="最近的菜单事件" block>
      <Code>{selection ? JSON.stringify(selection, null, 2) : "等待选择自定义菜单项"}</Code>
    </Row>
  );
}

export function MenubarDemo({ toast, window, refresh }: DemoProps) {
  const installed = window.customMenubar ?? false;
  const [busy, setBusy] = useState(false);

  const install = async () => {
    setBusy(true);
    try {
      await api.menuInstall();
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title={installed ? "自定义菜单栏" : "默认菜单栏"}>
      <Card>
        <Row label={installed ? "打开顶部的「示例」菜单，点击「复选示例」切换勾选" : "试试顶部的「帮助 → 关于」"}>
          {!installed ? (
            <Button busy={busy} onClick={() => void install()}>替换为自定义菜单</Button>
          ) : null}
        </Row>
        {installed ? <MenuResult /> : null}
      </Card>
      {installed ? <Foot>从启动器重新运行可体验默认菜单栏。</Foot> : null}
    </Group>
  );
}

export function ContextMenuDemo({ toast, window, refresh }: DemoProps) {
  const enabled = window.customContextMenu ?? false;
  const [busy, setBusy] = useState(false);

  const configure = async (next: boolean) => {
    setBusy(true);
    try {
      await api.contextMenu({ mode: next ? "sample" : "default" });
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title="对照默认菜单和自定义菜单">
      <Card>
        <Row label="使用自定义右键菜单" hint="应用到当前 WebView">
          <Switch checked={enabled} disabled={busy} label="使用自定义右键菜单"
            onChange={(value) => void configure(value)} />
        </Row>
        <Row label="选中下面的文字，再点右键" block>
          <textarea className="context-demo pg-native-input" aria-label="右键菜单试验区" rows={3}
            defaultValue="选中这段文字，试试复制；启用自定义菜单后，还可以点击带图标的菜单项。" />
        </Row>
        <MenuResult />
      </Card>
    </Group>
  );
}
