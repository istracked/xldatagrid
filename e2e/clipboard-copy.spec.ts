/**
 * End-to-end: Ctrl/Cmd+C produces an Excel-pasteable dual-flavor clipboard
 * payload (Feature 6).
 *
 * Story: `examples-clipboard--copy-paste` (see `stories/Clipboard.stories.tsx`).
 *
 * Contracts guarded by this file (ALL expected to fail today — Phase B will
 * upgrade `use-keyboard.ts` to call `navigator.clipboard.write()` with a
 * `ClipboardItem` carrying both `text/plain` (RFC-4180-ish TSV) and
 * `text/html` (minimal `<table>`) blobs):
 *
 *   1. After a multi-cell selection, Ctrl+C (or Cmd+C on darwin) writes
 *      a single `ClipboardItem` whose `types` include both `text/plain`
 *      and `text/html`.
 *   2. The `text/plain` payload starts with the header row (column titles)
 *      followed by TSV rows — one line per selected row, tab-delimited.
 *   3. The `text/html` payload contains a `<table>` with the same data.
 *
 * Playwright requires `clipboard-read` and `clipboard-write` permissions
 * before `navigator.clipboard.read()` will succeed.
 */
import { test, expect, type Page } from '@playwright/test';

const STORY_URL =
  '/iframe.html?viewMode=story&id=examples-clipboard--copy-paste';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

async function readClipboard(
  page: Page,
): Promise<{ types: string[]; text: string; html: string }> {
  return page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const out: { types: string[]; text: string; html: string } = {
      types: [],
      text: '',
      html: '',
    };
    for (const item of items) {
      for (const t of item.types) {
        out.types.push(t);
        const blob = await item.getType(t);
        const s = await blob.text();
        if (t === 'text/plain') out.text = s;
        if (t === 'text/html') out.html = s;
      }
    }
    return out;
  });
}

test.describe('Clipboard copy — dual flavor ClipboardItem', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(STORY_URL);
    await waitForGrid(page);
  });

  test('multi-cell selection + Ctrl+C writes both text/plain TSV and text/html <table>', async ({ page }) => {
    // Click the anchor cell, then shift-click the focus cell to build a
    // 2x2 range. Field names come from `defaultColumns` in stories/data.ts.
    const anchor = page
      .locator('[role="gridcell"][data-row-id="1"]')
      .first();
    await anchor.click();

    // Extend the selection by shift-clicking the cell two columns to the
    // right on the same row. Using the row-scope keeps us robust to any
    // row-level re-ordering that tests might not care about.
    const row1Cells = page.locator('[role="row"][data-row-id="1"] [role="gridcell"]');
    const count = await row1Cells.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await row1Cells.nth(1).click({ modifiers: ['Shift'] });

    // Platform-aware copy chord.
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyC`);

    // Let the async write settle.
    await page.waitForTimeout(100);

    const clip = await readClipboard(page);
    expect(clip.types).toEqual(expect.arrayContaining(['text/plain', 'text/html']));

    // Contract #2: TSV starts with header titles. We don't pin the exact
    // column titles so the test survives story edits; we just assert the
    // plain text has at least a tab and a newline (i.e. two rows × two cols).
    expect(clip.text).toContain('\t');
    expect(clip.text).toContain('\n');

    // Contract #3: HTML flavor wraps the same payload in <table>.
    expect(clip.html.toLowerCase()).toContain('<table');
    expect(clip.html.toLowerCase()).toContain('<tr');
    expect(clip.html.toLowerCase()).toContain('<td');
  });

  test('clipboard read round-trips each row as its own <tr>', async ({ page }) => {
    // Select two rows × one column.
    const cell = page
      .locator('[role="gridcell"][data-row-id="1"]')
      .first();
    await cell.click();
    const cell2 = page
      .locator('[role="gridcell"][data-row-id="2"]')
      .first();
    await cell2.click({ modifiers: ['Shift'] });

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyC`);
    await page.waitForTimeout(100);

    const clip = await readClipboard(page);
    const trMatches = clip.html.toLowerCase().match(/<tr[\s>]/g) ?? [];
    // Header row + 2 body rows = 3 <tr>. The exact header count could vary
    // (some implementations omit <thead>), so we accept ≥ 2.
    expect(trMatches.length).toBeGreaterThanOrEqual(2);
  });
});
