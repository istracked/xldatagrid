import { defineConfig } from 'vite';
import { resolve } from 'path';

// Use PWD to preserve symlink path and avoid spaces in resolved real paths
// that break esbuild. Falls back to __dirname for environments without PWD.
const fallbackRoot = resolve(__dirname, '..');
const rootDir = process.env.PWD ?? fallbackRoot;
const pkgDir = (pkg: string) => resolve(rootDir, 'packages', pkg, 'src');

export default defineConfig({
  resolve: {
    symlinks: false,
    alias: {
      '@istracked/datagrid-core': pkgDir('core'),
      '@istracked/datagrid-react': pkgDir('react'),
      '@istracked/datagrid-extensions': pkgDir('extensions'),
      '@istracked/datagrid-mui': pkgDir('mui'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@istracked/datagrid-core',
      '@istracked/datagrid-react',
      '@istracked/datagrid-extensions',
      '@istracked/datagrid-mui',
    ],
  },
  server: {
    watch: {
      ignored: ['!**/packages/*/src/**'],
    },
  },
});
