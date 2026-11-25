# 多语言宿主目录（`hosts/`）

本目录集中存放所有编程语言的 **JadeView Playground 宿主实现**。前端 `web/`、静态图标 `assets/`、运行时动态库目录 `runtime/` 均位于仓库根目录，被所有语言宿主共享。

## 目录结构规范

每个语言宿主独占一个 `hosts/<id>/` 子目录，**不得直接散落到仓库根目录**：

```text
jadeview-next-playground/
├── assets/
│   └── playground.png          # 跨语言共享静态资源（图标、Splash LOGO 等）
├── docs/
│   └── HOST_INTEGRATION_SPEC.md # IPC 协议与前端插槽规范
├── runtime/                    # 共享 JadeView.dll / libJadeView.so
├── web/                        # 跨语言共享 React 前端
│   └── src/hosts/languages/    # 每种语言一个前端代码注册文件（零冲突 PR）
│       ├── python.ts
│       ├── go.ts
│       └── <id>.ts
└── hosts/
    ├── _template/              # 新增语言宿主复制模板
    ├── python/                 # Python 参考宿主
    │   ├── host.json           # 必填：标准化宿主清单
    │   ├── README.md           # 必填：构建与运行说明
    │   └── ...
    ├── go/                     # 示例：Go 语言 PR 目录规划
    │   ├── host.json
    │   ├── README.md
    │   ├── go.mod
    │   └── main.go
    └── rust/                   # 示例：Rust 语言 PR 目录规划
        ├── host.json
        ├── README.md
        ├── Cargo.toml
        └── src/main.rs
```

## 新增宿主语言的 PR 规范

1. 复制 `hosts/_template/` 到 `hosts/<lang>/`（目录名使用全小写标识符，例如 `go`、`rust`、`csharp`、`cpp`、`nodejs`）。
2. 在 `hosts/<lang>/` 下放置该语言的完整宿主源码、工程配置（如 `go.mod` / `Cargo.toml`）以及：
   - `hosts/<lang>/host.json`：`id` 必须与目录名 `<lang>` 一致。
   - `hosts/<lang>/README.md`：说明环境依赖、开发模式启动命令与构建方式。
3. 支持共享 CLI 参数约定，便于统一脚本和开发者使用：
   - 默认加载仓库根目录 `web/dist`；支持 `--frontend <path>` 覆写前端目录或 `.asar/.japk`。
   - 支持 `--dev`（连接 `http://127.0.0.1:5173` 或拉起根目录 Vite）及 `--dev <url>`。
   - 默认加载仓库根目录 `runtime/JadeView.dll`（Windows）或 `runtime/libJadeView.so`（Linux）。
   - 使用共享资源 `assets/playground.png` 作为默认托盘/启动画面/右键菜单示例图片。
4. 在 `web/src/hosts/languages/<lang>.ts` 新增该语言的前端代码片段与扩展模块（前端通过 `import.meta.glob` 自动发现，无需改动任何共享路由或注册表文件）。
5. 本地运行校验通过后再提交 PR：
   ```powershell
   npm run build
   npm test
   ```
