/**
 * DataGridBody — the virtualised body renderer for the data grid.
 *
 * Responsibilities:
 *  - Drive the virtualisation loop for the non-grouped render path: compute
 *    which rows fall inside `rowRange` and absolutely-position each visible
 *    row at `rowIdx * rowHeight` inside a sized spacer.
 *  - Drive the grouped render path: walk `groupedView` and emit group header
 *    rows, optional aggregate rows, and data rows, honouring the collapsed /
 *    expanded state in `rowGroupExpanded`.
 *  - Compose the per-row chrome columns around the data cells. Each rendered
 *    row has (optionally) a `ChromeControlsCell`, a `ChromeRowNumberCell`,
 *    the data cells from `orderedVisibleColumns`, and — depending on the
 *    configured row-number `position` — the row-number cell on the left or
 *    on the right of the data cells.
 *  - Render each data cell via the `renderCell` closure, which handles cell
 *    selection, the double-click-to-edit interaction, invocation of custom
 *    `cellRenderers`, the fallback `<input>` editor, validation display,
 *    frozen-column sticky offsets, and the context-menu hook.
 *  - Integrate the `GhostRow` for the blank append-row slot, positioning it
 *    at the top or bottom of either the grouped or virtualised wrapper
 *    according to `ghostRowConfig.position`.
 *  - Forward drag/drop events from the row-number cell (row reordering) and
 *    context-menu events from the row container (row-level menu) up to the
 *    owning `DataGrid`.
 *
 * Related modules:
 *  - {@link ../DataGrid} — the owning component that wires model state,
 *    virtualisation and keyboard handling and renders this component.
 *  - {@link ../chrome/ChromeControlsCell} and
 *    {@link ../chrome/ChromeRowNumberCell} — the pinned chrome column cells.
 *  - {@link ../GhostRow} — the appendable blank row at top/bottom.
 *  - {@link ./DataGridBody.styles} — inline CSSProperties factories used
 *    across both render paths.
 */
import React, { useRef } from 'react';
import {
  ColumnDef,
  CellAddress,
  CellValue,
  CellType,
  ValidationResult,
  RowGroupConfig,
  RowGroup,
  GroupState,
  GhostRowConfig,
  GhostRowPosition,
  GridModel,
  SelectionMode,
  RowOutlineSides,
} from '@istracked/datagrid-core';
import type {
  ControlsColumnConfig,
  RowNumberColumnConfig,
  RowBorderStyle,
  ChromeCellContent,
  ChromeRowResolver,
  ChromeRowResolverContext,
} from '@istracked/datagrid-core';
import { CellRendererProps } from '../DataGrid';
import { ChromeControlsCell, ChromeRowNumberCell } from '../chrome';
import { GhostRow } from '../GhostRow';
import * as styles from './DataGridBody.styles';

// ---------------------------------------------------------------------------
// Helper: format cell value for display
// ---------------------------------------------------------------------------

