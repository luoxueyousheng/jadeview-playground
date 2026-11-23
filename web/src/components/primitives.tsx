import type { ReactNode } from "react";

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="route-scroll">
      <div className={wide ? "app-page" : "app-page app-page--narrow"}>{children}</div>
    </div>
  );
}

export function PageHead({ kicker, title, sub }: { kicker?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <header className="pg-head">
      {kicker ? <span className="pg-head__kicker">{kicker}</span> : null}
      <h1 className="pg-head__title">{title}</h1>
      {sub ? <p className="pg-head__sub">{sub}</p> : null}
    </header>
  );
}

export function Group({
  title,
  note,
  children,
}: {
  title?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="group">
      {title ? (
        <h2 className="group__title">
          {title}
          {note ? <span className="group__title-note">{note}</span> : null}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className ? `card ${className}` : "card"}>{children}</div>;
}

/**
 * 卡片里的一行。
 *
 * `stack` / `block` 都切到 `.card__row--stack`（纵向排），区别只在语义：
 * `stack` 是"标签 + 值上下两行"，`block` 是"整行都让给内容"。
 */
export function Row({
  label,
  hint,
  stack = false,
  block = false,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  stack?: boolean;
  block?: boolean;
  children?: ReactNode;
}) {
  const column = stack || block;
  return (
    <div className={column ? "card__row card__row--stack" : "card__row"}>
      {label ? (
        <span className="row__label">
          {label}
          {hint ? <span className="row__hint">{hint}</span> : null}
        </span>
      ) : null}
      {children}
    </div>
  );
}

export function Foot({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={error ? "card__foot pg-foot pg-foot--error" : "card__foot pg-foot"}>{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint">{children}</p>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="note">{children}</p>;
}

/** 等宽读数：窗口 / WebView / 句柄这类要能逐位比对的数字。 */
export function Readout({ children }: { children: ReactNode }) {
  return <span className="mono pg-readout">{children}</span>;
}

export function Code({ children }: { children: ReactNode }) {
  return <pre className="pg-code">{children}</pre>;
}

export function Badge({ tone, children }: { tone?: "ok" | "warn"; children: ReactNode }) {
  return (
    <span className={tone === "warn" ? "pill pill--warn" : "pill pill--ok"}>
      <span className="pill__dot" />
      {children}
    </span>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <p className="empty">
      {title}
      {detail ? <span className="pg-empty__detail">{detail}</span> : null}
    </p>
  );
}
