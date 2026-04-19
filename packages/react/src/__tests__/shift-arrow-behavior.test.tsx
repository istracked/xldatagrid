/**
 * Tests for the `shiftArrowBehavior` config flag introduced for issues #12 and
 * #16. Covers both branches (`'scroll'` and `'rangeSelect'`) across all four
 * arrow directions, confirms the default is `'scroll'`, and verifies the
 * range-select branch populates every intermediate cell (fixing the
 * "only 2 cells selected" bug reported in #16).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGrid } from '../DataGrid';

type Row = { id: string; a: string; b: string; c: string; d: string };

function makeRows(): Row[] {
  return [
    { id: '1', a: 'a1', b: 'b1', c: 'c1', d: 'd1' },
    { id: '2', a: 'a2', b: 'b2', c: 'c2', d: 'd2' },
    { id: '3', a: 'a3', b: 'b3', c: 'c3', d: 'd3' },
    { id: '4', a: 'a4', b: 'b4', c: 'c4', d: 'd4' },
  ];
}

const columns = [
  { id: 'a', field: 'a' as const, title: 'A' },
  { id: 'b', field: 'b' as const, title: 'B' },
  { id: 'c', field: 'c' as const, title: 'C' },
  { id: 'd', field: 'd' as const, title: 'D' },
];

function renderGrid(overrides: Partial<Parameters<typeof DataGrid>[0]> = {}) {
  return render(
    <DataGrid
      data={makeRows()}
      columns={columns}
      rowKey="id"
      selectionMode="range"
      {...(overrides as any)}
    />,
  );
}

function getGrid() {
  return screen.getByRole('grid');
}

function getCell(rowId: string, field: string): HTMLElement {
  const cell = document.querySelector(
    `[data-row-id="${rowId}"][data-field="${field}"][role="gridcell"]`,
  );
  if (!cell) throw new Error(`Cell not found: ${rowId}/${field}`);
  return cell as HTMLElement;
}

function isOutlined(rowId: string, field: string): boolean {
  return getCell(rowId, field).style.outline.includes('2px solid');
}

// ---------------------------------------------------------------------------
// Branch A: 'scroll' (default)
// ---------------------------------------------------------------------------

describe('Shift+Arrow — scroll branch (default)', () => {
  it('is the default when shiftArrowBehavior is unset', () => {
    renderGrid();
    fireEvent.click(getCell('2', 'b'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });
    // Anchor unchanged; neighbour not selected.
    expect(isOutlined('2', 'b')).toBe(true);
    expect(isOutlined('2', 'c')).toBe(false);
  });

  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'] as const) {
    it(`Shift+${key} leaves the selection unchanged`, () => {
      renderGrid({ shiftArrowBehavior: 'scroll' });
      fireEvent.click(getCell('2', 'b'));
      const before = document.querySelectorAll('[role="gridcell"]').length;
      fireEvent.keyDown(getGrid(), { key, shiftKey: true });
      // Same cell remains outlined, no surrounding cell is pulled in.
      expect(isOutlined('2', 'b')).toBe(true);
      expect(isOutlined('1', 'b')).toBe(false);
      expect(isOutlined('3', 'b')).toBe(false);
      expect(isOutlined('2', 'a')).toBe(false);
      expect(isOutlined('2', 'c')).toBe(false);
      // Rendered DOM should not gain or lose cells.
      expect(document.querySelectorAll('[role="gridcell"]').length).toBe(before);
    });
  }

  it('invokes scrollBy on the scroll container for each direction', () => {
    renderGrid({ shiftArrowBehavior: 'scroll' });
    fireEvent.click(getCell('2', 'b'));

    // Locate the scrollable body (the element whose inline style uses overflow:auto).
    const scrollEl = Array.from(
      document.querySelectorAll<HTMLDivElement>('div'),
    ).find(d => d.style.overflow === 'auto');
    expect(scrollEl).toBeDefined();
    // Force a known viewport so scrollBy deltas are predictable.
    Object.defineProperty(scrollEl!, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(scrollEl!, 'clientHeight', { value: 300, configurable: true });

    const calls: Array<{ left?: number; top?: number }> = [];
    scrollEl!.scrollBy = ((opts: { left?: number; top?: number }) => {
      calls.push({ left: opts.left, top: opts.top });
    }) as typeof scrollEl.scrollBy;

    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp', shiftKey: true });

    expect(calls).toHaveLength(4);
    // Right: +half width, no vertical delta.
    expect(calls[0]).toEqual({ left: 200, top: 0 });
    // Left: -half width, no vertical delta.
    expect(calls[1]).toEqual({ left: -200, top: 0 });
    // Down: no horizontal delta, +half height.
    expect(calls[2]).toEqual({ left: 0, top: 150 });
    // Up: no horizontal delta, -half height.
    expect(calls[3]).toEqual({ left: 0, top: -150 });
  });
});

// ---------------------------------------------------------------------------
// Branch B: 'rangeSelect'
// ---------------------------------------------------------------------------

describe('Shift+Arrow — rangeSelect branch', () => {
  it('Shift+ArrowRight grows the range by one column (fixes #16)', () => {
    renderGrid({ shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('2', 'b'));

    // Step twice to verify intermediate cells are included (the bug reported
    // "only 2 cells selected" after multiple keystrokes — all cells in the
    // rectangle should be selected, not just anchor and focus).
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });

    // Anchor + two right-neighbours are all part of the range.
    expect(isOutlined('2', 'b')).toBe(true);
    expect(isOutlined('2', 'c')).toBe(true);
    expect(isOutlined('2', 'd')).toBe(true);
    // Cells outside the range are untouched.
    expect(isOutlined('2', 'a')).toBe(false);
    expect(isOutlined('1', 'b')).toBe(false);
  });

  it('Shift+ArrowLeft grows the range by one column', () => {
    renderGrid({ shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('2', 'c'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowLeft', shiftKey: true });

    expect(isOutlined('2', 'c')).toBe(true);
    expect(isOutlined('2', 'b')).toBe(true);
    expect(isOutlined('2', 'a')).toBe(true);
    expect(isOutlined('2', 'd')).toBe(false);
  });

  it('Shift+ArrowDown grows the range by one row', () => {
    renderGrid({ shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('1', 'b'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });

    expect(isOutlined('1', 'b')).toBe(true);
    expect(isOutlined('2', 'b')).toBe(true);
    expect(isOutlined('3', 'b')).toBe(true);
    expect(isOutlined('4', 'b')).toBe(false);
  });

  it('Shift+ArrowUp grows the range by one row', () => {
    renderGrid({ shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('3', 'b'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowUp', shiftKey: true });

    expect(isOutlined('3', 'b')).toBe(true);
    expect(isOutlined('2', 'b')).toBe(true);
    expect(isOutlined('1', 'b')).toBe(true);
    expect(isOutlined('4', 'b')).toBe(false);
  });

  it('preserves the anchor when changing direction', () => {
    renderGrid({ shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('2', 'b'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(getGrid(), { key: 'ArrowDown', shiftKey: true });

    // Rectangle from anchor (2,b) to focus (3,c). All four cells are selected.
    expect(isOutlined('2', 'b')).toBe(true);
    expect(isOutlined('2', 'c')).toBe(true);
    expect(isOutlined('3', 'b')).toBe(true);
    expect(isOutlined('3', 'c')).toBe(true);
    // Cells outside the rectangle are not selected.
    expect(isOutlined('1', 'b')).toBe(false);
    expect(isOutlined('2', 'a')).toBe(false);
    expect(isOutlined('4', 'c')).toBe(false);
  });

  it('does not override Ctrl+Arrow (Ctrl+Arrow jumps instead of extending)', () => {
    renderGrid({ shiftArrowBehavior: 'rangeSelect' });
    fireEvent.click(getCell('1', 'a'));
    fireEvent.keyDown(getGrid(), { key: 'ArrowRight', ctrlKey: true });
    // Ctrl+Arrow should still jump to the edge cell, not extend selection.
    expect(isOutlined('1', 'd')).toBe(true);
    expect(isOutlined('1', 'a')).toBe(false);
  });
});
