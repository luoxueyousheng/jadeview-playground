import { Link, Navigate } from "react-router-dom";

import type { RuntimeInfo, Snapshot } from "../bridge";
import { WindowSample } from "../components/WindowSample";
import { Page, PageHead } from "../components/primitives";
import { EXAMPLES, NAV_GROUPS, navGroupOf, sampleFields } from "../data/catalog";
import { asLaunchTheme } from "../launch";
import { DEFAULT_PATH, examplePath } from "../routing/routes";
import type { Launcher } from "../useExamples";
import { WebPopupDemo } from "./demos/webPopup";

type Search = { terms: readonly string[]; pattern: RegExp };

export function highlightSearch(text: string, pattern?: RegExp) {
  return pattern ? text.split(pattern).map((part, index) =>
    index % 2 ? <mark className="pg-search-hit" key={index}>{part}</mark> : part,
  ) : text;
}

function matchingCode(example: (typeof EXAMPLES)[string], terms: readonly string[]) {
  const visible = `${example.title} ${example.summary} ${example.group}`.toLowerCase();
  const hiddenTerms = terms.filter((term) => !visible.includes(term));
  if (!hiddenTerms.length) return;

  for (const source of [...example.api.split("\n"), example.kind]) {
    const line = source.trim();
    const match = line.toLowerCase();
    const term = hiddenTerms.find((word) => match.includes(word));
    if (!term) continue;
    const at = match.indexOf(term);
    const start = Math.max(0, at - 40);
    const end = Math.min(line.length, Math.max(start + 120, at + term.length + 40));
    return `${start ? "…" : ""}${line.slice(start, end)}${end < line.length ? "…" : ""}`;
  }
}

export function ExampleList({ kinds, search }: { kinds: readonly string[]; search?: Search }) {
  return (
    <ul className="pg-example-list">
      {kinds.map((kind) => {
        const example = EXAMPLES[kind];
        const code = search && matchingCode(example, search.terms);
        return (
          <li key={kind}>
            <Link className="pg-example-link" to={examplePath(kind)}>
              <span>
                <strong>{highlightSearch(example.title, search?.pattern)}</strong>
                <span className="pg-example-link__summary">{highlightSearch(example.summary, search?.pattern)}</span>
                {code ? <code className="pg-example-link__match">{highlightSearch(code, search?.pattern)}</code> : null}
              </span>
              <span className="pg-chevron" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function GroupPage({ group }: { group: string }) {
  const current = NAV_GROUPS.find((item) => item.id === group);
  if (!current) return <Navigate replace to={DEFAULT_PATH} />;

  return (
    <Page wide>
      <PageHead title={current.label} />
      <ExampleList kinds={current.items} />
    </Page>
  );
}

export function ExamplePage({
  kind, runtime, snapshot, launcher,
}: {
  kind: string;
  runtime: RuntimeInfo;
  snapshot: Snapshot;
  launcher: Launcher;
}) {
  const meta = EXAMPLES[kind];
  const group = navGroupOf(kind);
  if (!meta || !group) return <Navigate replace to={DEFAULT_PATH} />;
  const window = snapshot.windows.find((item) => item.kind === kind) ?? null;

  return (
    <Page wide>
      <PageHead title={meta.title} sub={meta.summary} />
      {kind === "webpopup" ? <WebPopupDemo runtime={runtime} /> : <WindowSample
        key={kind}
        kind={kind}
        source={meta.api}
        sourceLanguage={meta.language}
        fields={sampleFields(kind)}
        defaultTitle={`${meta.title} · JadeView`}
        isWindows={runtime.platform === "Windows"}
        win11={runtime.win11}
        keepActiveBackdrop={runtime.keepActiveBackdrop}
        theme={asLaunchTheme(snapshot.theme)}
        window={window}
        launcher={launcher}
        supported={kind !== "splash" || runtime.platform === "Windows"}
      />}
    </Page>
  );
}
