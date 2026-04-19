/**
 * End-to-end: row-level selection outline + multi-row row-range semantics.
 *
 * Row outline rendering uses `box-shadow: inset ...` (not CSS `outline`)
 * so that a contiguous multi-row range can turn individual sides on or
 * off — top border on the first row, bottom border on the last, sides on
 * all, no internal horizontals. Disjoint rows get all four sides each.
 *
 * Primary story driven here is `Examples/Selection → Row Range
 * Contiguous`, which pairs `selectionMode="range"` with the Excel-style
 * row-number gutter and `shiftArrowBehavior="rangeSelect"` so every
 * modifier + keyboard path under test is live. A secondary describe
 * block stays on `Examples/Selection → Row-Header Selection` to keep the
 * plain-click regressions from PR #58 locked in.
 *
 * Assertions read computed `box-shadow` / `outline-style` on live DOM.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const ROW_HEADER_URL =
  '/iframe.html?viewMode=story&id=examples-selection--row-header-selection';
const ROW_RANGE_URL =
  '/iframe.html?viewMode=story&id=examples-selection--row-range-contiguous';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

// `getComputedStyle(el).boxShadow` normalises to `<color> <x> <y> <blur>
// <spread> inset` (color first, `inset` last, offsets in `px`). We extract
// each part's four offset values regardless of where `inset` / the color
// sits so the assertions match what the browser actually emits.
type Sides = { top: boolean; right: boolean; bottom: boolean; left: boolean };
function parseInsetSides(boxShadow: string): Sides {
  if (!boxShadow || boxShadow === 'none') {
    return { top: false, right: false, bottom: false, left: false };
  }
  const parts = boxShadow.split(/,(?![^(]*\))/).map((p) => p.trim());
  const offsetsOf = (p: string): [number, number, number, number] | null => {
    // Strip `inset` and any `rgb(...)` / `rgba(...)` color wrapper, then
    // pluck the first four signed numeric tokens — these are the four
    // offset values `<x> <y> <blur> <spread>`.
    const cleaned = p
      .replace(/\binset\b/, ' ')
      .replace(/rgba?\([^)]*\)/, ' ')
      .trim();
    const nums = cleaned.match(/-?\d*\.?\d+/g);
    if (!nums || nums.length < 4) return null;
    return [
      parseFloat(nums[0]!),
      parseFloat(nums[1]!),
      parseFloat(nums[2]!),
      parseFloat(nums[3]!),
    ];
  };
  const has = (pred: (o: [number, number, number, number]) => boolean) =>
    parts.some((p) => {
      const o = offsetsOf(p);
      return o !== null && pred(o);
    });
  return {
    // top:    x=0,  y=+2, blur=0, spread=0
    top: has(([x, y]) => x === 0 && y === 2),
    // right:  x=-2, y=0
    right: has(([x, y]) => x === -2 && y === 0),
    // bottom: x=0,  y=-2
    bottom: has(([x, y]) => x === 0 && y === -2),
    // left:   x=+2, y=0
    left: has(([x, y]) => x === 2 && y === 0),
  };
}

async function getRowSides(row: Locator): Promise<Sides> {
  const boxShadow = await row.evaluate((el) => getComputedStyle(el).boxShadow);
  return parseInsetSides(boxShadow);
}

async function rowHasAnySide(row: Locator): Promise<boolean> {
  const s = await getRowSides(row);
  return s.top || s.right || s.bottom || s.left;
}

// ---------------------------------------------------------------------------
// Plain-click row selection (regression suite from PR #58 / #59)
// ---------------------------------------------------------------------------

test.describe('Row selection – outline rendered on row, not per cell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROW_HEADER_URL);
    await waitForGrid(page);
  });

  test('clicking a rowheader paints the outline on the row element', async ({ page }) => {
    const rowheader = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await expect(rowheader).toBeVisible();
    await rowheader.click();

    const row = page.locator('[role="row"][data-row-id="3"]').first();
    await expect(row).toBeVisible();

    const cellsInRow = row.locator('[role="gridcell"]');
    const cellCount = await cellsInRow.count();
    expect(cellCount).toBeGreaterThan(0);
    for (let i = 0; i < cellCount; i += 1) {
      await expect(cellsInRow.nth(i)).toHaveAttribute('aria-selected', 'true');
    }

    // A single-row selection draws all four sides of the inset shadow.
    expect(await getRowSides(row)).toEqual({
      top: true, right: true, bottom: true, left: true,
    });

    // Per-cell outlines are suppressed (first and last cell is a cheap proxy
    // for the whole row).
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
    expect(await rowHasAnySide(otherRow)).toBe(false);
  });

  test('clicking a gridcell directly does NOT paint the row-level outline', async ({ page }) => {
    const clickedCell = page
      .locator('[role="gridcell"][data-row-id="4"][data-field="name"]')
      .first();
    await expect(clickedCell).toBeVisible();
    await clickedCell.click();

    await expect(clickedCell).toHaveAttribute('aria-selected', 'true');

    const row = page.locator('[role="row"][data-row-id="4"]').first();
    expect(await rowHasAnySide(row)).toBe(false);

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
    const rowheader = page.locator('[role="rowheader"][data-row-id="6"]').first();
    await rowheader.click();

    const row = page.locator('[role="row"][data-row-id="6"]').first();
    expect(await rowHasAnySide(row)).toBe(true);

    const innerCell = page
      .locator('[role="gridcell"][data-row-id="6"][data-field="name"]')
      .first();
    await innerCell.click();
    await expect(innerCell).toHaveAttribute('aria-selected', 'true');

    expect(await rowHasAnySide(row)).toBe(false);

    const clickedCellOutlineStyle = await innerCell.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(clickedCellOutlineStyle).not.toBe('none');

    const siblingCell = page
      .locator('[role="gridcell"][data-row-id="6"][data-field="email"]')
      .first();
    await expect(siblingCell).toHaveAttribute('aria-selected', 'false');
  });
});

// ---------------------------------------------------------------------------
// Shift/Cmd-click row ranges + keyboard extensions
// ---------------------------------------------------------------------------

test.describe('Row range – Shift+click contiguous and Cmd/Ctrl+click disjoint', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROW_RANGE_URL);
    await waitForGrid(page);
  });

  test('Shift+click extends to a contiguous row range outlined as one block', async ({ page }) => {
    const first = page.locator('[role="rowheader"][data-row-id="2"]').first();
    const last = page.locator('[role="rowheader"][data-row-id="5"]').first();
    await first.click();
    await last.click({ modifiers: ['Shift'] });

    const row2 = page.locator('[role="row"][data-row-id="2"]').first();
    const row3 = page.locator('[role="row"][data-row-id="3"]').first();
    const row4 = page.locator('[role="row"][data-row-id="4"]').first();
    const row5 = page.locator('[role="row"][data-row-id="5"]').first();
    const row6 = page.locator('[role="row"][data-row-id="6"]').first();

    // Outer edges only — top on first, bottom on last, sides on every row
    // in between, no internal horizontals.
    expect(await getRowSides(row2)).toEqual({ top: true, right: true, bottom: false, left: true });
    expect(await getRowSides(row3)).toEqual({ top: false, right: true, bottom: false, left: true });
    expect(await getRowSides(row4)).toEqual({ top: false, right: true, bottom: false, left: true });
    expect(await getRowSides(row5)).toEqual({ top: false, right: true, bottom: true, left: true });
    // Row outside the range has no shadow at all.
    expect(await rowHasAnySide(row6)).toBe(false);
  });

  test('Cmd/Ctrl+click toggles a disjoint row with its own four-sided outline', async ({ page }) => {
    // Plain click row 2, then Cmd/Ctrl+click row 5. Intermediate rows stay
    // un-selected; both anchor and disjoint row carry the full four sides.
    const r2 = page.locator('[role="rowheader"][data-row-id="2"]').first();
    const r5 = page.locator('[role="rowheader"][data-row-id="5"]').first();
    await r2.click();
    await r5.click({ modifiers: ['ControlOrMeta'] });

    const row2 = page.locator('[role="row"][data-row-id="2"]').first();
    const row3 = page.locator('[role="row"][data-row-id="3"]').first();
    const row4 = page.locator('[role="row"][data-row-id="4"]').first();
    const row5 = page.locator('[role="row"][data-row-id="5"]').first();

    const all = { top: true, right: true, bottom: true, left: true };
    expect(await getRowSides(row2)).toEqual(all);
    expect(await getRowSides(row5)).toEqual(all);
    expect(await rowHasAnySide(row3)).toBe(false);
    expect(await rowHasAnySide(row4)).toBe(false);
  });

  test('Cmd/Ctrl+click a selected row again removes it from the disjoint selection', async ({ page }) => {
    const r2 = page.locator('[role="rowheader"][data-row-id="2"]').first();
    const r5 = page.locator('[role="rowheader"][data-row-id="5"]').first();
    await r2.click();
    await r5.click({ modifiers: ['ControlOrMeta'] });
    await r5.click({ modifiers: ['ControlOrMeta'] });

    const row2 = page.locator('[role="row"][data-row-id="2"]').first();
    const row5 = page.locator('[role="row"][data-row-id="5"]').first();
    expect(await rowHasAnySide(row2)).toBe(true);
    expect(await rowHasAnySide(row5)).toBe(false);
  });

  test('Shift+ArrowDown once extends the row selection down by one row', async ({ page }) => {
    const r3 = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await r3.click();
    await page.locator('[role="grid"]').first().focus();
    await page.keyboard.press('Shift+ArrowDown');

    const row3 = page.locator('[role="row"][data-row-id="3"]').first();
    const row4 = page.locator('[role="row"][data-row-id="4"]').first();
    const row5 = page.locator('[role="row"][data-row-id="5"]').first();

    expect(await getRowSides(row3)).toEqual({ top: true, right: true, bottom: false, left: true });
    expect(await getRowSides(row4)).toEqual({ top: false, right: true, bottom: true, left: true });
    expect(await rowHasAnySide(row5)).toBe(false);
  });

  test('Shift+ArrowDown twice extends the row selection down by two rows', async ({ page }) => {
    const r3 = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await r3.click();
    await page.locator('[role="grid"]').first().focus();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');

    const row3 = page.locator('[role="row"][data-row-id="3"]').first();
    const row4 = page.locator('[role="row"][data-row-id="4"]').first();
    const row5 = page.locator('[role="row"][data-row-id="5"]').first();
    const row6 = page.locator('[role="row"][data-row-id="6"]').first();

    expect(await getRowSides(row3)).toEqual({ top: true, right: true, bottom: false, left: true });
    expect(await getRowSides(row4)).toEqual({ top: false, right: true, bottom: false, left: true });
    expect(await getRowSides(row5)).toEqual({ top: false, right: true, bottom: true, left: true });
    expect(await rowHasAnySide(row6)).toBe(false);
  });

  test('Shift+ArrowUp shrinks an extended range back', async ({ page }) => {
    const r3 = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await r3.click();
    await page.locator('[role="grid"]').first().focus();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowUp');

    const row3 = page.locator('[role="row"][data-row-id="3"]').first();
    const row4 = page.locator('[role="row"][data-row-id="4"]').first();
    const row5 = page.locator('[role="row"][data-row-id="5"]').first();

    expect(await getRowSides(row3)).toEqual({ top: true, right: true, bottom: false, left: true });
    expect(await getRowSides(row4)).toEqual({ top: false, right: true, bottom: true, left: true });
    expect(await rowHasAnySide(row5)).toBe(false);
  });

  test('Shift+ArrowLeft and Shift+ArrowRight are no-ops while a row is selected', async ({ page }) => {
    const r3 = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await r3.click();
    await page.locator('[role="grid"]').first().focus();
    const before = await getRowSides(
      page.locator('[role="row"][data-row-id="3"]').first(),
    );

    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowRight');

    const after = await getRowSides(
      page.locator('[role="row"][data-row-id="3"]').first(),
    );
    expect(after).toEqual(before);

    // No sibling row gained any shadow.
    for (const id of ['2', '4']) {
      expect(await rowHasAnySide(page.locator(`[role="row"][data-row-id="${id}"]`).first())).toBe(false);
    }
  });

  test('plain ArrowDown moves the row selection to the next row', async ({ page }) => {
    const r3 = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await r3.click();
    await page.locator('[role="grid"]').first().focus();
    await page.keyboard.press('ArrowDown');

    const row3 = page.locator('[role="row"][data-row-id="3"]').first();
    const row4 = page.locator('[role="row"][data-row-id="4"]').first();
    expect(await rowHasAnySide(row3)).toBe(false);
    expect(await getRowSides(row4)).toEqual({
      top: true, right: true, bottom: true, left: true,
    });
  });

  test('plain ArrowLeft and ArrowRight are no-ops while a row is selected', async ({ page }) => {
    const r3 = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await r3.click();
    await page.locator('[role="grid"]').first().focus();
    const before = await getRowSides(
      page.locator('[role="row"][data-row-id="3"]').first(),
    );

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');

    const after = await getRowSides(
      page.locator('[role="row"][data-row-id="3"]').first(),
    );
    expect(after).toEqual(before);
  });

  test('Escape clears the row selection', async ({ page }) => {
    const r3 = page.locator('[role="rowheader"][data-row-id="3"]').first();
    await r3.click();
    await page.locator('[role="grid"]').first().focus();
    await page.keyboard.press('Escape');

    expect(await rowHasAnySide(page.locator('[role="row"][data-row-id="3"]').first())).toBe(false);
  });
});
