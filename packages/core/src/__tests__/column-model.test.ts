import {
  createColumnState,
  getVisibleColumns,
  getColumnWidth,
  resizeColumn,
  reorderColumn,
  toggleColumnVisibility,
  freezeColumn,
  isColumnFrozen,
  getOrderedColumnWidths,
} from '../column-model';
import { ColumnDef } from '../types';

function makeColumns(fields: string[], overrides: Partial<ColumnDef>[] = []): ColumnDef[] {
  return fields.map((field, i) => ({
    id: field,
    field,
    title: field.toUpperCase(),
    ...overrides[i],
  }));
}

describe('createColumnState', () => {
  it('initializes order from columns', () => {
    const columns = makeColumns(['name', 'age', 'email']);
    const state = createColumnState(columns);
    expect(state.order).toEqual(['name', 'age', 'email']);
  });

  it('initializes widths from column defs', () => {
    const columns = makeColumns(['name', 'age'], [{ width: 200 }, { width: 80 }]);
    const state = createColumnState(columns);
    expect(state.widths['name']).toBe(200);
    expect(state.widths['age']).toBe(80);
  });

  it('uses default width 150 when not specified', () => {
    const columns = makeColumns(['name']);
    const state = createColumnState(columns);
    expect(state.widths['name']).toBe(150);
  });

  it('initializes hidden as an empty set', () => {
    const columns = makeColumns(['name', 'age']);
    const state = createColumnState(columns);
    expect(state.hidden.size).toBe(0);
  });

  it('initializes frozen columns from column defs', () => {
    const columns = makeColumns(['name', 'age', 'email'], [{ frozen: 'left' }, {}, {}]);
    const state = createColumnState(columns);
    expect(state.frozen).toContain('name');
    expect(state.frozen).not.toContain('age');
  });
});

describe('getVisibleColumns', () => {
  it('returns columns in order', () => {
    const columns = makeColumns(['name', 'age', 'email']);
    const state = createColumnState(columns);
    const visible = getVisibleColumns(state);
    expect(visible.map(c => c.field)).toEqual(['name', 'age', 'email']);
  });

  it('excludes hidden columns', () => {
    const columns = makeColumns(['name', 'age', 'email']);
    const state = toggleColumnVisibility(createColumnState(columns), 'age');
    const visible = getVisibleColumns(state);
    expect(visible.map(c => c.field)).toEqual(['name', 'email']);
  });
});

describe('resizeColumn', () => {
  it('updates width', () => {
    const state = createColumnState(makeColumns(['name'], [{ width: 100 }]));
    const next = resizeColumn(state, 'name', 250);
    expect(next.widths['name']).toBe(250);
  });

  it('clamps to minWidth', () => {
    const state = createColumnState(makeColumns(['name'], [{ width: 100, minWidth: 80 }]));
    const next = resizeColumn(state, 'name', 20);
    expect(next.widths['name']).toBe(80);
  });

  it('clamps to maxWidth', () => {
    const state = createColumnState(makeColumns(['name'], [{ width: 100, maxWidth: 300 }]));
    const next = resizeColumn(state, 'name', 500);
    expect(next.widths['name']).toBe(300);
  });

  it('does not mutate original state', () => {
    const state = createColumnState(makeColumns(['name'], [{ width: 100 }]));
    resizeColumn(state, 'name', 250);
    expect(state.widths['name']).toBe(100);
  });
});

describe('reorderColumn', () => {
  it('moves column to new position', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c']));
    const next = reorderColumn(state, 'c', 0);
    expect(next.order).toEqual(['c', 'a', 'b']);
  });

  it('from start to end', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c']));
    const next = reorderColumn(state, 'a', 2);
    expect(next.order).toEqual(['b', 'c', 'a']);
  });

  it('from end to start', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c']));
    const next = reorderColumn(state, 'c', 0);
    expect(next.order).toEqual(['c', 'a', 'b']);
  });

  it('no-op for unknown field', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c']));
    const next = reorderColumn(state, 'z', 0);
    expect(next.order).toEqual(['a', 'b', 'c']);
    expect(next).toBe(state); // same reference returned
  });

  it('does not mutate original state', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c']));
    reorderColumn(state, 'b', 0);
    expect(state.order).toEqual(['a', 'b', 'c']);
  });
});

