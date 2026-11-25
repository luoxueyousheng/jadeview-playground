import { useState } from "react";

import { api, hasBridge, type RuntimeInfo } from "../bridge";
import { Button } from "../components/controls";
import { GroupIcons } from "../components/NavIcons";
import { Card, Code, Empty, Group, Page, PageHead, Readout, Row } from "../components/primitives";
import { EXAMPLES, NAV_GROUPS } from "../data/catalog";
import { usePlaygroundSlots } from "../slots";
import { ExampleList, highlightSearch } from "./GroupPage";

export function Overview({
  query,
  openKinds,
  runtime,
}: {
  query: string;
  openKinds?: ReadonlySet<string>;
  runtime?: RuntimeInfo;
}) {
  const slots = usePlaygroundSlots();
  const allExamples = { ...EXAMPLES, ...slots.customExamples };
  const allGroups = [...NAV_GROUPS, ...(slots.customNavGroups ?? [])];
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const escapedTerms = [...new Set(terms)].sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const search = escapedTerms.length
    ? { terms, pattern: new RegExp(`(${escapedTerms.join("|")})`, "giu") }
    : undefined;
  const groups = allGroups.map((group) => ({
    ...group,
    items: group.items.filter((kind) => {
      const example = allExamples[kind];
      if (!example) return false;
      const text = [kind, group.label, example.title, example.summary, example.api].join(" ").toLowerCase();
      return terms.every((term) => text.includes(term));
    }),
  })).filter((group) => group.items.length);

  const totalExamples = Object.keys(allExamples).length;
  const matchCount = groups.reduce((acc, group) => acc + group.items.length, 0);
  const openCount = openKinds?.size ?? 0;
  const hostName = runtime?.host?.name || runtime?.host?.language;

  return (
    <Page wide>
      {search ? (
        <>
          <PageHead title="搜索示例" />
          <p className="pg-search-summary">
            找到 {matchCount} 个匹配「{query.trim()}」的示例
          </p>
        </>
      ) : (
        <section className="pg-hero" aria-label="JadeView 示例概览">
          <div className="pg-hero__body">
            <span className="pg-hero__eyebrow">JadeView NEXT · Cross-Language Playground</span>
            <h1 className="pg-hero__title">探索 JadeView 原生能力</h1>
            <p className="pg-hero__sub">
              面向多种编程语言与 JadeView 宿主的交互式示例平台，涵盖窗口标题栏、背景材质、多 WebView 布局、IPC 通信与系统集成。
            </p>
            {hostName ? (
              <div className="pg-host-badge">
                <span>当前宿主：{hostName}</span>
                {runtime?.host?.version ? <span className="mono">v{runtime.host.version}</span> : null}
              </div>
            ) : null}
            {runtime && slots.overviewHeroExtra ? slots.overviewHeroExtra({ runtime }) : null}
          </div>
          <div className="pg-hero__stats">
            <div className="pg-stat">
              <span className="pg-stat__value mono">{totalExamples}</span>
              <span className="pg-stat__label">交互示例</span>
            </div>
            <div className="pg-stat">
              <span className="pg-stat__value mono">{allGroups.length}</span>
              <span className="pg-stat__label">能力分组</span>
            </div>
            <div className="pg-stat">
              <span className="pg-stat__value mono">{openCount}</span>
              <span className="pg-stat__label">运行中窗口</span>
            </div>
          </div>
        </section>
      )}

      {groups.length === 0 ? <Empty title="没有匹配的示例" detail="尝试搜索窗口、标题栏、IPC、dialog 或 WebView 等关键词。" /> : null}
      <div className="pg-groups">
        {groups.map((group) => {
          const Icon = GroupIcons[group.id as keyof typeof GroupIcons] ?? GroupIcons.windowing;
          return (
            <section className="pg-group" key={group.id} data-group={group.id}>
              <div className="pg-group__header">
                <h2 className="pg-group__title">
                  <Icon />
                  <span>{highlightSearch(group.label, search?.pattern)}</span>
                </h2>
                <span className="pg-group__count mono">{group.items.length}</span>
              </div>
              <ExampleList kinds={group.items} search={search} openKinds={openKinds} />
            </section>
          );
        })}
      </div>
    </Page>
  );
}

