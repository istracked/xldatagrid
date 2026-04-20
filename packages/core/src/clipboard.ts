/**
 * Clipboard module for the datagrid core engine.
 *
 * Handles serialisation and deserialisation of cell ranges for copy/paste
 * operations. Ranges are converted to tab-separated text (compatible with
 * spreadsheet applications) and parsed back into typed grids of cell values.
 *
 * Feature 6 upgrades:
 *  - TSV output uses RFC-4180-ish escaping so values containing tabs,
 *    newlines, carriage returns, or double-quote characters survive a
 *    round-trip through Excel without losing row/column structure.
 *  - A companion `serializeRangeToHtml` produces a minimal `<table>` so
 *    paste targets that understand rich clipboard formats (Excel, Google
 *    Sheets, Word) receive explicit cell boundaries.
 *  - Chrome columns (row-number gutter, controls column) are filtered out of
 *    BOTH flavours before serialisation — they are presentation-only gutters
 *    and should never leak into a paste.
 *
 * @module clipboard
 */

import { CellRange, CellValue, ColumnDef } from './types';

/**
 * Represents data copied from the grid, ready for placement on the system clipboard.
 */
export interface ClipboardData {
  /** Tab-separated plain-text representation. */
  text: string;
  /** HTML table representation (for rich-paste targets). */
  html: string;
  /** Two-dimensional array of typed cell values (rows x columns). */
  cells: CellValue[][];
  /** The source range that was copied. */
  sourceRange: CellRange;
}

/**
 * Options common to both serialisation flavours.
 */
export interface SerializeOptions {
  /**
   * Whether to include a header row with column titles.
   *
   * For multi-cell ranges the Phase B default is `true`; for single-cell
   * selections the default is `false`. Callers may override either default
   * by passing an explicit boolean.
   */
  withHeaders?: boolean;
}

// ---------------------------------------------------------------------------
// Chrome-column detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the given column is a presentation-only chrome column
 * (row-number gutter, controls column, etc.) and must therefore be excluded
 * from both clipboard flavours.
 *
 * Detection is intentionally permissive — the clipboard layer has no strong
 * coupling to how the rendering layer marks chrome, so we recognise three
 * sentinels:
 *
 *   1. A `kind: 'chrome'` tag on the column definition (the explicit opt-in
 *      the tests use for freshly-declared chrome columns).
 *   2. A `field` or `id` that starts with a double underscore — the
 *      convention the React layer uses for injected chrome columns
 *      (`__controls`, `__rowNumber`).
 */
