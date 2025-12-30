import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/'),
      '@root': __dirname,
    },
  },
  server: {
    allowedHosts: true,
  },
  base: './',
  assetsInclude: ['**/*.txt'],
});
