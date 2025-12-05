import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // 排除 @google/genai，避免 Vite 在 Node 环境中预构建它导致 crypto 报错
    exclude: ['@google/genai']
  },
  build: {
    rollupOptions: {
      // 告诉打包工具这是一个外部依赖，不要打包进最终产物
      external: ['@google/genai']
    }
  },
  // 确保 process.env 在客户端代码中可用（兼容现有代码）
  define: {
    'process.env': process.env
  }
});