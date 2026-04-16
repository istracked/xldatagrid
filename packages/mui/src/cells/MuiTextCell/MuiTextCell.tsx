/**
 * MUI text cell renderer for the datagrid.
 *
 * @module MuiTextCell
 * @packageDocumentation
 */
import React from 'react';
import type { CellRendererProps } from '@istracked/datagrid-react';
import { useDraftState } from '@istracked/datagrid-react';
import { EditableTextField, DisplayTypography } from '../../components';

/**
 * MUI-based text cell renderer.
 *
 * Uses MUI Typography in display mode and MUI TextField in edit mode.
 */
export const MuiTextCell = React.memo(function MuiTextCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const displayValue = value != null ? String(value) : '';

  const { draft, setDraft, inputRef, handleKeyDown, handleBlur } = useDraftState({
    initialValue: displayValue,
    isEditing,
    onCommit: onCommit as (value: unknown) => void,
    onCancel,
    deferFocus: true,
  });

  if (!isEditing) {
    return (
      <DisplayTypography value={displayValue} placeholder={column.placeholder} noWrap />
    );
  }

  return (
    <EditableTextField
      inputRef={inputRef as React.Ref<HTMLInputElement>}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={column.placeholder}
    />
  );
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
