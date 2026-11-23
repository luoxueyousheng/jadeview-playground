import { useEffect, useState } from "react";

import { api, jade, hasBridge, type NativeEvent } from "../bridge";
import { Button, TextArea } from "../components/controls";
import { Badge, Card, Code, Foot, Group, Hint, Page, PageHead, Readout, Row } from "../components/primitives";
import { WindowChrome } from "../components/WindowChrome";
import { useRuntime } from "../runtime";

const NOTE_KEY = "playground.note";

/**
 * 工作区里的独立 WebView。
 *
 * 这张页面是"真正被嵌进原生窗口的网页"：它有独立的 Profile、独立的导航历史，
 * 也能被宿主执行脚本、收发消息。页面自己只证明三件事——我是谁、我属于谁、
 * 我的状态是不是真的独立保存。
 */
export function Pane() {
  const { runtime, snapshot, error } = useRuntime();
  const params = new URLSearchParams(location.search);
  const details = params.has("details");
  const hiddenFrame = params.get("window") === "hidden";

  const [note, setNote] = useState(() => localStorage.getItem(NOTE_KEY) ?? "");
  const [reply, setReply] = useState("");
  const [inbox, setInbox] = useState<NativeEvent | null>(null);

  useEffect(() => {
    localStorage.setItem(NOTE_KEY, note);
  }, [note]);

  useEffect(() => {
    if (!hasBridge()) return;
    return jade().on("playground.message", (payload) => {
      setInbox(payload as NativeEvent);
    });
  }, []);

  const profile = runtime?.snapshot.panes.find((row) => row.id === runtime.sourceId)?.profile;

  const body = (
    <Page>
      <PageHead
        kicker={runtime ? `Window ${runtime.windowId} / WebView ${runtime.sourceId}` : "正在连接宿主"}
        title={details ? "这是详情页" : "独立的原生 WebView"}
        sub="一张真正独立的网页：可导航、可被宿主执行脚本、可接收跨视图消息，也保存自己的页面状态。"
      />

      {error ? <Hint>{error}</Hint> : null}

      <Group title="身份">
        <Card>
          <Row label="视图">
            <Readout>{runtime ? String(runtime.sourceId) : "—"}</Readout>
          </Row>
          <Row label="父窗口">
            <Readout>{runtime ? String(runtime.windowId) : "—"}</Readout>
          </Row>
          <Row label="Profile">
            <Readout>{profile ?? (runtime ? "独立窗口 Profile" : "—")}</Readout>
          </Row>
          <Row label="来源">
            <Readout>{location.origin}</Readout>
          </Row>
          <Foot>Profile 与无痕设置在「多 WebView 工作区」里创建视图时选择。</Foot>
        </Card>
      </Group>

      <Group title="独立状态">
        <Card>
          <Row label="Profile 便签" hint="写进当前视图的 localStorage" stack>
            <TextArea rows={3} value={note} placeholder="输入内容，然后刷新视图" label="Profile 便签" onChange={setNote} />
          </Row>
          <Row label="往返">
            <Button
              variant="primary"
              onClick={() => {
                void api
                  .echo(note)
                  .then((result) => setReply(JSON.stringify(result, null, 2)))
                  .catch((caught: Error) => setReply(caught.message));
              }}
            >
              发给宿主
            </Button>
            <Button
              onClick={() => {
                const target = new URL(location.href);
                target.searchParams.set("details", String(Date.now()));
                location.assign(target.href);
              }}
            >
              进入下一页
            </Button>
          </Row>
          {reply ? (
            <Row block>
              <Code>{reply}</Code>
            </Row>
          ) : null}
          <Foot>刷新后便签仍在，说明这个视图有自己的存储；换一个 Profile 就看不到它。</Foot>
        </Card>
      </Group>

      {inbox ? (
        <Group title="收到的消息">
          <Card>
            <Row block>
              <Code>{JSON.stringify(inbox, null, 2)}</Code>
            </Row>
          </Card>
        </Group>
      ) : null}

      <Group title="连接">
        <Card>
          <Row label="运行库">
            <Readout>{runtime ? `${runtime.version} · ${runtime.platform}` : "未连接"}</Readout>
          </Row>
          <Row label="状态">
            <Badge tone={runtime ? "ok" : "warn"}>{runtime ? "已连接" : "等待宿主"}</Badge>
          </Row>
          <Row label="窗口数">
            <Readout>{snapshot ? String(snapshot.windows.length) : "—"}</Readout>
          </Row>
        </Card>
      </Group>
    </Page>
  );

  if (!hiddenFrame) return body;

  return (
    <div className="app pg-app pg-app--single pg-app--frameless">
      <div className="view view--wide">
        <div className="shell">
          <main className="panel panel--routes">
            <div className="pg-window">
              <WindowChrome title={runtime ? `WebView ${runtime.sourceId}` : "WebView"} variant="bar" windowId={runtime?.sourceId} />
              <div className="pg-window__body">{body}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
