/**
 * Filtering module for the datagrid core engine.
 *
 * Evaluates individual and composite (AND / OR) filter descriptors against tabular
 * data. Supports a rich set of operators including equality, comparison, string
 * matching, range checks, and null tests. Composite filters can be nested
 * arbitrarily, enabling complex boolean-logic filter trees.
 *
 * @module filtering
 */

import { FilterDescriptor, CompositeFilterDescriptor, FilterState, CellValue } from './types';

/**
 * Tests a single cell value against a {@link FilterDescriptor}.
 *
 * Operator evaluation is type-sensitive: Date equality compares epoch
 * milliseconds, string operators are case-insensitive, and `between` expects
 * a two-element array target.
 *
 * For the value-list operators (`in` / `notIn`), the descriptor's `value` may be
 * either an array of strings or a `Set<string>`. Passing a `Set` enables O(1)
 * membership checks per row, which {@link applyFiltering} relies on for fast
 * filtering of large value-list filters (e.g. Excel-style checklist menus).
 *
 * @param value - The cell value to test.
 * @param filter - The filter descriptor containing operator and target value.
 * @returns `true` if the value satisfies the filter condition.
 *
 * @example
 * ```ts
 * evaluateFilter('hello world', { field: 'text', operator: 'contains', value: 'hello' }); // true
 * ```
 */
export function evaluateFilter(value: CellValue, filter: FilterDescriptor): boolean {
  const v = value;
  const target = filter.value;

  switch (filter.operator) {
    // Equality checks -- Date instances are compared by epoch time
    case 'eq': {
      if (v instanceof Date && target instanceof Date) return v.getTime() === target.getTime();
      return v === target;
    }
    case 'neq': {
      if (v instanceof Date && target instanceof Date) return v.getTime() !== target.getTime();
      return v !== target;
    }

    // Relational comparisons -- null-safe: return false when either side is null
    case 'gt': return v != null && target != null && v > (target as any);
    case 'gte': return v != null && target != null && v >= (target as any);
    case 'lt': return v != null && target != null && v < (target as any);
    case 'lte': return v != null && target != null && v <= (target as any);

    // Case-insensitive string matching operators
    case 'contains': return typeof v === 'string' && typeof target === 'string' && v.toLowerCase().includes(target.toLowerCase());
    case 'startsWith': return typeof v === 'string' && typeof target === 'string' && v.toLowerCase().startsWith(target.toLowerCase());
    case 'endsWith': return typeof v === 'string' && typeof target === 'string' && v.toLowerCase().endsWith(target.toLowerCase());

    // Range check -- target must be a [min, max] tuple
    case 'between': {
      if (!Array.isArray(target) || target.length !== 2) return false;
      const lo = target[0] as unknown;
      const hi = target[1] as unknown;
      return v != null && lo != null && hi != null && v >= (lo as any) && v <= (hi as any);
    }

    // Null presence operators
    case 'isNull': return v == null;
    case 'isNotNull': return v != null;

    // Value-list membership operators -- used by the Excel 365 filter menu to
    // express a multi-value distinct-value filter. Comparison is case-sensitive
    // against String(v). The sentinel '(blanks)' matches null/undefined/''.
    //
    // The target may be either an array or a Set<string>. A Set enables O(1)
    // lookup; applyFiltering precompiles arrays into Sets to avoid O(n*m)
    // scans across large checklist filters.
    case 'in': {
      const isBlank = v == null || v === '';
      if (target instanceof Set) {
        if (target.size === 0) return false;
        return isBlank ? target.has('(blanks)') : target.has(String(v));
      }
      const list = Array.isArray(target) ? target : [String(target)];
      if (list.length === 0) return false;
      if (isBlank) return list.includes('(blanks)');
      return list.includes(String(v));
    }
    case 'notIn': {
      const isBlank = v == null || v === '';
      if (target instanceof Set) {
        return isBlank ? !target.has('(blanks)') : !target.has(String(v));
      }
      const list = Array.isArray(target) ? target : [String(target)];
      if (isBlank) return !list.includes('(blanks)');
      return !list.includes(String(v));
    }

    // Unknown operators pass through as truthy by default
    default: return true;
  }
}

/**
 * Recursively evaluates a composite (AND / OR) filter against a data row.
 *
 * Each child filter in {@link CompositeFilterDescriptor.filters} may itself be
 * a composite, enabling arbitrarily deep boolean-logic trees. Leaf filters are
 * evaluated via {@link evaluateFilter}.
 *
 * @param row - The data row whose fields will be tested.
 * @param filter - The composite filter descriptor (contains logic and children).
 * @returns `true` if the row satisfies the composite condition.
 */
export function evaluateCompositeFilter(row: Record<string, unknown>, filter: CompositeFilterDescriptor): boolean {
  // Evaluate each child, recursing into nested composites as needed
  const results = filter.filters.map(f => {
    if ('logic' in f) return evaluateCompositeFilter(row, f);
    return evaluateFilter(row[f.field] as CellValue, f);
  });
  // Combine results according to the composite's boolean logic
  return filter.logic === 'and' ? results.every(Boolean) : results.some(Boolean);
}

/**
 * Walks a composite filter tree and returns a structurally-cloned copy in which
 * any `in` / `notIn` leaf whose `value` is an array has been converted to a
 * `Set<string>`. This precompile step turns the per-row membership test from an
 * O(m) `Array.includes` scan into an O(1) `Set.has` lookup, which dominates
 * total cost when large value-list filters are applied to large datasets.
 *
 * The original descriptor tree is never mutated; only nodes that need rewriting
 * are reallocated, so cost is proportional to filter size, not row count.
 */
function precompileFilter(filter: CompositeFilterDescriptor): CompositeFilterDescriptor {
  // We rebuild children lazily: if nothing needs rewriting we return the
  // original node unchanged so that callers comparing references still see
  // the same object where possible.
  let mutated = false;
  const newChildren = filter.filters.map(child => {
    if ('logic' in child) {
      const compiled = precompileFilter(child);
      if (compiled !== child) mutated = true;
      return compiled;
    }
    if ((child.operator === 'in' || child.operator === 'notIn') && Array.isArray(child.value)) {
      mutated = true;
      const set = new Set<string>();
      for (const item of child.value) set.add(String(item));
      return { ...child, value: set } as FilterDescriptor;
    }
    return child;
  });
  return mutated ? { ...filter, filters: newChildren } : filter;
}

/**
 * Filters an array of data rows using the given filter state.
 *
 * Returns the original array unchanged when no filter is provided or the filter
 * contains no conditions. Before iterating rows, the filter tree is walked once
 * to convert any `in` / `notIn` array targets into `Set<string>` instances so
 * that per-row membership tests run in O(1) regardless of value-list size.
 *
 * @typeParam T - Row type, must extend a string-keyed record.
 * @param data - Source rows to filter.
 * @param filter - The top-level composite filter state, or `null` to skip filtering.
 * @returns A new array containing only the rows that satisfy the filter.
 */
export function applyFiltering<T extends Record<string, unknown>>(data: T[], filter: FilterState | null): T[] {
  // Short-circuit when there is nothing to filter
  if (!filter || filter.filters.length === 0) return data;
  // Precompile once per call so that each row only pays O(1) for in / notIn
  // membership checks instead of an O(m) Array.includes scan.
  const compiled = precompileFilter(filter);
  return data.filter(row => evaluateCompositeFilter(row, compiled));
}
