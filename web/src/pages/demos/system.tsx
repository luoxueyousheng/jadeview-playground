import { useEffect, useState } from "react";

import { api, jade } from "../../bridge";
import { Button, Switch } from "../../components/controls";
import { Badge, Card, Code, Foot, Group, Hint, Readout, Row } from "../../components/primitives";
import type { DemoProps } from "./types";

/** 原生对话框。 */
export function DialogsDemo({ toast }: DemoProps) {
  const [result, setResult] = useState<unknown>(null);

  const run = async (kind: "open" | "save" | "message") => {
    try {
      if (kind === "open") {
        setResult(
          await jade().dialog.showOpenDialog({
            title: "JadeView NEXT · 文件对话框",
            properties: ["openFile", "multiSelections"],
          }),
        );
      } else if (kind === "save") {
        setResult(await jade().dialog.showSaveDialog({ title: "保存对话框", defaultPath: "example.txt" }));
      } else {
        setResult(
          await jade().dialog.showMessageBox({
            type: "info",
            title: "JadeView NEXT",
            message: "这是原生系统消息框",
            buttons: ["确定", "取消"],
          }),
        );
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    }
  };

  return (
    <Group title="系统对话框">
      <Card>
        <Foot>
          <Button onClick={() => void run("open")}>打开文件</Button>
          <Button onClick={() => void run("save")}>保存路径</Button>
          <Button onClick={() => void run("message")}>消息框</Button>
        </Foot>
        <Row block>
          <Code>{result ? JSON.stringify(result, null, 2) : "等待调用"}</Code>
        </Row>
      </Card>
      <Hint>对话框由操作系统绘制；返回结构里的 canceled、filePaths、response 会原样带回页面。</Hint>
    </Group>
  );
}

/** 通知与托盘。 */
export function TrayDemo({ toast }: DemoProps) {
  const [enabled, setEnabled] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const notify = async () => {
    try {
      setResult(await api.notification("JadeView NEXT 系统通知示例"));
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    }
  };

  const toggle = async (next: boolean) => {
    try {
      setEnabled(await api.tray(next));
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    }
  };

  return (
    <Group title="通知与托盘">
      <Card>
        <Row label="系统通知" hint="由系统通知中心展示">
          <Button onClick={() => void notify()}>发送通知</Button>
        </Row>
        <Row label="托盘图标">
          <Switch checked={enabled} label="托盘图标" onChange={(next) => void toggle(next)} />
        </Row>
        <Foot>
          {enabled ? (
            <>
              <Badge tone="ok">托盘已创建</Badge>
              右键托盘图标会弹出多级菜单。
            </>
          ) : (
            "打开后窗口关闭也会保留托盘图标，记得再关掉。"
          )}
        </Foot>
        <Row label="最近一次调用" stack>
          <Code>{result === null ? "—" : JSON.stringify(result, null, 2)}</Code>
        </Row>
      </Card>
    </Group>
  );
}

/** 剪贴板读写。 */
export function ClipboardDemo({ toast }: DemoProps) {
  const [text, setText] = useState("JadeView NEXT");
  const [busy, setBusy] = useState(false);

  const read = async () => {
    setBusy(true);
    try {
      setText(await api.clipboardRead());
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const write = async () => {
    setBusy(true);
    try {
      await api.clipboardWrite(text);
      toast("已写入剪贴板");
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title="纯文本剪贴板">
      <Card>
        <Row label="内容" stack>
          <textarea className="pg-textarea" value={text} rows={5} onChange={(event) => setText(event.target.value)} />
        </Row>
        <Foot>
          <Button busy={busy} onClick={() => void read()}>读取剪贴板</Button>
          <Button variant="primary" busy={busy} onClick={() => void write()}>写入剪贴板</Button>
          <span className="row__spacer" />
          <Readout>{text.length} 字符</Readout>
        </Foot>
      </Card>
      <Hint>读写由宿主的 C API 完成，不经过浏览器权限，也不要求页面处于焦点。</Hint>
    </Group>
  );
}

/** YAML 持久化。 */
export function StorageDemo({ toast }: DemoProps) {
  const [value, setValue] = useState("Hello NEXT");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.storageSave(value);
      setResult("已写入应用数据目录");
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const read = async () => {
    setBusy(true);
    try {
      setResult(await api.storageRead());
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Group title="YAML 文件">
      <Card>
        <Row label="示例值">
          <input className="pg-native-input" style={{ maxWidth: 260 }} type="text" value={value} onChange={(event) => setValue(event.target.value)} />
        </Row>
        <Foot>
          <Button variant="primary" busy={busy} onClick={() => void save()}>保存</Button>
          <Button busy={busy} onClick={() => void read()}>读取</Button>
        </Foot>
        <Row label="读取结果" stack>
          <Code>{result === null ? "—" : JSON.stringify(result, null, 2)}</Code>
        </Row>
      </Card>
      <Hint>数据写在应用数据目录的 playground.yaml，键为 example.value。</Hint>
    </Group>
  );
}

/** 运行环境。 */
export function RuntimeDemo({ runtime, toast }: DemoProps) {
  const [system, setSystem] = useState<{
    displays: unknown;
    locale: string;
    paths: Record<string, string>;
    mount: unknown;
  } | null>(null);

  useEffect(() => {
    void api.system().then(setSystem).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : String(error), "error");
    });
  }, [toast]);

  return (
    <>
      <Group title="运行库">
        <Card>
          <Row label="版本">
            <Readout>{runtime.version}</Readout>
          </Row>
          <Row label="WebView 引擎">
            <Readout>{runtime.engine}</Readout>
          </Row>
          <Row label="平台">
            <Readout>{runtime.platform}</Readout>
          </Row>
          <Row label="宿主进程">
            <Readout>{runtime.pointerBits} 位</Readout>
          </Row>
          {runtime.host ? (
            <Row label="宿主实现">
              <Readout>
                {runtime.host.name || runtime.host.language}
                {runtime.host.version ? ` · v${runtime.host.version}` : ""}
              </Readout>
            </Row>
          ) : null}
          <Row label="当前窗口">
            <Readout>
              Window {runtime.windowId} · WebView {runtime.sourceId}
            </Readout>
          </Row>
          <Row label="语言">
            <Readout>{system?.locale || "读取中…"}</Readout>
          </Row>
        </Card>
      </Group>

      <Group title="路径">
        <Card>
          {(["app", "userData", "temp"] as const).map((name) => (
            <Row key={name} label={name}>
              <Readout>{system?.paths[name] || "—"}</Readout>
            </Row>
          ))}
        </Card>
      </Group>

      <Group title="显示器与挂载能力">
        <Card>
          <Row label="显示器" stack>
            <Code>{system ? JSON.stringify(system.displays, null, 2) : "读取中…"}</Code>
          </Row>
          <Row label="JAPK 挂载" stack>
            <Code>{system ? JSON.stringify(system.mount, null, 2) : "读取中…"}</Code>
          </Row>
        </Card>
      </Group>
    </>
  );
}
