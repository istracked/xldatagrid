/**
 * End-to-end: hover tooltip on data cells (Feature 5).
 *
 * Story: `examples-cell-types--all-cell-types`
 * (see `stories/CellTypes.stories.tsx#AllCellTypes`).
 *
 * Contracts guarded by this file:
 *
 *   1. Hovering a truncated data cell and waiting past the ~400 ms
 *      activation delay produces a visible `[role="tooltip"]` node whose
 *      text contains the full (untruncated) raw cell value. The production
 *      hover tooltip only surfaces for cells whose content is clipped
 *      (see `BodyCell.resolveContent` in `DataGridBody.tsx`), so the test
 *      picks a `richText` cell whose seeded markdown always exceeds the
 *      24-char truncate budget in every fixture row.
 *   2. The tooltip is portaled OUTSIDE the hovered cell's DOM subtree
 *      (the exact parent should be `document.body`, matching the
 *      `ContextMenu` pattern).
 *   3. The tooltip's rendered bounding box stays inside the viewport on
 *      every axis — Phase B is expected to clamp against
 *      `window.innerWidth` / `innerHeight` just as `ContextMenu` does.
 *
 * The tests use the standard iframe URL (bypasses Storybook manager chrome)
 * so events land directly on the grid.
 */
import { test, expect, type Page } from '@playwright/test';

const STORY_URL =
  '/iframe.html?viewMode=story&id=examples-cell-types--all-cell-types';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

test.describe('Hover tooltip — portal + viewport clamping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY_URL);
    await waitForGrid(page);
  });

  test('hovering a cell shows a portaled role="tooltip" with its text content (#65)', async ({ page }) => {
    // Pick the first visible data cell in the "Rich Text" column — the
    // fixture seeds every row with multi-line markdown that always exceeds
    // the grid's 24-char truncate budget, guaranteeing the cell is
    // measured as truncated and therefore reveals its hover tooltip.
    const cell = page
      .locator('[role="gridcell"][data-field="richText"]')
      .first();
    await expect(cell).toBeVisible();
    // Read the full raw value from the published `data-raw-value` mirror
    // attribute (see `DataGridBody.tsx` + cell-overflow spec) — the visible
    // text is truncated with a U+2026 ellipsis, so `textContent` alone
    // cannot be compared directly against the tooltip contents.
    const rawValue = (await cell.getAttribute('data-raw-value')) ?? '';
    expect(rawValue.length).toBeGreaterThan(0);

    // Move the pointer over the cell's centre. Playwright's `hover` dispatches
    // a real mouseenter, which is what the tooltip hook listens to.
    await cell.hover();

    // The 400 ms activation delay means a zero-timeout wait would miss it.
    // `toBeVisible` under Playwright's auto-wait polls for up to
    // `expect.timeout`, so this implicitly tolerates the delay.
    const tooltip = page.locator('[role="tooltip"]:not([data-validation-target])').first();
    await expect(tooltip).toBeVisible();

    // Contract #1: the tooltip text contains a leading slice of the raw
    // cell value. We compare against the first line of the markdown (the
    // `### Row N` heading) so the assertion is robust to either the
    // prefix-only rendering of a `reveal-only` policy or the full-value
    // rendering of the default policy.
    const tipText = (await tooltip.textContent())?.trim() ?? '';
    const firstLine = rawValue.split('\n')[0]?.trim() ?? '';
    expect(firstLine.length).toBeGreaterThan(0);
    expect(tipText).toContain(firstLine);

    // Contract #2: portal — NOT a descendant of the hovered cell.
    const cellContainsTooltip = await page.evaluate(
      ({ cellSelector, tooltipSelector }) => {
        const c = document.querySelector(cellSelector);
        const t = document.querySelector(tooltipSelector);
        return !!(c && t && c.contains(t));
      },
      {
        cellSelector: '[role="gridcell"][data-field="richText"]',
        tooltipSelector: '[role="tooltip"]:not([data-validation-target])',
      },
    );
    expect(cellContainsTooltip).toBe(false);
  });

  test('tooltip stays inside the viewport (viewport-edge clamping) (#65)', async ({ page }) => {
    // Hover the rightmost visible cell in the first row so the tooltip
    // has a strong chance of overflowing right-edge without clamping.
    const row = page.locator('[role="row"][data-row-id="1"]').first();
    const cells = row.locator('[role="gridcell"]');
    const count = await cells.count();
    expect(count).toBeGreaterThan(0);
    const last = cells.nth(count - 1);
    await last.scrollIntoViewIfNeeded();
    await last.hover();

    const tooltip = page.locator('[role="tooltip"]:not([data-validation-target])').first();
    await expect(tooltip).toBeVisible();

    const { tipRect, viewport } = await page.evaluate(() => {
      const tip = document.querySelector(
        '[role="tooltip"]:not([data-validation-target])',
      ) as HTMLElement | null;
      if (!tip) return { tipRect: null, viewport: null };
      const r = tip.getBoundingClientRect();
      return {
        tipRect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
        viewport: { w: window.innerWidth, h: window.innerHeight },
      };
    });
    expect(tipRect).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(tipRect!.left).toBeGreaterThanOrEqual(0);
    expect(tipRect!.top).toBeGreaterThanOrEqual(0);
    expect(tipRect!.right).toBeLessThanOrEqual(viewport!.w);
    expect(tipRect!.bottom).toBeLessThanOrEqual(viewport!.h);
  });
});
