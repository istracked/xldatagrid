/**
 * Filter-tree utilities shared by the DataGrid's field-scoped replace /
 * clear flow.
 *
 * The grid lets consumers mutate its filter tree a field at a time: the
 * checklist dropdown, the condition dialog, and the toolbar's "clear filter"
 * button all boil down to "remove every predicate that targets field X, then
 * optionally append a replacement". `stripField` is the recursive walker
 * that implements the removal half of that contract.
 *
 * Hardening contract (WS-E):
 *   - A depth cap (`MAX_FILTER_DEPTH`) guarantees pathological trees
 *     (deeply nested composites, circular references) raise a clear
 *     `RangeError` instead of blowing the JS stack.
 *   - Empty composites are cascade-pruned: if every child of a composite
 *     resolves to `null`, the composite itself resolves to `null` so its
 *     parent also drops it. This keeps the surfaced filter tree canonical
 *     (no dangling `{ logic: 'and', filters: [] }` nodes).
 *
 * @module filter-utils
 * @packageDocumentation
 */
import type {
  FilterDescriptor,
  CompositeFilterDescriptor,
} from '@istracked/datagrid-core';

/**
 * Maximum nesting depth `stripField` will recurse into. Real-world filter
 * trees built via the condition dialog rarely exceed 3-4 levels; 100 leaves
 * generous headroom while still catching runaway recursion (circular refs,
 * programmatically-generated pathological trees) before it blows the stack.
 */
export const MAX_FILTER_DEPTH = 100;

/**
 * Recursively removes every predicate targeting `field` from a filter tree.
 *
 * Returns:
 *   - The leaf unchanged when it targets a different field.
 *   - `null` when the leaf targets `field`.
 *   - A shallow-copied composite with its surviving children when at least
 *     one child survives.
 *   - `null` when a composite's children all prune away — the caller should
 *     drop the composite from its own `filters` array.
 *
 * Throws `RangeError` when the traversal exceeds
 * {@link MAX_FILTER_DEPTH}. This guards against unbounded recursion from
 * deeply-nested composites or circular references (`a.filters = [a]`).
 *
 * @param node   - The leaf or composite being walked.
 * @param field  - Name of the field whose predicates should be removed.
 * @param depth  - Current recursion depth; consumers should not pass this.
 */
export function stripField(
  node: FilterDescriptor | CompositeFilterDescriptor,
  field: string,
  depth = 0,
): FilterDescriptor | CompositeFilterDescriptor | null {
  if (depth > MAX_FILTER_DEPTH) {
    throw new RangeError(
      `Filter tree exceeds MAX_FILTER_DEPTH (${MAX_FILTER_DEPTH})`,
    );
  }

  if ('filters' in node) {
    const kept: Array<FilterDescriptor | CompositeFilterDescriptor> = [];
    for (const child of node.filters) {
      const pruned = stripField(child, field, depth + 1);
      if (pruned !== null) kept.push(pruned);
    }
    // Empty branches collapse so the parent also drops them.
    if (kept.length === 0) return null;
    return { ...node, filters: kept };
  }

  return node.field === field ? null : node;
}
