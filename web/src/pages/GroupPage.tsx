import { Link, Navigate } from "react-router-dom";

import { getExampleSupport, type RuntimeInfo, type Snapshot } from "../bridge";
import { ExampleIcons, GroupIcons } from "../components/NavIcons";
import { WindowSample } from "../components/WindowSample";
import { Card, Group, Page, PageHead } from "../components/primitives";
import { EXAMPLES, NAV_GROUPS, sampleFields, type ExampleMeta } from "../data/catalog";
import { asLaunchTheme } from "../launch";
import { DEFAULT_PATH, examplePath } from "../routing/routes";
import { usePlaygroundSlots } from "../slots";
import type { Launcher } from "../useExamples";
import { WebPopupDemo } from "./demos/webPopup";

type Search = { terms: readonly string[]; pattern: RegExp };

export function highlightSearch(text: string, pattern?: RegExp) {
  return pattern ? text.split(pattern).map((part, index) =>
    index % 2 ? <mark className="pg-search-hit" key={index}>{part}</mark> : part,
  ) : text;
}

function matchingCode(example: ExampleMeta, terms: readonly string[]) {
  const visible = `${example.title} ${example.summary} ${example.group}`.toLowerCase();
  const hiddenTerms = terms.filter((term) => !visible.includes(term));
  if (!hiddenTerms.length) return;

  for (const source of [...example.api.split("\n"), example.kind]) {
    const line = source.trim();
    const match = line.toLowerCase();
    const term = hiddenTerms.find((word) => match.includes(word));
    if (!term) continue;
    const at = match.indexOf(term);
    const start = Math.max(0, at - 36);
    const end = Math.min(line.length, Math.max(start + 100, at + term.length + 36));
    return `${start ? "…" : ""}${line.slice(start, end)}${end < line.length ? "…" : ""}`;
  }
}

export function ExampleList({
  kinds,
  search,
  openKinds,
}: {
  kinds: readonly string[];
  search?: Search;
  openKinds?: ReadonlySet<string>;
}) {
  const slots = usePlaygroundSlots();
  const allExamples = { ...EXAMPLES, ...slots.customExamples };
  const allGroups = [...NAV_GROUPS, ...(slots.customNavGroups ?? [])];

  return (
    <ul className="pg-example-list">
      {kinds.map((kind) => {
        const example = allExamples[kind];
        if (!example) return null;
        const code = search && matchingCode(example, search.terms);
        const groupId = allGroups.find((group) => group.items.includes(kind))?.id ?? "windowing";
        const Icon = ExampleIcons[example.icon] ?? GroupIcons[groupId];
        const opened = openKinds?.has(kind);
        return (
          <li key={kind}>
            <Link className="pg-example-link" to={examplePath(kind)}>
              <span className="pg-example-link__icon" aria-hidden="true">
                {Icon ? <Icon /> : null}
              </span>
              <span className="pg-example-link__content">
                <span className="pg-example-link__top">
                  <strong>{highlightSearch(example.title, search?.pattern)}</strong>
                  {opened ? <span className="pg-example-link__live">运行中</span> : null}
                  <span className="pg-example-link__lang">{example.language}</span>
                </span>
                <span className="pg-example-link__summary">{highlightSearch(example.summary, search?.pattern)}</span>
                {code ? <code className="pg-example-link__match">{highlightSearch(code, search?.pattern)}</code> : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function GroupPage({ group, openKinds }: { group: string; openKinds?: ReadonlySet<string> }) {
  const slots = usePlaygroundSlots();
  const allGroups = [...NAV_GROUPS, ...(slots.customNavGroups ?? [])];
  const current = allGroups.find((item) => item.id === group);
  if (!current) return <Navigate replace to={DEFAULT_PATH} />;

  return (
    <Page wide>
      <PageHead
        kicker={`能力分组 · ${current.items.length} 个示例`}
        title={current.label}
      />
      <ExampleList kinds={current.items} openKinds={openKinds} />
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
  const slots = usePlaygroundSlots();
  const allExamples = { ...EXAMPLES, ...slots.customExamples };
  const allGroups = [...NAV_GROUPS, ...(slots.customNavGroups ?? [])];
  const meta = allExamples[kind];
  const group = allGroups.find((item) => item.items.includes(kind));
  if (!meta || !group) return <Navigate replace to={DEFAULT_PATH} />;
  const window = snapshot.windows.find((item) => item.kind === kind) ?? null;
  const CustomDemo = slots.customDemos?.[kind];
  const support = getExampleSupport(runtime, kind);
  const unsupportedReason = support.supported ? null : (support.reason ?? "当前宿主不支持此示例。");

  return (
    <Page wide>
      <PageHead kicker={group.label} title={meta.title} sub={meta.summary} />
      {kind === "webpopup" ? (
        <>
          <WebPopupDemo runtime={runtime} />
          {meta.points.length ? <ExamplePoints points={meta.points} /> : null}
        </>
      ) : CustomDemo ? (
        <>
          <CustomDemo runtime={runtime} theme={snapshot.theme} />
          {meta.points.length ? <ExamplePoints points={meta.points} /> : null}
        </>
      ) : (
        <WindowSample
          key={kind}
          kind={kind}
          source={meta.api}
          sourceLanguage={meta.language}
          customSnippets={meta.snippets}
          points={meta.points}
          fields={sampleFields(kind)}
          defaultTitle={`${meta.title} · JadeView`}
          isWindows={runtime.platform === "Windows"}
          win11={runtime.win11}
          keepActiveBackdrop={runtime.keepActiveBackdrop}
          theme={asLaunchTheme(snapshot.theme)}
          window={window}
          launcher={launcher}
          supported={kind !== "splash" || runtime.platform === "Windows"}
          host={runtime.host}
          unsupportedReason={unsupportedReason}
        />
      )}
    </Page>
  );
}

export function ExamplePoints({ points }: { points: readonly string[] }) {
  return (
    <Group title="演示要点">
      <Card>
        <ul className="pg-points">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </Card>
    </Group>
  );
}
