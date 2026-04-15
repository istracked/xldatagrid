/**
 * Row grouping module for the datagrid core engine.
 *
 * Groups tabular data by one or more fields into a hierarchical tree of
 * {@link RowGroup} nodes. Supports multi-level nesting, per-group aggregate
 * calculations (sum, avg, count, min, max), and expand/collapse state
 * management. The flattened visible-row list produced by
 * {@link getVisibleRowsWithGroups} feeds directly into the virtualisation layer.
 *
 * @module grouping
 */

import { RowGroup, GroupState, RowGroupConfig } from './types';

/**
 * Creates an empty group state with no groups and nothing expanded.
 *
 * @returns A fresh {@link GroupState} ready for use.
 */
export function createGroupState(): GroupState {
  return { rowGroups: [], expandedGroups: new Set() };
}

/**
 * Groups an array of data rows into a hierarchy of {@link RowGroup} nodes.
 *
 * Rows are recursively partitioned by each field in `config.fields`, producing
 * a tree whose depth equals the number of grouping fields. If `config.aggregates`
 * is provided, numeric aggregates are computed for each group.
 *
 * @typeParam T - Row type, must extend a string-keyed record.
 * @param data - Source rows to group.
 * @param rowIds - Ordered list of row identifiers corresponding to `data`.
 * @param config - Grouping configuration specifying fields and optional aggregates.
 * @returns An array of top-level {@link RowGroup} nodes (empty when no fields are configured).
 *
 * @example
 * ```ts
 * const groups = groupRows(data, ids, { fields: ['category', 'status'] });
 * ```
 */
export function groupRows<T extends Record<string, unknown>>(
  data: T[],
  rowIds: string[],
  config: RowGroupConfig
): RowGroup[] {
  if (!config.fields || config.fields.length === 0) return [];
  return groupByField(data, rowIds, config.fields, 0, config);
}

/**
 * Recursively groups data by the field at the given depth.
 *
 * Builds a `Map` keyed by stringified field values, then converts each bucket
 * into a `RowGroup`. Sub-groups are created for subsequent fields. Aggregates
 * are computed when configured. Groups are sorted alphabetically by value.
 *
 * @typeParam T - Row type.
 * @param data - Rows to partition.
 * @param rowIds - Row identifiers matching `data`.
 * @param fields - Full list of grouping field names.
 * @param depth - Current recursion depth (index into `fields`).
 * @param config - The grouping configuration (for aggregate definitions).
 * @returns Array of {@link RowGroup} nodes for this level.
 */
function groupByField<T extends Record<string, unknown>>(
  data: T[],
  rowIds: string[],
  fields: string[],
  depth: number,
  config: RowGroupConfig
): RowGroup[] {
  // Base case: no more fields to group by
  if (depth >= fields.length) return [];
  const field = fields[depth]!;

  // Bucket rows by their stringified field value
  const groups = new Map<string, { rows: string[]; indices: number[] }>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowId = rowIds[i];
    if (!row || rowId == null) continue;
    const value = String(row[field] ?? '');
    if (!groups.has(value)) {
      groups.set(value, { rows: [], indices: [] });
    }
    const bucket = groups.get(value)!;
    bucket.rows.push(rowId);
    bucket.indices.push(i);
  }

  // Convert each bucket into a RowGroup, recursing for sub-groups
  const result: RowGroup[] = [];
  for (const [value, { rows, indices }] of groups) {
    const subData = indices.map(i => data[i]).filter((r): r is T => r != null);
    const group: RowGroup = {
      key: `${field}:${value}`,
      field,
      value,
      rows,
      count: rows.length,
      subGroups: depth < fields.length - 1
        ? groupByField(subData, rows, fields, depth + 1, config)
        : undefined,
    };

    // Compute aggregates for numeric columns when configured
    if (config.aggregates) {
      group.aggregates = {};
      for (const [aggField, aggType] of Object.entries(config.aggregates)) {
        // Extract only numeric values for aggregate calculation
        const values = subData.map(r => r[aggField]).filter((v): v is number => typeof v === 'number');
        switch (aggType) {
          case 'sum': group.aggregates[aggField] = values.reduce((a, b) => a + b, 0); break;
          case 'avg': group.aggregates[aggField] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
          case 'count': group.aggregates[aggField] = values.length; break;
          case 'min': group.aggregates[aggField] = values.length > 0 ? Math.min(...values) : 0; break;
          case 'max': group.aggregates[aggField] = values.length > 0 ? Math.max(...values) : 0; break;
        }
      }
    }

    result.push(group);
  }

  // Sort groups alphabetically by value for deterministic ordering
  result.sort((a, b) => String(a.value).localeCompare(String(b.value)));
  return result;
}

