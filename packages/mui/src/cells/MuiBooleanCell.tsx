/**
 * MUI boolean cell renderer for the datagrid.
 *
 * @module MuiBooleanCell
 * @packageDocumentation
 */
import React from 'react';
import Checkbox from '@mui/material/Checkbox';
import type { CellRendererProps } from '@istracked/datagrid-react';

/**
 * MUI-based boolean cell renderer using MUI Checkbox.
 */
export function MuiBooleanCell<TData = Record<string, unknown>>({
  value,
  column,
  onCommit,
}: CellRendererProps<TData>) {
  const isNull = value === null || value === undefined;
  const checked = Boolean(value);
  const editable = column.editable !== false;

  return (
    <Checkbox
      checked={checked}
      indeterminate={isNull}
      disabled={!editable}
      onChange={() => {
        if (editable) onCommit(!checked);
      }}
      size="small"
      sx={{ padding: 0 }}
    />
  );
}
