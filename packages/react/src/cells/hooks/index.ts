/**
 * Shared cell-editor hooks for the datagrid React package.
 *
 * These hooks extract duplicated state patterns found across built-in cell
 * renderers and are intentionally kept generic so they can be reused by
 * third-party cell implementations (e.g. the MUI cell package).
 *
 * @module cells/hooks
 */

/** Hook that manages draft string state, focus, and Enter/Escape/blur commit logic. */
export { useDraftState } from './useDraftState';
export type { UseDraftStateOptions, UseDraftStateReturn } from './useDraftState';

/** Hook that manages draft value + open state for single-select / dropdown editors. */
export { useSelectState } from './useSelectState';
export type { UseSelectStateOptions, UseSelectStateReturn } from './useSelectState';

/** Hook that manages an array of items for multi-select / tag-list editors. */
export { useArrayState } from './useArrayState';
export type { UseArrayStateOptions, UseArrayStateReturn } from './useArrayState';

/** Hook that manages show/hide state + stable ids for password cell editors. */
export { usePasswordInput } from './usePasswordInput';
export type { UsePasswordInputOptions, UsePasswordInputResult } from './usePasswordInput';
