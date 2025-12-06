import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, (process as any).cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: 8080,
    },
    optimizeDeps: {
      // 排除 @google/genai，避免 Vite 在 Node 环境中预构建它导致 crypto 报错
      exclude: ["@google/genai"],
    },
    build: {
      outDir: "dist",
    },
    define: {
      "process.env.API_KEY": JSON.stringify(env.API_KEY),
      // Fix: Define process.env as an empty object string to avoid replacing it with the actual Node process.env object
      // which causes syntax errors or massive bundles in the browser.
      "process.env": JSON.stringify({}),
    },
  };
});
