import type { HostLanguageModule } from "../types";

const pythonHostModule: HostLanguageModule = {
  id: "python",
  language: "Python",
  displayName: "Python + JadeView NEXT",
  snippets: {
    dwm: `window.set_resizable(True)
window.set_titlebar_components(
    back=True, reload=True, icon=True, minimize=True, maximize=True,
)
window.set_titlebar_style(
    height=42, background="#202020", foreground="#f5f5f5",
    button_bg="", button_hover_bg="#ffffff20", button_hover_fg="#ffffff",
)`,
  },
};

export default pythonHostModule;
