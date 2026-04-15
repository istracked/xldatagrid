/**
 * Cell renderer barrel module for the datagrid React package.
 *
 * Re-exports every built-in cell renderer component and provides a
 * {@link cellRendererMap} lookup table that maps column `type` strings
 * (e.g. `"text"`, `"numeric"`, `"currency"`) to their corresponding
 * React component.  The DataGrid uses this map at render time to resolve
 * the appropriate renderer for each column.
 *
 * @module cells
 * @packageDocumentation
 */
import React from 'react';
import type { CellRendererProps } from '../DataGrid';

export { TextCell } from './TextCell';
export { CheckboxCell } from './CheckboxCell';
export { NumericCell } from './NumericCell';
export { PasswordCell } from './PasswordCell';
export { CurrencyCell } from './CurrencyCell';
export { StatusCell } from './StatusCell';
export { TagsCell } from './TagsCell';
export { ActionsCell } from './ActionsCell';
export { CalendarCell } from './CalendarCell';
export { ListCell } from './ListCell';
export { ChipSelectCell } from './ChipSelectCell';
export { CompoundChipListCell } from './CompoundChipListCell';
export { RichTextCell } from './RichTextCell';
export { UploadCell } from './UploadCell';
export { SubGridCell } from './SubGridCell';

import { TextCell } from './TextCell';
import { CheckboxCell } from './CheckboxCell';
import { NumericCell } from './NumericCell';
import { PasswordCell } from './PasswordCell';
import { CurrencyCell } from './CurrencyCell';
import { StatusCell } from './StatusCell';
import { TagsCell } from './TagsCell';
import { ActionsCell } from './ActionsCell';
import { CalendarCell } from './CalendarCell';
import { ListCell } from './ListCell';
import { ChipSelectCell } from './ChipSelectCell';
import { CompoundChipListCell } from './CompoundChipListCell';
import { RichTextCell } from './RichTextCell';
import { UploadCell } from './UploadCell';
import { SubGridCell } from './SubGridCell';

/**
 * Maps column type identifiers to their corresponding cell renderer components.
 *
 * The DataGrid consults this record when determining which component to
 * instantiate for a given column.  Each key is a column `type` string and
 * each value is a React component that conforms to {@link CellRendererProps}.
 *
 * @remarks
 * Custom renderers can be added by extending or replacing this map before
 * passing it to the grid.  All built-in renderers are cast to
 * `React.ComponentType<CellRendererProps<any>>` to satisfy the homogeneous
 * record signature while preserving per-component generic flexibility.
 */
export const cellRendererMap: Record<string, React.ComponentType<CellRendererProps<any>>> = {
  text: TextCell as React.ComponentType<CellRendererProps<any>>,
  boolean: CheckboxCell as React.ComponentType<CellRendererProps<any>>,
  numeric: NumericCell as React.ComponentType<CellRendererProps<any>>,
  password: PasswordCell as React.ComponentType<CellRendererProps<any>>,
  currency: CurrencyCell as React.ComponentType<CellRendererProps<any>>,
  status: StatusCell as React.ComponentType<CellRendererProps<any>>,
  tags: TagsCell as React.ComponentType<CellRendererProps<any>>,
  actions: ActionsCell as React.ComponentType<CellRendererProps<any>>,
  calendar: CalendarCell as React.ComponentType<CellRendererProps<any>>,
  list: ListCell as React.ComponentType<CellRendererProps<any>>,
  chipSelect: ChipSelectCell as React.ComponentType<CellRendererProps<any>>,
  compoundChipList: CompoundChipListCell as React.ComponentType<CellRendererProps<any>>,
  richText: RichTextCell as React.ComponentType<CellRendererProps<any>>,
  upload: UploadCell as React.ComponentType<CellRendererProps<any>>,
  subGrid: SubGridCell as React.ComponentType<CellRendererProps<any>>,
};
