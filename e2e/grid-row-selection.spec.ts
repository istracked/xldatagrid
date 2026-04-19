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

  test('clicking a gridcell directly does NOT paint the row-level outline', async ({ page }) => {
    // Single-cell selection is the default behaviour: clicking one gridcell
    // must leave the row container un-outlined and paint the selection on
    // the clicked cell only. This guards against over-eager row collapse
    // (i.e. the "full row" predicate firing when only one cell is selected).
    const clickedCell = page
      .locator('[role="gridcell"][data-row-id="4"][data-field="name"]')
      .first();
    await expect(clickedCell).toBeVisible();
    await clickedCell.click();

    await expect(clickedCell).toHaveAttribute('aria-selected', 'true');

    // Row container has no outline.
    const row = page.locator('[role="row"][data-row-id="4"]').first();
    const rowOutlineStyle = await row.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(rowOutlineStyle).toBe('none');

    // The clicked cell paints its own outline (per-cell UX) and sibling
    // cells in the same row remain unselected.
    const clickedCellOutline = await clickedCell.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    expect(clickedCellOutline.style).not.toBe('none');
    expect(parseFloat(clickedCellOutline.width)).toBeGreaterThanOrEqual(1);

    const siblingCell = page
      .locator('[role="gridcell"][data-row-id="4"][data-field="email"]')
      .first();
    await expect(siblingCell).toHaveAttribute('aria-selected', 'false');
  });

  test('clicking a gridcell after a row is selected collapses to per-cell UX', async ({ page }) => {
    // First: select the whole row via the rowheader. Row outline present,
    // per-cell outlines suppressed.
    const rowheader = page
      .locator('[role="rowheader"][data-row-id="6"]')
      .first();
    await rowheader.click();

    const row = page.locator('[role="row"][data-row-id="6"]').first();
    const initialRowOutline = await row.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(initialRowOutline).not.toBe('none');

    // Then: click a gridcell in the same row. Selection must shrink to that
    // one cell — the row outline vanishes and the clicked cell paints its
    // own outline.
    const innerCell = page
      .locator('[role="gridcell"][data-row-id="6"][data-field="name"]')
      .first();
    await innerCell.click();
    await expect(innerCell).toHaveAttribute('aria-selected', 'true');

    const finalRowOutline = await row.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(finalRowOutline).toBe('none');

    const clickedCellOutlineStyle = await innerCell.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(clickedCellOutlineStyle).not.toBe('none');

    // A sibling cell that was part of the prior row-selection is now
    // deselected.
    const siblingCell = page
      .locator('[role="gridcell"][data-row-id="6"][data-field="email"]')
      .first();
    await expect(siblingCell).toHaveAttribute('aria-selected', 'false');
  });
});
