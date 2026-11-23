import type { RuntimeInfo } from "../bridge";
import { GroupIcons } from "../components/NavIcons";
import { Card, Code, Empty, Group, Page, PageHead, Readout, Row } from "../components/primitives";
import { EXAMPLES, NAV_GROUPS } from "../data/catalog";
import { ExampleList, highlightSearch } from "./GroupPage";

export function Overview({ query }: { query: string }) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const escapedTerms = [...new Set(terms)].sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const search = escapedTerms.length
    ? { terms, pattern: new RegExp(`(${escapedTerms.join("|")})`, "giu") }
    : undefined;
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((kind) => {
      const example = EXAMPLES[kind];
      const text = [kind, group.label, example.title, example.summary, example.api].join(" ").toLowerCase();
      return terms.every((term) => text.includes(term));
    }),
  })).filter((group) => group.items.length);

  return (
    <Page wide>
      <PageHead title="示例" />
      {groups.length === 0 ? <Empty title="没有匹配的示例" /> : null}
      <div className="pg-groups">
        {groups.map((group) => {
          const Icon = GroupIcons[group.id as keyof typeof GroupIcons];
          return (
            <section className="pg-group" key={group.id} data-group={group.id}>
              <h2 className="pg-group__title"><Icon /><span>{highlightSearch(group.label, search?.pattern)}</span></h2>
              <ExampleList kinds={group.items} search={search} />
            </section>
          );
        })}
      </div>
    </Page>
  );
}

export function AboutPage({ runtime }: { runtime: RuntimeInfo }) {
  return (
    <Page>
      <PageHead title="关于 Playground" sub="用 Python 和 React 演示 JadeView NEXT。" />
      <Group title="运行环境">
        <Card>
          <Row label="JadeView"><Readout>{runtime.version}</Readout></Row>
          <Row label="WebView"><Readout>{runtime.engine}</Readout></Row>
          <Row label="平台"><Readout>{runtime.platform}</Readout></Row>
          <Row label="宿主进程"><Readout>{runtime.pointerBits} 位</Readout></Row>
        </Card>
      </Group>
      <Group title="从命令行启动">
        <Card>
          <Row block><Code>{"npm ci\npython run.py --dev"}</Code></Row>
        </Card>
      </Group>
    </Page>
  );
}
