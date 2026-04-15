import React, { useRef, useEffect } from 'react';
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

/** All 15 cell renderers mapped by cell type */
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

// ---------------------------------------------------------------------------
// EventLog component — displays event strings with auto-scroll
// ---------------------------------------------------------------------------

export function EventLog({ entries, placeholder }: { entries: string[]; placeholder?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);
  return React.createElement('pre', {
    ref,
    style: {
      margin: 0, fontSize: 11, padding: 8, borderRadius: 4,
      maxHeight: 120, overflow: 'auto',
      background: '#f1f5f9', color: '#334155',
    },
  }, entries.length ? entries.join('\n') : (placeholder ?? '(interact with the grid to see events)'));
}

// ---------------------------------------------------------------------------
// Shared layout styles
// ---------------------------------------------------------------------------

export const pageStyle: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: 24,
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxSizing: 'border-box',
  color: '#1e293b',
};

export const gridContainer: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  overflow: 'hidden',
};

export const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

export const btnStyle: React.CSSProperties = {
  padding: '5px 14px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  cursor: 'pointer',
  fontSize: 13,
};

export const btnActiveStyle: React.CSSProperties = {
  ...btnStyle,
  background: '#3b82f6',
  color: '#fff',
  borderColor: '#3b82f6',
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
