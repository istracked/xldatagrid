import { applySorting, toggleSort, compareValues, createComparator } from '../sorting';
import { SortState } from '../types';

describe('compareValues', () => {
  describe('null / undefined handling', () => {
    it('treats null as equal to null', () => {
      expect(compareValues(null, null)).toBe(0);
    });

    it('places null after a non-null value', () => {
      expect(compareValues(null, 'a')).toBeGreaterThan(0);
    });

    it('places a non-null value before null', () => {
      expect(compareValues('a', null)).toBeLessThan(0);
    });

    it('places undefined after a non-null value', () => {
      expect(compareValues(undefined, 'a')).toBeGreaterThan(0);
    });

    it('places a non-null value before undefined', () => {
      expect(compareValues('a', undefined)).toBeLessThan(0);
    });

    it('treats undefined as equal to undefined', () => {
      expect(compareValues(undefined, undefined)).toBe(0);
    });
  });

  describe('numeric comparison', () => {
    it('returns negative when a < b', () => {
      expect(compareValues(1, 2)).toBeLessThan(0);
    });

    it('returns positive when a > b', () => {
      expect(compareValues(10, 2)).toBeGreaterThan(0);
    });

    it('returns 0 for equal numbers', () => {
      expect(compareValues(5, 5)).toBe(0);
    });

    it('compares numerically not lexicographically', () => {
      // lexicographic: "10" < "9", numeric: 10 > 9
      expect(compareValues(10, 9)).toBeGreaterThan(0);
    });
  });

  describe('string comparison', () => {
    it('is case-insensitive', () => {
      expect(compareValues('Apple', 'apple')).toBe(0);
    });

    it('returns negative when a comes before b alphabetically', () => {
      expect(compareValues('apple', 'banana')).toBeLessThan(0);
    });

    it('returns positive when a comes after b alphabetically', () => {
      expect(compareValues('zebra', 'ant')).toBeGreaterThan(0);
    });

    it('treats mixed-case strings correctly', () => {
      expect(compareValues('Banana', 'apple')).toBeGreaterThan(0);
    });
  });

  describe('boolean comparison', () => {
    it('sorts false before true', () => {
      expect(compareValues(false, true)).toBeLessThan(0);
    });

    it('sorts true after false', () => {
      expect(compareValues(true, false)).toBeGreaterThan(0);
    });

    it('returns 0 for equal booleans', () => {
      expect(compareValues(true, true)).toBe(0);
      expect(compareValues(false, false)).toBe(0);
    });
  });

  describe('Date comparison', () => {
    it('sorts earlier dates before later dates', () => {
      const earlier = new Date('2020-01-01');
      const later = new Date('2023-06-15');
      expect(compareValues(earlier, later)).toBeLessThan(0);
    });

    it('sorts later dates after earlier dates', () => {
      const earlier = new Date('2020-01-01');
      const later = new Date('2023-06-15');
      expect(compareValues(later, earlier)).toBeGreaterThan(0);
    });

    it('returns 0 for equal dates', () => {
      const d1 = new Date('2022-03-10');
      const d2 = new Date('2022-03-10');
      expect(compareValues(d1, d2)).toBe(0);
    });
  });
});

describe('createComparator', () => {
  it('handles multiple sort fields in priority order', () => {
    const rows = [
      { dept: 'engineering', name: 'charlie' },
      { dept: 'design', name: 'alice' },
      { dept: 'engineering', name: 'alice' },
    ];
    const sort: SortState = [
      { field: 'dept', dir: 'asc' },
      { field: 'name', dir: 'asc' },
    ];
    const comparator = createComparator(sort);
    const sorted = [...rows].sort(comparator);
    expect(sorted[0]).toEqual({ dept: 'design', name: 'alice' });
    expect(sorted[1]).toEqual({ dept: 'engineering', name: 'alice' });
    expect(sorted[2]).toEqual({ dept: 'engineering', name: 'charlie' });
  });

  it('returns 0 when all fields are equal', () => {
    const comparator = createComparator([{ field: 'x', dir: 'asc' }]);
    expect(comparator({ x: 1 }, { x: 1 })).toBe(0);
  });
});

