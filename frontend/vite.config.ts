import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Em desenvolvimento, /api é repassado ao backend: celulares na mesma rede
// acessam só o frontend (porta 5173) e não precisam de CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3333', changeOrigin: true } },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
