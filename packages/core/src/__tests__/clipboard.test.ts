import {
  serializeRangeToText,
  parseTextToGrid,
  formatCellValue,
  // The green phase will add this named export. We import it eagerly so this
  // red-phase run surfaces as a "not a function" runtime failure (which is the
  // expected red signal), rather than as a type error. We suppress the type
  // error explicitly so `tsc` still passes during Phase A.
  // @ts-expect-error Phase B will add `serializeRangeToHtml` to the clipboard module.
  serializeRangeToHtml,
} from '../clipboard';
import { ColumnDef, CellRange } from '../types';

const cols: ColumnDef[] = [
  { id: 'c1', field: 'name', title: 'Name' },
  { id: 'c2', field: 'age', title: 'Age' },
  { id: 'c3', field: 'city', title: 'City' },
];

const rowIds = ['r1', 'r2', 'r3'];

const data: Record<string, unknown>[] = [
  { name: 'Alice', age: 30, city: 'London' },
  { name: 'Bob', age: 25, city: 'Paris' },
  { name: 'Carol', age: 35, city: 'Berlin' },
];

describe('formatCellValue', () => {
  it('formats null as empty string', () => {
    expect(formatCellValue(null)).toBe('');
  });

  it('formats undefined as empty string', () => {
    expect(formatCellValue(undefined)).toBe('');
  });

  it('formats a number', () => {
    expect(formatCellValue(42)).toBe('42');
  });

  it('formats a string', () => {
    expect(formatCellValue('hello')).toBe('hello');
  });

  it('formats a boolean true', () => {
    expect(formatCellValue(true)).toBe('true');
  });

  it('formats a boolean false', () => {
    expect(formatCellValue(false)).toBe('false');
  });

  it('formats a Date as ISO string', () => {
    const d = new Date('2024-01-15T00:00:00.000Z');
    expect(formatCellValue(d)).toBe('2024-01-15T00:00:00.000Z');
  });
});

describe('parseTextToGrid', () => {
  it('parses single cell', () => {
    expect(parseTextToGrid('hello')).toEqual([['hello']]);
  });

  it('parses tab-separated values on one line', () => {
    expect(parseTextToGrid('a\tb\tc')).toEqual([['a', 'b', 'c']]);
  });

  it('parses multiple lines', () => {
    const result = parseTextToGrid('a\tb\nc\td');
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('converts numeric strings to numbers', () => {
    expect(parseTextToGrid('42')).toEqual([[42]]);
  });

  it('converts float strings to numbers', () => {
    expect(parseTextToGrid('3.14')).toEqual([[3.14]]);
  });

  it('converts "true" to boolean true', () => {
    expect(parseTextToGrid('true')).toEqual([[true]]);
  });

  it('converts "false" to boolean false', () => {
    expect(parseTextToGrid('false')).toEqual([[false]]);
  });

  it('converts empty tab-separated cell to null', () => {
    expect(parseTextToGrid('a\t\tc')).toEqual([['a', null, 'c']]);
  });

  it('ignores empty lines', () => {
    expect(parseTextToGrid('a\n\nb')).toEqual([['a'], ['b']]);
  });

  it('preserves string that looks partially numeric', () => {
    expect(parseTextToGrid('42abc')).toEqual([['42abc']]);
  });

  it('parses mixed types in one row', () => {
    const result = parseTextToGrid('Alice\t30\ttrue');
    expect(result).toEqual([['Alice', 30, true]]);
  });
});

describe('serializeRangeToText', () => {
  it('serializes a single cell', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'name' },
    };
    expect(serializeRangeToText(data, range, cols, rowIds)).toBe('Alice');
  });

  it('serializes a multi-column single-row range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    // Multi-cell ranges terminate with LF so spreadsheet apps treat the
    // payload as a row-oriented block on paste (issue #65).
    expect(serializeRangeToText(data, range, cols, rowIds)).toBe('Alice\t30\n');
  });

  it('serializes a multi-row single-column range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r3', field: 'name' },
    };
    // Explicit `false` isolates the body rows from the Feature 6 default
    // that prepends a header for multi-row ranges. Every row — including
    // the last — is terminated with LF so the payload parses as a block.
    expect(serializeRangeToText(data, range, cols, rowIds, false)).toBe('Alice\nBob\nCarol\n');
  });

  it('serializes a full multi-row multi-column range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r2', field: 'age' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds, false);
    expect(result).toBe('Alice\t30\nBob\t25\n');
  });

  it('includes headers when requested', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds, true);
    expect(result).toBe('Name\tAge\nAlice\t30\n');
  });

  it('excludes headers by default', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds);
    expect(result).not.toContain('Name');
  });

  it('handles inverted anchor/focus order', () => {
    const range: CellRange = {
      anchor: { rowId: 'r2', field: 'age' },
      focus: { rowId: 'r1', field: 'name' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds, false);
    expect(result).toBe('Alice\t30\nBob\t25\n');
  });

  it('formats null cell values as empty string', () => {
    const dataWithNull: Record<string, unknown>[] = [
      { name: null, age: 30, city: 'London' },
    ];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const rowIds2 = ['r1'];
    expect(serializeRangeToText(dataWithNull, range, cols, rowIds2)).toBe('\t30\n');
  });

  it('serializes the entire grid via selectAll-style range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r3', field: 'city' },
    };
    // Trailing LF produces an empty trailing element when split — drop it
    // before asserting on the body rows.
    const lines = serializeRangeToText(data, range, cols, rowIds, false)
      .split('\n')
      .filter(l => l.length > 0);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Alice\t30\tLondon');
    expect(lines[1]).toBe('Bob\t25\tParis');
    expect(lines[2]).toBe('Carol\t35\tBerlin');
  });
});

