import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEARFLOW_');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': { target: env.GEARFLOW_API_TARGET || 'http://127.0.0.1:3000', changeOrigin: true },
      },
    },
  };
});
