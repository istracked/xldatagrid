/**
 * Parity coverage for the turndown + DOMPurify powered htmlToMarkdown.
 *
 * The previous regex-based implementation could not realistically handle GFM
 * features such as tables, task lists, nested lists, fenced code blocks with
 * language hints, and strikethrough on arbitrary inline tags. These tests
 * pin the post-swap behaviour and are intentionally written RED first — they
 * exercise shapes the regex pipeline simply did not produce.
 */
import { htmlToMarkdown } from '../htmlToMarkdown';

describe('htmlToMarkdown – turndown + DOMPurify (GFM parity)', () => {
  // ── Tables ────────────────────────────────────────────────────────────────
  it('converts a simple table to GFM pipe syntax', () => {
    const html = [
      '<table>',
      '<thead><tr><th>Name</th><th>Age</th></tr></thead>',
      '<tbody>',
      '<tr><td>Ada</td><td>36</td></tr>',
      '<tr><td>Alan</td><td>41</td></tr>',
      '</tbody>',
      '</table>',
    ].join('');

    const out = htmlToMarkdown(html);

    // Header row with pipes
    expect(out).toMatch(/\|\s*Name\s*\|\s*Age\s*\|/);
    // Separator row (GFM table delimiter) — at least two dashes per column
    expect(out).toMatch(/\|\s*-{2,}\s*\|\s*-{2,}\s*\|/);
    // Body rows
    expect(out).toMatch(/\|\s*Ada\s*\|\s*36\s*\|/);
    expect(out).toMatch(/\|\s*Alan\s*\|\s*41\s*\|/);
  });

  // ── Strikethrough ────────────────────────────────────────────────────────
  it('converts <del> to ~~strikethrough~~', () => {
    expect(htmlToMarkdown('<del>x</del>')).toBe('~~x~~');
  });

  it('converts <s> to ~~strikethrough~~', () => {
    expect(htmlToMarkdown('<s>gone</s>')).toBe('~~gone~~');
  });

  // ── Task lists ───────────────────────────────────────────────────────────
  it('converts checked task-list items to `- [x]`', () => {
    const html =
      '<ul>' +
      '<li><input type="checkbox" checked> done</li>' +
      '<li><input type="checkbox"> pending</li>' +
      '</ul>';

    const out = htmlToMarkdown(html);

    expect(out).toMatch(/- \[x\]\s+done/);
    expect(out).toMatch(/- \[ \]\s+pending/);
  });

  // ── Nested lists ─────────────────────────────────────────────────────────
  it('preserves indentation on nested unordered lists', () => {
    const html =
      '<ul>' +
      '<li>outer-1' +
      '<ul>' +
      '<li>inner-a</li>' +
      '<li>inner-b</li>' +
      '</ul>' +
      '</li>' +
      '<li>outer-2</li>' +
      '</ul>';

    const out = htmlToMarkdown(html);

    // Outer items start at column 0
    expect(out).toMatch(/^- outer-1/m);
    expect(out).toMatch(/^- outer-2/m);
    // Inner items are indented (turndown uses >=2 spaces for nesting)
    expect(out).toMatch(/^\s{2,}- inner-a/m);
    expect(out).toMatch(/^\s{2,}- inner-b/m);
  });

  // ── Fenced code blocks with language hint ────────────────────────────────
  it('emits a language-tagged fenced code block from `<pre><code class="language-js">`', () => {
    const html =
      '<pre><code class="language-js">const x = 1;\nconst y = 2;</code></pre>';

    const out = htmlToMarkdown(html);

    // Opening fence carries the language
    expect(out).toMatch(/```js\b/);
    // Code body preserved
    expect(out).toContain('const x = 1;');
    expect(out).toContain('const y = 2;');
    // Closing fence present
    expect(out).toMatch(/```[\s\S]*```/);
  });
});