// ---------------------------------------------------------------------------
// Phase A — RED tests for Feature 6: Excel-pasteable clipboard.
//
// These tests describe the upgraded clipboard contract the green phase will
// satisfy:
//
//  1. `serializeRangeToText` produces RFC-4180-ish TSV so values containing
//     tab, newline, carriage-return, or double-quote characters survive a
//     round-trip through Excel without losing row/column structure.
//  2. `serializeRangeToHtml` produces a minimal `<table><tr><td>…</td></tr></table>`
//     so paste targets that understand rich clipboard formats (Excel, Google
//     Sheets, Word) receive explicit cell boundaries, with `&`, `<`, `>` and
//     `"` HTML-escaped.
//  3. Chrome columns (row-number gutter, controls column) are never copied —
//     only user data columns appear in either flavor.
//  4. Ranges default to `withHeaders: true`; single-cell selections default
//     to `withHeaders: false`. Callers can override either default via the
//     explicit option.
//
// The current implementation fails all of these: `serializeRangeToText`
// joins on raw tabs/newlines with no escaping (→ a tab inside a value
// leaks as an extra column); `serializeRangeToHtml` doesn't exist yet;
// there is no chrome-column filtering; the `withHeaders` default is `false`
// universally. Each test is written to fail with a specific assertion so
// the green-phase implementer knows exactly which contract to satisfy.
// ---------------------------------------------------------------------------

