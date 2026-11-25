# JadeView Playground

## 1. 初始化

准备 Node.js 22+ 与目标语言运行时（当前内置参考宿主为 Python 3.11+）。Windows 将 `JadeView.dll` 放入 `runtime/`，Linux 将 `libJadeView.so` 放入 `runtime/`。

在仓库根目录安装前端依赖：

```sh
npm ci
```

## 2. 启动 Python 参考宿主调试

在仓库根目录运行：

```sh
python hosts/python/run.py --dev
# 或根目录兼容入口：
python run.py --dev
```

Playground 会启动 Vite 并打开原生窗口，直接加载 `http://127.0.0.1:5173`。修改前端代码后会热更新，关闭主窗口会一并退出 Vite。

## 3. 多语言宿主放置与 PR 规范

本仓库采用**跨语言共享前端（`web/`）+ 按语言分目录宿主（`hosts/<lang>/`）**结构，欢迎 Go、Rust、C#、C++ 等宿主通过 PR 直接加入本仓库：

- 多语言宿主目录放置与 `host.json` 清单规范：[hosts/README.md](hosts/README.md)
- 贡献指南与 PR 接入流程：[CONTRIBUTING.md](CONTRIBUTING.md)
- 完整 IPC 协议、`hello` 握手与前端插槽规范：[docs/HOST_INTEGRATION_SPEC.md](docs/HOST_INTEGRATION_SPEC.md)
- 宿主语言自动发现注册入口：[web/src/hosts/languages/](web/src/hosts/languages/)（每种语言一个独立文件，PR 零冲突）
- 前端传输适配层与扩展插槽：[web/src/bridge.ts](web/src/bridge.ts) · [web/src/slots.tsx](web/src/slots.tsx)
