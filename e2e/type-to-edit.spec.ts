/**
 * End-to-end: type-to-enter-edit on a selected cell (#71).
 *
 * Contract (see GitHub #71): typing a printable character while a cell is
 * selected (NOT already in edit mode) must immediately enter edit mode and
 * seed the editor with that character — matching the Google Sheets /
 * Excel convention shown in the reference GIF.
 *
 *   * Printable key on a selected cell → edit mode, editor value = the key.
 *   * Non-printable keys (ArrowDown, Tab, Escape-with-no-prior-typing) →
 *     NO edit mode change.
 *   * Enter commits the typed value; Escape cancels and restores the
 *     original cell content.
 *
 * Story: `examples-editing--inline-editing` — already has editable text
 * columns. This spec uses the first editable text cell on row 1.
 *
 * These tests are expected to FAIL today: only double-click / Enter / F2
 * enter edit mode. Printable keys on a selected cell are ignored.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const STORY_URL =
  '/iframe.html?viewMode=story&id=examples-editing--inline-editing';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

// Picks the first editable cell on the first data row. We look for a
// `role="gridcell"` with `data-field`; the inline-editing story wires the
// first visible data cell as editable.
function firstEditableCell(page: Page): Locator {
  return page.locator('[role="gridcell"][data-field]').first();
}

async function selectCell(cell: Locator): Promise<void> {
  await cell.click();
  // aria-selected is the cross-cutting hook for single-cell selection;
  // keyboard navigation + click both set it on this grid's cells.
  await expect(cell).toHaveAttribute('aria-selected', 'true');
}

test.describe('Type-to-edit (#71)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY_URL);
    await waitForGrid(page);
  });

  test('type-to-edit: typing a letter on a selected empty cell enters edit mode with the typed char as value (#71)', async ({
    page,
  }) => {
    const cell = firstEditableCell(page);
    await selectCell(cell);

    // Press a single printable key. We do NOT type via the input (there is
    // no input yet) — we dispatch a real keystroke to the focused cell.
    await page.keyboard.press('x');

    // After typing, an editor element must appear inside the cell with the
    // key as its value.
    const editor = cell
      .locator('input, textarea, [contenteditable="true"]')
      .first();
    await expect(editor).toBeVisible();

    const value = await editor.evaluate((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return el.value;
      }
      return (el as HTMLElement).textContent ?? '';
    });
    expect(value).toBe('x');
  });

  test('type-to-edit: typing on a selected non-empty cell replaces the existing value with the typed char (#71)', async ({
    page,
  }) => {
    const cell = firstEditableCell(page);
    await selectCell(cell);

    // Confirm there IS a pre-existing non-empty value on row 1 / col 1.
    const before = (await cell.textContent())?.trim() ?? '';
    expect(before.length).toBeGreaterThan(0);

    await page.keyboard.press('z');

    const editor = cell
      .locator('input, textarea, [contenteditable="true"]')
      .first();
    await expect(editor).toBeVisible();

    const value = await editor.evaluate((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return el.value;
      }
      return (el as HTMLElement).textContent ?? '';
    });
    // Google-Sheets semantics: the typed char replaces the previous value
    // rather than appending.
    expect(value).toBe('z');
  });

  test('type-to-edit: Enter commits the typed value; the cell shows the typed char on exit (#71)', async ({
    page,
  }) => {
    const cell = firstEditableCell(page);
    await selectCell(cell);

    await page.keyboard.press('q');
    await page.keyboard.press('Enter');

    // Editor must be gone; the committed text is what the cell displays.
    await expect(
      cell.locator('input, textarea, [contenteditable="true"]'),
    ).toHaveCount(0);
    const visible = (await cell.textContent())?.trim() ?? '';
    expect(visible).toBe('q');
  });

  test('type-to-edit: Escape discards the typed value; the cell reverts to its original content (#71)', async ({
    page,
  }) => {
    const cell = firstEditableCell(page);
    await selectCell(cell);
    const original = (await cell.textContent())?.trim() ?? '';

    await page.keyboard.press('a');
    await page.keyboard.press('Escape');

    await expect(
      cell.locator('input, textarea, [contenteditable="true"]'),
    ).toHaveCount(0);
    const visible = (await cell.textContent())?.trim() ?? '';
    expect(visible).toBe(original);
  });

  test('type-to-edit: non-printable keys (ArrowDown, Tab, Escape with no prior typing) do NOT enter edit mode (#71)', async ({
    page,
  }) => {
    const cell = firstEditableCell(page);
    await selectCell(cell);

    for (const key of ['ArrowDown', 'Tab', 'Escape']) {
      // Re-select after ArrowDown / Tab may move selection — we just need
      // to confirm the original cell never entered edit mode on these keys.
      await page.keyboard.press(key);
      await expect(
        cell.locator('input, textarea, [contenteditable="true"]'),
      ).toHaveCount(0);
    }
  });
});
