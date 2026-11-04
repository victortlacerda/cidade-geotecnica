import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { target: 'es2020', cssCodeSplit: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } },
});
