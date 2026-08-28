import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true
  },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  test: { exclude: ['tests/e2e/**', 'node_modules/**'] }
});
