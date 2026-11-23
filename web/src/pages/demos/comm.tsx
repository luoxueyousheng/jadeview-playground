import { useEffect, useRef, useState } from "react";

import { api, hasBridge, jade, type NativeEvent } from "../../bridge";
import { Button, Select, TextArea } from "../../components/controls";
import { Badge, Card, Code, Foot, Group, Hint, Row } from "../../components/primitives";
import type { DemoProps } from "./types";

/** 固定的轮询节奏；`delay` 传 null 表示暂停。 */
function useInterval(callback: () => void, delay: number | null, immediate = false) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (immediate) saved.current();
    if (delay === null) return;
    const timer = window.setInterval(() => saved.current(), delay);
    return () => window.clearInterval(timer);
  }, [delay, immediate]);
}

/** IPC：请求往返 + 批量调用 + 跨视图消息。 */
export function IpcDemo({ snapshot, toast }: DemoProps) {
  const [text, setText] = useState("你好，JadeView NEXT。");
  const [size, setSize] = useState("0");
  const [result, setResult] = useState<unknown>(null);
  const [target, setTarget] = useState("0");
  const [message, setMessage] = useState("来自主窗口的消息");
  const [messageResult, setMessageResult] = useState<unknown>(null);
  const [inbox, setInbox] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasBridge()) return;
    // 每个 WebView 监听自己的消息，卸载时解除订阅。
    const off = jade().on("playground.message", (payload) => setInbox(payload));
    return () => off();
  }, []);

  const send = async () => {
    setBusy(true);
    try {
      const body = Number(size) ? "x".repeat(Number(size)) : text;
      const started = performance.now();
      const echoed = await api.echo(body);
      setResult({
        ...echoed,
        value: body.length > 128 ? `${body.slice(0, 128)}…` : body,
        roundTripNs: Math.round((performance.now() - started) * 1_000_000),
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const batch = async () => {
    setBusy(true);
    try {
      const responses = await jade().invokeBatch(
        [1, 2, 3].map((index) => ({
          command: "playground",
          payload: { action: "echo", value: { index, text: "NEXT" } },
        })),
      );
      setResult(responses);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const broadcast = async () => {
    setBusy(true);
    try {
      setMessageResult(await api.message(Number(target), message));
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const targets = [
    { value: "0", label: "所有本地视图" },
    ...snapshot.panes.map((pane) => ({ value: String(pane.id), label: `${pane.label} · ${pane.profile}` })),
  ];

  return (
    <>
      <Group title="请求与响应">
        <Card>
          <Row label="消息正文" stack>
            <TextArea value={text} onChange={setText} rows={3} />
          </Row>
          <Row label="正文大小" hint="选择固定大小时忽略上面的文字">
            <Select
              label="正文大小"
              value={size}
              onChange={setSize}
              options={[
                { value: "0", label: "使用上方文字" },
                { value: "1024", label: "1 KiB" },
                { value: "65536", label: "64 KiB" },
                { value: "1048576", label: "1 MiB" },
                { value: "4194304", label: "4 MiB" },
              ]}
            />
          </Row>
          <Foot>
            <Button variant="primary" busy={busy} onClick={() => void send()}>invoke</Button>
            <Button busy={busy} onClick={() => void batch()}>invokeBatch</Button>
            <span className="row__spacer" />
            <Badge>{Number(size) ? `${size} B` : "文本"}</Badge>
          </Foot>
          <Row block>
            <Code>{result ? JSON.stringify(result, null, 2) : "等待请求"}</Code>
          </Row>
        </Card>
        <Hint>往返耗时以纳秒表示；浏览器的计时精度不等于纳秒精度。</Hint>
      </Group>

      <Group title="视图间消息">
        <Card>
          <Row label="发送给">
            <Select label="发送给" value={target} onChange={setTarget} options={targets} />
          </Row>
          <Row label="消息">
            <input type="text" value={message} onChange={(event) => setMessage(event.target.value)} />
          </Row>
          <Foot>
            <Button busy={busy} onClick={() => void broadcast()}>发送消息</Button>
          </Foot>
          <Row label="发送结果" stack>
            <Code>{messageResult ? JSON.stringify(messageResult, null, 2) : "尚未发送"}</Code>
          </Row>
          <Row label="本视图收到的消息" stack>
            <Code>{inbox ? JSON.stringify(inbox, null, 2) : "等待消息…"}</Code>
          </Row>
        </Card>
        {!snapshot.panes.length ? (
          <Hint>当前窗口里没有工作区视图：目标只有「所有本地视图」和窗口自身。</Hint>
        ) : null}
      </Group>
    </>
  );
}

/** 事件查看器：轮询宿主事件环，按名称筛选。 */
export function EventsDemo({ snapshot }: DemoProps) {
  const [rows, setRows] = useState<NativeEvent[]>([]);
  const [filter, setFilter] = useState("");
  const cursor = useRef(0);

  useInterval(() => {
    void api
      .events(cursor.current)
      .then((next) => {
        if (!next.length) return;
        cursor.current = next[next.length - 1]?.index ?? cursor.current;
        setRows((list) => [...list, ...next].slice(-400));
      })
      .catch(() => {});
  }, 900, true);

  const term = filter.trim().toLowerCase();
  const visible = rows.filter((row) => row.name.toLowerCase().includes(term));
  const relationships = snapshot.windows.map((window) => ({
    windowId: window.id,
    type: window.kind,
    webviewIds: window.webviewIds,
  }));

  return (
    <>
      <Group title="实时事件流">
        <Card>
          <Foot>
            <input
              type="text"
              value={filter}
              placeholder="按事件名称筛选"
              aria-label="事件筛选"
              style={{ maxWidth: 240 }}
              onChange={(event) => setFilter(event.target.value)}
            />
            <span className="row__spacer" />
            <Badge>{rows.length} 条</Badge>
            <Button
              variant="plain"
              onClick={() => {
                cursor.current = 0;
                setRows([]);
              }}
            >
              清空
            </Button>
          </Foot>
          <Row block>
            <div className="event-log">
              <pre>{visible.map((row) => JSON.stringify(row)).join("\n") || "等待事件…"}</pre>
            </div>
          </Row>
        </Card>
      </Group>

      <Group title="窗口与视图 ID">
        <Card>
          <Row block>
            <Code>{JSON.stringify(relationships, null, 2)}</Code>
          </Row>
        </Card>
      </Group>
    </>
  );
}
