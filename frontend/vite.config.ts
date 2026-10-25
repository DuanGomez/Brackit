import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE = "/<repo>/" al publicar en GitHub Pages; "/" en local.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: { port: 5173 },
});
