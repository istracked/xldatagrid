/**
 * Keyboard navigation and editing hook for the datagrid.
 *
 * Attaches a native `keydown` listener to a container element and translates
 * keyboard events into {@link GridModel} mutations -- cell navigation,
 * selection extension, editing lifecycle, undo/redo, and boolean toggling.
 * Supports standard spreadsheet-like key bindings including arrow keys with
 * Shift (extend selection), Ctrl/Cmd (jump to edge), Tab (move within row),
 * Enter (commit edit / begin edit), Escape (cancel), Home/End, F2, Delete,
 * Ctrl+A, and Ctrl+Z/Y.
 *
 * @module use-keyboard
 */
import { useEffect, useCallback } from 'react';
import {
  GridModel,
  CellAddress,
  getNextCell,
  getFirstCell,
  getLastCell,
  getNextCellInRow,
  getPrevCellInRow,
  ColumnDef,
  serializeRangeToText,
  parseTextToGrid,
} from '@istracked/datagrid-core';

/**
 * Binds keyboard navigation and editing shortcuts to a grid container element.
 *
 * The hook reads the current selection, editing, column, and row state from
 * the model on every key press, then dispatches the appropriate model mutation
 * (navigate, select, edit, undo, etc.). A native DOM event listener is used
 * (rather than a React `onKeyDown` prop) so that the grid container can
 * capture keyboard events regardless of which internal element has focus.
 *
 * @typeParam TData - Row data shape; must be a string-keyed record.
 *
 * @param model - The {@link GridModel} instance to mutate in response to
 *   keyboard events.
 * @param containerRef - React ref pointing to the grid's root `<div>`. The
 *   `keydown` listener is attached to this element.
 * @param enabled - When `false`, all keyboard handling is skipped. Defaults
 *   to `true`.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * useKeyboard(model, containerRef);
 * return <div ref={containerRef} tabIndex={0}>...</div>;
 * ```
 */