describe('serializeRangeToText — RFC-4180-ish TSV escaping (Feature 6)', () => {
  // Single-column/single-cell fixture so the focus is the escaping logic
  // rather than layout concerns. The green phase should detect that the
  // value contains a delimiter character and wrap the whole cell in double
  // quotes, doubling any embedded quotes per the RFC 4180 convention that
  // Excel understands when reading TSV.
  const escapingCols: ColumnDef[] = [
    { id: 'c1', field: 'note', title: 'Note' },
  ];

  it('wraps values containing a TAB in double quotes (round-trips via parseTextToGrid)', () => {
    const data = [{ note: 'hello\tworld' }];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'note' },
      focus: { rowId: 'r1', field: 'note' },
    };
    const text = serializeRangeToText(data, range, escapingCols, ['r1']);
    // The serialized form MUST quote the tab so a naive split on '\t' does
    // not produce two cells. The canonical RFC-4180-ish form is
    // `"hello\tworld"` (the inner tab is preserved verbatim inside quotes).
    expect(text).toBe('"hello\tworld"');

    // Round-trip: the parser must unquote the value back to the original.
    const parsed = parseTextToGrid(text);
    expect(parsed).toEqual([['hello\tworld']]);
  });

  it('wraps values containing a LF newline in double quotes', () => {
    const data = [{ note: 'line1\nline2' }];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'note' },
      focus: { rowId: 'r1', field: 'note' },
    };
    const text = serializeRangeToText(data, range, escapingCols, ['r1']);
    expect(text).toBe('"line1\nline2"');
    expect(parseTextToGrid(text)).toEqual([['line1\nline2']]);
  });

  it('wraps values containing a CRLF sequence in double quotes', () => {
    const data = [{ note: 'line1\r\nline2' }];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'note' },
      focus: { rowId: 'r1', field: 'note' },
    };
    const text = serializeRangeToText(data, range, escapingCols, ['r1']);
    expect(text).toBe('"line1\r\nline2"');
  });

  it('doubles embedded double-quote characters inside a quoted cell', () => {
    const data = [{ note: 'she said "hi"' }];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'note' },
      focus: { rowId: 'r1', field: 'note' },
    };
    const text = serializeRangeToText(data, range, escapingCols, ['r1']);
    // Per RFC 4180: the whole value is quoted and internal `"` is doubled.
    expect(text).toBe('"she said ""hi"""');
    expect(parseTextToGrid(text)).toEqual([['she said "hi"']]);
  });

  it('does NOT quote ordinary values that contain none of tab/newline/quote', () => {
    const data = [{ note: 'plain text' }];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'note' },
      focus: { rowId: 'r1', field: 'note' },
    };
    const text = serializeRangeToText(data, range, escapingCols, ['r1']);
    expect(text).toBe('plain text');
  });
});

describe('serializeRangeToHtml — minimal <table> flavor (Feature 6)', () => {
  const cols2: ColumnDef[] = [
    { id: 'c1', field: 'name', title: 'Name' },
    { id: 'c2', field: 'age', title: 'Age' },
  ];
  const rowIds2 = ['r1', 'r2'];
  const data2: Record<string, unknown>[] = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ];

  it('produces a <table> with one <tr> per row and one <td> per cell', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r2', field: 'age' },
    };
    // withHeaders: false to isolate the body-row shape.
    const html = (serializeRangeToHtml as (
      data: Record<string, unknown>[],
      range: CellRange,
      columns: ColumnDef[],
      rowIds: string[],
      options?: { withHeaders?: boolean },
    ) => string)(data2, range, cols2, rowIds2, { withHeaders: false });

    expect(html).toContain('<table');
    expect(html).toContain('</table>');
    // Exactly two body rows and four body cells.
    const trMatches = html.match(/<tr[\s>]/g) ?? [];
    expect(trMatches.length).toBe(2);
    const tdMatches = html.match(/<td[\s>]/g) ?? [];
    expect(tdMatches.length).toBe(4);
    // Values appear in the right order.
    expect(html.indexOf('Alice')).toBeLessThan(html.indexOf('Bob'));
    expect(html.indexOf('30')).toBeLessThan(html.indexOf('25'));
  });

  it('HTML-escapes &, <, > in cell values', () => {
    const data = [{ name: 'A & B <c>', age: 1 }];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'name' },
    };
    const html = (serializeRangeToHtml as (
      data: Record<string, unknown>[],
      range: CellRange,
      columns: ColumnDef[],
      rowIds: string[],
    ) => string)(data, range, cols2, ['r1']);
    // Raw characters must not leak into the HTML — a paste target could
    // otherwise interpret them as markup and drop content.
    expect(html).not.toContain('A & B <c>');
    expect(html).toContain('A &amp; B &lt;c&gt;');
  });

  it('prepends a <thead><tr><th>…</th></tr></thead> when withHeaders=true', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const html = (serializeRangeToHtml as (
      data: Record<string, unknown>[],
      range: CellRange,
      columns: ColumnDef[],
      rowIds: string[],
      options?: { withHeaders?: boolean },
    ) => string)(data2, range, cols2, rowIds2, { withHeaders: true });

    expect(html).toContain('<th');
    // Header text comes from `ColumnDef.title`, not `field`.
    expect(html).toContain('Name');
    expect(html).toContain('Age');
    // Header appears before any body cell.
    expect(html.indexOf('Name')).toBeLessThan(html.indexOf('Alice'));
  });
});

