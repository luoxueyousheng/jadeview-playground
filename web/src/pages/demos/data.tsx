import { useState, type SyntheticEvent } from "react";

import { api, jade, type ResourceInfo } from "../../bridge";
import { Button } from "../../components/controls";
import { Card, Code, Foot, Group, Hint, Row } from "../../components/primitives";
import type { DemoProps } from "./types";

const VIDEO = ["mp4", "webm", "ogv", "mov"];
const AUDIO = ["mp3", "wav", "ogg", "flac", "m4a", "aac"];
const IMAGE = ["png", "jpg", "jpeg", "webp", "avif", "svg", "gif", "bmp"];

function releaseMediaOnUnmount(media: HTMLMediaElement | null) {
  if (!media) return;
  return () => {
    // 换文件或注销时，停止旧媒体的播放并释放浏览器正在使用的资源。
    media.pause();
    media.removeAttribute("src");
    media.load();
  };
}

/** 资源注册与预览：本地文件 → 页面可访问的 HTTPS 地址，并检查交付方式。 */
export function ResourcesDemo({ toast }: DemoProps) {
  const [resource, setResource] = useState<ResourceInfo | null>(null);
  const [state, setState] = useState<unknown>(null);
  const [http, setHttp] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const extension = resource?.name.split(".").pop()?.toLowerCase() ?? "";
  const Media = VIDEO.includes(extension) ? "video" : AUDIO.includes(extension) ? "audio" : null;
  // 调试页与受控资源地址不同源，显式启用 JadeView 的 CORS 响应。
  const crossOrigin = resource?.delivery.mode === "controlled" ? "anonymous" : undefined;

  const reportMediaEvent = ({ type, currentTarget: media }: SyntheticEvent<HTMLMediaElement>) => {
    setState({
      event: type,
      currentTime: media.currentTime,
      duration: media.duration,
      readyState: media.readyState,
      error: media.error?.message,
    });
    void api.mediaReport({ event: type, time: media.currentTime }).catch(() => {});
  };

  const open = async () => {
    setBusy(true);
    try {
      const selection = await jade().dialog.showOpenDialog({ title: "选择本地资源", properties: ["openFile"] });
      const path = selection.filePaths?.[0];
      if (selection.canceled || !path) return;
      if (resource) {
        await api.resourceClose(resource.url);
        setResource(null);
      }
      setHttp(null);
      setState(null);
      setResource(await api.resourceOpen(path));
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!resource) return;
    setBusy(true);
    try {
      await api.resourceClose(resource.url);
      setResource(null);
      setHttp(null);
      setState(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const probe = async (method: "HEAD" | "GET") => {
    if (!resource) return toast("请先注册文件", "error");
    try {
      const response = await fetch(
        resource.url,
        method === "HEAD" ? { method } : { headers: { Range: "bytes=0-1023" } },
      );
      const size = method === "HEAD" ? 0 : (await response.arrayBuffer()).byteLength;
      setHttp({ status: response.status, bodyBytes: size, headers: Object.fromEntries(response.headers) });
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), "error");
    }
  };

  return (
    <>
      <Group title="注册并预览">
        <Card>
          <Foot>
            <Button variant="primary" busy={busy} onClick={() => void open()}>
              选择并注册文件
            </Button>
            <Button busy={busy} disabled={!resource} onClick={() => void close()}>
              注销资源
            </Button>
            <span className="row__spacer" />
            <Button disabled={!resource} onClick={() => void probe("HEAD")}>HEAD</Button>
            <Button disabled={!resource} onClick={() => void probe("GET")}>Range · 前 1 KiB</Button>
          </Foot>
          <Row block>
            <div className="media-preview">
              {!resource ? (
                <span>图片、音频或视频会显示在这里</span>
              ) : Media ? (
                // 用宿主返回的私有 URL 加载资源。同类媒体换文件时也会释放旧元素。
                <Media
                  key={resource.url}
                  ref={releaseMediaOnUnmount}
                  crossOrigin={crossOrigin}
                  src={resource.url}
                  controls
                  preload={Media === "video" ? "auto" : "metadata"}
                  onLoadedMetadata={reportMediaEvent}
                  onPlaying={reportMediaEvent}
                  onWaiting={reportMediaEvent}
                  onSeeking={reportMediaEvent}
                  onSeeked={reportMediaEvent}
                  onError={reportMediaEvent}
                />
              ) : IMAGE.includes(extension) ? (
                <img crossOrigin={crossOrigin} src={resource.url} alt={resource.name} />
              ) : (
                <a href={resource.url} download={resource.name}>下载 {resource.name}</a>
              )}
            </div>
          </Row>
          <Row label="媒体状态" stack>
            <Code>{state ? JSON.stringify(state, null, 2) : "尚未播放"}</Code>
          </Row>
        </Card>
        <Hint>注册后的地址只对当前视图有效，注销或关闭窗口即失效。</Hint>
      </Group>

      <Group title="交付诊断">
        <Card>
          <Row label="资源" stack>
            <Code>{resource ? JSON.stringify(resource, null, 2) : "未注册文件"}</Code>
          </Row>
          <Row label="HTTP 响应" stack>
            <Code>{http ? JSON.stringify(http, null, 2) : "选择文件后可检查状态码与响应头"}</Code>
          </Row>
        </Card>
      </Group>
    </>
  );
}
