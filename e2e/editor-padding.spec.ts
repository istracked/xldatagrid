/**
 * End-to-end: editor padding parity with cell padding (Excel-365 contract).
 *
 * Story: `Examples/Editing → Inline Editing` (`stories/Editing.stories.tsx`).
 *
 * The contract: entering edit mode on a cell MUST NOT shift the text
 * horizontally or vertically. In Excel 365 web the fallback inline editor
 * inherits the cell's padding box verbatim, so the first glyph stays at the
 * same pixel position the moment the input mounts — the only visible change
 * is a blinking caret.
 *
 * Today's implementation uses `styles.cellInput` with `padding: 0` while the
 * cell uses `padding: var(--dg-cell-padding, 0 12px)`. That 12px left-padding
 * delta causes the text to "snap" to the cell's left edge as soon as the
 * editor mounts. These tests quantify the jump and REQUIRE it to be ≤ 1px in
 * both axes. They are authored RED: against the current implementation they
 * fail; fixing `DataGridBody.styles.ts#cellInput` to re-use the cell padding
 * token chain will turn them green.
 *
 * Assertions in numeric pixels (Chromium resolves CSS custom properties and
 * reports them as resolved pixel values via `getComputedStyle`, which jsdom
 * does not). No screenshots — DOM rect + computed style only.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

// Storybook renders each story inside a <iframe id="storybook-preview-iframe">
// on the manager page. Target `/iframe.html` directly to skip the manager
// chrome so key/mouse events land on the grid without indirection.
const INLINE_EDITING_URL =
  '/iframe.html?viewMode=story&id=examples-editing--inline-editing';

/** Returns the first gridcell locator for the given row id / field. */
function cell(page: Page, rowId: string, field: string): Locator {
  return page.locator(
    `[role="gridcell"][data-row-id="${rowId}"][data-field="${field}"]`,
  );
}

test.describe('Inline Editing – editor padding matches cell padding (Excel-365 parity)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(INLINE_EDITING_URL);
    await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
  });

  test('first glyph X position does not shift on enter-edit (≤ 1px delta)', async ({ page }) => {
    const target = cell(page, '1', 'name');
    await target.click();
    await expect(target).toHaveAttribute('aria-selected', 'true');

    // Capture the bounding rect of the rendered text inside the cell BEFORE
    // editing. We read the first text-node's rect via a Range so we get the
    // actual glyph box, not the wrapping <span>.
    const preEditLeft = await target.evaluate((el) => {
      // Walk to the first non-empty text node.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node: Node | null = walker.nextNode();
      while (node && !(node.nodeValue && node.nodeValue.trim().length > 0)) {
        node = walker.nextNode();
      }
      if (!node) throw new Error('no text node in cell');
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().left;
    });

    // Double-click → enter edit mode.
    await target.dblclick();
    const input = target.locator('input');
    await expect(input).toBeVisible();

    // Compute the X position of character 0 inside the input: the input's
    // content-box left edge = boundingRect.left + padding-left + border-left
    // + margin-left. The first glyph sits at that X.
    const postEditLeft = await input.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft || '0') || 0;
      const bl = parseFloat(cs.borderLeftWidth || '0') || 0;
      const ml = parseFloat(cs.marginLeft || '0') || 0;
      return rect.left + pl + bl + ml;
    });

    // ≤ 1 pixel tolerance for sub-pixel anti-aliasing. Today's bug produces a
    // ~12px jump (the cell's 12px padding vanishing), well outside tolerance.
    expect(Math.abs(postEditLeft - preEditLeft)).toBeLessThanOrEqual(1);
  });

  test('input padding / font-size / line-height match the cell pixel-for-pixel', async ({ page }) => {
    const target = cell(page, '1', 'name');
    await target.click();

    // Read resolved pixel values on the cell BEFORE mounting the editor so
    // they reflect the stable, non-editing state.
    const cellMetrics = await target.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
      };
    });

    await target.dblclick();
    const input = target.locator('input');
    await expect(input).toBeVisible();

    const inputMetrics = await input.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
      };
    });

    expect(inputMetrics.paddingLeft).toBe(cellMetrics.paddingLeft);
    expect(inputMetrics.paddingRight).toBe(cellMetrics.paddingRight);
    expect(inputMetrics.paddingTop).toBe(cellMetrics.paddingTop);
    expect(inputMetrics.paddingBottom).toBe(cellMetrics.paddingBottom);
    expect(inputMetrics.fontFamily).toBe(cellMetrics.fontFamily);
    expect(inputMetrics.fontSize).toBe(cellMetrics.fontSize);
    expect(inputMetrics.fontWeight).toBe(cellMetrics.fontWeight);
    expect(inputMetrics.lineHeight).toBe(cellMetrics.lineHeight);
  });

  test('input is not visually shorter/taller than the cell (height delta ≤ 1px)', async ({ page }) => {
    const target = cell(page, '2', 'name');
    await target.click();
    const cellHeight = await target.evaluate(
      (el) => el.getBoundingClientRect().height,
    );

    await target.dblclick();
    const input = target.locator('input');
    await expect(input).toBeVisible();

    const inputHeight = await input.evaluate(
      (el) => el.getBoundingClientRect().height,
    );

    // A padding mismatch in the vertical axis can make the editor's box
    // appear shorter than the cell (content-box shrinks by 2× padding). The
    // contract requires the editor to occupy the full cell height.
    expect(Math.abs(inputHeight - cellHeight)).toBeLessThanOrEqual(1);
  });
});