/**
 * Toggles the expanded/collapsed state of a single group.
 *
 * @param state - Current group state.
 * @param groupKey - The unique key identifying the group (e.g. `"category:Electronics"`).
 * @returns A new group state with the specified group toggled.
 */
export function toggleGroupExpansion(state: GroupState, groupKey: string): GroupState {
  const expanded = new Set(state.expandedGroups);
  if (expanded.has(groupKey)) {
    expanded.delete(groupKey);
  } else {
    expanded.add(groupKey);
  }
  return { ...state, expandedGroups: expanded };
}

/**
 * Expands every group (and sub-group) in the current hierarchy.
 *
 * Walks the entire group tree and adds every key to the expanded set.
 *
 * @param state - Current group state (must have `rowGroups` populated).
 * @returns A new group state with all groups expanded.
 */
export function expandAllGroups(state: GroupState): GroupState {
  const expanded = new Set<string>();
  // Recursively collect all group keys from the tree
  function collect(groups: RowGroup[]) {
    for (const g of groups) {
      expanded.add(g.key);
      if (g.subGroups) collect(g.subGroups);
    }
  }
  collect(state.rowGroups);
  return { ...state, expandedGroups: expanded };
}

/**
 * Collapses every group by clearing the expanded set.
 *
 * @param state - Current group state.
 * @returns A new group state with no groups expanded.
 */
export function collapseAllGroups(state: GroupState): GroupState {
  return { ...state, expandedGroups: new Set() };
}

/**
 * Checks whether a specific group is currently expanded.
 *
 * @param state - Current group state.
 * @param groupKey - The group key to check.
 * @returns `true` if the group is expanded.
 */
export function isGroupExpanded(state: GroupState, groupKey: string): boolean {
  return state.expandedGroups.has(groupKey);
}

/**
 * Flattens the group hierarchy into an ordered list of visible entries
 * (group headers and data rows) suitable for rendering.
 *
 * Groups that are collapsed have their children omitted. When the expanded set
 * is empty and `defaultExpanded` is `true`, all groups are treated as expanded.
 *
 * @param state - Current group state with populated `rowGroups`.
 * @param defaultExpanded - Whether groups default to expanded when the expanded set is empty. Defaults to `true`.
 * @returns A flat array of entries, each tagged with `'group'` or `'row'` type and a nesting `depth`.
 */
export function getVisibleRowsWithGroups(
  state: GroupState,
  defaultExpanded: boolean = true
): { type: 'group' | 'row'; key: string; group?: RowGroup; depth: number }[] {
  const result: { type: 'group' | 'row'; key: string; group?: RowGroup; depth: number }[] = [];

  // Recursive walker that emits group headers and conditionally their children
  function walk(groups: RowGroup[], depth: number) {
    for (const group of groups) {
      // Always emit the group header
      result.push({ type: 'group', key: group.key, group, depth });

      // Determine expansion: explicitly expanded, or default-expanded when no explicit state exists
      const isExpanded = state.expandedGroups.has(group.key) || (defaultExpanded && !state.expandedGroups.has(group.key) && state.expandedGroups.size === 0);
      if (isExpanded) {
        if (group.subGroups && group.subGroups.length > 0) {
          // Recurse into nested sub-groups
          walk(group.subGroups, depth + 1);
        } else {
          // Leaf group: emit individual data rows
          for (const rowId of group.rows) {
            result.push({ type: 'row', key: rowId, depth: depth + 1 });
          }
        }
      }
    }
  }

  walk(state.rowGroups, 0);
  return result;
}
