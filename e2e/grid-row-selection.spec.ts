/**
 * End-to-end: row-level selection outline.
 *
 * Drives the `Examples/Basic Grid → Basic Grid Left Row Numbers` story,
 * which renders the Excel-style sticky row-number gutter. Each gutter cell
 * carries `role="rowheader"` and, on click, selects the entire row.
 *
 * Contract under test:
 *   - Clicking a `role="rowheader"` cell selects every cell in that row.
 *   - The selected row's outline is drawn once on the `role="row"` element
 *     (via `outline: 2px solid ...; outline-offset: -2px`). Drawing one
 *     rectangle around the row avoids the stacked per-cell borders that
 *     previously produced a thicker, uneven edge.
 *   - Individual child `role="gridcell"` elements in the selected row
 *     suppress their own outline, so the border is not drawn twice.
 *   - Cells in unselected rows are unaffected (their per-cell outline
 *     behaviour for single-cell selection still applies elsewhere).
 *
 * Assertions target computed styles on live DOM — no screenshots.
 */
import { test, expect, type Page } from '@playwright/test';

const ROW_NUMBERS_URL =
  '/iframe.html?viewMode=story&id=examples-basic-grid--basic-grid-left-row-numbers';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

test.describe('Row selection – outline rendered on row, not per cell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROW_NUMBERS_URL);
    await waitForGrid(page);
  });

  test('clicking a rowheader paints the outline on the row element', async ({ page }) => {
    const rowheader = page
      .locator('[role="rowheader"][data-row-id="3"]')
      .first();
    await expect(rowheader).toBeVisible();
    await rowheader.click();

    const row = page.locator('[role="row"][data-row-id="3"]').first();
    await expect(row).toBeVisible();

    // Every cell in the row is marked selected.
    const cellsInRow = row.locator('[role="gridcell"]');
    const cellCount = await cellsInRow.count();
    expect(cellCount).toBeGreaterThan(0);
    for (let i = 0; i < cellCount; i += 1) {
      await expect(cellsInRow.nth(i)).toHaveAttribute('aria-selected', 'true');
    }

    // The row's own outline is drawn (non-`none`, width >= 1px).
    const rowOutline = await row.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    expect(rowOutline.style).not.toBe('none');
    expect(parseFloat(rowOutline.width)).toBeGreaterThanOrEqual(1);

    // No child gridcell draws its own outline while the row is fully selected.
    // Checking the first and last cell gives coverage of both edges of the row
    // without a full scan per test run.
    for (const idx of [0, cellCount - 1]) {
      const cellOutlineStyle = await cellsInRow
        .nth(idx)
        .evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(cellOutlineStyle).toBe('none');
    }
  });

  test('a different row stays un-outlined when another row is selected', async ({ page }) => {
    const target = page.locator('[role="rowheader"][data-row-id="2"]').first();
    await target.click();

    const otherRow = page.locator('[role="row"][data-row-id="5"]').first();
    const otherOutlineStyle = await otherRow.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(otherOutlineStyle).toBe('none');
  });
});
