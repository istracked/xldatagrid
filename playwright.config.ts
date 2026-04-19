/**
 * Playwright configuration for the `@istracked/datagrid-monorepo` end-to-end
 * suite. Specs live under `e2e/` and drive a real browser against the
 * Storybook instance that renders the grid packages.
 *
 * CI note: the `webServer` stanza tells Playwright to boot Storybook on port
 * 6006 before the test run begins, so GitHub Actions does not need to pre-
 * start a server. The server is reused locally when it is already running
 * (typical developer workflow: `pnpm run storybook` in a separate terminal).
 */
import { defineConfig, devices } from '@playwright/test';

const STORYBOOK_PORT = Number(process.env.STORYBOOK_PORT ?? 6006);
const STORYBOOK_URL = `http://localhost:${STORYBOOK_PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Single worker keeps story iframes deterministic on CI runners that only
  // have a couple of cores; Playwright still parallelises across files when
  // the worker count is raised.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list']]
    : [['list']],
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  use: {
    baseURL: STORYBOOK_URL,
    headless: true,
    actionTimeout: 7_500,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `storybook dev` is fast enough for E2E and supports HMR; the static
    // build path is available via `pnpm build-storybook && pnpm exec http-server`
    // for anyone who needs to profile without Vite in the loop.
    command: `pnpm run storybook -- --ci --port ${STORYBOOK_PORT} --quiet`,
    url: STORYBOOK_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
