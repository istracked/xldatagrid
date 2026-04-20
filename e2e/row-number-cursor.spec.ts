/**
 * End-to-end: row-number cell shows a non-default "select this row" cursor (#74).
 *
 * Contract (see GitHub #74): hovering the chrome row-number cell must
 * switch the cursor to a right-pointing-arrow shape (or equivalent
 * non-default token) that communicates "click to select this row".
 * Acceptable cursor strings are anything NOT in {auto, text, default, ''}
 * because concrete implementations may use `url(...) fallback`, `e-resize`,
 * `pointer`, or a bespoke token — all of which satisfy the contract.
 *
 * The styling must hold in dark mode as well.
 *
 * Story: `examples-chrome-columns--row-numbers-only` for light mode. Dark
 * mode is exercised by toggling `data-theme="dark"` on `document.body` via
 * `page.evaluate`, which matches how the grid's theming surface is
 * commonly flipped in stories.
 *
 * Expected to FAIL today: the row-number cell inherits the default text
 * cursor.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const STORY_URL =
  '/iframe.html?viewMode=story&id=examples-chrome-columns--row-numbers-only';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

function firstRowNumber(page: Page): Locator {
  return page.locator('[data-chrome="row-number"]').first();
}

async function cursorOf(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).cursor);
}

const DEFAULT_CURSORS = new Set(['auto', 'text', 'default', '']);

test.describe('Row-number cursor affordance (#74)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY_URL);
    await waitForGrid(page);
  });

  test('row-number-cursor: hovering a row-number cell sets a non-default cursor (#74)', async ({
    page,
  }) => {
    const cell = firstRowNumber(page);
    await expect(cell).toBeVisible();
    await cell.hover();

    const cursor = await cursorOf(cell);
    expect(
      DEFAULT_CURSORS.has(cursor),
      `row-number cursor must NOT be a default token; got ${JSON.stringify(cursor)}`,
    ).toBe(false);
  });

  test('row-number-cursor: the cursor value is NOT text/auto/default — it communicates "select this row" (#74)', async ({
    page,
  }) => {
    const cell = firstRowNumber(page);
    await cell.hover();

    // The concrete keyword / URL is implementation-defined, but it must not
    // be one of the defaults that indicate "no affordance".
    const cursor = await cursorOf(cell);
    for (const bad of DEFAULT_CURSORS) {
      expect(cursor).not.toBe(bad);
    }
    // Practical sanity: the cursor string should be non-empty and at least
    // resemble a cursor token ('pointer', 'e-resize', 'url(...), <fallback>').
    expect(cursor.length).toBeGreaterThan(0);
  });

  test('row-number-cursor: the non-default cursor styling applies in dark mode as well (#74)', async ({
    page,
  }) => {
    // Flip to dark theme via the grid's `data-theme` attribute on body.
    // This is a best-effort hook — if the grid uses a class-based toggle
    // (`.theme-dark` on `<html>`) the spec will adjust alongside the
    // implementation.
    await page.evaluate(() => {
      document.body.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    const cell = firstRowNumber(page);
    await cell.hover();

    const cursor = await cursorOf(cell);
    expect(
      DEFAULT_CURSORS.has(cursor),
      `dark-mode row-number cursor must NOT fall back to a default; got ${JSON.stringify(cursor)}`,
    ).toBe(false);
  });
});