export function AboutPage({ runtime }: { runtime: RuntimeInfo }) {
  const slots = usePlaygroundSlots();
  const [copied, setCopied] = useState(false);
  const [copiedRepo, setCopiedRepo] = useState(false);
  const host = runtime.host;
  const hostName = host?.name || host?.language || "JadeView 宿主";
  const cli = host?.launchCommand;
  const repoUrl = host?.repository || "https://github.com/tuyangJs/jadeview-playground";
  const repoLabel = repoUrl.replace(/^https?:\/\/github\.com\//i, "");
  const extraRows = slots.aboutHostRows ? slots.aboutHostRows({ runtime }) : [];

  const copyCli = async () => {
    if (!cli) return;
    try {
      await api.clipboardWrite(cli);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 宿主不可用时静默忽略
    }
  };

  const copyRepo = async () => {
    try {
      await api.clipboardWrite(repoUrl);
      setCopiedRepo(true);
      window.setTimeout(() => setCopiedRepo(false), 1600);
    } catch {
      // 宿主不可用时静默忽略
    }
  };

  return (
    <Page>
      <PageHead
        title="关于 Playground"
        sub={`由 ${hostName} 与 React Frontend 驱动的 JadeView NEXT 跨语言交互式示例平台。`}
      />
      <Group>
        <Card>
          <div className="pg-about-head">
            <div className="pg-about-head__icon">
              <img src="./favicon.ico" width="24" height="24" alt="" draggable={false} />
            </div>
            <div>
              <div className="pg-about-head__title">JadeView Playground</div>
              <div className="pg-about-head__sub">跨语言宿主通用前端 · Windows 11 Fluent / WinUI 风格</div>
            </div>
          </div>
          {host ? (
            <Row label="当前宿主">
              <Readout>
                {hostName}
                {host.version ? ` · v${host.version}` : ""}
              </Readout>
            </Row>
          ) : null}
          <Row label="JadeView 版本"><Readout>{runtime.version}</Readout></Row>
          <Row label="WebView 引擎"><Readout>{runtime.engine}</Readout></Row>
          <Row label="操作系统"><Readout>{runtime.platform}{runtime.win11 ? " 11" : ""}</Readout></Row>
          <Row label="宿主进程架构"><Readout>{runtime.pointerBits} 位</Readout></Row>
          {extraRows.map((row) => (
            <Row key={row.label} label={row.label}>{row.value}</Row>
          ))}
        </Card>
      </Group>
      <Group title="开源仓库">
        <Card>
          <Row label="GitHub" hint="查看跨语言集成规范、示例源码或参与贡献">
            <div className="btn-row">
              <Button variant="plain" onClick={() => void copyRepo()}>
                {copiedRepo ? "已复制" : "复制地址"}
              </Button>
              <a
                className="btn"
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (!hasBridge()) return;
                  event.preventDefault();
                  void api.openExternal(repoUrl);
                }}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path d="M8 1.2a6.8 6.8 0 0 0-2.15 13.25c.34.06.46-.15.46-.33v-1.16c-1.88.41-2.28-.9-2.28-.9-.3-.78-.75-.99-.75-.99-.62-.42.05-.41.05-.41.68.05 1.04.7 1.04.7.61 1.04 1.6.74 1.99.57.06-.44.24-.74.43-.91-1.5-.17-3.08-.75-3.08-3.34 0-.74.26-1.34.7-1.82-.07-.17-.3-.86.07-1.8 0 0 .57-.18 1.87.7a6.5 6.5 0 0 1 3.4 0c1.3-.88 1.87-.7 1.87-.7.37.94.14 1.63.07 1.8.44.48.7 1.08.7 1.82 0 2.6-1.58 3.17-3.09 3.34.24.21.46.62.46 1.26v1.87c0 .18.12.4.47.33A6.8 6.8 0 0 0 8 1.2Z" />
                </svg>
                {repoLabel}
              </a>
            </div>
          </Row>
        </Card>
      </Group>
      {cli ? (
        <Group title="从命令行启动">
          <Card>
            <Row label="开发环境命令" hint="启动前端构建/热更新并运行当前宿主">
              <Button variant="plain" onClick={() => void copyCli()}>
                {copied ? "已复制" : "复制命令"}
              </Button>
            </Row>
            <Row block><Code>{cli}</Code></Row>
          </Card>
        </Group>
      ) : null}
    </Page>
  );
}
