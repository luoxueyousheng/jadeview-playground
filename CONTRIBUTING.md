# 贡献指南：为 JadeView Playground 新增宿主语言

欢迎通过 Pull Request 为本项目贡献新的编程语言宿主实现（如 **Go、Rust、C#、C++、Node.js** 等）！
本仓库采用「**一语言一宿主目录 + 一语言一前端注册文件**」的设计，确保不同语言的 PR 互不冲突、可直接合入。

---

## PR 必须包含的文件布局

假设你要提交 **Go** 语言宿主，你的 PR 只需新增/修改以下两个隔离区域：

```text
jadeview-next-playground/
├── hosts/
│   └── go/                         # 1. 宿主源码目录（与其它语言完全隔离）
│       ├── host.json               #    必填：宿主清单，参考 hosts/_template/host.json
│       ├── README.md               #    必填：环境依赖、运行与构建命令
│       ├── go.mod
│       ├── main.go                 #    宿主实现（默认读取根目录 runtime/ 与 web/dist）
│       └── ...
└── web/
    └── src/
        └── hosts/
            └── languages/
                └── go.ts           # 2. 前端语言模块（Vite 自动扫描加载，无需改动其它 TS 文件）
```

> 请**不要**修改 `web/src/App.tsx`、`web/src/pages/*` 等公共前端页面；如需定制入口，请通过 `go.ts` 中的 `slots` 字段注入到预留插槽。

---

## 分步接入流程

### 第 1 步：创建 `hosts/<lang>/` 目录

1. 复制 [hosts/_template/](hosts/_template/) 到 `hosts/<lang>/`（目录名使用全小写，例如 `go`、`rust`、`csharp`）。
2. 编辑 `hosts/<lang>/host.json`：
   - `"id"` 必须与目录名 `<lang>` 一致。
   - `"entry"` 指向主入口文件或包路径（例如 `"hosts/go/main.go"`）。
   - `"frontendModule"` 指向 `"web/src/hosts/languages/<lang>.ts"`。
   - 若部分示例在初版 PR 中尚未实现，将其写入 `"unsupportedExamples": { "tray": "暂未实现..." }`。
3. 宿主运行时路径约定：
   - **前端资源**：发布模式默认加载仓库根目录 `web/dist`（支持 `--frontend <path>` 覆盖）；开发模式支持 `--dev [url]` 连接 `http://127.0.0.1:5173`。
   - **JadeView 动态库**：默认加载仓库根目录 `runtime/JadeView.dll`（Windows）或 `runtime/libJadeView.so`（Linux）。
   - **共享图片资产**：优先读取根目录 `assets/playground.png`。
4. 按 [跨语言宿主集成规范](docs/HOST_INTEGRATION_SPEC.md) 实现 `"playground"` IPC 通道、`hello` 中的 `host` 描述字段，以及受信任 WebView 鉴权边界。

### 第 2 步：新增 `web/src/hosts/languages/<lang>.ts`

1. 复制 [web/src/hosts/languages/_template.ts](web/src/hosts/languages/_template.ts) 为 `web/src/hosts/languages/<lang>.ts`。
2. 填写：
   - `id`（与 `hosts/<lang>/host.json` 一致）
   - `language`（与 `CodeLanguage` 一致，如 `"Go"`、`"Rust"`、`"C#"`）
   - `snippets`：各示例在该语言下的参考代码
   - `apiReference`（可选）：该语言绑定专属 API Hover 文档
   - `slots`（可选）：注入到标题栏、侧边栏、概览页、关于页或自定义示例页面的 UI 插槽

`web/src/hosts/index.ts` 通过 `import.meta.glob` 自动发现所有语言文件，**不需要手动改动入口导入列表**。

### 第 3 步：本地检查与提交 PR

在仓库根目录执行完整检查：

```powershell
npm ci
npm run build
npm test
node --experimental-strip-types tests/test_color.mjs
```

确认以上检查全部通过后，填写 PR 模板即可提交。
