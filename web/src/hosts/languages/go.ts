import type { HostLanguageModule } from "../types";

const goHostModule: HostLanguageModule = {
  id: "go",
  language: "Go",
  displayName: "Go + JadeView NEXT",
  snippets: {
    dwm: `// 通过 JadeView C ABI / Go 绑定设置标题栏组件与样式
jade.SetWindowResizable(windowID, true)
jade.SetTitlebarComponents(windowID, true, true, true, true, true)
jade.SetTitlebarStyle(windowID, jade.TitlebarStyle{
\tHeight:         42,
\tBackground:     "#202020",
\tForeground:     "#f5f5f5",
\tButtonBg:       "",
\tButtonHoverBg:  "#ffffff20",
\tButtonHoverFg:  "#ffffff",
})`,
    overlay: `// BarOverlay 保留原生边框，由网页通过 jade-region-drag 绘制拖拽区
jade.SetWindowFrame(windowID, "BarOverlay")
jade.SetTitlebarStyle(windowID, jade.TitlebarStyle{
\tHeight:        40,
\tButtonBg:      "#ffffff10",
\tButtonHoverBg: "#ffffff20",
})`,
    theme: `// 先切换主题，再设置 DWM 背景材质
jade.SetWindowTheme(windowID, "Dark")
jade.SetWindowBackdrop(windowID, "MicaAlt")`,
    layout: `// 在同一宿主窗口中创建多个带独立名称与 Profile 的 WebView Pane
paneID := jade.CreateWebviewPane(windowID, jade.PaneOptions{
\tLabel:   "left",
\tURL:     "https://jade.run/pane.html",
\tProfile: "isolated",
})
jade.SetWebviewBounds(paneID, 12, 48, 360, 420)`,
    ipc: `// 注册 Playground IPC 通道处理器并向指定 WebView 推送消息
jade.OnIPC("playground", func(ctx jade.IPCContext) jade.IPCResponse {
\taction := ctx.PayloadString("action")
\tif action == "hello" {
\t\treturn jade.OK(map[string]any{"host": map[string]any{"language": "go"}})
\t}
\treturn jade.Err("unsupported action")
})
jade.SendIPCMessage(webviewID, "playground:event", map[string]any{"seq": 1})`,
    clipboard: `// 直接通过原生能力读写系统剪贴板文本
text, err := jade.ClipboardReadText()
jade.ClipboardWriteText("来自 Go 宿主的数据")`,
  },
};

export default goHostModule;
