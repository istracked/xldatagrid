/**
 * End-to-end: per-column configuration (`borderRight`, `highlightColor`,
 * `readOnly`, `skipNavigation`) plus the row-number chrome column redesign.
 *
 * Encoded contracts (all currently failing — feature not yet implemented):
 *   - `borderRight: false` suppresses the right-hand cell divider entirely.
 *   - `borderRight: { color, width, style }` paints a custom right divider.
 *   - `highlightColor` tints every cell in the column, and remains visible
 *     when the column participates in a range selection.
 *   - `readOnly: true` on a column blocks entry into edit mode on double
 *     click, regardless of the grid-level `readOnly` flag.
 *   - `skipNavigation: true` excludes the column from both click selection
 *     and keyboard navigation.
 *   - The row-number chrome gutter no longer uses a grey header tint on the
 *     body rows: the body cell adopts the data-row background and a muted
 *     text token, with a subtle right border carrying the gutter seam.
 *
 * Assertions read computed styles on live DOM — same pattern as
 * `grid-row-selection.spec.ts`.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const STORY_URL =
  '/iframe.html?viewMode=story&id=examples-column-config--column-config-showcase';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

// ---------------------------------------------------------------------------
// Locator + computed-style helpers (modeled on `rowHasAnySide` / `getRowSides`)
// ---------------------------------------------------------------------------

function cellAt(page: Page, rowId: string, field: string): Locator {
  return page
    .locator(`[role="gridcell"][data-row-id="${rowId}"][data-field="${field}"]`)
    .first();
}

interface BorderRightStyle {
  color: string;
  style: string;
  width: number;
}

async function getBorderRight(cell: Locator): Promise<BorderRightStyle> {
  return cell.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      color: s.borderRightColor,
      style: s.borderRightStyle,
      width: parseFloat(s.borderRightWidth) || 0,
    };
  });
}

async function getBackgroundColor(cell: Locator): Promise<string> {
  return cell.evaluate((el) => getComputedStyle(el).backgroundColor);
}

async function getBackgroundImage(cell: Locator): Promise<string> {
  return cell.evaluate((el) => getComputedStyle(el).backgroundImage);
}

async function getColor(cell: Locator): Promise<string> {
  return cell.evaluate((el) => getComputedStyle(el).color);
}

async function getFontWeight(cell: Locator): Promise<string> {
  return cell.evaluate((el) => getComputedStyle(el).fontWeight);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Column config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY_URL);
    await waitForGrid(page);
  });

  test('borderRight: false hides the right border on a status cell', async ({ page }) => {
    const cell = cellAt(page, '1', 'status');
    await expect(cell).toBeVisible();
    const br = await getBorderRight(cell);
    // Accept either `border-right-style: none` or a zero-width border — the
    // grid can suppress the divider via either CSS path.
    expect(br.style === 'none' || br.width === 0).toBe(true);
  });

  test('borderRight object applies custom color, width, and style to notes', async ({ page }) => {
    const cell = cellAt(page, '1', 'notes');
    await expect(cell).toBeVisible();
    const br = await getBorderRight(cell);
    expect(br.color).toBe('rgb(139, 92, 246)');
    expect(br.width).toBeGreaterThanOrEqual(2);
    expect(br.style).toBe('dashed');
  });

  test('highlightColor applies as background on the dept column', async ({ page }) => {
    const cell = cellAt(page, '1', 'dept');
    await expect(cell).toBeVisible();
    const bg = await getBackgroundColor(cell);
    expect(bg).toBe('rgb(254, 243, 199)');
  });

  test('highlightColor stays visible when dept cells are part of a range selection', async ({ page }) => {
    // Capture an unselected dept cell's computed background as a reference.
    const unselectedRef = await getBackgroundColor(cellAt(page, '5', 'dept'));

    const first = cellAt(page, '1', 'dept');
    const second = cellAt(page, '2', 'dept');
    // Click seeds the anchor on the first dept cell; Shift+ArrowDown then
    // extends the selection through the second dept cell. The story is
    // configured with `shiftArrowBehavior="rangeSelect"` so Shift+Arrow
    // routes through `model.extendTo` rather than viewport scroll.
    await first.click();
    await page.keyboard.press('Shift+ArrowDown');

    // Both cells should be reported as selected.
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(second).toHaveAttribute('aria-selected', 'true');

    // The key guarantee: selected dept cells remain visually identifiable
    // both as selected AND as highlighted-column members. Accept any of:
    //   - background-color differs from the untouched dept-cell background
    //     (i.e. a selection tint overlays the yellow), OR
    //   - a background-image / gradient is layered on top of the highlight.
    for (const cell of [first, second]) {
      const bg = await getBackgroundColor(cell);
      const bgImage = await getBackgroundImage(cell);
      const differsFromUnselected = bg !== unselectedRef;
      const hasOverlay = bgImage !== 'none' && bgImage.length > 0;
      expect(differsFromUnselected || hasOverlay).toBe(true);
    }
  });

  test('readOnly: true blocks entering edit mode on double-click of a salary cell', async ({ page }) => {
    const cell = cellAt(page, '1', 'salary');
    await expect(cell).toBeVisible();
    await cell.dblclick();

    // No editor surface should have mounted inside the cell.
    await expect(cell.locator('input')).toHaveCount(0);
    await expect(cell.locator('textarea')).toHaveCount(0);
    await expect(cell.locator('[contenteditable="true"]')).toHaveCount(0);
  });

  test('skipNavigation: true blocks click-select on an id cell', async ({ page }) => {
    const cell = cellAt(page, '1', 'id');
    await expect(cell).toBeVisible();
    await cell.click();
    // Click-selection must NOT move into a skip-navigation column.
    await expect(cell).toHaveAttribute('aria-selected', 'false');
  });

  test('skipNavigation: true is honoured by ArrowLeft from name — focus stays on name (id is skipped)', async ({ page }) => {
    // `id` sits to the left of `name`. Clicking `name` and pressing
    // ArrowLeft should NOT move into `id` (skipNavigation: true). With no
    // other column further left, the selection stays on `name`.
    const nameCell = cellAt(page, '3', 'name');
    await nameCell.click();
    await expect(nameCell).toHaveAttribute('aria-selected', 'true');

    await page.locator('[role="grid"]').first().focus();
    await page.keyboard.press('ArrowLeft');

    // Name must still be the selected cell — the skipped `id` column should
    // NOT have received the selection.
    await expect(nameCell).toHaveAttribute('aria-selected', 'true');
    await expect(cellAt(page, '3', 'id')).toHaveAttribute('aria-selected', 'false');
  });

  test('chrome row-number body cell uses the body background (no grey gutter)', async ({ page }) => {
    const chromeCell = page
      .locator('[data-testid="chrome-row-number"][data-row-id="1"]')
      .first();
    const dataCell = cellAt(page, '1', 'name');
    await expect(chromeCell).toBeVisible();
    await expect(dataCell).toBeVisible();

    const chromeBg = await getBackgroundColor(chromeCell);
    const dataBg = await getBackgroundColor(dataCell);
    expect(chromeBg).toBe(dataBg);
  });

  test('chrome row-number body cell uses a muted text token (lighter than data cells)', async ({ page }) => {
    const chromeCell = page
      .locator('[data-testid="chrome-row-number"][data-row-id="1"]')
      .first();
    const dataCell = cellAt(page, '1', 'name');

    const chromeColor = await getColor(chromeCell);
    const dataColor = await getColor(dataCell);
    // The muted token must differ from the primary data-cell text colour.
    expect(chromeColor).not.toBe(dataColor);
  });

  test('chrome row-number body cell has a subtle right border', async ({ page }) => {
    const chromeCell = page
      .locator('[data-testid="chrome-row-number"][data-row-id="1"]')
      .first();
    const br = await getBorderRight(chromeCell);
    expect(br.style).not.toBe('none');
    expect(br.width).toBeGreaterThan(0);
  });

  test('chrome row-number body cell is NOT rendered bold', async ({ page }) => {
    const chromeCell = page
      .locator('[data-testid="chrome-row-number"][data-row-id="1"]')
      .first();
    const weight = await getFontWeight(chromeCell);
    // Computed `font-weight` normalises the keyword to a number; accept both
    // surfaces for robustness across browsers.
    expect(weight === '400' || weight === 'normal').toBe(true);
  });
});
