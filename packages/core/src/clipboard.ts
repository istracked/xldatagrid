/**
 * Clipboard module for the datagrid core engine.
 *
 * Handles serialisation and deserialisation of cell ranges for copy/paste
 * operations. Ranges are converted to tab-separated text (compatible with
 * spreadsheet applications) and parsed back into typed grids of cell values.
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
 * Serialises a rectangular cell range into tab-separated plain text.
 *
 * Columns are delimited by tabs and rows by newlines, matching the format
 * expected by spreadsheet applications. An optional header row containing
 * column titles can be prepended.
 *
 * @param data - The full data array backing the grid.
 * @param range - The cell range to serialise.
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @param includeHeaders - Whether to include a header row with column titles. Defaults to `false`.
 * @returns A tab-and-newline-delimited string representation of the range.
 *
 * @example
 * ```ts
 * const text = serializeRangeToText(data, range, columns, rowIds, true);
 * navigator.clipboard.writeText(text);
 * ```
 */
export function serializeRangeToText(
  data: Record<string, unknown>[],
  range: CellRange,
  columns: ColumnDef[],
  rowIds: string[],
  includeHeaders: boolean = false
): string {
  // Resolve the anchor/focus range into concrete row IDs and column definitions
  const { rows, cols } = resolveRange(range, columns, rowIds);
  const lines: string[] = [];

  // Optionally prepend a header row containing column titles
  if (includeHeaders) {
    lines.push(cols.map(c => c.title).join('\t'));
  }

  // Build one tab-delimited line per row
  for (const rowId of rows) {
    const row = data.find((_, i) => rowIds[i] === rowId);
    if (!row) continue;
    lines.push(cols.map(c => formatCellValue(row[c.field] as CellValue)).join('\t'));
  }

  return lines.join('\n');
}

/**
 * Parses tab-separated plain text (e.g. pasted from a spreadsheet) into a
 * two-dimensional grid of typed cell values.
 *
 * Each non-empty line becomes a row; cells within a line are split on tabs.
 * Values are coerced to `number`, `boolean`, or `string` where possible;
 * empty cells become `null`.
 *
 * @param text - The raw clipboard text to parse.
 * @returns A two-dimensional array of typed {@link CellValue}s.
 */
export function parseTextToGrid(text: string): CellValue[][] {
  return text.split('\n').filter(line => line.length > 0).map(line =>
    line.split('\t').map(cell => {
      const trimmed = cell.trim();
      // Empty cells map to null
      if (trimmed === '') return null;
      // Attempt numeric coercion
      const num = Number(trimmed);
      if (!isNaN(num) && trimmed !== '') return num;
      // Boolean literals
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      // Fall back to string
      return trimmed;
    })
  );
}

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

/**
 * Resolves an anchor/focus {@link CellRange} into concrete row IDs and column
 * definitions, normalising the direction so that start <= end regardless of
 * whether the user selected left-to-right or right-to-left.
 *
 * @param range - The anchor/focus range to resolve.
 * @param columns - Full list of column definitions.
 * @param rowIds - Ordered list of all row identifiers.
 * @returns An object containing the ordered `rows` and `cols` slices.
 */
function resolveRange(
  range: CellRange,
  columns: ColumnDef[],
  rowIds: string[]
): { rows: string[]; cols: ColumnDef[] } {
  // Map field names to indices for normalisation
  const colFields = columns.map(c => c.field);
  const anchorCol = colFields.indexOf(range.anchor.field);
  const focusCol = colFields.indexOf(range.focus.field);
  const minCol = Math.min(anchorCol, focusCol);
  const maxCol = Math.max(anchorCol, focusCol);

  // Map row IDs to indices for normalisation
  const anchorRow = rowIds.indexOf(range.anchor.rowId);
  const focusRow = rowIds.indexOf(range.focus.rowId);
  const minRow = Math.min(anchorRow, focusRow);
  const maxRow = Math.max(anchorRow, focusRow);

  // Slice out the resolved sub-ranges
  return {
    rows: rowIds.slice(minRow, maxRow + 1),
    cols: columns.slice(minCol, maxCol + 1),
  };
}
