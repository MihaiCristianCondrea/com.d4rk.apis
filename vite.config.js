import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  publicDir: resolve(__dirname, 'src/main/assets'),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/main'),
    },
  },
  build: {
    outDir: 'assets/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    open: false,
    port: 5173,
  },
});