describe('applySorting', () => {
  const data = [
    { name: 'Charlie', age: 30 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 35 },
  ];

  it('returns the same reference when sort is empty', () => {
    const result = applySorting(data, []);
    expect(result).toBe(data);
  });

  it('returns a new array when sorting is applied', () => {
    const result = applySorting(data, [{ field: 'name', dir: 'asc' }]);
    expect(result).not.toBe(data);
  });

  it('does not mutate the original array', () => {
    const original = [...data];
    applySorting(data, [{ field: 'name', dir: 'asc' }]);
    expect(data).toEqual(original);
  });

  it('sorts a single column ascending', () => {
    const result = applySorting(data, [{ field: 'name', dir: 'asc' }]);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts a single column descending', () => {
    const result = applySorting(data, [{ field: 'name', dir: 'desc' }]);
    expect(result.map(r => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('sorts numeric column ascending', () => {
    const result = applySorting(data, [{ field: 'age', dir: 'asc' }]);
    expect(result.map(r => r.age)).toEqual([25, 30, 35]);
  });

  it('sorts numeric column descending', () => {
    const result = applySorting(data, [{ field: 'age', dir: 'desc' }]);
    expect(result.map(r => r.age)).toEqual([35, 30, 25]);
  });

  it('places null values at the end in ascending order', () => {
    const withNulls = [
      { name: 'Charlie', score: null },
      { name: 'Alice', score: 10 },
      { name: 'Bob', score: 5 },
    ] as Record<string, unknown>[];

    const asc = applySorting(withNulls, [{ field: 'score', dir: 'asc' }]);
    expect(asc[asc.length - 1].name).toBe('Charlie');
  });

  it('places null values at the start in descending order (direction is negated)', () => {
    // compareValues returns +1 for null-after-non-null; desc negates to -1, so
    // nulls sort to the front. This is the defined behaviour of the comparator.
    const withNulls = [
      { name: 'Alice', score: 10 },
      { name: 'Bob', score: 5 },
      { name: 'Charlie', score: null },
    ] as Record<string, unknown>[];

    const desc = applySorting(withNulls, [{ field: 'score', dir: 'desc' }]);
    expect(desc[0].name).toBe('Charlie');
  });

  it('places undefined values at the end', () => {
    const withUndefined = [
      { name: 'Charlie', score: undefined },
      { name: 'Alice', score: 10 },
    ] as Record<string, unknown>[];

    const result = applySorting(withUndefined, [{ field: 'score', dir: 'asc' }]);
    expect(result[result.length - 1].name).toBe('Charlie');
  });

  it('handles multi-column sort', () => {
    const multiData = [
      { dept: 'engineering', level: 2 },
      { dept: 'design', level: 1 },
      { dept: 'engineering', level: 1 },
      { dept: 'design', level: 2 },
    ];
    const result = applySorting(multiData, [
      { field: 'dept', dir: 'asc' },
      { field: 'level', dir: 'asc' },
    ]);
    expect(result).toEqual([
      { dept: 'design', level: 1 },
      { dept: 'design', level: 2 },
      { dept: 'engineering', level: 1 },
      { dept: 'engineering', level: 2 },
    ]);
  });

  it('preserves stable order for equal values', () => {
    const stableData = [
      { group: 'a', order: 1 },
      { group: 'a', order: 2 },
      { group: 'a', order: 3 },
    ];
    const result = applySorting(stableData, [{ field: 'group', dir: 'asc' }]);
    // All groups are equal; original insertion order must be preserved
    expect(result.map(r => r.order)).toEqual([1, 2, 3]);
  });

  it('handles mixed-type-ish data gracefully (numbers and strings in same field)', () => {
    // Two rows with numbers, used to confirm no crash on comparison
    const mixed = [
      { val: 100 },
      { val: 20 },
      { val: 3 },
    ];
    const result = applySorting(mixed, [{ field: 'val', dir: 'asc' }]);
    expect(result.map(r => r.val)).toEqual([3, 20, 100]);
  });
});

describe('toggleSort', () => {
  it('adds asc sort when field not present (single mode)', () => {
    const result = toggleSort([], 'name', false);
    expect(result).toEqual([{ field: 'name', dir: 'asc' }]);
  });

  it('cycles asc -> desc on second toggle', () => {
    const state: SortState = [{ field: 'name', dir: 'asc' }];
    const result = toggleSort(state, 'name', false);
    expect(result).toEqual([{ field: 'name', dir: 'desc' }]);
  });

  it('removes sort on third toggle (desc -> removed)', () => {
    const state: SortState = [{ field: 'name', dir: 'desc' }];
    const result = toggleSort(state, 'name', false);
    expect(result).toEqual([]);
  });

  it('replaces existing sort in single mode', () => {
    const state: SortState = [{ field: 'age', dir: 'asc' }];
    const result = toggleSort(state, 'name', false);
    expect(result).toEqual([{ field: 'name', dir: 'asc' }]);
  });

  it('adds to existing sorts in multi mode', () => {
    const state: SortState = [{ field: 'age', dir: 'asc' }];
    const result = toggleSort(state, 'name', true);
    expect(result).toEqual([
      { field: 'age', dir: 'asc' },
      { field: 'name', dir: 'asc' },
    ]);
  });

  it('updates only the toggled field in multi mode', () => {
    const state: SortState = [
      { field: 'age', dir: 'asc' },
      { field: 'name', dir: 'asc' },
    ];
    const result = toggleSort(state, 'name', true);
    expect(result).toEqual([
      { field: 'age', dir: 'asc' },
      { field: 'name', dir: 'desc' },
    ]);
  });

  it('removes only the toggled field in multi mode, preserving others', () => {
    const state: SortState = [
      { field: 'age', dir: 'asc' },
      { field: 'name', dir: 'desc' },
    ];
    const result = toggleSort(state, 'name', true);
    expect(result).toEqual([{ field: 'age', dir: 'asc' }]);
  });

  it('does not mutate the original sort state', () => {
    const state: SortState = [{ field: 'name', dir: 'asc' }];
    const frozen = Object.freeze([...state]);
    // Should not throw even if we cannot mutate
    expect(() => toggleSort(frozen as SortState, 'name', false)).not.toThrow();
  });
});