export function useKeyboard<TData extends Record<string, unknown>>(
  model: GridModel<TData>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Events originating inside a nested grid (sub-grid) must not be handled
    // here. Each nested DataGrid instance attaches its own keydown listener
    // on its own container ref; when the user focuses a cell inside a
    // sub-grid the nested listener fires first and calls `stopPropagation`
    // on handled events (see end of this switch). However native `keydown`
    // events without an explicit stop still bubble — we guard by checking
    // that the event target (or the closest descendant focus target) lives
    // inside another `[role="grid"]` subtree that is not our container.
    const container = containerRef.current;
    if (container && e.target instanceof Element) {
      const closestGrid = e.target.closest('[role="grid"]');
      if (closestGrid && closestGrid !== container) {
        // Event originated inside a nested grid — defer to its listener.
        return;
      }
    }

    // Snapshot the current model state needed for navigation decisions.
    const state = model.getState();
    const selection = state.selection.range;
    const editing = state.editing;
    const columns = model.getVisibleColumns() as ColumnDef[];
    const rowIds = model.getRowIds();

    // Determine the "current" cell: prefer the cell being edited, then the
    // selection anchor. Most key handlers are no-ops without a current cell.
    const current: CellAddress | null = editing.cell ?? selection?.anchor ?? null;
    if (!current && !['Tab'].includes(e.key)) return;

    // ---------------------------------------------------------------------
    // Sub-grid keyboard transitions
    // ---------------------------------------------------------------------
    //
    // Enter on a selected sub-grid cell expands the nested grid and
    // transfers focus into it (if the row has a sub-grid column). This
    // overrides the default "begin edit" behaviour, which is inappropriate
    // for sub-grid cells since they are not editable as scalars.
    //
    // Escape in a nested grid (when nothing is selected inside) collapses
    // the expansion back and returns focus to the parent grid container.
    // That arm is implemented in the outer container's listener — since
    // `useKeyboard` runs per grid level, each listener handles its own
    // side of the transition.

    if (e.key === 'Enter' && current && !editing.cell) {
      const col = columns.find(c => c.field === current.field);
      if (col?.cellType === 'subGrid') {
        e.preventDefault();
        e.stopPropagation();
        const expanded = state.expandedSubGrids.has(current.rowId);
        if (!expanded) {
          model.toggleSubGridExpansion(current.rowId);
        }
        // Focus the nested grid after the expansion row mounts. We look up
        // the expansion row via the `data-testid` attribute written by the
        // body renderer; that's a stable contract between layers.
        requestAnimationFrame(() => {
          if (!container) return;
          const nested = container.querySelector<HTMLElement>(
            `[data-testid="subgrid-expansion-${CSS.escape(current.rowId)}"] [role="grid"]`,
          );
          nested?.focus();
        });
        return;
      }
    }

    // Escape-to-exit a sub-grid: if we're a nested grid and the user presses
    // Escape while nothing is being edited, return focus to the nearest
    // outer grid. This path is triggered by noting that our container has
    // an ancestor `[role="grid"]` that isn't us.
    if (e.key === 'Escape' && !editing.cell && container) {
      const outerGrid = container.parentElement?.closest('[role="grid"]');
      if (outerGrid && outerGrid !== container) {
        e.preventDefault();
        e.stopPropagation();
        model.clearSelectionState();
        (outerGrid as HTMLElement).focus();
        return;
      }
    }

    switch (e.key) {
      // --- Tab: commit any active edit, then move horizontally within the row ---
      case 'Tab': {
        if (editing.cell) model.commitEdit();
        if (!current) {
          e.preventDefault();
          const first = getFirstCell(columns, rowIds);
          if (first) model.select(first);
          return;
        }
        const next = e.shiftKey
          ? getPrevCellInRow(current, columns, rowIds)
          : getNextCellInRow(current, columns, rowIds);
        if (next) {
          e.preventDefault();
          model.select(next);
        }
        break;
      }
      // --- Enter: toggle between editing and navigation ---
      case 'Enter': {
        e.preventDefault();
        if (editing.cell && current) {
          // Commit the current edit and advance vertically.
          model.commitEdit();
          const next = e.shiftKey
            ? getNextCell(current, 'up', columns, rowIds)
            : getNextCell(current, 'down', columns, rowIds);
          if (next) model.select(next);
        } else if (current) {
          // Begin editing the currently selected cell.
          model.beginEdit(current);
        }
        break;
      }
      // --- Escape: cancel edit or clear selection ---
      case 'Escape': {
        if (editing.cell) {
          model.cancelEdit();
        } else {
          model.clearSelectionState();
        }
        break;
      }
      // --- Arrow keys: navigate, extend selection, or jump to edge ---
      case 'ArrowRight':
      case 'ArrowLeft':
      case 'ArrowDown':
      case 'ArrowUp': {
        // Don't navigate while editing
        if (editing.cell) return;
        e.preventDefault();
        if (!current) return;

        // Map the key name to a cardinal direction string.
        const dir =
          e.key === 'ArrowRight' ? 'right' :
          e.key === 'ArrowLeft' ? 'left' :
          e.key === 'ArrowDown' ? 'down' : 'up';

        if (e.shiftKey) {
          // Shift+Arrow extends the selection range to the adjacent cell.
          const target = getNextCell(current, dir, columns, rowIds);
          if (target) model.extendTo(target);
        } else if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd+Arrow jumps to the edge of the grid in that direction.
          if (dir === 'right' || dir === 'left') {
            const edge = dir === 'right'
              ? getLastCell(columns, rowIds)
              : getFirstCell(columns, rowIds);
            if (edge) model.select({ rowId: current.rowId, field: edge.field });
          } else {
            const edge = dir === 'down'
              ? getLastCell(columns, rowIds)
              : getFirstCell(columns, rowIds);
            if (edge) model.select({ rowId: edge.rowId, field: current.field });
          }
        } else {
          // Plain arrow key moves selection by one cell.
          const next = getNextCell(current, dir, columns, rowIds);
          if (next) model.select(next);
        }
        break;
      }
      // --- Home: jump to the first column, or Ctrl+Home to the first cell ---
      case 'Home': {
        e.preventDefault();
        if (!current) return;
        if (e.ctrlKey || e.metaKey) {
          // Jump to the very first cell in the grid (top-left).
          const first = getFirstCell(columns, rowIds);
          if (first) model.select(first);
        } else {
          // Jump to the first column in the current row.
          const firstCol = columns[0];
          if (firstCol) model.select({ rowId: current.rowId, field: firstCol.field });
        }
        break;
      }
      // --- End: jump to the last column, or Ctrl+End to the last cell ---
      case 'End': {
        e.preventDefault();
        if (!current) return;
        if (e.ctrlKey || e.metaKey) {
          // Jump to the very last cell in the grid (bottom-right).
          const last = getLastCell(columns, rowIds);
          if (last) model.select(last);
        } else {
          // Jump to the last column in the current row.
          const lastCol = columns[columns.length - 1];
          if (lastCol) model.select({ rowId: current.rowId, field: lastCol.field });
        }
        break;
      }
      // --- F2: enter edit mode on the selected cell ---
      case 'F2': {
        if (current && !editing.cell) {
          model.beginEdit(current);
        }
        break;
      }
      // --- Space: toggle boolean cells ---
      case ' ': {
        if (current && !editing.cell) {
          // Only toggle if the column is explicitly typed as boolean.
          const col = columns.find(c => c.field === current.field);
          if (col?.cellType === 'boolean') {
            const allRowIds = model.getRowIds();
            const rowIndex = allRowIds.indexOf(current.rowId);
            if (rowIndex >= 0) {
              const currentVal = model.getProcessedData()[rowIndex]?.[current.field as keyof TData];
              model.setCellValue(current, !currentVal);
            }
          }
        }
        break;
      }
      // --- Delete: clear the selected cell's value ---
      case 'Delete': {
        if (current && !editing.cell) {
          model.setCellValue(current, null);
        }
        break;
      }
      // --- Ctrl+A: select all cells ---
      case 'a': {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          model.selectAllCells();
        }
        break;
      }
      // --- Ctrl+Z / Ctrl+Shift+Z: undo / redo ---
      case 'z': {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.shiftKey) {
            model.redo();
          } else {
            model.undo();
          }
        }
        break;
      }
      // --- Ctrl+Y: redo (alternative binding) ---
      case 'y': {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          model.redo();
        }
        break;
      }
      case 'c': {
        if ((e.ctrlKey || e.metaKey) && selection && !editing.cell) {
          e.preventDefault();
          const text = serializeRangeToText(
            model.getProcessedData(),
            selection,
            columns,
            rowIds
          );
          navigator.clipboard?.writeText(text);
        }
        break;
      }
      case 'x': {
        if ((e.ctrlKey || e.metaKey) && selection && !editing.cell) {
          e.preventDefault();
          const text = serializeRangeToText(
            model.getProcessedData(),
            selection,
            columns,
            rowIds
          );
          navigator.clipboard?.writeText(text);
          const { rows, cols } = resolveRangeIndices(selection, columns, rowIds);
          for (const rowId of rows) {
            for (const field of cols) {
              model.setCellValue({ rowId, field }, null);
            }
          }
        }
        break;
      }
      case 'v': {
        if ((e.ctrlKey || e.metaKey) && current && !editing.cell) {
          e.preventDefault();
          navigator.clipboard?.readText().then(text => {
            const grid = parseTextToGrid(text);
            const colIndex = columns.findIndex(c => c.field === current.field);
            const rowIndex = rowIds.indexOf(current.rowId);
            for (let r = 0; r < grid.length; r++) {
              const targetRowId = rowIds[rowIndex + r];
              if (!targetRowId) break;
              const row = grid[r];
              if (!row) continue;
              for (let c = 0; c < row.length; c++) {
                const targetCol = columns[colIndex + c];
                if (!targetCol) break;
                model.setCellValue(
                  { rowId: targetRowId, field: targetCol.field },
                  row[c]
                );
              }
            }
          });
        }
        break;
      }
    }

    // Note: we deliberately do NOT call e.stopPropagation() on handled keys
    // even though it would provide a clean Tab-boundary between nested grids.
    // The React 19 event system delegates all synthetic events through the
    // root, so stopping native propagation here also silences React's
    // `onKeyDown`/`onBlur` handlers on inner elements (notably the inline
    // editor `<input>`s), breaking commit/cancel and validation flows.
    //
    // The Tab-boundary guarantee is instead provided by the early-return
    // check at the top of this handler: when an event originates inside a
    // nested grid (`closest('[role="grid"]') !== containerRef.current`), the
    // outer container's listener exits before doing anything, so there is no
    // duplicate navigation. Each nested grid still updates its own model's
    // selection in response to Tab/Shift-Tab; that update cannot bubble
    // "through" the DOM because the model is an independent instance.
  }, [model, enabled, containerRef]);

  // useEffect is necessary here because we need to imperatively attach/detach a
  // native DOM event listener on the container element after it mounts.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, handleKeyDown]);
}

function resolveRangeIndices(
  range: { anchor: CellAddress; focus: CellAddress },
  columns: ColumnDef[],
  rowIds: string[]
): { rows: string[]; cols: string[] } {
  const colFields = columns.map(c => c.field);
  const anchorCol = colFields.indexOf(range.anchor.field);
  const focusCol = colFields.indexOf(range.focus.field);
  const minCol = Math.min(anchorCol, focusCol);
  const maxCol = Math.max(anchorCol, focusCol);
  const anchorRow = rowIds.indexOf(range.anchor.rowId);
  const focusRow = rowIds.indexOf(range.focus.rowId);
  const minRow = Math.min(anchorRow, focusRow);
  const maxRow = Math.max(anchorRow, focusRow);
  return {
    rows: rowIds.slice(minRow, maxRow + 1),
    cols: colFields.slice(minCol, maxCol + 1),
  };
}
