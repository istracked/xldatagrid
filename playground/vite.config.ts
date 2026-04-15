import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@istracked/datagrid-core': resolve(__dirname, '../packages/core/src'),
      '@istracked/datagrid-react': resolve(__dirname, '../packages/react/src'),
      '@istracked/datagrid-extensions': resolve(__dirname, '../packages/extensions/src'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@istracked/datagrid-core',
      '@istracked/datagrid-react',
      '@istracked/datagrid-extensions',
    ],
  },
  server: {
    watch: {
      ignored: ['!**/packages/*/src/**'],
    },
  },
});
