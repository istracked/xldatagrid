import { evaluateFilter, evaluateCompositeFilter, applyFiltering } from '../filtering';
import { FilterDescriptor, CompositeFilterDescriptor } from '../types';

// ---------------------------------------------------------------------------
// evaluateFilter
// ---------------------------------------------------------------------------

describe('evaluateFilter — text operators', () => {
  const f = (operator: FilterDescriptor['operator'], value: unknown): FilterDescriptor => ({
    field: 'name',
    operator,
    value,
  });

  it('eq matches an exact string', () => {
    expect(evaluateFilter('Alice', f('eq', 'Alice'))).toBe(true);
  });

  it('eq rejects a non-matching string', () => {
    expect(evaluateFilter('Bob', f('eq', 'Alice'))).toBe(false);
  });

  it('neq passes when values differ', () => {
    expect(evaluateFilter('Bob', f('neq', 'Alice'))).toBe(true);
  });

  it('neq rejects when values are equal', () => {
    expect(evaluateFilter('Alice', f('neq', 'Alice'))).toBe(false);
  });

  it('contains matches a substring', () => {
    expect(evaluateFilter('Hello World', f('contains', 'World'))).toBe(true);
  });

  it('contains is case-insensitive', () => {
    expect(evaluateFilter('Hello World', f('contains', 'world'))).toBe(true);
  });

  it('contains rejects missing substring', () => {
    expect(evaluateFilter('Hello', f('contains', 'xyz'))).toBe(false);
  });

  it('startsWith matches the beginning of a string', () => {
    expect(evaluateFilter('FooBar', f('startsWith', 'Foo'))).toBe(true);
  });

  it('startsWith is case-insensitive', () => {
    expect(evaluateFilter('FooBar', f('startsWith', 'foo'))).toBe(true);
  });

  it('startsWith rejects wrong prefix', () => {
    expect(evaluateFilter('FooBar', f('startsWith', 'Bar'))).toBe(false);
  });

  it('endsWith matches the end of a string', () => {
    expect(evaluateFilter('FooBar', f('endsWith', 'Bar'))).toBe(true);
  });

  it('endsWith is case-insensitive', () => {
    expect(evaluateFilter('FooBar', f('endsWith', 'bar'))).toBe(true);
  });

  it('endsWith rejects wrong suffix', () => {
    expect(evaluateFilter('FooBar', f('endsWith', 'Foo'))).toBe(false);
  });

  it('contains with empty string matches everything', () => {
    expect(evaluateFilter('anything', f('contains', ''))).toBe(true);
  });
});

describe('evaluateFilter — numeric operators', () => {
  const f = (operator: FilterDescriptor['operator'], value: unknown): FilterDescriptor => ({
    field: 'score',
    operator,
    value,
  });

  it('eq matches an exact number', () => {
    expect(evaluateFilter(42, f('eq', 42))).toBe(true);
  });

  it('gt passes when value is greater', () => {
    expect(evaluateFilter(10, f('gt', 5))).toBe(true);
  });

  it('gt rejects when value is not greater', () => {
    expect(evaluateFilter(5, f('gt', 5))).toBe(false);
  });

  it('gte passes when value is equal', () => {
    expect(evaluateFilter(5, f('gte', 5))).toBe(true);
  });

  it('lt passes when value is less', () => {
    expect(evaluateFilter(3, f('lt', 5))).toBe(true);
  });

  it('lt rejects when value is equal', () => {
    expect(evaluateFilter(5, f('lt', 5))).toBe(false);
  });

  it('lte passes when value is equal', () => {
    expect(evaluateFilter(5, f('lte', 5))).toBe(true);
  });

  it('between passes when value is within range (inclusive)', () => {
    expect(evaluateFilter(5, f('between', [1, 10]))).toBe(true);
    expect(evaluateFilter(1, f('between', [1, 10]))).toBe(true);
    expect(evaluateFilter(10, f('between', [1, 10]))).toBe(true);
  });

  it('between rejects when value is outside range', () => {
    expect(evaluateFilter(0, f('between', [1, 10]))).toBe(false);
    expect(evaluateFilter(11, f('between', [1, 10]))).toBe(false);
  });

  it('between rejects malformed target (not a 2-element array)', () => {
    expect(evaluateFilter(5, f('between', [1]))).toBe(false);
    expect(evaluateFilter(5, f('between', 'bad'))).toBe(false);
  });
});

describe('evaluateFilter — boolean operators', () => {
  const f = (value: unknown): FilterDescriptor => ({ field: 'active', operator: 'eq', value });

  it('eq matches true', () => {
    expect(evaluateFilter(true, f(true))).toBe(true);
  });

  it('eq rejects false when filtering for true', () => {
    expect(evaluateFilter(false, f(true))).toBe(false);
  });

  it('eq matches false', () => {
    expect(evaluateFilter(false, f(false))).toBe(true);
  });

  it('eq rejects true when filtering for false', () => {
    expect(evaluateFilter(true, f(false))).toBe(false);
  });
});

