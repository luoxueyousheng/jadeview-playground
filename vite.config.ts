import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * 前端入口在 `web/`，产物仍然落在 `web/dist`——宿主（run.py --frontend）、
 * ASAR 打包脚本和 README 都指向这个目录。
 *
 * `base: "./"`：页面由 JadeView 的自定义协议（JADE://…）提供，
 * 绝对路径 `/assets/…` 会解析到协议根之外，必须用相对路径。
 */
export default defineConfig({
  root: resolve(__dirname, "web"),
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "web/dist"),
    emptyOutDir: true,
    target: "chrome110",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "web/index.html"),
        pane: resolve(__dirname, "web/pane.html"),
      },
      output: {
        // 两个入口共享 React、motion 与组件层：单独切出来，另一个页面直接复用。
        manualChunks: { vendor: ["react", "react-dom", "motion"] },
        entryFileNames: "assets/[name]-[hash].js",
        // 共享块的默认名字会取自 styles.css，看着像样式文件，统一叫 shared。
        chunkFileNames: (chunk) => `assets/${chunk.name === "vendor" ? "vendor" : "shared"}-[hash].js`,
        // 样式也只有一份，固定叫 app.css，便于宿主/ASAR 排查。
        assetFileNames: (asset) =>
          asset.name?.endsWith(".css")
            ? "assets/app-[hash][extname]"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
