# Python 宿主（官方参考实现）

本目录是 JadeView Playground 的 Python 参考宿主实现，供其它语言宿主（Go、Rust、C#、C++ 等）对齐协议与功能行为。

## 前置条件

- Python 3.11+
- Node.js 22+（仓库根目录执行一次 `npm ci`）
- 与 Python 同位数的 JadeView NEXT 动态库放入仓库根目录 `runtime/`

## 启动方式

开发模式（自动拉起或连接 Vite）：

```powershell
python hosts/python/run.py --dev
# 或根目录兼容入口：
python run.py --dev
```

发布产物模式（先运行 `npm run build` 生成 `web/dist`）：

```powershell
python hosts/python/run.py
```

## 文件说明

- `app.py`：主控制器、IPC 路由分发、安全鉴权、多窗口与主题同步
- `native.py`：`ctypes` C ABI 绑定封装
- `sdk.py`：窗口、WebView、菜单与启动画面高级封装
- `layout.py`：多 WebView 工作区百分比/像素布局计算
- `dev.py`：开发期 Vite Dev Server 生命周期管理
- `host.json`：标准化宿主清单（由 `tests/test_hosts.py` 自动校验）
