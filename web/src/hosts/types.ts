import type { ApiReference } from "../data/apiReference";
import type { CodeLanguage } from "../data/catalog";
import type { SnippetMap } from "../data/hostSnippets";
import type { PlaygroundSlots } from "../slots";

/**
 * 单个宿主语言模块契约（每门语言独立放在 `web/src/hosts/languages/<id>.ts` 中）。
 * 前端通过 `import.meta.glob("./languages/*.ts", { eager: true })` 自动发现并注册，
 * 贡献者新增语言 PR 时无需修改公共入口文件，避免多人并行 PR 冲突。
 */
export interface HostLanguageModule {
  /** 唯一语言标识，须与 `hosts/<id>/` 目录名及 `host.json` 中的 `id` 一致，如 "go" | "rust" | "python" */
  id: string;
  /** 代码标签页显示名称，如 "Python" | "Go" | "Rust" | "C" */
  language: CodeLanguage;
  /** 展示名称，如 "Python + JadeView NEXT" */
  displayName: string;
  /** 按示例 kind 提供的该语言参考代码 */
  snippets?: SnippetMap;
  /** 该语言专属 API Hover 提示文档 */
  apiReference?: Readonly<Record<string, ApiReference>>;
  /** 该语言扩展的 UI 插槽（可选） */
  slots?: Partial<PlaygroundSlots>;
}