describe('evaluateFilter — Date operators', () => {
  const d1 = new Date('2022-01-01');
  const d2 = new Date('2023-06-15');
  const d3 = new Date('2024-12-31');

  it('eq matches the same date reference', () => {
    expect(evaluateFilter(d1, { field: 'date', operator: 'eq', value: d1 })).toBe(true);
  });

  it('gt passes for a later date', () => {
    expect(evaluateFilter(d2, { field: 'date', operator: 'gt', value: d1 })).toBe(true);
  });

  it('lt passes for an earlier date', () => {
    expect(evaluateFilter(d1, { field: 'date', operator: 'lt', value: d2 })).toBe(true);
  });

  it('between passes when date is within range', () => {
    expect(evaluateFilter(d2, { field: 'date', operator: 'between', value: [d1, d3] })).toBe(true);
  });

  it('between rejects when date is outside range', () => {
    expect(evaluateFilter(d3, { field: 'date', operator: 'between', value: [d1, d2] })).toBe(false);
  });
});

describe('evaluateFilter — null operators', () => {
  it('isNull passes for null', () => {
    expect(evaluateFilter(null, { field: 'x', operator: 'isNull', value: null })).toBe(true);
  });

  it('isNull passes for undefined', () => {
    expect(evaluateFilter(undefined, { field: 'x', operator: 'isNull', value: null })).toBe(true);
  });

  it('isNull rejects a non-null value', () => {
    expect(evaluateFilter('something', { field: 'x', operator: 'isNull', value: null })).toBe(false);
  });

  it('isNotNull passes for a non-null value', () => {
    expect(evaluateFilter('value', { field: 'x', operator: 'isNotNull', value: null })).toBe(true);
  });

  it('isNotNull rejects null', () => {
    expect(evaluateFilter(null, { field: 'x', operator: 'isNotNull', value: null })).toBe(false);
  });

  it('gt returns false when value is null', () => {
    expect(evaluateFilter(null, { field: 'x', operator: 'gt', value: 0 })).toBe(false);
  });

  it('lt returns false when value is null', () => {
    expect(evaluateFilter(null, { field: 'x', operator: 'lt', value: 100 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateCompositeFilter
// ---------------------------------------------------------------------------

describe('evaluateCompositeFilter', () => {
  it('AND logic passes when all filters match', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [
        { field: 'age', operator: 'gte', value: 18 },
        { field: 'age', operator: 'lte', value: 65 },
      ],
    };
    expect(evaluateCompositeFilter({ age: 30 }, filter)).toBe(true);
  });

  it('AND logic fails when any filter does not match', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [
        { field: 'age', operator: 'gte', value: 18 },
        { field: 'age', operator: 'lte', value: 25 },
      ],
    };
    expect(evaluateCompositeFilter({ age: 30 }, filter)).toBe(false);
  });

  it('OR logic passes when at least one filter matches', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'or',
      filters: [
        { field: 'role', operator: 'eq', value: 'admin' },
        { field: 'role', operator: 'eq', value: 'moderator' },
      ],
    };
    expect(evaluateCompositeFilter({ role: 'moderator' }, filter)).toBe(true);
  });

  it('OR logic fails when no filter matches', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'or',
      filters: [
        { field: 'role', operator: 'eq', value: 'admin' },
        { field: 'role', operator: 'eq', value: 'moderator' },
      ],
    };
    expect(evaluateCompositeFilter({ role: 'guest' }, filter)).toBe(false);
  });

  it('handles nested composite filters', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [
        { field: 'active', operator: 'eq', value: true },
        {
          logic: 'or',
          filters: [
            { field: 'role', operator: 'eq', value: 'admin' },
            { field: 'role', operator: 'eq', value: 'editor' },
          ],
        },
      ],
    };
    expect(evaluateCompositeFilter({ active: true, role: 'editor' }, filter)).toBe(true);
    expect(evaluateCompositeFilter({ active: true, role: 'guest' }, filter)).toBe(false);
    expect(evaluateCompositeFilter({ active: false, role: 'admin' }, filter)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyFiltering
// ---------------------------------------------------------------------------

describe('applyFiltering', () => {
  const data = [
    { id: 1, name: 'Alice', age: 30, active: true },
    { id: 2, name: 'Bob', age: 17, active: false },
    { id: 3, name: 'Charlie', age: 45, active: true },
    { id: 4, name: 'Diana', age: 22, active: null },
  ] as Record<string, unknown>[];

  it('returns the same reference when filter is null', () => {
    const result = applyFiltering(data, null);
    expect(result).toBe(data);
  });

  it('returns the same reference when filters array is empty', () => {
    const result = applyFiltering(data, { logic: 'and', filters: [] });
    expect(result).toBe(data);
  });

  it('returns a new array when a filter is applied', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'active', operator: 'eq', value: true }],
    };
    const result = applyFiltering(data, filter);
    expect(result).not.toBe(data);
  });

  it('filters rows by active === true', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'active', operator: 'eq', value: true }],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it('filters rows by minimum age', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'age', operator: 'gte', value: 18 }],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie', 'Diana']);
  });

  it('filters rows with isNull on active', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'active', operator: 'isNull', value: null }],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Diana']);
  });

  it('filters rows with isNotNull on active', () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'active', operator: 'isNotNull', value: null }],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('does not mutate the original data array', () => {
    const original = data.slice();
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'active', operator: 'eq', value: true }],
    };
    applyFiltering(data, filter);
    expect(data).toEqual(original);
  });
});
