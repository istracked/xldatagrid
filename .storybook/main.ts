import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/react-vite',
  viteFinal: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@istracked/datagrid-core': resolve(__dirname, '../packages/core/src'),
      '@istracked/datagrid-react': resolve(__dirname, '../packages/react/src'),
      '@istracked/datagrid-extensions': resolve(__dirname, '../packages/extensions/src'),
    };
    // Enable HMR for package source files
    config.server = config.server ?? {};
    config.server.watch = {
      ...config.server.watch,
      // Watch the package source directories for changes
      ignored: ['!**/packages/*/src/**'],
    };
    config.optimizeDeps = {
      ...config.optimizeDeps,
      // Exclude workspace packages so Vite processes them as source
      exclude: [
        ...(config.optimizeDeps?.exclude ?? []),
        '@istracked/datagrid-core',
        '@istracked/datagrid-react',
        '@istracked/datagrid-extensions',
      ],
    };
    return config;
  },
};
export default config;
