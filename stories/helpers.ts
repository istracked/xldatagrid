import type { CellRendererProps } from '@istracked/datagrid-react';
import { TextCell } from '@istracked/datagrid-react/cells/TextCell';
import { CheckboxCell } from '@istracked/datagrid-react/cells/CheckboxCell';
import { NumericCell } from '@istracked/datagrid-react/cells/NumericCell';
import { PasswordCell } from '@istracked/datagrid-react/cells/PasswordCell';
import { CurrencyCell } from '@istracked/datagrid-react/cells/CurrencyCell';
import { StatusCell } from '@istracked/datagrid-react/cells/StatusCell';
import { TagsCell } from '@istracked/datagrid-react/cells/TagsCell';
import { ActionsCell } from '@istracked/datagrid-react/cells/ActionsCell';
import { CalendarCell } from '@istracked/datagrid-react/cells/CalendarCell';
import { ChipSelectCell } from '@istracked/datagrid-react/cells/ChipSelectCell';
import { CompoundChipListCell } from '@istracked/datagrid-react/cells/CompoundChipListCell';
import { ListCell } from '@istracked/datagrid-react/cells/ListCell';
import { RichTextCell } from '@istracked/datagrid-react/cells/RichTextCell';
import { UploadCell } from '@istracked/datagrid-react/cells/UploadCell';
import { SubGridCell } from '@istracked/datagrid-react/cells/SubGridCell';
import React from 'react';

/** All cell renderers registered so every cellType works in stories */
export const allCellRenderers: Record<string, React.ComponentType<CellRendererProps<any>>> = {
  text: TextCell as any,
  boolean: CheckboxCell as any,
  numeric: NumericCell as any,
  password: PasswordCell as any,
  currency: CurrencyCell as any,
  status: StatusCell as any,
  tags: TagsCell as any,
  actions: ActionsCell as any,
  calendar: CalendarCell as any,
  chipSelect: ChipSelectCell as any,
  compoundChipList: CompoundChipListCell as any,
  list: ListCell as any,
  richText: RichTextCell as any,
  upload: UploadCell as any,
  subGrid: SubGridCell as any,
};

/** Wrapper style for story containers */
export const storyContainer: React.CSSProperties = {
  padding: 24,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxSizing: 'border-box',
};

export const gridContainer: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  overflow: 'hidden',
};