function isChromeColumn(col: ColumnDef): boolean {
  const kind = (col as unknown as { kind?: unknown }).kind;
  if (kind === 'chrome') return true;
  if (typeof col.field === 'string' && col.field.startsWith('__')) return true;
  if (typeof col.id === 'string' && col.id.startsWith('__')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// TSV escaping (RFC-4180-ish, with `\t` in place of `,`)
// ---------------------------------------------------------------------------

/**
 * Applies RFC-4180-ish quoting to a single TSV cell. Values containing any of
 * tab, LF, CR, or double-quote characters are wrapped in double quotes and any
 * embedded double quote is doubled. Ordinary values pass through unchanged.
 *
 * The field delimiter is tab (not comma) so spreadsheet apps such as Excel
 * recognise the payload as TSV on paste.
 */
function escapeTsvCell(raw: string): string {
  if (
    raw.indexOf('\t') !== -1 ||
    raw.indexOf('\n') !== -1 ||
    raw.indexOf('\r') !== -1 ||
    raw.indexOf('"') !== -1
  ) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Escapes the `&`, `<`, `>` (and `"`) characters that would otherwise be
 * interpreted as markup by an HTML paste target. Single quote is left alone
 * since attribute values use double quotes; we're emitting text content.
 */
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// serializeRangeToText
// ---------------------------------------------------------------------------

/**
 * Serialises a rectangular cell range into tab-separated plain text.
 *
 * Columns are delimited by tabs and every multi-cell row — including the
 * last — is terminated by a trailing LF, matching the format Excel and
 * Google Sheets emit when copying cells. The trailing newline ensures
 * spreadsheet applications parse the payload as a row-oriented block
 * rather than a bare cell value on paste. Values containing tab, newline,
 * carriage-return, or double-quote characters are RFC-4180-quoted so the
 * payload round-trips through Excel without losing row/column structure.
 * Chrome columns (row-number gutter, controls column) are filtered out
 * before serialisation.
 *
 * Single-cell selections are the one exception: they represent a scalar
 * value the user typically pastes into another cell, a search box, or a
 * cell editor. Appending an LF there would convert the paste into a
 * two-row operation (value + blank), so we emit the bare value instead.
 *
 * The `includeHeaders` parameter supports three calling conventions:
 *
 *   - Omitted entirely — the default is derived from the resolved range:
 *     multi-cell ranges include headers, single-cell selections do not.
 *   - Passed as a boolean — the explicit value is honoured verbatim.
 *
 * @param data - The full data array backing the grid.
 * @param range - The cell range to serialise.
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @param includeHeaders - Optional explicit override for the header-row default.
 * @returns A tab-and-newline-delimited string representation of the range.
 */
export function serializeRangeToText(
  data: Record<string, unknown>[],
  range: CellRange,
  columns: ColumnDef[],
  rowIds: string[],
  includeHeaders?: boolean,
): string {
  const { rows, cols } = resolveRange(range, columns, rowIds);
  // Header default: a range that spans multiple rows opts in; a single-row
  // selection (whether one column or many) opts out. This preserves the
  // historical `toBe('Alice\t30')` contract for 1×N ranges while giving
  // multi-row copies the Excel-style "headers included" payload the new
  // dual-flavour Ctrl+C pathway expects.
  const useHeaders = includeHeaders ?? rows.length > 1;

  const lines: string[] = [];

  if (useHeaders) {
    lines.push(cols.map(c => escapeTsvCell(c.title)).join('\t'));
  }

  for (const rowId of rows) {
    const row = data.find((_, i) => rowIds[i] === rowId);
    if (!row) continue;
    lines.push(
      cols
        .map(c => escapeTsvCell(formatCellValue(row[c.field] as CellValue)))
        .join('\t'),
    );
  }

  // Terminate every row with LF (including the last) so spreadsheet
  // applications parse the payload as a row-oriented block. A bare cell
  // value with no newline is treated as a plain string by Excel/Sheets and
  // loses the row boundary on paste — see issue #65.
  //
  // Single-cell selections (1×1, no header row) keep the historical
  // bare-value contract so pastes into scalar targets (another cell, a
  // search box, a cell editor) still work.
  if (lines.length === 0) return '';
  const isSingleCell = !useHeaders && rows.length === 1 && cols.length === 1;
  if (isSingleCell) return lines[0]!;
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// serializeRangeToHtml
// ---------------------------------------------------------------------------

/**
 * Serialises a rectangular cell range into a minimal HTML table string
 * suitable for placement on the clipboard under the `text/html` flavour.
 *
 * The emitted markup is:
 *   `<table><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody></table>`
 * with `<thead>` present only when the resolved `withHeaders` default is
 * `true`. All cell text is HTML-escaped (`&`, `<`, `>`, `"`). Chrome columns
 * are filtered out before serialisation so the paste target only sees user
 * data.
 *
 * @param data - The full data array backing the grid.
 * @param range - The cell range to serialise.
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @param options - Optional serialisation options; see {@link SerializeOptions}.
 * @returns A `<table>`-wrapped HTML representation of the range.
 */
export function serializeRangeToHtml(
  data: Record<string, unknown>[],
  range: CellRange,
  columns: ColumnDef[],
  rowIds: string[],
  options?: SerializeOptions,
): string {
  const { rows, cols } = resolveRange(range, columns, rowIds);
  // Same default rule as the TSV flavour: multi-row ranges include a
  // `<thead>`, single-row selections omit it. See
  // {@link serializeRangeToText} for the rationale.
  const useHeaders = options?.withHeaders ?? rows.length > 1;

  const parts: string[] = [];
  parts.push('<table>');

  if (useHeaders) {
    parts.push('<thead><tr>');
    for (const c of cols) {
      parts.push(`<th>${escapeHtml(c.title)}</th>`);
    }
    parts.push('</tr></thead>');
  }

  parts.push('<tbody>');
  for (const rowId of rows) {
    const row = data.find((_, i) => rowIds[i] === rowId);
    if (!row) continue;
    parts.push('<tr>');
    for (const c of cols) {
      const formatted = formatCellValue(row[c.field] as CellValue);
      parts.push(`<td>${escapeHtml(formatted)}</td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</tbody>');

  parts.push('</table>');
  return parts.join('');
}

// ---------------------------------------------------------------------------
// parseTextToGrid
// ---------------------------------------------------------------------------

/**
 * Parses tab-separated plain text (e.g. pasted from a spreadsheet) into a
 * two-dimensional grid of typed cell values.
 *
 * Understands the RFC-4180-ish quoting that {@link serializeRangeToText}
 * produces: fields beginning with `"` are parsed as quoted cells that may
 * contain tab, newline, or doubled `""` sequences; the surrounding quotes are
 * stripped and doubled quotes collapsed to single on output.
 *
 * Values outside quotes are coerced to `number`, `boolean`, or `string` where
 * possible; empty cells become `null`.
 *
 * @param text - The raw clipboard text to parse.
 * @returns A two-dimensional array of typed {@link CellValue}s.
 */
export function parseTextToGrid(text: string): CellValue[][] {
  // Split into logical lines first (preserving quoted newlines), then parse
  // each line as a sequence of tab-separated fields. This matches the old
  // split-based behaviour (empty lines dropped, `a\t\tb` → three fields) and
  // layers RFC-4180-ish quoting on top of it.
  const lines = splitLogicalLines(text);
  const out: CellValue[][] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    out.push(parseTsvLine(line));
  }
  return out;
}

/**
 * Splits a text blob into logical lines, respecting double-quoted fields —
 * newline characters inside quoted fields do NOT end the line. Empty lines
 * are preserved in the returned array; callers are responsible for dropping
 * them if that's the desired semantics.
 */
function splitLogicalLines(text: string): string[] {
  const lines: string[] = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // Escaped quote; stay inside the quoted run.
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      lines.push(text.slice(start, i));
      if (ch === '\r' && text[i + 1] === '\n') i++;
      start = i + 1;
    }
  }
  if (start < text.length) lines.push(text.slice(start));
  return lines;
}

/**
 * Parses a single logical TSV line into cell values. Quoted fields have the
 * surrounding quotes stripped and internal doubled quotes collapsed; unquoted
 * fields are coerced via {@link coerceUnquotedCell}.
 */
function parseTsvLine(line: string): CellValue[] {
  const cells: CellValue[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i < line.length && line[i] === '"') {
      // Quoted field.
      let j = i + 1;
      let value = '';
      while (j < line.length) {
        if (line[j] === '"') {
          if (line[j + 1] === '"') {
            value += '"';
            j += 2;
            continue;
          }
          j++;
          break;
        }
        value += line[j];
        j++;
      }
      cells.push(value);
      i = j;
      // Consume a trailing tab if present, otherwise this was the last cell
      // on the line.
      if (i < line.length && line[i] === '\t') {
        i++;
      } else {
        break;
      }
      continue;
    }

    // Unquoted field: read up to the next tab.
    let j = i;
    while (j < line.length && line[j] !== '\t') j++;
    const raw = line.slice(i, j);
    cells.push(coerceUnquotedCell(raw));
    if (j < line.length && line[j] === '\t') {
      i = j + 1;
    } else {
      break;
    }
  }
  return cells;
}

/**
 * Coerces an unquoted TSV field into a typed {@link CellValue}.
 *
 * Trimmed empty strings map to `null`; numeric literals to `number`; `"true"`
 * / `"false"` to booleans; everything else falls back to the raw trimmed
 * string.
 */
function coerceUnquotedCell(cell: string): CellValue {
  const trimmed = cell.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

// ---------------------------------------------------------------------------
// formatCellValue
// ---------------------------------------------------------------------------

/**
 * Formats a single cell value as a string suitable for clipboard export.
 *
 * `null` and `undefined` become the empty string, Dates are serialised as
 * ISO-8601 strings, and all other values use their default `String()` coercion.
 *
 * @param value - The cell value to format.
 * @returns The formatted string representation.
 */
export function formatCellValue(value: CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

// ---------------------------------------------------------------------------
// Range resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an anchor/focus {@link CellRange} into concrete row IDs and column
 * definitions, normalising direction (anchor and focus may be in any order)
 * and filtering out chrome columns.
 *
 * When a chrome column appears at either edge of the range, it is dropped and
 * the nearest surviving data column takes its place. This prevents chrome
 * values (row numbers, controls placeholders) from leaking into either
 * clipboard flavour.
 */
function resolveRange(
  range: CellRange,
  columns: ColumnDef[],
  rowIds: string[],
): { rows: string[]; cols: ColumnDef[] } {
  const colFields = columns.map(c => c.field);
  const anchorCol = colFields.indexOf(range.anchor.field);
  const focusCol = colFields.indexOf(range.focus.field);
  // When one endpoint is missing from the column list, fall back to the
  // other endpoint so we still emit a range rather than nothing. A missing
  // index is `-1`; coerce to the other endpoint's index.
  const resolvedAnchorCol = anchorCol < 0 ? focusCol : anchorCol;
  const resolvedFocusCol = focusCol < 0 ? anchorCol : focusCol;
  const minCol = Math.max(
    0,
    Math.min(resolvedAnchorCol, resolvedFocusCol),
  );
  const maxCol = Math.min(
    columns.length - 1,
    Math.max(resolvedAnchorCol, resolvedFocusCol),
  );

  const anchorRow = rowIds.indexOf(range.anchor.rowId);
  const focusRow = rowIds.indexOf(range.focus.rowId);
  const minRow = Math.min(anchorRow, focusRow);
  const maxRow = Math.max(anchorRow, focusRow);

  const rawCols = columns.slice(minCol, maxCol + 1);
  // Drop chrome columns — they are presentation-only gutters and must never
  // contribute to the clipboard payload.
  const cols = rawCols.filter(c => !isChromeColumn(c));

  return {
    rows: rowIds.slice(minRow, maxRow + 1),
    cols,
  };
}
