/**
 * End-to-end: row-number gutter uses a darker grey background by default (#70).
 *
 * Contract (see GitHub #70): the chrome row-number cell MUST render with a
 * non-transparent background whose luminance is lower than the background
 * of the adjacent data cell on the same row. This makes the row-number
 * gutter read as a distinct "frame" around the data area, matching the
 * spreadsheet convention users expect.
 *
 * The invariant applies by default (no config flag) and across multiple
 * rows, so alternating-row-colour schemes cannot accidentally satisfy it
 * only for row 1.
 *
 * Story: `examples-chrome-columns--row-numbers-only` — the canonical
 * row-number demonstration.
 *
 * These tests are expected to FAIL today: the row-number cell inherits the
 * row background, so its luminance equals the adjacent data cell.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const STORY_URL =
  '/iframe.html?viewMode=story&id=examples-chrome-columns--row-numbers-only';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

// Parses `rgb(r, g, b)` / `rgba(r, g, b, a)` into its numeric components.
// Returns `null` if the colour string is transparent (alpha 0 or the literal
// `transparent`) so callers can assert the cell actually paints a colour.
function parseRgba(s: string): [number, number, number, number] | null {
  if (!s || s === 'transparent') return null;
  const m = s.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/,
  );
  if (!m) return null;
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  if (a === 0) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), a];
}

// Relative luminance per WCAG — good enough to compare "which is darker".
function luminance([r, g, b]: [number, number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

async function computedBg(locator: Locator): Promise<string> {
  return locator.evaluate((el) => getComputedStyle(el).backgroundColor);
}

function rowNumberCellForRow(page: Page, rowIndex: number): Locator {
  return page.locator('[data-chrome="row-number"]').nth(rowIndex);
}

function firstDataCellForRow(page: Page, rowIndex: number): Locator {
  // Data cells carry `data-field` and `role="gridcell"`. The chrome row
  // number cell is also a gridcell but carries `data-chrome` — we exclude
  // those here so we pick a data column, not the gutter itself.
  return page
    .locator('[role="row"]')
    .nth(rowIndex + 1 /* skip header row */)
    .locator('[role="gridcell"]:not([data-chrome])')
    .first();
}

test.describe('Row-number gutter background (#70)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY_URL);
    await waitForGrid(page);
  });

  test('row-number-bg: the row-number cell has a non-transparent computed background-color by default (#70)', async ({
    page,
  }) => {
    const cell = rowNumberCellForRow(page, 0);
    await expect(cell).toBeVisible();

    const bg = await computedBg(cell);
    const parsed = parseRgba(bg);
    expect(
      parsed,
      `row-number cell must paint a non-transparent background; got ${JSON.stringify(bg)}`,
    ).not.toBeNull();
  });

  test('row-number-bg: the row-number cell\'s background is darker (lower luminance) than the adjacent data cell\'s background (#70)', async ({
    page,
  }) => {
    const gutter = rowNumberCellForRow(page, 0);
    const data = firstDataCellForRow(page, 0);
    await expect(gutter).toBeVisible();
    await expect(data).toBeVisible();

    const gutterBg = parseRgba(await computedBg(gutter));
    const dataBg = parseRgba(await computedBg(data));
    expect(gutterBg, 'gutter must paint a background').not.toBeNull();
    expect(dataBg, 'data cell must paint a background').not.toBeNull();

    expect(
      luminance(gutterBg!),
      'row-number gutter must be visibly darker than the adjacent data cell',
    ).toBeLessThan(luminance(dataBg!));
  });

  test('row-number-bg: the darker-than-adjacent invariant holds across multiple rows (first and a middle row) (#70)', async ({
    page,
  }) => {
    for (const rowIndex of [0, 2]) {
      const gutter = rowNumberCellForRow(page, rowIndex);
      const data = firstDataCellForRow(page, rowIndex);
      await expect(gutter).toBeVisible();
      await expect(data).toBeVisible();

      const gutterBg = parseRgba(await computedBg(gutter));
      const dataBg = parseRgba(await computedBg(data));
      expect(gutterBg, `row ${rowIndex} gutter bg`).not.toBeNull();
      expect(dataBg, `row ${rowIndex} data bg`).not.toBeNull();

      expect(
        luminance(gutterBg!),
        `row ${rowIndex}: gutter must be darker than adjacent data cell`,
      ).toBeLessThan(luminance(dataBg!));
    }
  });
});
