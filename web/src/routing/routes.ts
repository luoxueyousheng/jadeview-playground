import { EXAMPLES, NAV_GROUPS, navGroupOf } from "../data/catalog";

export const DEFAULT_PATH = "/overview";

export function groupPath(group: string): string {
  return `/groups/${group}`;
}

export function examplePath(kind: string): string {
  return Object.hasOwn(EXAMPLES, kind) ? `/examples/${kind}` : DEFAULT_PATH;
}

export function exampleOfPath(path: string): string | null {
  const kind = path.match(/^\/examples\/([^/]+)$/)?.[1];
  return kind && Object.hasOwn(EXAMPLES, kind) ? kind : null;
}

export function groupOfPath(path: string): string | null {
  const kind = exampleOfPath(path);
  if (kind) return navGroupOf(kind)?.id ?? null;
  return NAV_GROUPS.find((group) => groupPath(group.id) === path)?.id ?? null;
}
