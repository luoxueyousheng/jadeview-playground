## 变更说明

<!-- 简述本 PR 的改动内容与目标 -->

## PR 类型

- [ ] 新增宿主语言实现（`hosts/<lang>/` + `web/src/hosts/languages/<lang>.ts`）
- [ ] 更新现有宿主语言实现或示例代码
- [ ] 前端公共能力 / 规范文档调整

## 新增宿主信息（如新增语言宿主请填写）

- **宿主语言与 ID**：`<!-- 例如：go / rust / csharp -->`
- **目录位置**：`hosts/<lang>/`
- **前端语言模块**：`web/src/hosts/languages/<lang>.ts`
- **开发模式启动命令**：`<!-- 例如：go run ./hosts/go -- --dev -->`

## 合入前检查清单

- [ ] 宿主代码完整放置在 `hosts/<lang>/` 下，未污染仓库根目录
- [ ] 已创建 `hosts/<lang>/host.json`（`id` 与目录名一致）与 `hosts/<lang>/README.md`
- [ ] 默认加载仓库根目录 `web/dist` 与 `runtime/`，并支持 `--dev` 与 `--frontend` 参数
- [ ] `hello` 回包包含 `host` 描述信息；暂未适配的示例已在 `host.json` 和 `hello.host.unsupportedExamples` 中声明
- [ ] `playground` IPC 通道已实施受信任 WebView 鉴权（禁止 `webpopup` 等第三方站点调用宿主控制动作）
- [ ] 已添加 `web/src/hosts/languages/<lang>.ts`（无需修改 `App.tsx` 等共享前端文件）
- [ ] 本地已通过：`npm run build`、`npm test`、`node --experimental-strip-types tests/test_color.mjs`