function renderCellValue(value: CellValue, cellType: CellType): string {
  if (value == null) return '';
  if (cellType === 'boolean') return value ? '\u2611' : '\u2610';
  if (cellType === 'currency' && typeof value === 'number') return `$${value.toFixed(2)}`;
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

// ---------------------------------------------------------------------------
// Helper: validation key
// ---------------------------------------------------------------------------

function getValidationKey(rowId: string, field: string): string {
  return `${rowId}:${field}`;
}

// ---------------------------------------------------------------------------
// Helper: resolve ghost row position from config
// ---------------------------------------------------------------------------

function resolveGhostPosition<T extends Record<string, unknown> = Record<string, unknown>>(config: boolean | GhostRowConfig<T> | undefined): GhostRowPosition {
  if (typeof config === 'object' && config.position) return config.position;
  return 'bottom';
}

// ---------------------------------------------------------------------------
// Chrome-resolver shape detection
// ---------------------------------------------------------------------------

/**
 * Detects whether a chrome row resolver was declared with the named-object
 * calling convention (a single destructured object parameter).
 *
 * The detection is a structural prefix match against the resolver's
 * stringified source — the same `Function.prototype.toString()` mechanism
 * used by popular introspection libraries (redux-toolkit's
 * `checkForBraces`, vue's props-resolution). It looks for the first
 * non-whitespace token after the opening parenthesis (or the `function`
 * keyword's paren) and returns `true` when that token is `{`.
 *
 * False-negative cases all fall through to the positional branch, which
 * is the safe default — the worst that can happen is that a consumer
 * writes `(ctx) => ctx.row` without destructuring and the grid invokes
 * them as `fn(row, rowId, rowIndex)`, so `ctx === row`. Because `TData`
 * is opaque, the consumer's code breaks loudly at the first property
 * access — never silently wrong.
 *
 * Guarded against arity-0 (`(...args)`, `() => …`) and non-function
 * inputs for safety, though neither path is reachable from the typed
 * call sites.
 */
function isNamedObjectResolver(fn: unknown): boolean {
  if (typeof fn !== 'function') return false;
  // Arity-0 callables are treated as positional — this covers the
  // documented `(...args) => …` fallback case and any accidental
  // `() => …` resolver.
  if (fn.length < 1) return false;
  // Peek at the source. `toString()` on native / bound functions may
  // yield `"function X() { [native code] }"` — the regex below does not
  // match `{` before the closing paren so native callables correctly
  // fall through to positional.
  let src: string;
  try {
    src = Function.prototype.toString.call(fn);
  } catch {
    return false;
  }
  // Locate the first opening paren (after an optional leading
  // `function` / `async function` / identifier / whitespace). Arrow
  // functions begin with `(`, so the first paren is always the
  // parameter list.
  const parenIdx = src.indexOf('(');
  if (parenIdx < 0) return false;
  // Skip whitespace after `(`. If the first non-whitespace byte is `{`,
  // the resolver destructures its first parameter.
  for (let i = parenIdx + 1; i < src.length; i++) {
    const c = src.charCodeAt(i);
    // Fast whitespace check: space (32), tab (9), LF (10), CR (13).
    if (c === 32 || c === 9 || c === 10 || c === 13) continue;
    return c === 0x7b /* `{` */;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Props for {@link DataGridBody}.
 *
 * The body is a controlled renderer: the owning `DataGrid` owns all state
 * (selection, editing, grouping, virtualisation range, validation) and passes
 * it down through these props. The body emits user intent back via the
 * `onCellEdit`, `onValidationError`, `onContextMenu`, `onGroupToggle`,
 * `onGroupChange`, `onRowNumberClick`, `onRowDrag*`, `onRowDrop` and
 * `onRowAdd` callbacks.
 *
 * Props are grouped by concern below; the non-trivial ones:
 *  - **Virtualization** — `rowRange` defines the currently-visible slice and
 *    `totalSize` the scroll spacer. `scrollRef` / `handleScroll` let the
 *    parent observe scroll events.
 *  - **Grouping** — `groupedView` is the pre-computed flat list of group
 *    header / aggregate / data rows. When non-null the grouped render path is
 *    taken (no virtualisation).
 *  - **Chrome columns** — `controlsConfig` and `rowNumberConfig` turn the
 *    respective pinned chrome columns on; their widths and click/drag hooks
 *    are supplied separately so the body can remain agnostic of how the
 *    owning grid wires row-selection and reordering behaviour.
 *  - **Ghost row** — `ghostRowConfig` may be a boolean or a config object and
 *    its `position` (top/bottom) is resolved via `resolveGhostPosition`.
 */
export interface DataGridBodyProps<TData extends Record<string, unknown>> {
  // Data
  processedData: TData[];
  rowIds: string[];
  orderedVisibleColumns: ColumnDef<TData>[];
  columnWidths: { width: number }[];
  totalWidth: number;
  rowHeight: number;

  // Virtualization
  rowRange: { startIndex: number; endIndex: number; totalSize: number };
  scrollRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;

  // State
  isSelected: (rowId: string, field: string) => boolean;
  /**
   * Returns the per-side border flags for a row-selection outline, or null
   * when the row is not fully selected. When non-null, the row container gets
   * an inset box-shadow for each active side and per-cell outlines are
   * suppressed so only one outline-level is visible.
   */
  getRowSelectionBorders?: (rowId: string) => RowOutlineSides | null;
  /**
   * Returns `true` when the cell is part of a multi-cell rectangular range.
   * Defaults to always-false if not supplied. Feeds the per-cell background
   * resolver in `renderCell`, which composes it with the chrome-column
   * presentation hooks (`getRowBackground` etc., issue #14) to paint the
   * range tint. The anchor cell keeps its outline via {@link isSelected}.
   */
  isInRange?: (rowId: string, field: string) => boolean;
  isEditingCell: (rowId: string, field: string) => boolean;
  getCellType: (column: ColumnDef<TData>, rowIndex: number) => CellType;
  getColumnFrozen: (col: ColumnDef<TData>) => 'left' | 'right' | null;
  computeFrozenLeftOffset: (colIdx: number) => number;

  // Editing
  cellRenderers?: Record<string, React.ComponentType<CellRendererProps<TData>>>;
  isReadOnly: boolean;
  model: GridModel<TData>;
  validateCell: (col: ColumnDef<TData>, value: CellValue, rowId: string) => ValidationResult | null;
  clearValidation: (rowId: string, field: string) => void;
  validationErrors: Record<string, ValidationResult | null>;
  onCellEdit?: (rowKey: string, field: string, value: CellValue, prev: CellValue) => void;
  onValidationError?: (cell: CellAddress, error: ValidationResult) => void;

  // Context menu
  onContextMenu: (e: React.MouseEvent, rowId: string | null, field: string | null) => void;

  // Grouping
  groupedView: any[] | null;
  rowGroupExpanded: Set<string>;
  onGroupToggle: (groupKey: string) => void;
  rowGroupConfig: RowGroupConfig | null;
  computedRowGroups: RowGroup[];
  onGroupChange?: (groupState: GroupState) => void;

  // Chrome columns
  controlsConfig?: ControlsColumnConfig | null;
  controlsWidth?: number;
  rowNumberConfig?: RowNumberColumnConfig | null;
  rowNumberWidth?: number;
  onRowNumberClick?: (rowId: string, shiftKey: boolean, metaKey: boolean) => void;
  onRowDragStart?: (rowId: string, rowIndex: number) => void;
  onRowDragOver?: (rowId: string, rowIndex: number) => void;
  onRowDrop?: (rowId: string, rowIndex: number) => void;

  // Selection mode governs how a data-cell click is interpreted. In `'row'`
  // mode, clicks on data cells (issue #15) are routed through
  // `onRowNumberClick` so the chrome column's row-selection handler is the
  // single source of truth for "select this row" — whether the click
  // originated in the row-number gutter or anywhere in the row body.
  selectionMode?: SelectionMode;

  // Chrome-level row presentation hooks (issue #14). Each is evaluated per
  // rendered row; returning nullish preserves the stock presentation.
  //
  // The resolver types are {@link ChromeRowResolver} — a union of the
  // positional `(row, rowId, rowIndex) => TResult` form and the named-object
  // `(ctx: ChromeRowResolverContext<TData>) => TResult` form. The body
  // dispatches at runtime via `fn.length` (declared arity).
  getRowBorder?: ChromeRowResolver<TData, RowBorderStyle | null | undefined>;
  getRowBackground?: ChromeRowResolver<TData, string | null | undefined>;
  getChromeCellContent?: ChromeRowResolver<TData, ChromeCellContent | null | undefined>;

  // Ghost row
  showGhostRow: boolean;
  ghostRowConfig?: boolean | GhostRowConfig<TData>;
  readOnly?: boolean;
  onRowAdd?: (data: Partial<TData>) => void;

  // Sub-grid expansion
  /**
   * Set of row ids whose sub-grid is currently expanded. For each id in this
   * set, the body renders an inline expansion row beneath the parent row
   * using `renderSubGridExpansionRow`. The depth is inferred from
   * `subGridDepth` (0 for the top-level grid) so nested grids can indent and
   * avoid re-entering themselves.
   */
  expandedSubGrids?: Set<string>;
  /**
   * Called for each expanded row to produce the React subtree rendered in
   * the expansion row. Returning `null` hides the expansion (useful when the
   * row has no sub-grid columns or the data is empty).
   */
  renderSubGridExpansionRow?: (rowId: string, row: TData) => React.ReactNode;
  /** Current nesting depth; 0 for the outer grid. */
  subGridDepth?: number;
  /**
   * Stable identifier of the owning grid, forwarded to cell renderers so they
   * can construct deterministic child-grid ARIA ids for `aria-controls` linkage.
   */
  gridId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataGridBody<TData extends Record<string, unknown>>(
  props: DataGridBodyProps<TData>,
) {
  const {
    processedData,
    rowIds,
    orderedVisibleColumns,
    columnWidths,
    totalWidth,
    rowHeight,
    rowRange,
    scrollRef,
    handleScroll,
    isSelected,
    getRowSelectionBorders,
    isInRange,
    isEditingCell,
    getCellType,
    getColumnFrozen,
    computeFrozenLeftOffset,
    cellRenderers,
    isReadOnly,
    model,
    validateCell,
    clearValidation,
    validationErrors,
    onCellEdit,
    onValidationError,
    onContextMenu,
    groupedView,
    rowGroupExpanded,
    onGroupToggle,
    rowGroupConfig,
    computedRowGroups,
    onGroupChange,
    controlsConfig,
    controlsWidth,
    rowNumberConfig,
    rowNumberWidth,
    onRowNumberClick,
    onRowDragStart,
    onRowDragOver,
    onRowDrop,
    getRowBorder,
    getRowBackground,
    getChromeCellContent,
    selectionMode,
    showGhostRow,
    ghostRowConfig,
    readOnly,
    onRowAdd,
    expandedSubGrids,
    renderSubGridExpansionRow,
    subGridDepth = 0,
    gridId,
  } = props;

  const ghostPosition = showGhostRow ? resolveGhostPosition(ghostRowConfig) : 'bottom';
  const ghostAtTop = ghostPosition === 'top' && showGhostRow;

  // ---------------------------------------------------------------------------
  // Chrome resolver memoization
  // ---------------------------------------------------------------------------
  //
  // Chrome resolvers (`getRowBackground`, `getRowBorder`, `getChromeCellContent`)
  // are invoked once per rendered row. For a 10k-row grid with an expensive
  // consumer resolver the per-render cost dominates; worse, every unrelated
  // parent re-render (e.g. a container-prop tweak) would normally re-invoke
  // every resolver even though the row data is unchanged.
  //
  // We guard against that with a WeakMap keyed by the row object. Two
  // invariants fall out for free:
  //
  //   * Correctness — when a consumer mutates a row they create a new row
  //     reference (immutable-style updates) or swap in a new object. The new
  //     reference is absent from the WeakMap, so the resolver is invoked and
  //     the fresh value is cached under the new key. Old entries are GC'd
  //     with the row.
  //   * Performance — re-rendering the body with the same `processedData`
  //     array and the same resolver identity hits the cache on every row.
  //
  // The inner `Map` is keyed by the resolver function itself so a consumer
  // that swaps the resolver (e.g. toggles the config) transparently
  // invalidates only its own slot without touching the other resolvers'
  // caches for the same row.
  //
  // `useRef` ensures the cache survives across renders; `.current` is never
  // reassigned, only mutated.
  //
  // Typing notes:
  //   * `TData extends Record<string, unknown>` at the component level, so
  //     a row reference is already a non-primitive object — it satisfies
  //     the `WeakMap` key constraint (`WeakKey`) without any cast.
  //   * The inner `Map`'s key is a chrome-resolver function. Resolvers have
  //     distinct signatures per slot (`getRowBackground` vs `getRowBorder`
  //     vs `getChromeCellContent`), and two calling conventions
  //     (positional / named-object — see {@link ChromeRowResolver}). We
  //     only use them as map identities so a plain `Function` alias is
  //     sufficient for cache storage.
  type ChromeResolverKey = Function;
  const resolverCacheRef = useRef<WeakMap<TData, Map<ChromeResolverKey, unknown>>>(new WeakMap());

  // -------------------------------------------------------------------------
  // Chrome-resolver dispatch (positional vs named-object)
  // -------------------------------------------------------------------------
  //
  // Per PR5, chrome resolvers accept either of two backward-compatible call
  // shapes — see {@link ChromeRowResolver}:
  //
  //   (row, rowId, rowIndex)        → positional (historical; unchanged)
  //   ({ row, rowId, rowIndex, … }) → named-object (self-documenting, new)
  //
  // We pick the shape by inspecting the resolver's declared first parameter:
  // the named-object form is triggered only when the resolver destructures
  // its first parameter as an object literal (`{…}` or `{…} = default`).
  //
  // The arity alone is not a reliable discriminator — historical consumers
  // routinely write `(row) => …` (a length-1 positional resolver that
  // simply ignores `rowId` and `rowIndex`), and a blind `fn.length === 1`
  // dispatch would silently pass them a context object and break. Looking
  // at the stringified function prefix tells positional `(row) => …`
  // apart from destructured `({ row }) => …` without false positives in
  // practice:
  //
  //   * `(row) => …`                  → positional
  //   * `function (row) { … }`        → positional
  //   * `({ row }) => …`              → named-object
  //   * `function ({ row }) { … }`    → named-object
  //   * `({ row } = {}) => …`         → named-object
  //   * `(...args) => …`              → positional (arity 0)
  //
  // For runtime-untyped callers (`(...args) => …`, whose `.length` is `0`)
  // we fall back to positional. This matches the compat matrix in the PR
  // description.
  //
  // The context object is constructed lazily (only for the named-object
  // branch) to keep the hot-path allocation count identical to the pre-PR5
  // shape for positional resolvers.
  const invokeChromeResolver = <TReturn,>(
    fn: ChromeRowResolver<TData, TReturn>,
    row: TData,
    rowId: string,
    rowIndex: number,
  ): TReturn => {
    if (isNamedObjectResolver(fn)) {
      const ctx: ChromeRowResolverContext<TData> = { row, rowId, rowIndex };
      return (fn as (ctx: ChromeRowResolverContext<TData>) => TReturn)(ctx);
    }
    return (fn as (row: TData, rowId: string, rowIndex: number) => TReturn)(
      row,
      rowId,
      rowIndex,
    );
  };

  const getCachedResolverResult = <TReturn,>(
    resolver: ChromeRowResolver<TData, TReturn> | undefined,
    row: TData,
    rowId: string,
    rowIndex: number,
  ): TReturn | undefined => {
    if (!resolver) return undefined;
    let byResolver = resolverCacheRef.current.get(row);
    if (!byResolver) {
      byResolver = new Map();
      resolverCacheRef.current.set(row, byResolver);
    }
    // The cache is keyed by resolver identity (the function object itself).
    if (byResolver.has(resolver)) {
      return byResolver.get(resolver) as TReturn;
    }
    const value = invokeChromeResolver(resolver, row, rowId, rowIndex);
    byResolver.set(resolver, value);
    return value;
  };

  // Issue #11: when Esc is pressed inside the fallback inline editor, the
  // unmount that follows `model.cancelEdit()` triggers a native `blur` event
  // that would otherwise commit the draft. This ref flips to `true` in the
  // Escape handler and is consulted by `onBlur` so the cancelled draft is
  // discarded. It lives at component scope so the closure captured by the
  // input survives the unmount.
  const inlineEditCancelledRef = useRef(false);

  // Row-number chrome column position.
  //
  // Defaults to 'left' to match the Excel 365 convention: row numbers sit to
  // the left of the data cells, immediately after the (optional) controls
  // column. Consumers that want the legacy layout (row numbers pinned at the
  // far right of the row) set `rowNumberConfig.position = 'right'`.
  //
  // Render order within a row is:
  //   position: 'left'  →  [controls] [row-number] [data cells...]
  //   position: 'right' →  [controls] [data cells...] [row-number]
  //
  // `rowNumberOnLeft` is cached here because both render paths (grouped and
  // non-grouped) branch on it twice per row and we want a single source of
  // truth.
  const rowNumberPosition: 'left' | 'right' = rowNumberConfig?.position ?? 'left';
  const rowNumberOnLeft = rowNumberPosition === 'left';

  // -------------------------------------------------------------------------
  // Render helper: row-number chrome cell (shared across both body paths)
  // -------------------------------------------------------------------------

  // Horizontal offset at which the row-number cell should be `position:
  // sticky` when rendered on the left. The row-number gutter must stay
  // visible during horizontal scroll (Excel-style) *and* must not overlap the
  // controls column when one is configured. The offset therefore is:
  //
  //   - `controlsWidth ?? 40`  when a controls column is active (the default
  //                            controls-column width is 40px), so the sticky
  //                            row-number cell is pinned immediately to the
  //                            right of the controls column.
  //   - `0`                    when no controls column is configured; the
  //                            row-number cell pins to the left edge.
  //   - `undefined`            when the row number is rendered on the right;
  //                            the cell does not need sticky-left positioning
  //                            in that case (the chrome cell omits the
  //                            sticky style when `stickyLeft` is undefined).
  const rowNumberStickyLeft = rowNumberOnLeft
    ? (controlsConfig ? (controlsWidth ?? 40) : 0)
    : undefined;

  // Render the row-number chrome cell for a given row.
  //
  // Factored into a helper so the grouped and non-grouped render paths can
  // share identical props/key/offset wiring and to keep the two call sites
  // (left-of-data and right-of-data) symmetrical. Returns null when the
  // caller hasn't opted into row numbers — both the config object and a
  // click handler are required before a cell is rendered, matching the
  // pre-refactor behaviour.
  //
  // The `key="__row-number__"` is stable across re-renders and distinct from
  // any column `field` value so React can reconcile this child independently
  // of the data-cell list whose keys are `col.field`.
  const renderRowNumberCell = (row: TData | undefined, rowId: string, rowIdx: number) => {
    if (!rowNumberConfig || !onRowNumberClick) return null;
    // Resolve optional per-row chrome-cell content override. Only invoked when
    // the consumer supplied a resolver; the row may be `undefined` during a
    // brief reconciliation window (e.g. a data swap), in which case we fall
    // back to the default digit rather than propagating `undefined` into user
    // code.
    const content = row !== undefined
      ? getCachedResolverResult(getChromeCellContent, row, rowId, rowIdx) ?? null
      : null;
    return (
      <ChromeRowNumberCell
        key="__row-number__"
        rowNumber={rowIdx + 1}
        rowId={rowId}
        width={rowNumberWidth ?? 50}
        height={rowHeight}
        reorderable={rowNumberConfig.reorderable !== false}
        stickyLeft={rowNumberStickyLeft}
        contentText={content?.text}
        contentIcon={content?.icon as React.ReactNode}
        onContentClick={content?.onClick}
        onSelect={onRowNumberClick}
        onDragStart={onRowDragStart}
        onDragOver={onRowDragOver}
        onDrop={onRowDrop}
      />
    );
  };

  // -------------------------------------------------------------------------
  // Find row by ID helper
  // -------------------------------------------------------------------------

  const findRowByRowId = (rowId: string): TData | undefined => {
    for (let i = 0; i < processedData.length; i++) {
      if ((rowIds[i] ?? String(i)) === rowId) return processedData[i];
    }
    return undefined;
  };

  // -------------------------------------------------------------------------
  // renderCell
  // -------------------------------------------------------------------------

  const renderCell = (
    col: ColumnDef<TData>,
    colIdx: number,
    row: TData,
    rowId: string,
    rowIdx: number,
    suppressSelectionOutline?: boolean,
  ) => {
    const width = columnWidths[colIdx]?.width ?? 150;
    const value = row[col.field as keyof TData] as CellValue;
    const editing = isEditingCell(rowId, col.field);
    const selected = isSelected(rowId, col.field);
    // Per-cell background resolution. The Shift+Arrow range tint (issue #16)
    // used to live inside the cell style factory as a hard-coded
    // `--dg-range-bg` override; it now flows through the same chrome-API
    // plumbing as consumer-supplied row backgrounds so the range visual is a
    // first-class consumer of the chrome presentation hooks (issue #14)
    // rather than a parallel CSS hack.
    //
    // Composition rule: the consumer's `getRowBackground` paints the row
    // container and shows through every non-tinted cell; the range tint is
    // applied at the cell layer *on top* using the `--dg-range-bg` token's
    // built-in alpha channel, so a consumer-authored row colour stays visible
    // underneath the range highlight rather than being replaced by it. The
    // frozen-column background is the one exception and wins over both (see
    // `styles.cell`).
    // When the row is fully covered by a row-kind selection we render a
    // single outline around the row and suppress the per-cell range tint —
    // otherwise every cell in the row repaints the blue tint and the
    // selection reads as "individual cells" rather than "one row block".
    const cellBackground =
      !suppressSelectionOutline && isInRange && isInRange(rowId, col.field)
        ? 'var(--dg-range-bg, rgba(59, 130, 246, 0.12))'
        : null;
    const cellType = getCellType(col, rowIdx);
    const cellAddr: CellAddress = { rowId, field: col.field };
    const CustomRenderer = cellRenderers?.[cellType];
    const vKey = getValidationKey(rowId, col.field);
    const cellError = validationErrors[vKey] ?? null;
    const hasError = cellError !== null && cellError.severity === 'error';
    const frozen = getColumnFrozen(col);

    // Click dispatch (issue #15):
    //
    // In `selectionMode === 'row'`, a click anywhere in a data cell must
    // select the entire row — the same behaviour the chrome row-number
    // gutter already provides on its own cell clicks. Rather than
    // maintaining a second code path for row selection, we fan every
    // row-level click through the same `onRowNumberClick` callback the
    // chrome column uses. That is the "one click path for 'select this
    // row'" the issue calls for: consumers (or the owning DataGrid) only
    // wire row-selection once and it handles every click source.
    //
    // For all other selection modes the pre-existing cell-level selection
    // contract is preserved verbatim — `model.select(cellAddr)` selects a
    // single cell and `onRowNumberClick`, when present, still runs
    // independently from chrome gutter clicks.
    const handleCellClick = (e: React.MouseEvent) => {
      // If a child element already handled the click (e.g. a custom renderer
      // that opens a popup), respect that and skip row/cell selection.
      if (e.defaultPrevented) return;
      if (selectionMode === 'row' && onRowNumberClick) {
        onRowNumberClick(rowId, e.shiftKey, e.metaKey || e.ctrlKey);
        return;
      }
      model.select(cellAddr);
    };

    return (
      <div
        key={col.field}
        style={styles.cell({
          width,
          height: rowHeight,
          selected,
          background: cellBackground,
          hasError,
          frozen,
          frozenLeftOffset: computeFrozenLeftOffset(colIdx),
          editable: col.editable !== false && !isReadOnly,
          suppressSelectionOutline,
        })}
        role="gridcell"
        aria-colindex={colIdx + 1}
        aria-selected={selected}
        aria-invalid={hasError || undefined}
        data-cell-type={cellType}
        data-field={col.field}
        data-row-id={rowId}
        title={hasError ? cellError!.message : undefined}
        onClick={handleCellClick}
        onContextMenu={(e) => onContextMenu(e, rowId, col.field)}
        onDoubleClick={() => {
          if (col.editable !== false && !readOnly) {
            model.beginEdit(cellAddr);
          }
        }}
      >
        {CustomRenderer ? (
          <CustomRenderer
            value={value}
            row={row}
            column={col}
            rowIndex={rowIdx}
            isEditing={editing}
            gridId={gridId}
            rowId={rowId}
            onCommit={v => {
              const vResult = validateCell(col, v, rowId);
              if (vResult && vResult.severity === 'error') {
                onValidationError?.(cellAddr, vResult);
                return;
              }
              clearValidation(rowId, col.field);
              model.setCellValue(cellAddr, v);
              model.cancelEdit();
              onCellEdit?.(rowId, col.field, v, value);
            }}
            onCancel={() => model.cancelEdit()}
          />
        ) : editing ? (
          <input
            autoFocus
            defaultValue={value != null ? String(value) : ''}
            style={styles.cellInput}
            ref={(el) => {
              // Clear the cancellation flag each time a new edit input
              // mounts, so a previous Esc doesn't silence the next commit.
              if (el) inlineEditCancelledRef.current = false;
            }}
            onBlur={e => {
              if (inlineEditCancelledRef.current) return;
              const newVal = e.target.value;
              const vResult = validateCell(col, newVal, rowId);
              if (vResult && vResult.severity === 'error') {
                onValidationError?.(cellAddr, vResult);
                model.cancelEdit();
                return;
              }
              clearValidation(rowId, col.field);
              model.setCellValue(cellAddr, newVal);
              model.cancelEdit();
              onCellEdit?.(rowId, col.field, newVal, value);
            }}
            onKeyDown={e => {
              // Issue #10: Enter AND Tab both commit the draft, exit edit
              // mode, and keep the current cell selected. preventDefault on
              // Tab suppresses the browser's native focus-advance behaviour;
              // the trailing stopPropagation stops the grid-level keyboard
              // handler from seeing the event (otherwise Enter would re-open
              // edit mode on the now-idle cell, and Tab would advance the
              // selection one column).
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const newVal = (e.target as HTMLInputElement).value;
                const vResult = validateCell(col, newVal, rowId);
                if (vResult && vResult.severity === 'error') {
                  onValidationError?.(cellAddr, vResult);
                  model.cancelEdit();
                  e.stopPropagation();
                  return;
                }
                clearValidation(rowId, col.field);
                model.setCellValue(cellAddr, newVal);
                model.cancelEdit();
                onCellEdit?.(rowId, col.field, newVal, value);
              } else if (e.key === 'Escape') {
                inlineEditCancelledRef.current = true;
                model.cancelEdit();
              }
              e.stopPropagation();
            }}
          />
        ) : (
          <span style={styles.cellValueText}>
            {renderCellValue(value, cellType)}
          </span>
        )}
        {hasError && (
          <span
            data-testid={`validation-error-${col.field}`}
            role="alert"
            style={styles.validationError}
          >
            {cellError!.message}
          </span>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Grouped body rendering
  // -------------------------------------------------------------------------

  const renderGroupedBody = () => {
    if (!groupedView) return null;

    return groupedView.map((item) => {
      if (item.type === 'group') {
        const group = item.group!;
        const isExpanded = rowGroupExpanded.has(group.key);
        return (
          <React.Fragment key={`group-${item.key}`}>
            <div
              data-testid="group-header-row"
              data-group-key={group.key}
              data-group-value={String(group.value)}
              data-group-depth={item.depth}
              role="row"
              style={styles.groupHeaderRow({ height: rowHeight, totalWidth, depth: item.depth })}
              onClick={() => {
                onGroupToggle(group.key);
                onGroupChange?.({ rowGroups: computedRowGroups, expandedGroups: rowGroupExpanded });
              }}
            >
              <span style={styles.groupExpandIcon}>{isExpanded ? '\u25BC' : '\u25B6'}</span>
              <span>{String(group.value)}</span>
              <span style={styles.groupCount}>({group.count})</span>
            </div>
            {/* Aggregate row */}
            {rowGroupConfig?.aggregates && isExpanded && (
              <div
                data-testid="group-aggregate-row"
                data-group-key={group.key}
                role="row"
                style={styles.groupAggregateRow(rowHeight, totalWidth)}
              >
                {orderedVisibleColumns.map((col, colIdx) => {
                  const w = columnWidths[colIdx]?.width ?? 150;
                  const aggValue = group.aggregates?.[col.field];
                  return (
                    <div
                      key={col.field}
                      style={styles.aggregateCell(w)}
                    >
                      {aggValue != null ? String(aggValue) : ''}
                    </div>
                  );
                })}
              </div>
            )}
          </React.Fragment>
        );
      } else {
        // Data row
        const rowId = item.key;
        const row = findRowByRowId(rowId);
        if (!row) return null;
        const rowIdx = rowIds.indexOf(rowId);
        const isExpanded = expandedSubGrids?.has(rowId) ?? false;

        // Resolve per-row presentation overrides for this data row. Results
        // are cached per-row-object via `getCachedResolverResult`, so an
        // unchanged `processedData` reference skips resolver work across
        // unrelated re-renders of the grid (e.g. container-prop tweaks).
        const rowBg = getCachedResolverResult(getRowBackground, row, rowId, rowIdx) ?? null;
        const rowBorder = getCachedResolverResult(getRowBorder, row, rowId, rowIdx) ?? null;
        const rowBorders = getRowSelectionBorders ? getRowSelectionBorders(rowId) : null;
        const rowIsFullySelected = rowBorders !== null;
        return (
          <React.Fragment key={rowId}>
            <div
              style={styles.dataRow({ height: rowHeight, totalWidth, isEven: rowIdx % 2 === 0, background: rowBg, border: rowBorder, borders: rowBorders })}
              role="row"
              aria-rowindex={rowIdx + 2}
              data-row-id={rowId}
              data-row-header="true"
              data-subgrid-expanded={isExpanded ? 'true' : undefined}
              onContextMenu={(e) => {
                if (e.target === e.currentTarget) {
                  onContextMenu(e, rowId, null);
                }
              }}
            >
              {controlsConfig && (
                <ChromeControlsCell
                  actions={controlsConfig.actions}
                  rowId={rowId}
                  rowIndex={rowIdx}
                  width={controlsWidth ?? 40}
                  height={rowHeight}
                />
              )}
              {rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
              {orderedVisibleColumns.map((col, colIdx) =>
                renderCell(col, colIdx, row, rowId, rowIdx, rowIsFullySelected)
              )}
              {!rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
            </div>
            {isExpanded && renderSubGridExpansionRow && (
              // The expansion row is a spanning row that holds a nested grid.
              // A bare role="grid" inside role="row" or role="grid" fails
              // aria-required-children. The fix is to wrap the nested grid
              // in a single role="gridcell" so the parent grid sees a valid
              // row→gridcell hierarchy, and the gridcell's content (the
              // nested grid) is opaque to the aria-required-children rule.
              <div
                role="row"
                data-testid={`subgrid-expansion-${rowId}`}
                data-subgrid-row-id={rowId}
                data-subgrid-depth={subGridDepth + 1}
                style={styles.subGridExpansionRow({
                  totalWidth,
                  depth: subGridDepth,
                })}
              >
                <div role="gridcell" style={styles.subGridExpansionInner}>
                  {renderSubGridExpansionRow(rowId, row)}
                </div>
              </div>
            )}
          </React.Fragment>
        );
      }
    });
  };

  // -------------------------------------------------------------------------
  // Sub-grid expansion detection
  // -------------------------------------------------------------------------
  const hasExpandedSubGrids = !!expandedSubGrids && expandedSubGrids.size > 0;

  // -------------------------------------------------------------------------
  // Non-grouped body rendering
  // -------------------------------------------------------------------------

  const renderNonGroupedBody = () => {
    if (processedData.length === 0) {
      return (
        <div style={styles.emptyState}>
          No data
        </div>
      );
    }

    // Always use the virtualised window for the row range. When sub-grids are
    // expanded we switch from absolute-positioning to in-flow layout within the
    // window (so expansion rows push subsequent rows down naturally) and prepend
    // a pixel-height spacer for the rows above the window. This preserves
    // virtualisation — only O(viewport) rows are ever in the DOM — while still
    // allowing variable-height expansion rows to flow correctly.
    const windowIndices = Array.from(
      { length: rowRange.endIndex - rowRange.startIndex + 1 },
      (_, i) => rowRange.startIndex + i,
    );

    // When rendering in flow layout (hasExpandedSubGrids), the rows are no
    // longer absolutely positioned. We need a top spacer to push the visible
    // window down to its correct scroll offset so the rows appear at the right
    // position within the oversized scroll container.
    const topSpacerHeight = hasExpandedSubGrids
      ? rowRange.startIndex * rowHeight + (ghostAtTop ? rowHeight : 0)
      : 0;

    const rowElements = windowIndices.map(rowIdx => {
      const row = processedData[rowIdx];
      if (!row) return null;
      const rowId = rowIds[rowIdx] ?? String(rowIdx);
      const isExpanded = expandedSubGrids?.has(rowId) ?? false;

      // Per-row presentation overrides (issue #14). Cached per-row-object via
      // `getCachedResolverResult` so unrelated re-renders reuse the prior
      // result; a fresh row reference (data swap) invalidates the cache slot.
      const rowBg = getCachedResolverResult(getRowBackground, row, rowId, rowIdx) ?? null;
      const rowBorder = getCachedResolverResult(getRowBorder, row, rowId, rowIdx) ?? null;
      const rowBorders = getRowSelectionBorders ? getRowSelectionBorders(rowId) : null;
      const rowIsFullySelected = rowBorders !== null;

      // When sub-grids are expanded use in-flow layout so the expansion row
      // naturally pushes subsequent rows downward. When no sub-grids are
      // expanded use absolute positioning (the original virtualised layout)
      // which is faster and avoids the reflow cost of a spacer element.
      const rowStyle = hasExpandedSubGrids
        ? styles.dataRow({ height: rowHeight, totalWidth, isEven: rowIdx % 2 === 0, background: rowBg, border: rowBorder, borders: rowBorders })
        : styles.virtualizedRow({
            height: rowHeight,
            totalWidth,
            top: rowIdx * rowHeight + (ghostAtTop ? rowHeight : 0),
            isEven: rowIdx % 2 === 0,
            background: rowBg,
            border: rowBorder,
            borders: rowBorders,
          });

      return (
        <React.Fragment key={rowId}>
          <div
            style={rowStyle}
            role="row"
            aria-rowindex={rowIdx + 2}
            data-row-id={rowId}
            data-row-header="true"
            data-subgrid-expanded={isExpanded ? 'true' : undefined}
            onContextMenu={(e) => {
              if (e.target === e.currentTarget) {
                onContextMenu(e, rowId, null);
              }
            }}
          >
            {controlsConfig && (
              <ChromeControlsCell
                actions={controlsConfig.actions}
                rowId={rowId}
                rowIndex={rowIdx}
                width={controlsWidth ?? 40}
                height={rowHeight}
              />
            )}
            {rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
            {orderedVisibleColumns.map((col, colIdx) =>
              renderCell(col, colIdx, row, rowId, rowIdx, rowIsFullySelected)
            )}
            {!rowNumberOnLeft && renderRowNumberCell(row, rowId, rowIdx)}
          </div>
          {isExpanded && renderSubGridExpansionRow && (
            // See companion branch above for rationale: the nested grid is
            // wrapped in a single role="gridcell" so the parent grid's
            // row→gridcell hierarchy stays valid under axe-core's
            // aria-required-children rule.
            <div
              role="row"
              data-testid={`subgrid-expansion-${rowId}`}
              data-subgrid-row-id={rowId}
              data-subgrid-depth={subGridDepth + 1}
              style={styles.subGridExpansionRow({
                totalWidth,
                depth: subGridDepth,
              })}
            >
              <div role="gridcell" style={styles.subGridExpansionInner}>
                {renderSubGridExpansionRow(rowId, row)}
              </div>
            </div>
          )}
        </React.Fragment>
      );
    });

    if (!hasExpandedSubGrids || topSpacerHeight === 0) {
      return rowElements;
    }

    // Return spacer + windowed rows as a flat array that React renders as a
    // fragment. The spacer reserves vertical space for the rows above the
    // current viewport window; the flow-layout rows then appear at the correct
    // scroll position without re-implementing absolute positioning math.
    return [
      <div
        key="__top-spacer__"
        aria-hidden="true"
        style={{ height: topSpacerHeight, flexShrink: 0 }}
      />,
      ...rowElements,
    ];
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={scrollRef}
      style={styles.scrollableBody}
      onScroll={handleScroll}
    >
      {rowGroupConfig && groupedView ? (
        <div style={styles.groupedBodyWrapper(totalWidth)}>
          {showGhostRow && ghostRowConfig && ghostPosition === 'top' && (
            <GhostRow
              columns={orderedVisibleColumns}
              columnWidths={columnWidths}
              rowHeight={rowHeight}
              topOffset={0}
              model={model as any}
              config={ghostRowConfig}
              readOnly={readOnly}
              onRowAdd={onRowAdd}
            />
          )}
          {renderGroupedBody()}
          {showGhostRow && ghostRowConfig && ghostPosition !== 'top' && (
            <GhostRow
              columns={orderedVisibleColumns}
              columnWidths={columnWidths}
              rowHeight={rowHeight}
              topOffset={0}
              model={model as any}
              config={ghostRowConfig}
              readOnly={readOnly}
              onRowAdd={onRowAdd}
            />
          )}
        </div>
      ) : (
        <div
          style={
            // Always use the virtualised wrapper so the scroll container has
            // the correct total height and the browser renders an accurate
            // scrollbar thumb. When sub-grids are expanded we switch to flow
            // layout inside the window (via a top spacer + in-flow rows) rather
            // than absolute positioning, but the outer container height is
            // unchanged so scrolling behaviour remains correct.
            styles.virtualizedBodyWrapper(
              rowRange.totalSize + (showGhostRow ? rowHeight : 0),
              totalWidth,
            )
          }
        >
          {renderNonGroupedBody()}
          {showGhostRow && ghostRowConfig && !hasExpandedSubGrids && (
            <GhostRow
              columns={orderedVisibleColumns}
              columnWidths={columnWidths}
              rowHeight={rowHeight}
              topOffset={ghostPosition === 'top' ? 0 : processedData.length * rowHeight}
              model={model as any}
              config={ghostRowConfig}
              readOnly={readOnly}
              onRowAdd={onRowAdd}
            />
          )}
        </div>
      )}
    </div>
  );
}
