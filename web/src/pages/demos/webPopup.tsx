import { useState } from "react";

import type { RuntimeInfo } from "../../bridge";
import { Button } from "../../components/controls";
import { Card, Foot, Group } from "../../components/primitives";
import { SourceCode } from "../../components/SourceCode";
import { TextField } from "../../components/ui";
import { DEFAULT_WEB_POPUP, webPopupFeatures, webPopupSource } from "../../data/webPopup";

/** 从 WebView 内直接打开网页，演示 JadeView 对 window.open 的处理。 */
export function WebPopupDemo({ runtime }: { runtime: RuntimeInfo }) {
  const supported = runtime.platform === "Windows";
  const [url, setUrl] = useState(DEFAULT_WEB_POPUP.url);
  const [width, setWidth] = useState(String(DEFAULT_WEB_POPUP.width));
  const [height, setHeight] = useState(String(DEFAULT_WEB_POPUP.height));
  const [error, setError] = useState("");

  const requestedWidth = Number(width);
  const requestedHeight = Number(height);
  const validSize = Number.isSafeInteger(requestedWidth) && requestedWidth >= 480
    && Number.isSafeInteger(requestedHeight) && requestedHeight >= 280;

  const openPopup = () => {
    setError("");
    let address: URL;
    try {
      address = new URL(url.trim());
    } catch {
      setError("请输入完整的 HTTP 或 HTTPS 地址。");
      return;
    }
    if ((address.protocol !== "https:" && address.protocol !== "http:") || address.username || address.password) {
      setError("请输入不含用户名和密码的 HTTP 或 HTTPS 地址。");
      return;
    }
    if (!validSize) {
      setError("宽度至少为 480，高度至少为 280，且必须是整数。");
      return;
    }
    // 直接在用户点击时调用，等待 IPC 或异步任务可能丢失弹窗所需的用户操作。
    const popup = window.open(address.href, "_blank", webPopupFeatures(requestedWidth, requestedHeight));
    if (!popup) setError("未能打开弹窗。请检查网页弹窗设置。");
  };

  const reset = () => {
    setUrl(DEFAULT_WEB_POPUP.url);
    setWidth(String(DEFAULT_WEB_POPUP.width));
    setHeight(String(DEFAULT_WEB_POPUP.height));
    setError("");
  };

  return (
    <>
      <Group>
        <Card>
          <div className="pg-launch-bar">
            <Button variant="primary" disabled={!supported} onClick={openPopup}>打开网页弹窗</Button>
          </div>
          <div className="pg-launch-options">
            <div className="pg-param">
              <span className="pg-param__label">网页地址</span>
              <TextField
                value={url}
                onChange={setUrl}
                placeholder={DEFAULT_WEB_POPUP.url}
                aria-label="网页地址"
                disabled={!supported}
              />
            </div>
            <div className="pg-param">
              <span className="pg-param__label">窗口尺寸（CSS 像素）</span>
              <div className="pg-pair">
                <div className="pg-num">
                  <TextField value={width} onChange={setWidth} inputMode="numeric"
                    placeholder="宽" aria-label="弹窗宽度" disabled={!supported} />
                </div>
                <span className="pg-pair__x" aria-hidden="true">×</span>
                <div className="pg-num">
                  <TextField value={height} onChange={setHeight} inputMode="numeric"
                    placeholder="高" aria-label="弹窗高度" disabled={!supported} />
                </div>
              </div>
            </div>
            <button type="button" className="btn btn--plain pg-param__reset" onClick={reset} disabled={!supported}>
              恢复默认
            </button>
          </div>
          {!supported ? <Foot>此示例需要 Windows。</Foot> : null}
          {error ? <Foot><span role="alert">{error}</span></Foot> : null}
        </Card>
      </Group>
      <Group title="参考代码">
        <Card className="pg-source">
          <SourceCode language="JavaScript" code={webPopupSource({
            url: url.trim() || DEFAULT_WEB_POPUP.url,
            width: validSize ? requestedWidth : DEFAULT_WEB_POPUP.width,
            height: validSize ? requestedHeight : DEFAULT_WEB_POPUP.height,
          })} />
        </Card>
      </Group>
    </>
  );
}
