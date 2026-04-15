import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    alias: {
      '@istracked/datagrid-core': path.resolve(__dirname, 'packages/core/src'),
      '@istracked/datagrid-react': path.resolve(__dirname, 'packages/react/src'),
      '@istracked/datagrid-extensions': path.resolve(__dirname, 'packages/extensions/src'),
      '@istracked/datagrid-mui': path.resolve(__dirname, 'packages/mui/src')
    }
  },
  test: {
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
    workspace: [{
      extends: true,
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['packages/**/__tests__/**/*.test.{ts,tsx}']
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});