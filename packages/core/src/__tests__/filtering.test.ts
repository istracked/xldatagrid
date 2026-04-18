/**
 * Behavioural tests for the filtering module.
 *
 * Covers the three public entry points of `../filtering`:
 * - `evaluateFilter` — per-operator leaf semantics, including the Excel-style
 *   `in` / `notIn` value-list operators and the `'(blanks)'` sentinel used to
 *   match empty cells.
 * - `evaluateCompositeFilter` — AND / OR combination of leaves, including
 *   arbitrarily nested composites.
 * - `applyFiltering` — row-level integration, reference-identity fast paths
 *   for the no-op case, and the `Set`-precompile path that accelerates
 *   `in` / `notIn` without mutating the caller's descriptor.
 *
 * Each `describe` block groups tests around a single invariant so regressions
 * stay scoped. Fixture data and assertions below must not be edited by any
 * automated docstring pass.
 */

import { evaluateFilter, evaluateCompositeFilter, applyFiltering } from '../filtering';
import { FilterDescriptor, CompositeFilterDescriptor } from '../types';

// ---------------------------------------------------------------------------
// evaluateFilter
// ---------------------------------------------------------------------------

// String operators (`eq`, `neq`, `contains`, `startsWith`, `endsWith`) must be
// case-insensitive for substring matching and must not throw on empty targets.
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

// Relational (`gt`, `gte`, `lt`, `lte`) and range (`between`) operators on
// numbers. `between` must reject malformed targets (non-array or wrong arity).
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

// Equality on boolean cells: strict `===` without truthiness coercion, so
// `true` only matches `true` and `false` only matches `false`.
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

// Date comparisons: equality uses epoch milliseconds (so two `Date` objects
// with the same instant match), and relational ops delegate to the native
// `Date` ordering.
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

// Null-presence operators treat `null` and `undefined` identically (via
// `v == null`), and relational ops must short-circuit to `false` rather than
// comparing against null/undefined and producing surprising results.
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
// evaluateFilter — value-list membership (in / notIn)
// ---------------------------------------------------------------------------

