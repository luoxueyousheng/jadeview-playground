import type { HostLanguageModule } from "../types";

/**
 * 新增宿主语言 PR 前端注册模板：
 * 1. 复制本文件为 `web/src/hosts/languages/<id>.ts`（例如 `csharp.ts` / `cpp.ts` / `nodejs.ts`）；
 * 2. 填写下方的 id、language、snippets、apiReference 或 slots；
 * 3. `web/src/hosts/index.ts` 会自动扫描并加载，无需修改其它公共文件。
 */
const templateHostModule: HostLanguageModule = {
  id: "example",
  language: "C",
  displayName: "Example + JadeView NEXT",
  snippets: {
    // dwm: `...`,
  },
};

export default templateHostModule;