describe('serializeRangeToText — withHeaders default + options flag (Feature 6)', () => {
  const cols2: ColumnDef[] = [
    { id: 'c1', field: 'name', title: 'Name' },
    { id: 'c2', field: 'age', title: 'Age' },
  ];
  const rowIds2 = ['r1', 'r2'];
  const data2: Record<string, unknown>[] = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ];

  it('defaults to INCLUDING headers for a multi-cell range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r2', field: 'age' },
    };
    // No explicit flag — Phase B's default for ranges is `true`.
    const text = serializeRangeToText(
      data2,
      range,
      cols2,
      rowIds2,
    );
    const lines = text.split('\n');
    expect(lines[0]).toBe('Name\tAge');
    expect(lines[1]).toBe('Alice\t30');
    expect(lines[2]).toBe('Bob\t25');
  });

  it('defaults to EXCLUDING headers for a single-cell selection', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'name' },
    };
    const text = serializeRangeToText(
      data2,
      range,
      cols2,
      rowIds2,
    );
    expect(text).toBe('Alice');
  });
});

describe('serializeRangeToText — chrome column exclusion (Feature 6)', () => {
  // Simulate the chrome columns the React layer injects. When they appear in
  // the column list passed to the serializer, they MUST be dropped from both
  // the header row and the per-row payload — they are presentation-only
  // gutters and their values are not user data.
  //
  // The green phase will recognise chrome columns via one of several
  // sentinels. The most explicit option is a `kind: 'chrome'` marker on the
  // column definition. We assert the result shape (chrome values absent)
  // rather than the detection mechanism so the implementation has latitude.
  const mixedCols = [
    // Chrome controls column (far left).
    { id: '__controls', field: '__controls', title: '', kind: 'chrome' } as unknown as ColumnDef,
    // Chrome row-number column.
    { id: '__rowNumber', field: '__rowNumber', title: '#', kind: 'chrome' } as unknown as ColumnDef,
    // Real user data columns.
    { id: 'c1', field: 'name', title: 'Name' } as ColumnDef,
    { id: 'c2', field: 'age', title: 'Age' } as ColumnDef,
  ];
  const data: Record<string, unknown>[] = [
    { __controls: '…', __rowNumber: 1, name: 'Alice', age: 30 },
    { __controls: '…', __rowNumber: 2, name: 'Bob', age: 25 },
  ];
  const rowIds = ['r1', 'r2'];

  it('excludes chrome columns from the TSV output even when they are in the column list', () => {
    const range: CellRange = {
      // Anchor at the leftmost chrome cell; focus at the rightmost data cell.
      // The serializer should still only emit the two data columns.
      anchor: { rowId: 'r1', field: '__controls' },
      focus: { rowId: 'r2', field: 'age' },
    };
    const text = serializeRangeToText(
      data,
      range,
      mixedCols,
      rowIds,
      true,
    );
    const lines = text.split('\n');
    // Header row: chrome titles absent, only user column titles present.
    expect(lines[0]).toBe('Name\tAge');
    expect(lines[1]).toBe('Alice\t30');
    expect(lines[2]).toBe('Bob\t25');
    // Defense-in-depth: the chrome placeholder values never leak.
    expect(text).not.toContain('…');
    expect(text).not.toContain('__controls');
    expect(text).not.toContain('__rowNumber');
  });

  it('excludes chrome columns from the HTML output as well', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: '__controls' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const html = (serializeRangeToHtml as (
      data: Record<string, unknown>[],
      range: CellRange,
      columns: ColumnDef[],
      rowIds: string[],
      options?: { withHeaders?: boolean },
    ) => string)(data, range, mixedCols, rowIds, { withHeaders: true });
    expect(html).toContain('Name');
    expect(html).toContain('Age');
    expect(html).not.toContain('__controls');
    expect(html).not.toContain('__rowNumber');
  });
});
