# `<Language>` 宿主实现

> 从 `hosts/_template/` 复制创建本目录后，请替换本文件中的所有占位符，并在提交 PR 前确保 `python -m unittest discover -s tests -v` 通过。

## 环境要求

- `<Language toolchain>`
- Node.js 22+（仓库根目录运行 `npm ci`）
- JadeView NEXT 运行库（`runtime/JadeView.dll` 或 `runtime/libJadeView.so`）

## 运行方式

开发模式：

```sh
<devCommand>
```

打包模式（需先执行 `npm run build`）：

```sh
<runCommand>
```

## 已支持 / 未支持示例说明

如部分示例暂未适配，请在 `host.json` 的 `unsupportedExamples` 以及运行时 `hello` 回包的 `host.unsupportedExamples` 中声明原因。
