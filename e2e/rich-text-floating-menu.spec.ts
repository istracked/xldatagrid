/**
 * End-to-end: RichText cell floating formatting menu + "Show formatting" toggle.
 *
 * Drives the `Examples/Cell Types → AllCellTypes` story (see
 * `stories/CellTypes.stories.tsx`), which contains an editable `richText`
 * column rendered by `RichTextCell`. These specs encode the two rich-text
 * features under active development:
 *
 *   Feature A — Floating menu, viewport-aware:
 *     • The formatting toolbar must render via `createPortal` to
 *       `document.body`, NOT inline inside the cell. The assertion below
 *       checks that `[role="toolbar"][data-floating-menu]` exists at the
 *       document root and is NOT a descendant of the edited cell.
 *     • When the cell sits near the viewport top, placement flips below
 *       (`data-placement="below"`). Placement is surfaced as a data
 *       attribute so this spec can assert geometry without re-deriving it.
 *
 *   Feature B — "Show formatting" toggle:
 *     • Clicking the toggle (`aria-label="Show formatting"`) reveals the
 *       raw markdown delimiters ALONGSIDE the rendered formatting. With the
 *       toggle ON, `**bold**` shows both the literal `**` characters AND a
 *       live `<strong>` element. Toggling OFF hides the delimiters while
 *       the `<strong>` rendering remains.
 *
 * These tests are designed to FAIL today — the current implementation
 * renders an inline toolbar inside the cell (see `RichTextCell.tsx` lines
 * ~225-295) with no portal, no placement logic, and a "Preview" toggle
 * rather than a "Show formatting" one.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const CELL_TYPES_URL =
  '/iframe.html?viewMode=story&id=examples-cell-types--all-cell-types';

function richTextCell(page: Page, rowId: string): Locator {
  return page.locator(
    `[role="gridcell"][data-row-id="${rowId}"][data-field="richText"]`,
  );
}

/**
 * Enters edit mode on a rich-text cell via double-click, matching the gesture
 * wired up by `DataGridBody.tsx` and exercised by `grid-xss.spec.ts`.
 */
async function enterEditMode(cell: Locator): Promise<void> {
  await cell.dblclick();
  // The inline textarea is the current edit surface; future implementations
  // may replace it with a contenteditable element. Wait for either so the
  // spec remains valid across the refactor without rewriting setup.
  await cell
    .locator('textarea, [contenteditable="true"]')
    .first()
    .waitFor({ state: 'visible' });
}

test.describe('RichText cell – floating formatting menu (Feature A)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CELL_TYPES_URL);
    await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
  });

  test('toolbar renders at document root via portal, not as a descendant of the cell', async ({ page }) => {
    const cell = richTextCell(page, '1');
    await expect(cell).toBeVisible();
    await enterEditMode(cell);

    // The floating menu must be reachable as a top-level descendant of the
    // document — i.e. a child chain that does NOT traverse through the cell.
    const menu = page.locator('[role="toolbar"][data-floating-menu]');
    await expect(menu).toHaveCount(1);
    await expect(menu).toBeVisible();

    // Verify the menu is NOT a descendant of the cell. We ask the page to
    // resolve both nodes and compare containment directly — Playwright's
    // locator model doesn't have a built-in "not a descendant of" so we
    // drop to an `evaluate` on the cell element.
    const isInsideCell = await cell.evaluate((cellEl) => {
      const toolbar = document.querySelector('[role="toolbar"][data-floating-menu]');
      return toolbar !== null && cellEl.contains(toolbar);
    });
    expect(
      isInsideCell,
      'floating toolbar must be portaled out of the cell',
    ).toBe(false);
  });

  test('cell near viewport top flips the menu to `data-placement="below"`', async ({ page }) => {
    const cell = richTextCell(page, '1');
    await expect(cell).toBeVisible();

    // Scroll the cell to the very top of the viewport, then enter edit mode.
    // `scrollIntoView({ block: 'start' })` pins `cellRect.top` near zero so
    // the placement logic has no room above and must flip below.
    await cell.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await enterEditMode(cell);

    const menu = page.locator('[role="toolbar"][data-floating-menu]');
    await expect(menu).toHaveAttribute('data-placement', 'below');
  });
});

test.describe('RichText cell – "Show formatting" toggle (Feature B)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CELL_TYPES_URL);
    await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
  });

  test('toggle ON shows raw `**` delimiters alongside the rendered <strong>', async ({ page }) => {
    const cell = richTextCell(page, '1');
    await expect(cell).toBeVisible();
    await enterEditMode(cell);

    const menu = page.locator('[role="toolbar"][data-floating-menu]');
    const toggle = menu.getByRole('button', { name: /show formatting/i });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Type the markdown payload into whichever editor surface is active.
    const editor = cell.locator('textarea, [contenteditable="true"]').first();
    await editor.click();
    // Clear any seed markdown so the assertions below reason about only
    // the characters this test inserted.
    await editor.press('Control+a');
    await editor.press('Delete');
    await editor.type('**bold**');

    // Visible text must include BOTH the literal delimiters and the word.
    const visibleText = (await editor.innerText()) ?? '';
    expect(
      visibleText.includes('**'),
      `editor must show raw ** delimiters when toggle is ON; got: ${JSON.stringify(visibleText)}`,
    ).toBe(true);
    expect(visibleText.toLowerCase()).toContain('bold');

    // A live <strong> node must be rendered somewhere inside the cell.
    const strongCount = await cell.locator('strong').count();
    expect(
      strongCount,
      '<strong> rendering must remain present with delimiters visible',
    ).toBeGreaterThan(0);
  });

  test('toggle OFF hides the `**` delimiters but keeps the <strong> rendering', async ({ page }) => {
    const cell = richTextCell(page, '1');
    await expect(cell).toBeVisible();
    await enterEditMode(cell);

    const menu = page.locator('[role="toolbar"][data-floating-menu]');
    const toggle = menu.getByRole('button', { name: /show formatting/i });

    // Start with a known state: click ON, then back OFF.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    const editor = cell.locator('textarea, [contenteditable="true"]').first();
    await editor.click();
    await editor.press('Control+a');
    await editor.press('Delete');
    await editor.type('**bold**');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // Delimiters are no longer in the user-visible text.
    const visibleText = (await editor.innerText()) ?? '';
    expect(
      visibleText.includes('**'),
      `editor must NOT show ** when toggle is OFF; got: ${JSON.stringify(visibleText)}`,
    ).toBe(false);
    expect(visibleText.toLowerCase()).toContain('bold');

    // The <strong> rendering is still present.
    const strongCount = await cell.locator('strong').count();
    expect(strongCount).toBeGreaterThan(0);
  });
});
