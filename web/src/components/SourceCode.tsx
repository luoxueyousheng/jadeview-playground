import hljs from "highlight.js/lib/core";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import { useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { api } from "../bridge";
import { getApiReference } from "../data/apiReference";
import type { CodeLanguage } from "../data/catalog";
import { normalizeLanguageLabel, resolvePreferredLanguage } from "../data/hostSnippets";

hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("go", go);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("typescript", typescript);

function hljsLanguageKey(language: string): string | null {
  const normalized = language.trim().toLowerCase();
  const alias: Record<string, string> = {
    c: "c",
    "c++": "cpp",
    cpp: "cpp",
    "c#": "csharp",
    csharp: "csharp",
    go: "go",
    golang: "go",
    rust: "rust",
    python: "python",
    javascript: "javascript",
    typescript: "typescript",
  };
  const key = alias[normalized] ?? normalized;
  return hljs.getLanguage(key) ? key : null;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function highlightCode(code: string, language: string) {
  // Highlight.js 转义源码。只在它生成的 HTML 中装饰已登记的 API 标识符。
  const template = document.createElement("template");
  const hljsLang = hljsLanguageKey(language);
  template.innerHTML = hljsLang ? hljs.highlight(code, { language: hljsLang }).value : escapeHtml(code);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  const apiLang = (normalizeLanguageLabel(language) ?? language) as CodeLanguage;

  for (const node of texts) {
    if (node.parentElement?.closest(".hljs-comment, .hljs-string, .hljs-regexp")) continue;
    const matches = [...node.data.matchAll(/\b[A-Za-z_]\w*\b/g)]
      .filter(([name]) => getApiReference(name, apiLang));
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

export function SourceCode({
  code,
  language,
  snippets,
  preferredLanguage,
}: {
  code: string;
  language: string;
  snippets?: Record<string, string>;
  preferredLanguage?: string;
}) {
  const snippetEntries = useMemo(() => {
    const map: Record<string, string> = {};
    if (code) map[language] = code;
    if (snippets) {
      for (const [lang, text] of Object.entries(snippets)) {
        if (text) map[lang] = text;
      }
    }
    return map;
  }, [code, language, snippets]);
  const languages = useMemo(() => Object.keys(snippetEntries), [snippetEntries]);
  const defaultLanguage = useMemo(
    () => resolvePreferredLanguage(languages, preferredLanguage, language),
    [languages, preferredLanguage, language],
  );
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  useEffect(() => {
    setSelectedLanguage(defaultLanguage);
  }, [defaultLanguage]);

  const activeLanguage = snippetEntries[selectedLanguage] ? selectedLanguage : defaultLanguage;
  const activeCode = snippetEntries[activeLanguage] ?? code;
  const [status, setStatus] = useState("");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tooltipId = useId();
  // Syntax highlighting can wait a render while a slider is moving.
  const displayedCode = useDeferredValue(activeCode);
  const html = useMemo(() => ({ __html: highlightCode(displayedCode, activeLanguage) }), [displayedCode, activeLanguage]);
  const copy = async () => {
    try {
      await api.clipboardWrite(activeCode);
      setStatus("已复制");
      window.setTimeout(() => setStatus(""), 1800);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <div className="pg-source__tools">
        {languages.length > 1 ? (
          <div className="pg-source__langs" role="tablist" aria-label="参考代码语言">
            {languages.map((lang) => (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={lang === activeLanguage}
                className="pg-source__lang-btn"
                data-active={lang === activeLanguage ? "true" : undefined}
                onClick={() => setSelectedLanguage(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
        ) : (
          <span className="pg-source__language">{activeLanguage}</span>
        )}
        <span className="pg-source__status" role="status">{status}</span>
        <button type="button" className="btn btn--plain" onClick={() => void copy()}>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" />
            <path d="M3.5 10.5H3a1.2 1.2 0 0 1-1.2-1.2V3A1.2 1.2 0 0 1 3 1.8h6.3A1.2 1.2 0 0 1 10.5 3v.5" />
          </svg>
          复制代码
        </button>
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
        <ApiTooltip id={tooltipId} anchor={anchor} name={anchor.dataset.api}
          language={(normalizeLanguageLabel(activeLanguage) ?? activeLanguage) as CodeLanguage}
          dismiss={() => setAnchor(null)} />
      ) : null}
    </>
  );
}
