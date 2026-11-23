import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import { useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { api } from "../bridge";
import { getApiReference } from "../data/apiReference";
import type { CodeLanguage } from "../data/catalog";

hljs.registerLanguage("c", c);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);

function highlightCode(code: string, language: CodeLanguage) {
  // Highlight.js 转义源码。只在它生成的 HTML 中装饰已登记的 API 标识符。
  const template = document.createElement("template");
  template.innerHTML = hljs.highlight(code, { language: language.toLowerCase() }).value;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);

  for (const node of texts) {
    if (node.parentElement?.closest(".hljs-comment, .hljs-string, .hljs-regexp")) continue;
    const matches = [...node.data.matchAll(/\b[A-Za-z_]\w*\b/g)]
      .filter(([name]) => getApiReference(name, language));
    if (!matches.length) continue;

    const annotated = document.createDocumentFragment();
    let offset = 0;
    for (const match of matches) {
      const name = match[0];
      annotated.append(node.data.slice(offset, match.index));
      const token = document.createElement("span");
      token.className = "pg-api-token";
      token.tabIndex = 0;
      token.dataset.api = name;
      token.textContent = name;
      annotated.append(token);
      offset = match.index + name.length;
    }
    annotated.append(node.data.slice(offset));
    node.replaceWith(annotated);
  }
  return template.innerHTML;
}

function apiToken(target: EventTarget | null) {
  return target instanceof HTMLElement ? target.closest<HTMLElement>("[data-api]") : null;
}

function ApiTooltip({ id, anchor, name, language, dismiss }: {
  id: string;
  anchor: HTMLElement;
  name: string;
  language: CodeLanguage;
  dismiss: () => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const entry = getApiReference(name, language);

  useLayoutEffect(() => {
    const popup = element.current;
    if (!popup) return;
    const rect = anchor.getBoundingClientRect();
    const margin = 10;
    const x = Math.max(margin, Math.min(rect.left, innerWidth - popup.offsetWidth - margin));
    const below = rect.bottom + 8;
    const y = below + popup.offsetHeight <= innerHeight - margin
      ? below : Math.max(margin, rect.top - popup.offsetHeight - 8);
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.visibility = "visible";
    anchor.setAttribute("aria-describedby", id);
    return () => anchor.removeAttribute("aria-describedby");
  }, [anchor, id, language, name]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [dismiss]);

  return entry ? createPortal(
    <div className="pg-api-tooltip" id={id} ref={element} role="tooltip">
      <code>{entry.signature}</code>
      <strong>{entry.summary}</strong>
      {entry.details ? <p>{entry.details}</p> : null}
    </div>,
    document.body,
  ) : null;
}

export function SourceCode({ code, language }: { code: string; language: CodeLanguage }) {
  const [status, setStatus] = useState("");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tooltipId = useId();
  // Syntax highlighting can wait a render while a slider is moving.
  const displayedCode = useDeferredValue(code);
  const html = useMemo(() => ({ __html: highlightCode(displayedCode, language) }), [displayedCode, language]);
  const copy = async () => {
    try {
      await api.clipboardWrite(code);
      setStatus("已复制");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <div className="pg-source__tools">
        <span className="pg-source__language">{language}</span>
        <span className="pg-source__status" role="status">{status}</span>
        <button type="button" className="btn btn--plain" onClick={() => void copy()}>复制代码</button>
      </div>
      <pre className="pg-code pg-code--block">
        <code
          className="hljs"
          dangerouslySetInnerHTML={html}
          onPointerOver={(event) => setAnchor(apiToken(event.target))}
          onPointerLeave={() => setAnchor(apiToken(document.activeElement))}
          onFocus={(event) => setAnchor(apiToken(event.target))}
          onBlur={(event) => setAnchor(apiToken(event.relatedTarget))}
        />
      </pre>
      {anchor?.isConnected && anchor.dataset.api ? (
        <ApiTooltip id={tooltipId} anchor={anchor} name={anchor.dataset.api} language={language}
          dismiss={() => setAnchor(null)} />
      ) : null}
    </>
  );
}
