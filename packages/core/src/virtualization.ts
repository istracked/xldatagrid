/**
 * Virtualisation module for the datagrid core engine.
 *
 * Computes the range of rows and columns that should be rendered given the
 * current scroll position and viewport dimensions. An overscan buffer is
 * included on both sides of the visible window to reduce flicker during
 * fast scrolling. Row virtualisation assumes uniform row heights; column
 * virtualisation handles variable-width columns by accumulating widths.
 *
 * @module virtualization
 */

/**
 * Describes a contiguous slice of rows or columns that should be rendered.
 */
export interface VirtualRange {
  /** Index of the first item to render (inclusive). */
  startIndex: number;
  /** Index of the last item to render (inclusive). A value of `-1` means no items. */
  endIndex: number;
  /** Pixel offset from the start of the scrollable area to the first rendered item. */
  offset: number;
  /** Total pixel size of all items (used for scroll-container sizing). */
  totalSize: number;
}

/**
 * Calculates the range of rows visible within the viewport, plus an overscan buffer.
 *
 * Assumes all rows share the same fixed height. The overscan expands the rendered
 * window by a few extra rows above and below the visible area to prevent blank
 * flashes during scrolling.
 *
 * @param opts - Calculation parameters.
 * @param opts.totalRows - Total number of rows in the dataset.
 * @param opts.rowHeight - Height of each row in pixels.
 * @param opts.viewportHeight - Height of the visible viewport in pixels.
 * @param opts.scrollTop - Current vertical scroll offset in pixels.
 * @param opts.overscan - Number of extra rows to render above and below the viewport. Defaults to `3`.
 * @returns A {@link VirtualRange} describing the row slice to render.
 *
 * @example
 * ```ts
 * const range = calculateVisibleRows({
 *   totalRows: 10_000,
 *   rowHeight: 36,
 *   viewportHeight: 600,
 *   scrollTop: 1200,
 * });
 * // Render rows range.startIndex..range.endIndex at pixel offset range.offset
 * ```
 */
export function calculateVisibleRows(opts: {
  totalRows: number;
  rowHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}): VirtualRange {
  const { totalRows, rowHeight, viewportHeight, scrollTop, overscan = 3 } = opts;
  const totalSize = totalRows * rowHeight;

  // Empty dataset -- return a degenerate range
  if (totalRows === 0) {
    return { startIndex: 0, endIndex: -1, offset: 0, totalSize: 0 };
  }

  // Determine the first visible row, then expand upward by the overscan count
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  // Count of rows that fit in the viewport
  const visibleCount = Math.ceil(viewportHeight / rowHeight);
  // Determine the last visible row, then expand downward by the overscan count
  const endIndex = Math.min(totalRows - 1, Math.floor(scrollTop / rowHeight) + visibleCount + overscan);
  // Pixel offset to position the rendered slice correctly in the scroll container
  const offset = startIndex * rowHeight;

  return { startIndex, endIndex, offset, totalSize };
}

/**
 * Calculates the range of columns visible within the viewport, plus an overscan buffer.
 *
 * Unlike rows, columns can have varying widths, so the calculation iterates
 * through columns accumulating widths until the visible window is found.
 *
 * @param opts - Calculation parameters.
 * @param opts.columns - Array of objects with a `width` property for each column.
 * @param opts.viewportWidth - Width of the visible viewport in pixels.
 * @param opts.scrollLeft - Current horizontal scroll offset in pixels.
 * @param opts.overscan - Number of extra columns to render on each side. Defaults to `1`.
 * @returns A {@link VirtualRange} describing the column slice to render.
 */
export function calculateVisibleColumns(opts: {
  columns: { width: number }[];
  viewportWidth: number;
  scrollLeft: number;
  overscan?: number;
}): VirtualRange {
  const { columns, viewportWidth, scrollLeft, overscan = 1 } = opts;

  // Empty column set -- return a degenerate range
  if (columns.length === 0) {
    return { startIndex: 0, endIndex: -1, offset: 0, totalSize: 0 };
  }

  // Sum total width of all columns for scroll-container sizing
  let totalSize = 0;
  for (const col of columns) totalSize += col.width;

  // Walk columns to find the first one whose right edge exceeds scrollLeft
  let startIndex = 0;
  let accum = 0;
  for (let i = 0; i < columns.length; i++) {
    const colWidth = columns[i]?.width ?? 0;
    if (accum + colWidth > scrollLeft) {
      // Apply overscan by stepping back
      startIndex = Math.max(0, i - overscan);
      break;
    }
    accum += colWidth;
  }

  // Walk forward from startIndex to find the last column still within the viewport
  let endIndex = startIndex;
  accum = 0;
  for (let i = 0; i < startIndex; i++) accum += columns[i]?.width ?? 0;
  for (let i = startIndex; i < columns.length; i++) {
    endIndex = i;
    if (accum > scrollLeft + viewportWidth) {
      // Apply overscan by stepping forward
      endIndex = Math.min(columns.length - 1, i + overscan);
      break;
    }
    accum += columns[i]?.width ?? 0;
  }

  // Compute the pixel offset for positioning the rendered column slice
  let offset = 0;
  for (let i = 0; i < startIndex; i++) offset += columns[i]?.width ?? 0;

  return { startIndex, endIndex, offset, totalSize };
}
