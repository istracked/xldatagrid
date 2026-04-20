/**
 * End-to-end: Excel-365 commit-and-move contract for inline cell editing.
 *
 * Contract (same as `packages/react/src/__tests__/edit-commit-nav.test.tsx`):
 *
 *   ENTER  → commit draft, exit edit mode, move selection DOWN one row.
 *   TAB    → commit draft, exit edit mode, move selection RIGHT one column.
 *   ESCAPE → discard draft, exit edit mode, selection STAYS on same cell.
 *   After any of the three, plain arrow keys navigate normally.
 *
 * This spec sweeps every `Examples/Editing` Storybook story in
 * `stories/Editing.stories.tsx` and runs the four key-path scenarios against
 * each one. Every story has the full Employee column set with `name`, `email`
 * and `city` as text-editable cells, so we pick a non-edge cell (`(row 2,
 * name)`) deep enough that DOWN and RIGHT land on real neighbours.
 *
 * Assertions read concrete DOM state only — `[aria-selected="true"]` for the
 * active cell and cell `innerText` for committed values.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

// Story IDs mirror Storybook's automatic kebab-case derivation from the
// named exports in `stories/Editing.stories.tsx`:
//   InlineEditing                    → inline-editing
//   EnterTabCommitAndAdvance         → enter-tab-commit-and-advance
//   WithValidation                   → with-validation
//   EscapeCancelsAndKeepsSelection   → escape-cancels-and-keeps-selection
//   UndoRedo                         → undo-redo
const STORY_URLS: { label: string; url: string }[] = [
  { label: 'InlineEditing',                  url: '/iframe.html?viewMode=story&id=examples-editing--inline-editing' },
  { label: 'EnterTabCommitAndAdvance',       url: '/iframe.html?viewMode=story&id=examples-editing--enter-tab-commit-and-advance' },
  { label: 'WithValidation',                 url: '/iframe.html?viewMode=story&id=examples-editing--with-validation' },
  { label: 'EscapeCancelsAndKeepsSelection', url: '/iframe.html?viewMode=story&id=examples-editing--escape-cancels-and-keeps-selection' },
  { label: 'UndoRedo',                       url: '/iframe.html?viewMode=story&id=examples-editing--undo-redo' },
];

/** A deterministic locator for a cell by row id / field. */
function cell(page: Page, rowId: string, field: string): Locator {
  return page
    .locator(`[role="gridcell"][data-row-id="${rowId}"][data-field="${field}"]`)
    .first();
}

/** Wait for the first role=grid to render, then focus it so the grid keyboard handler sees events. */
async function focusGrid(page: Page): Promise<void> {
  const grid = page.locator('[role="grid"]').first();
  await grid.waitFor({ state: 'visible' });
  await grid.focus();
}

/** Double-click into a cell's inline editor and return its input locator. */
async function beginEdit(target: Locator): Promise<Locator> {
  await target.click();
  await target.dblclick();
  const input = target.locator('input').first();
  await expect(input).toBeVisible();
  return input;
}

for (const { label, url } of STORY_URLS) {
  test.describe(`Editing story: ${label} — commit-and-move contract`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
      await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
    });

    // -----------------------------------------------------------------------
    // Enter → commit + move DOWN
    // -----------------------------------------------------------------------
    test('Enter commits typed value and moves selection DOWN one row', async ({ page }) => {
      const target = cell(page, '2', 'name');
      const input = await beginEdit(target);

      const newValue = `enter-${label}-${Date.now()}`;
      // `fill` atomically clears + sets the value via the DOM property and
      // dispatches an `input` event, which React's controlled-input
      // `onChange` picks up. More robust than keystroke-level Ctrl+A +
      // pressSequentially, where selection state can be dropped across the
      // focus/re-render cycle in chromium.
      await input.fill(newValue);
      await input.press('Enter');

      // Editor is gone.
      await expect(target.locator('input')).toHaveCount(0);
      // Committed value is visible in the original cell.
      await expect(target).toContainText(newValue);
      // Selection advanced DOWN one row to (row 3, name).
      await expect(cell(page, '3', 'name')).toHaveAttribute('aria-selected', 'true');
      await expect(target).toHaveAttribute('aria-selected', 'false');
    });

    // -----------------------------------------------------------------------
    // Tab → commit + move RIGHT
    // -----------------------------------------------------------------------
    test('Tab commits typed value and moves selection RIGHT one cell', async ({ page }) => {
      const target = cell(page, '2', 'name');
      const input = await beginEdit(target);

      const newValue = `tab-${label}-${Date.now()}`;
      await input.fill(newValue);
      await input.press('Tab');

      await expect(target.locator('input')).toHaveCount(0);
      await expect(target).toContainText(newValue);
      // Selection advanced RIGHT one column. The adjacent editable column
      // on `defaultColumns` after `name` is `email`.
      await expect(cell(page, '2', 'email')).toHaveAttribute('aria-selected', 'true');
      await expect(target).toHaveAttribute('aria-selected', 'false');
    });

    // -----------------------------------------------------------------------
    // Escape → cancel + STAY
    // -----------------------------------------------------------------------
    test('Escape discards the draft and keeps selection on the same cell', async ({ page }) => {
      const target = cell(page, '2', 'name');
      const originalText = (await target.innerText()).trim();

      const input = await beginEdit(target);
      await input.fill('should-not-persist');
      await input.press('Escape');

      await expect(target.locator('input')).toHaveCount(0);
      // Original value preserved.
      await expect(target).toContainText(originalText);
      await expect(target).not.toContainText('should-not-persist');
      // Selection stays on the same cell.
      await expect(target).toHaveAttribute('aria-selected', 'true');
    });

    // -----------------------------------------------------------------------
    // Post-commit arrow navigation guard.
    //
    // After Enter-commit, selection is at (3, name). Pressing ArrowRight on
    // the grid root must move to (3, email) — guards the regression where
    // the editor's `stopPropagation` / stale `editing.cell` state blocks
    // plain arrow navigation from running after an edit commits.
    // -----------------------------------------------------------------------
    test('ArrowRight after Enter commit moves selection one more cell to the right', async ({ page }) => {
      const target = cell(page, '2', 'name');
      const input = await beginEdit(target);

      const newValue = `post-commit-arrow-${Date.now()}`;
      await input.fill(newValue);
      await input.press('Enter');

      // Enter-commit landed us on (3, name).
      await expect(cell(page, '3', 'name')).toHaveAttribute('aria-selected', 'true');

      // Arrow navigation must resume working on the grid container.
      await focusGrid(page);
      await page.keyboard.press('ArrowRight');

      await expect(cell(page, '3', 'email')).toHaveAttribute('aria-selected', 'true');
      await expect(cell(page, '3', 'name')).toHaveAttribute('aria-selected', 'false');
    });
  });
}
