/**
 * End-to-end: RichText cell XSS hardening (WS-A/B contract at the UI level).
 *
 * Drives the `Examples/Cell Types → AllCellTypes` story which contains an
 * editable `richText` column rendered by `RichTextCell`. The cell stores
 * GitHub-Flavored Markdown and renders it via `react-markdown` +
 * `remark-gfm`, deliberately WITHOUT `rehype-raw` so embedded HTML is
 * treated as plain text.
 *
 * This spec types two different hostile payloads into the cell and, after
 * the draft is committed, scans the rendered DOM for any javascript:
 * href or inline on* event handler. Both must be absent.
 *
 *   Payload 1 (raw HTML — the example from the task spec):
 *       <a href="javascript:alert(1)">x</a>
 *     Expected: no <a> element with `javascript:` href, no inline event
 *     handler, and no unescaped `javascript:` string in the rendered HTML.
 *
 *   Payload 2 (markdown link with a hostile URL):
 *       [x](javascript:alert(1))
 *     Expected: react-markdown's default urlTransform replaces the scheme
 *     with `#` (or similar neutered value), so the rendered <a> href does
 *     not start with `javascript:`.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const CELL_TYPES_URL = '/iframe.html?viewMode=story&id=examples-cell-types--all-cell-types';

function richTextCell(page: Page, rowId: string): Locator {
  return page.locator(
    `[role="gridcell"][data-row-id="${rowId}"][data-field="richText"]`,
  );
}

async function commitPayload(page: Page, cell: Locator, payload: string): Promise<void> {
  // Enter edit mode via double-click: the grid config on this story uses
  // `selectionMode: "cell"` + `keyboardNavigation`, and RichTextCell starts
  // editing only when the grid flips its editing state. Double-click is the
  // gesture wired up in DataGridBody.tsx `onDoubleClick`.
  await cell.dblclick();
  const textarea = cell.locator('textarea').first();
  await expect(textarea).toBeVisible();

  // Replace draft with the hostile payload.
  await textarea.press('Control+a');
  await textarea.press('Delete');
  // Use fill() for the payload to avoid any accidental key-binding triggers
  // (Ctrl+B, Ctrl+I, Ctrl+K) that the cell listens for.
  await textarea.fill(payload);

  // Blur to commit. RichTextCell.tsx commits on blur (unless the new focus
  // target is an in-toolbar button).
  await page.locator('[role="grid"]').first().click({ position: { x: 2, y: 2 } });
  await expect(textarea).toHaveCount(0);
}

test.describe('RichText cell – XSS hardening', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CELL_TYPES_URL);
    await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
  });

  test('raw HTML <a href="javascript:"> is not rendered as a live link (#47)', async ({ page }) => {
    const cell = richTextCell(page, '1');
    await expect(cell).toBeVisible();

    const hostile = '<a href="javascript:alert(1)">x</a>';
    await commitPayload(page, cell, hostile);

    // Scan the rendered markdown body for hostile surface area.
    const rendered = cell.locator('[data-testid="richtext-rendered"]');
    await expect(rendered).toBeVisible();

    // 1. No anchor element with a javascript: href. react-markdown is
    //    deliberately wired without `rehype-raw`, so raw HTML tags in the
    //    markdown source are not rendered as tags — they come through as
    //    escaped text. The hostile `<a>` must therefore not exist as an
    //    actual element in the live DOM.
    const jsAnchor = rendered.locator('a[href^="javascript:" i]');
    await expect(jsAnchor).toHaveCount(0);

    // 2. No live element carries an inline on*= handler attribute. Walk
    //    the rendered DOM and collect all attribute names from every
    //    element — comparing against the live attribute list rather than
    //    the innerHTML string avoids false positives from escaped text
    //    content like `&lt;a onclick=...&gt;`.
    const hostileAttrs = await rendered.evaluate((root) => {
      const offenders: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node: Element | null = root;
      while (node) {
        for (const attr of Array.from((node as Element).attributes ?? [])) {
          if (/^on/i.test(attr.name)) {
            offenders.push(`${(node as Element).tagName.toLowerCase()}[${attr.name}=${attr.value}]`);
          }
        }
        node = walker.nextNode() as Element | null;
      }
      return offenders;
    });
    expect(
      hostileAttrs,
      'rendered DOM must not carry any on*= inline event handlers',
    ).toEqual([]);

    // 3. No live element has a href starting with `javascript:` (any
    //    tag — not just <a>).
    const hostileHrefs = await rendered.evaluate((root) => {
      const hits: string[] = [];
      root.querySelectorAll('[href]').forEach((el) => {
        const href = el.getAttribute('href') ?? '';
        if (/^\s*javascript:/i.test(href)) {
          hits.push(`${el.tagName.toLowerCase()}[href=${href}]`);
        }
      });
      return hits;
    });
    expect(
      hostileHrefs,
      'rendered DOM must not carry any element with a javascript: href',
    ).toEqual([]);
  });

  test('markdown link with javascript: scheme is neutered (#47)', async ({ page }) => {
    const cell = richTextCell(page, '2');
    await expect(cell).toBeVisible();

    const hostile = '[click me](javascript:alert(1))';
    await commitPayload(page, cell, hostile);

    const rendered = cell.locator('[data-testid="richtext-rendered"]');
    await expect(rendered).toBeVisible();

    // react-markdown v10's default urlTransform replaces unsafe schemes
    // with the empty string / `#`, so the resulting <a href> must not
    // start with `javascript:`.
    const anchors = rendered.locator('a');
    const count = await anchors.count();
    for (let i = 0; i < count; i++) {
      const href = await anchors.nth(i).getAttribute('href');
      expect(
        href == null || !/^\s*javascript:/i.test(href),
        `anchor ${i} href must not be a javascript: URL; got: ${href}`,
      ).toBe(true);
    }

    // Inline-handler sweep as defence-in-depth (attribute walk, not a
    // string search, so escaped text in code blocks never trips us up).
    const hostileAttrs = await rendered.evaluate((root) => {
      const offenders: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node: Element | null = root;
      while (node) {
        for (const attr of Array.from((node as Element).attributes ?? [])) {
          if (/^on/i.test(attr.name)) {
            offenders.push(`${(node as Element).tagName.toLowerCase()}[${attr.name}]`);
          }
        }
        node = walker.nextNode() as Element | null;
      }
      return offenders;
    });
    expect(hostileAttrs).toEqual([]);
  });
});
