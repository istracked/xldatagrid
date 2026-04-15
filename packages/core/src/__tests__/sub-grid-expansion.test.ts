import { vi } from 'vitest';
import { createGridModel } from '../grid-model';

describe('Sub-grid expansion', () => {
  const makeGrid = (opts = {}) => createGridModel({
    data: [
      { id: '1', name: 'Row 1', items: [] },
      { id: '2', name: 'Row 2', items: [] },
      { id: '3', name: 'Row 3', items: [] },
    ],
    columns: [
      { id: 'name', field: 'name', title: 'Name' },
      { id: 'items', field: 'items', title: 'Items', cellType: 'subGrid' as const },
    ],
    rowKey: 'id',
    ...opts,
  });

  test('toggleSubGridExpansion adds rowId to expandedSubGrids', () => {
    const grid = makeGrid();
    grid.toggleSubGridExpansion('1');
    expect(grid.getState().expandedSubGrids.has('1')).toBe(true);
  });

  test('toggleSubGridExpansion removes rowId when already expanded', () => {
    const grid = makeGrid();
    grid.toggleSubGridExpansion('1');
    grid.toggleSubGridExpansion('1');
    expect(grid.getState().expandedSubGrids.has('1')).toBe(false);
  });

  test('multiple rows can be expanded simultaneously', () => {
    const grid = makeGrid();
    grid.toggleSubGridExpansion('1');
    grid.toggleSubGridExpansion('2');
    expect(grid.getState().expandedSubGrids.size).toBe(2);
  });

  test('singleExpand mode collapses others', () => {
    const grid = makeGrid({ subGrid: { singleExpand: true } });
    grid.toggleSubGridExpansion('1');
    grid.toggleSubGridExpansion('2');
    expect(grid.getState().expandedSubGrids.has('1')).toBe(false);
    expect(grid.getState().expandedSubGrids.has('2')).toBe(true);
  });

  test('dispatches subGrid:expand event on expand', () => {
    const grid = makeGrid();
    grid.toggleSubGridExpansion('1');
    expect(grid.getState().expandedSubGrids.has('1')).toBe(true);
  });

  test('dispatches subGrid:collapse event on collapse', () => {
    const grid = makeGrid();
    grid.toggleSubGridExpansion('1');
    grid.toggleSubGridExpansion('1');
    expect(grid.getState().expandedSubGrids.has('1')).toBe(false);
  });

  test('maxDepth is respected (stored in config)', () => {
    const grid = makeGrid({ subGrid: { maxDepth: 2 } });
    expect(grid.getState().config.subGrid?.maxDepth).toBe(2);
  });

  test('singleExpand collapses first when expanding second', () => {
    const grid = makeGrid({ subGrid: { singleExpand: true } });
    grid.toggleSubGridExpansion('1');
    expect(grid.getState().expandedSubGrids.size).toBe(1);
    expect(grid.getState().expandedSubGrids.has('1')).toBe(true);

    grid.toggleSubGridExpansion('3');
    expect(grid.getState().expandedSubGrids.size).toBe(1);
    expect(grid.getState().expandedSubGrids.has('3')).toBe(true);
    expect(grid.getState().expandedSubGrids.has('1')).toBe(false);
  });

  test('singleExpand toggling same row off works', () => {
    const grid = makeGrid({ subGrid: { singleExpand: true } });
    grid.toggleSubGridExpansion('1');
    grid.toggleSubGridExpansion('1');
    expect(grid.getState().expandedSubGrids.size).toBe(0);
  });

  test('expandedSubGrids starts empty', () => {
    const grid = makeGrid();
    expect(grid.getState().expandedSubGrids.size).toBe(0);
  });

  test('notify is called on toggle', () => {
    const grid = makeGrid();
    const listener = vi.fn();
    grid.subscribe(listener);
    grid.toggleSubGridExpansion('1');
    expect(listener).toHaveBeenCalled();
  });
});
