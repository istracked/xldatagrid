import {
  createGroupState,
  groupRows,
  toggleGroupExpansion,
  expandAllGroups,
  collapseAllGroups,
  isGroupExpanded,
  getVisibleRowsWithGroups,
} from '../grouping';
import { GroupState, RowGroup } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const people = [
  { id: 'r1', dept: 'engineering', level: 2, salary: 90 },
  { id: 'r2', dept: 'design', level: 1, salary: 70 },
  { id: 'r3', dept: 'engineering', level: 1, salary: 80 },
  { id: 'r4', dept: 'design', level: 2, salary: 60 },
] as Record<string, unknown>[];

const rowIds = ['r1', 'r2', 'r3', 'r4'];

// ---------------------------------------------------------------------------
// createGroupState
// ---------------------------------------------------------------------------

describe('createGroupState', () => {
  it('starts with empty rowGroups and expandedGroups', () => {
    const state = createGroupState();
    expect(state.rowGroups).toEqual([]);
    expect(state.expandedGroups.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// groupRows
// ---------------------------------------------------------------------------

describe('groupRows', () => {
  it('returns empty array when no fields are provided', () => {
    const result = groupRows(people, rowIds, { fields: [] });
    expect(result).toEqual([]);
  });

  it('groups by single field', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'] });
    expect(result).toHaveLength(2);
    const keys = result.map(g => g.field);
    expect(keys).toEqual(['dept', 'dept']);
  });

  it('sorts groups alphabetically', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'] });
    expect(result[0]!.value).toBe('design');
    expect(result[1]!.value).toBe('engineering');
  });

  it('counts rows per group correctly', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'] });
    const design = result.find(g => g.value === 'design')!;
    const eng = result.find(g => g.value === 'engineering')!;
    expect(design.count).toBe(2);
    expect(eng.count).toBe(2);
  });

  it('group rows contain correct row IDs', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'] });
    const design = result.find(g => g.value === 'design')!;
    expect(design.rows).toContain('r2');
    expect(design.rows).toContain('r4');
    expect(design.rows).not.toContain('r1');
  });

  it('groups by multiple fields (multi-level)', () => {
    const result = groupRows(people, rowIds, { fields: ['dept', 'level'] });
    expect(result).toHaveLength(2); // top level: design, engineering
    const design = result.find(g => g.value === 'design')!;
    expect(design.subGroups).toBeDefined();
    expect(design.subGroups).toHaveLength(2); // level 1 and level 2
  });

  it('multi-level grouping nests correctly', () => {
    const result = groupRows(people, rowIds, { fields: ['dept', 'level'] });
    const eng = result.find(g => g.value === 'engineering')!;
    const subValues = eng.subGroups!.map(g => g.value);
    expect(subValues).toContain('1');
    expect(subValues).toContain('2');
  });

  it('leaf groups have no subGroups for single-field grouping', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'] });
    for (const g of result) {
      expect(g.subGroups).toBeUndefined();
    }
  });

  it('computes sum aggregate', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'], aggregates: { salary: 'sum' } });
    const design = result.find(g => g.value === 'design')!;
    expect(design.aggregates!['salary']).toBe(130); // 70 + 60
  });

  it('computes avg aggregate', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'], aggregates: { salary: 'avg' } });
    const design = result.find(g => g.value === 'design')!;
    expect(design.aggregates!['salary']).toBe(65); // (70 + 60) / 2
  });

  it('computes count aggregate', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'], aggregates: { salary: 'count' } });
    const eng = result.find(g => g.value === 'engineering')!;
    expect(eng.aggregates!['salary']).toBe(2);
  });

  it('computes min aggregate', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'], aggregates: { salary: 'min' } });
    const eng = result.find(g => g.value === 'engineering')!;
    expect(eng.aggregates!['salary']).toBe(80);
  });

  it('computes max aggregate', () => {
    const result = groupRows(people, rowIds, { fields: ['dept'], aggregates: { salary: 'max' } });
    const eng = result.find(g => g.value === 'engineering')!;
    expect(eng.aggregates!['salary']).toBe(90);
  });

  it('aggregate returns 0 when there are no numeric values', () => {
    const data = [{ id: 'x', dept: 'hr', salary: 'n/a' }] as Record<string, unknown>[];
    const result = groupRows(data, ['x'], { fields: ['dept'], aggregates: { salary: 'sum' } });
    expect(result[0]!.aggregates!['salary']).toBe(0);
  });

  it('aggregate ignores non-numeric values in the field', () => {
    const data = [
      { id: 'a', dept: 'hr', salary: 50 },
      { id: 'b', dept: 'hr', salary: 'unknown' },
    ] as Record<string, unknown>[];
    const result = groupRows(data, ['a', 'b'], { fields: ['dept'], aggregates: { salary: 'sum' } });
    // Only the numeric 50 is included
    expect(result[0]!.aggregates!['salary']).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// toggleGroupExpansion
// ---------------------------------------------------------------------------

describe('toggleGroupExpansion', () => {
  it('expands a collapsed group', () => {
    const state = createGroupState();
    const next = toggleGroupExpansion(state, 'dept:design');
    expect(next.expandedGroups.has('dept:design')).toBe(true);
  });

  it('collapses an already-expanded group', () => {
    let state = createGroupState();
    state = toggleGroupExpansion(state, 'dept:design');
    state = toggleGroupExpansion(state, 'dept:design');
    expect(state.expandedGroups.has('dept:design')).toBe(false);
  });

  it('does not mutate the original state', () => {
    const state = createGroupState();
    toggleGroupExpansion(state, 'dept:design');
    expect(state.expandedGroups.has('dept:design')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// expandAllGroups / collapseAllGroups
// ---------------------------------------------------------------------------

describe('expandAllGroups', () => {
  it('expands all groups including nested ones', () => {
    const groups = groupRows(people, rowIds, { fields: ['dept', 'level'] });
    let state: GroupState = { rowGroups: groups, expandedGroups: new Set() };
    state = expandAllGroups(state);
    // Top-level keys
    expect(state.expandedGroups.has('dept:design')).toBe(true);
    expect(state.expandedGroups.has('dept:engineering')).toBe(true);
    // Sub-group keys (level within dept)
    for (const g of groups) {
      for (const sub of g.subGroups ?? []) {
        expect(state.expandedGroups.has(sub.key)).toBe(true);
      }
    }
  });
});

describe('collapseAllGroups', () => {
  it('collapses all groups', () => {
    let state: GroupState = {
      rowGroups: [],
      expandedGroups: new Set(['dept:design', 'dept:engineering']),
    };
    state = collapseAllGroups(state);
    expect(state.expandedGroups.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isGroupExpanded
// ---------------------------------------------------------------------------

describe('isGroupExpanded', () => {
  it('returns true for an expanded group', () => {
    let state = createGroupState();
    state = toggleGroupExpansion(state, 'dept:design');
    expect(isGroupExpanded(state, 'dept:design')).toBe(true);
  });

  it('returns false for a collapsed group', () => {
    const state = createGroupState();
    expect(isGroupExpanded(state, 'dept:design')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getVisibleRowsWithGroups
// ---------------------------------------------------------------------------

describe('getVisibleRowsWithGroups', () => {
  function buildState(expanded: Set<string> = new Set()): GroupState {
    const groups = groupRows(people, rowIds, { fields: ['dept'] });
    return { rowGroups: groups, expandedGroups: expanded };
  }

  it('shows group headers in the output', () => {
    const state = buildState();
    const visible = getVisibleRowsWithGroups(state, false);
    const groupEntries = visible.filter(e => e.type === 'group');
    expect(groupEntries).toHaveLength(2);
  });

  it('shows rows under expanded groups', () => {
    const state = buildState(new Set(['dept:design']));
    const visible = getVisibleRowsWithGroups(state, false);
    const rowEntries = visible.filter(e => e.type === 'row');
    expect(rowEntries).toHaveLength(2); // two design rows
  });

  it('hides rows under collapsed groups', () => {
    const state = buildState(new Set()); // nothing expanded
    const visible = getVisibleRowsWithGroups(state, false);
    const rowEntries = visible.filter(e => e.type === 'row');
    expect(rowEntries).toHaveLength(0);
  });

  it('handles nested groups — shows sub-group headers when parent is expanded', () => {
    const groups = groupRows(people, rowIds, { fields: ['dept', 'level'] });
    const state: GroupState = {
      rowGroups: groups,
      expandedGroups: new Set(['dept:design']),
    };
    const visible = getVisibleRowsWithGroups(state, false);
    // Two top-level groups (design, engineering) + two design sub-groups (level 1, level 2)
    // Engineering is collapsed so its sub-groups are not shown
    expect(visible).toHaveLength(4);
    // All four entries should be group headers (no leaf rows yet — sub-groups are collapsed)
    expect(visible.every(e => e.type === 'group')).toBe(true);
    // design's sub-groups appear at depth 1
    const subGroupEntries = visible.filter(e => e.depth === 1);
    expect(subGroupEntries).toHaveLength(2);
  });

  it('assigns depth 0 to top-level groups', () => {
    const state = buildState();
    const visible = getVisibleRowsWithGroups(state, false);
    const topGroups = visible.filter(e => e.type === 'group');
    for (const entry of topGroups) {
      expect(entry.depth).toBe(0);
    }
  });

  it('assigns depth 1 to rows under a top-level group', () => {
    const state = buildState(new Set(['dept:design']));
    const visible = getVisibleRowsWithGroups(state, false);
    const rowEntries = visible.filter(e => e.type === 'row');
    for (const entry of rowEntries) {
      expect(entry.depth).toBe(1);
    }
  });
});
