import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'node:url';

// Use PWD (preserves symlink path) to avoid spaces in resolved real paths.
// esbuild cannot handle spaces in import paths, and the real path on this
// system contains "MacIntosh HD 1". Falling back to __dirname when PWD is
// unavailable keeps the config portable.
const dirname = process.env.PWD ?? (typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  // Force Vite to use the symlink path as root (real path may contain spaces)
  root: dirname,
  resolve: {
    // Note: Vite does not expose a `symlinks` toggle here. The spaces-in-path
    // workaround is handled entirely by forcing `root` to the PWD (symlink)
    // path above; esbuild's own import handling stays on that path as long as
    // we do not resolve through real paths ourselves.
    alias: {
      '@istracked/datagrid-core': path.resolve(dirname, 'packages/core/src'),
      '@istracked/datagrid-react': path.resolve(dirname, 'packages/react/src'),
      '@istracked/datagrid-extensions': path.resolve(dirname, 'packages/extensions/src'),
      '@istracked/datagrid-mui': path.resolve(dirname, 'packages/mui/src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['**/__tests__/**', '**/index.ts'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80
      }
    },
  }
});
