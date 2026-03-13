import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  base: './',
  envDir: path.resolve(__dirname),
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@utils': path.resolve(__dirname, './src/renderer/utils'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@assets': path.resolve(__dirname, './src/renderer/assets'),
    },
  },
  server: {
    port: 5173,
  },
});