describe('toggleColumnVisibility', () => {
  it('hides column', () => {
    const state = createColumnState(makeColumns(['name', 'age']));
    const next = toggleColumnVisibility(state, 'age');
    expect(next.hidden.has('age')).toBe(true);
  });

  it('shows hidden column', () => {
    const state = createColumnState(makeColumns(['name', 'age']));
    const hidden = toggleColumnVisibility(state, 'age');
    const shown = toggleColumnVisibility(hidden, 'age');
    expect(shown.hidden.has('age')).toBe(false);
  });

  it('round-trip toggle returns to original visibility', () => {
    const state = createColumnState(makeColumns(['name', 'age']));
    const toggled = toggleColumnVisibility(toggleColumnVisibility(state, 'name'), 'name');
    expect(toggled.hidden.has('name')).toBe(false);
  });

  it('does not mutate original state', () => {
    const state = createColumnState(makeColumns(['name', 'age']));
    toggleColumnVisibility(state, 'age');
    expect(state.hidden.has('age')).toBe(false);
  });
});

describe('freezeColumn', () => {
  it('adds to frozen list on left', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c']));
    const next = freezeColumn(state, 'b', 'left');
    expect(next.frozen).toContain('b');
    expect(next.frozen[0]).toBe('b');
  });

  it('adds to frozen list on right', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c']));
    const next = freezeColumn(state, 'b', 'right');
    expect(next.frozen[next.frozen.length - 1]).toBe('b');
  });

  it('removes from frozen on null', () => {
    const state = createColumnState(makeColumns(['a', 'b', 'c'], [{ frozen: 'left' }, {}, {}]));
    const next = freezeColumn(state, 'a', null);
    expect(next.frozen).not.toContain('a');
  });

  it('does not mutate original state', () => {
    const state = createColumnState(makeColumns(['a', 'b']));
    freezeColumn(state, 'a', 'left');
    expect(state.frozen).not.toContain('a');
  });
});

describe('isColumnFrozen', () => {
  it('returns true for frozen column', () => {
    const state = createColumnState(makeColumns(['a', 'b'], [{ frozen: 'left' }, {}]));
    expect(isColumnFrozen(state, 'a')).toBe(true);
  });

  it('returns false for unfrozen column', () => {
    const state = createColumnState(makeColumns(['a', 'b'], [{ frozen: 'left' }, {}]));
    expect(isColumnFrozen(state, 'b')).toBe(false);
  });
});

describe('getOrderedColumnWidths', () => {
  it('returns visible columns with widths', () => {
    const columns = makeColumns(['a', 'b', 'c'], [{ width: 100 }, { width: 200 }, { width: 150 }]);
    const state = createColumnState(columns);
    const widths = getOrderedColumnWidths(state);
    expect(widths).toEqual([
      { field: 'a', width: 100 },
      { field: 'b', width: 200 },
      { field: 'c', width: 150 },
    ]);
  });

  it('excludes hidden columns', () => {
    const columns = makeColumns(['a', 'b', 'c'], [{ width: 100 }, { width: 200 }, { width: 150 }]);
    const state = toggleColumnVisibility(createColumnState(columns), 'b');
    const widths = getOrderedColumnWidths(state);
    expect(widths.map(w => w.field)).toEqual(['a', 'c']);
  });
});

describe('getColumnWidth', () => {
  it('returns configured width', () => {
    const state = createColumnState(makeColumns(['name'], [{ width: 250 }]));
    expect(getColumnWidth(state, 'name')).toBe(250);
  });

  it('returns default 150 for unconfigured field', () => {
    const state = createColumnState(makeColumns(['name']));
    expect(getColumnWidth(state, 'ghost')).toBe(150);
  });
});
