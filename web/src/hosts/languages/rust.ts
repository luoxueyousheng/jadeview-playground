import type { HostLanguageModule } from "../types";

const rustHostModule: HostLanguageModule = {
  id: "rust",
  language: "Rust",
  displayName: "Rust + JadeView NEXT",
  snippets: {
    dwm: `// 通过 JadeView Rust 绑定设置标题栏组件与样式
window.set_resizable(true);
window.set_titlebar_components(true, true, true, true, true);
window.set_titlebar_style(TitlebarStyle {
    height: 42,
    background: Some("#202020"),
    foreground: Some("#f5f5f5"),
    button_bg: Some(""),
    button_hover_bg: Some("#ffffff20"),
    button_hover_fg: Some("#ffffff"),
});`,
    overlay: `window.set_frame("BarOverlay");
window.set_titlebar_style(TitlebarStyle {
    height: 40,
    button_bg: Some("#ffffff10"),
    button_hover_bg: Some("#ffffff20"),
    ..Default::default()
});`,
    theme: `window.set_theme("Dark");
window.set_backdrop("MicaAlt");`,
    layout: `let pane_id = window.create_webview_pane(PaneOptions {
    label: "left",
    url: "https://jade.run/pane.html",
    profile: Some("isolated"),
})?;
pane_id.set_bounds(12, 48, 360, 420);`,
    ipc: `runtime.on_ipc("playground", |ctx| {
    match ctx.action() {
        "hello" => Ok(json!({ "host": { "language": "rust" } })),
        _ => Err("unsupported action"),
    }
});
webview.send_ipc_message("playground:event", json!({ "seq": 1 }));`,
    clipboard: `let text = jade::clipboard_read_text()?;
jade::clipboard_write_text("来自 Rust 宿主的数据")?;`,
  },
};

export default rustHostModule;
