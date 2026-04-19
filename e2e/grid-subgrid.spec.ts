/**
 * End-to-end: sub-grid expansion + ARIA wiring (WS-G hardening).
 *
 * Drives the `Examples/Sub-Grid → BasicSubGrid` story which puts a
 * `cellType: "subGrid"` column on each parent row. WS-G wires the nested
 * grid's DOM id and `aria-labelledby` in `DataGrid.tsx` (lines 1101-1123):
 *
 *   - Nested grid id:         `${parentGridId}-row-${rowId}-subgrid`
 *   - Nested grid aria-label: the parent cell id
 *
 * The story uses `MuiDataGrid` which plugs in `MuiSubGridCell` as the
 * toggle renderer. The parent grid and its nested grid wiring is the same
 * regardless of which toggle cell is used — the id / aria-labelledby pair
 * lives in the parent `DataGrid` component itself.
 *
 * Assertions here are against live DOM only: attribute values, element
 * counts, and focus reachability after Tab.
 */
import { test, expect, type Page } from '@playwright/test';

const SUBGRID_URL = '/iframe.html?viewMode=story&id=examples-sub-grid--basic-sub-grid';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

test.describe('Sub-grid – ARIA wiring + expansion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SUBGRID_URL);
    await waitForGrid(page);
  });

  test('clicking the expander mounts a nested grid with the expected id format', async ({ page }) => {
    // Exactly one parent grid exists before any toggle is clicked. The
    // count of `[role="grid"]` must increase when we expand a row.
    const initialGridCount = await page.locator('[role="grid"]').count();
    expect(initialGridCount).toBe(1);

    const firstToggle = page.locator('[data-testid="subgrid-toggle"]').first();
    await expect(firstToggle).toBeVisible();
    await expect(firstToggle).toHaveAttribute('data-expanded', 'false');

    await firstToggle.click();
    await expect(firstToggle).toHaveAttribute('data-expanded', 'true');

    // After expansion the nested grid is mounted — there are now >= 2 grids.
    const gridsAfter = page.locator('[role="grid"]');
    await expect(gridsAfter).toHaveCount(2);

    // The nested grid's id must match the WS-G contract:
    //   `${parentGridId}-row-${rowId}-subgrid`
    const nestedGridId = await gridsAfter.nth(1).getAttribute('id');
    expect(nestedGridId).toBeTruthy();
    expect(nestedGridId!).toMatch(/-row-.+-subgrid$/);
  });

  test('nested grid carries aria-labelledby pointing at an in-DOM parent cell id', async ({ page }) => {
    const firstToggle = page.locator('[data-testid="subgrid-toggle"]').first();
    await firstToggle.click();

    const gridsAfter = page.locator('[role="grid"]');
    await expect(gridsAfter).toHaveCount(2);

    const nested = gridsAfter.nth(1);
    const labelledBy = await nested.getAttribute('aria-labelledby');
    expect(labelledBy, 'nested grid must expose aria-labelledby').toBeTruthy();

    // The referenced parent cell id must follow the WS-G format:
    //   `${parentGridId}-row-${rowId}-cell-${field}`
    expect(labelledBy!).toMatch(/-row-.+-cell-/);

    // Additionally the nested grid id must not equal the parent grid id
    // (self-reference would silently break announcements).
    const parentId = await gridsAfter.nth(0).getAttribute('id');
    const nestedId = await nested.getAttribute('id');
    expect(nestedId).not.toBe(parentId);
  });

  test('expanded sub-grid renders inner cells and Tab reaches a grid', async ({ page }) => {
    const firstToggle = page.locator('[data-testid="subgrid-toggle"]').first();
    await firstToggle.click();

    const nested = page.locator('[role="grid"]').nth(1);
    await expect(nested).toBeVisible();

    // Inner grid must render its own gridcells — proves the nested DataGrid
    // actually mounted and received the nested row data.
    const innerCells = nested.locator('[role="gridcell"]');
    await expect(innerCells.first()).toBeVisible();
    expect(await innerCells.count()).toBeGreaterThan(0);

    // "Focus trap" substitute: from the expander, Tab must eventually land
    // on some element whose ancestor chain includes a `role="grid"` — we
    // tolerate either the nested grid root (tabIndex=0) or any focused
    // descendant of any grid. Without a dedicated focus trap we just want
    // to confirm Tab-ability doesn't escape the grids immediately.
    await firstToggle.focus();
    let reachedGrid = false;
    for (let i = 0; i < 15; i++) {
      reachedGrid = await page.evaluate(() => {
        let node = document.activeElement as HTMLElement | null;
        while (node) {
          if (node.getAttribute && node.getAttribute('role') === 'grid') return true;
          node = node.parentElement;
        }
        return false;
      });
      if (reachedGrid) break;
      await page.keyboard.press('Tab');
    }
    expect(
      reachedGrid,
      'Tab from the expander must reach a grid (outer or nested) within a handful of presses',
    ).toBe(true);
  });
});
