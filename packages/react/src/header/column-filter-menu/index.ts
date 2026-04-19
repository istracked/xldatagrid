/**
 * Barrel for the Excel-365-style column header filter menu.
 *
 * Re-exports the dropdown component rendered when a user opens the filter menu
 * from a column header, along with its props interface. Consumed by the header
 * cell component to wire sort commands, the value checklist, and the custom
 * filter dialog trigger into one anchored popover.
 */

// Portal-based dropdown that hosts sort actions, distinct-value checklist, and the custom-filter launcher.
export { DataGridColumnFilterMenu } from './DataGridColumnFilterMenu';
export type { DataGridColumnFilterMenuProps } from './DataGridColumnFilterMenu';
