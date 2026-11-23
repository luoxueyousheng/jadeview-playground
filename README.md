# JadeView Playground

## 1. 初始化

准备 Python 3.11+、Node.js 22+ 和与 Python 同位数的 JadeView NEXT 运行库。Windows 将 `JadeView.dll` 放入 `runtime/`，Linux 将 `libJadeView.so` 放入 `runtime/`。

在 `jadeview-playground` 目录安装前端依赖：

```sh
npm ci
```

## 2. 启动调试

在同一目录运行：

```sh
python run.py --dev
```

Playground 会启动 Vite 并打开原生窗口，直接加载 `http://127.0.0.1:5173`。修改前端代码后会热更新，关闭主窗口会一并退出 Vite。