// Value-list membership operators used by the Excel 365 filter menu.
// Cells are coerced via `String(cell)` (so the number `42` matches the
// string `'42'`), comparison is case-sensitive, `'(blanks)'` is a sentinel
// for null/undefined/empty, a non-array `value` is treated as a one-element
// list, and a `Set<string>` target is accepted as a pre-built fast path.
describe('evaluateFilter — in / notIn', () => {
  const f = (operator: FilterDescriptor['operator'], value: unknown): FilterDescriptor => ({
    field: 'category',
    operator,
    value,
  });

  it("'in' matches when value is in array", () => {
    expect(evaluateFilter('A', f('in', ['A', 'B', 'C']))).toBe(true);
    expect(evaluateFilter('D', f('in', ['A', 'B', 'C']))).toBe(false);
  });

  it("'in' with string array matches numeric cell (\"42\" in [\"42\"])", () => {
    expect(evaluateFilter(42, f('in', ['42']))).toBe(true);
    expect(evaluateFilter(42, f('in', ['7']))).toBe(false);
  });

  it("'in' with Date cell coerces to its String() representation", () => {
    const d = new Date('2023-06-15');
    expect(evaluateFilter(d, f('in', [String(d)]))).toBe(true);
  });

  it("'in' is case-sensitive", () => {
    expect(evaluateFilter('Alice', f('in', ['alice']))).toBe(false);
    expect(evaluateFilter('Alice', f('in', ['Alice']))).toBe(true);
  });

  it("'in' with empty array never matches", () => {
    expect(evaluateFilter('A', f('in', []))).toBe(false);
    expect(evaluateFilter(null, f('in', []))).toBe(false);
    expect(evaluateFilter('', f('in', []))).toBe(false);
  });

  it("'in' including '(blanks)' matches null and undefined cells", () => {
    expect(evaluateFilter(null, f('in', ['A', '(blanks)']))).toBe(true);
    expect(evaluateFilter(undefined, f('in', ['A', '(blanks)']))).toBe(true);
    expect(evaluateFilter('', f('in', ['A', '(blanks)']))).toBe(true);
  });

  it("'in' without '(blanks)' does NOT match null/undefined/empty cells", () => {
    expect(evaluateFilter(null, f('in', ['A', 'B']))).toBe(false);
    expect(evaluateFilter(undefined, f('in', ['A', 'B']))).toBe(false);
    expect(evaluateFilter('', f('in', ['A', 'B']))).toBe(false);
  });

  it("'notIn' negates 'in'", () => {
    expect(evaluateFilter('A', f('notIn', ['A', 'B']))).toBe(false);
    expect(evaluateFilter('C', f('notIn', ['A', 'B']))).toBe(true);
    expect(evaluateFilter(42, f('notIn', ['42']))).toBe(false);
    expect(evaluateFilter(7, f('notIn', ['42']))).toBe(true);
  });

  it("'notIn' including '(blanks)' excludes blank cells", () => {
    expect(evaluateFilter(null, f('notIn', ['(blanks)']))).toBe(false);
    expect(evaluateFilter(undefined, f('notIn', ['(blanks)']))).toBe(false);
    expect(evaluateFilter('', f('notIn', ['(blanks)']))).toBe(false);
    expect(evaluateFilter('A', f('notIn', ['(blanks)']))).toBe(true);
  });

  it("'notIn' without '(blanks)' keeps blank cells", () => {
    expect(evaluateFilter(null, f('notIn', ['A']))).toBe(true);
    expect(evaluateFilter(undefined, f('notIn', ['A']))).toBe(true);
    expect(evaluateFilter('', f('notIn', ['A']))).toBe(true);
  });

  it("'in' coerces non-array filter.value to [String(value)]", () => {
    expect(evaluateFilter('A', f('in', 'A'))).toBe(true);
    expect(evaluateFilter('B', f('in', 'A'))).toBe(false);
    expect(evaluateFilter(42, f('in', 42))).toBe(true);
    expect(evaluateFilter(7, f('in', 42))).toBe(false);
  });

  it("'notIn' coerces non-array filter.value to [String(value)]", () => {
    expect(evaluateFilter('A', f('notIn', 'A'))).toBe(false);
    expect(evaluateFilter('B', f('notIn', 'A'))).toBe(true);
  });

  it("evaluateCompositeFilter still works when composite contains an 'in' clause (AND)", () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [
        { field: 'active', operator: 'eq', value: true },
        { field: 'role', operator: 'in', value: ['admin', 'editor'] },
      ],
    };
    expect(evaluateCompositeFilter({ active: true, role: 'admin' }, filter)).toBe(true);
    expect(evaluateCompositeFilter({ active: true, role: 'guest' }, filter)).toBe(false);
    expect(evaluateCompositeFilter({ active: false, role: 'admin' }, filter)).toBe(false);
  });

  it("evaluateCompositeFilter still works when composite contains an 'in' clause (OR)", () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'or',
      filters: [
        { field: 'role', operator: 'in', value: ['admin', 'editor'] },
        { field: 'age', operator: 'gt', value: 50 },
      ],
    };
    expect(evaluateCompositeFilter({ role: 'admin', age: 30 }, filter)).toBe(true);
    expect(evaluateCompositeFilter({ role: 'guest', age: 60 }, filter)).toBe(true);
    expect(evaluateCompositeFilter({ role: 'guest', age: 30 }, filter)).toBe(false);
  });

  // The fast-path: callers (and the applyFiltering precompile step) may pass a
  // pre-built Set for O(1) membership testing instead of an array.
  it("'in' accepts a Set<string> target with the same semantics as an array", () => {
    expect(evaluateFilter('A', f('in', new Set(['A', 'B', 'C'])))).toBe(true);
    expect(evaluateFilter('D', f('in', new Set(['A', 'B', 'C'])))).toBe(false);
    expect(evaluateFilter(42, f('in', new Set(['42'])))).toBe(true);
    expect(evaluateFilter(7, f('in', new Set(['42'])))).toBe(false);
  });

  it("'in' with empty Set never matches", () => {
    expect(evaluateFilter('A', f('in', new Set()))).toBe(false);
    expect(evaluateFilter(null, f('in', new Set()))).toBe(false);
    expect(evaluateFilter('', f('in', new Set()))).toBe(false);
  });

  it("'in' Set including '(blanks)' matches null/undefined/empty cells", () => {
    expect(evaluateFilter(null, f('in', new Set(['A', '(blanks)'])))).toBe(true);
    expect(evaluateFilter(undefined, f('in', new Set(['A', '(blanks)'])))).toBe(true);
    expect(evaluateFilter('', f('in', new Set(['A', '(blanks)'])))).toBe(true);
    expect(evaluateFilter(null, f('in', new Set(['A', 'B'])))).toBe(false);
  });

  it("'notIn' accepts a Set<string> target with the same semantics as an array", () => {
    expect(evaluateFilter('A', f('notIn', new Set(['A', 'B'])))).toBe(false);
    expect(evaluateFilter('C', f('notIn', new Set(['A', 'B'])))).toBe(true);
    expect(evaluateFilter(42, f('notIn', new Set(['42'])))).toBe(false);
    expect(evaluateFilter(7, f('notIn', new Set(['42'])))).toBe(true);
  });

  it("'notIn' Set including '(blanks)' excludes blank cells", () => {
    expect(evaluateFilter(null, f('notIn', new Set(['(blanks)'])))).toBe(false);
    expect(evaluateFilter(undefined, f('notIn', new Set(['(blanks)'])))).toBe(false);
    expect(evaluateFilter('', f('notIn', new Set(['(blanks)'])))).toBe(false);
    expect(evaluateFilter('A', f('notIn', new Set(['(blanks)'])))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluateCompositeFilter
// ---------------------------------------------------------------------------

// Composite evaluation combines leaf results with AND / OR and recurses
// through nested composites. Assertions cover pass/fail for both combinators
// and confirm arbitrarily nested trees evaluate correctly.
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

// Row-level integration: reference-identity fast paths for the no-op case,
// non-mutation of caller state, and the `Set`-precompile path that turns
// `in` / `notIn` array targets into O(1) membership tests without ever
// touching the caller's descriptor.
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

  // The Set precompile path: applyFiltering must produce identical results to
  // the array path, must not mutate the caller's descriptor, and must work for
  // 'in' nested inside composites.
  it("filters with 'in' value-list operator (array target)", () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'name', operator: 'in', value: ['Alice', 'Charlie'] }],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it("filters with 'in' value-list operator (Set target, same result as array)", () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'name', operator: 'in', value: new Set(['Alice', 'Charlie']) }],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it("filters with 'notIn' value-list operator", () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [{ field: 'name', operator: 'notIn', value: ['Bob', 'Diana'] }],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it("does not mutate caller's filter descriptor when precompiling 'in' arrays to Sets", () => {
    const arrayValue = ['Alice', 'Charlie'];
    const inLeaf = { field: 'name', operator: 'in' as const, value: arrayValue };
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [inLeaf],
    };
    applyFiltering(data, filter);
    // Caller's descriptor and value array remain untouched.
    expect(inLeaf.value).toBe(arrayValue);
    expect(Array.isArray(inLeaf.value)).toBe(true);
    expect(arrayValue).toEqual(['Alice', 'Charlie']);
    expect(filter.filters[0]).toBe(inLeaf);
  });

  it("precompiles 'in' inside nested composite filters", () => {
    const filter: CompositeFilterDescriptor = {
      logic: 'and',
      filters: [
        { field: 'active', operator: 'eq', value: true },
        {
          logic: 'or',
          filters: [
            { field: 'name', operator: 'in', value: ['Alice'] },
            { field: 'age', operator: 'gt', value: 40 },
          ],
        },
      ],
    };
    const result = applyFiltering(data, filter);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
  });
});
