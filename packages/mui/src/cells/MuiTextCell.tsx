/**
 * MUI text cell renderer for the datagrid.
 *
 * @module MuiTextCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CellValue, ColumnDef } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

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
  const [draft, setDraft] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(displayValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditing) {
    return (
      <Typography
        variant="body2"
        noWrap
        sx={{ width: '100%', lineHeight: '100%' }}
        title={displayValue}
      >
        {displayValue || (
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            {column.placeholder ?? ''}
          </Typography>
        )}
      </Typography>
    );
  }

  return (
    <TextField
      inputRef={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(draft);
        if (e.key === 'Escape') onCancel();
      }}
      variant="standard"
      size="small"
      fullWidth
      placeholder={column.placeholder ?? ''}
      slotProps={{ input: { disableUnderline: true } }}
      sx={{ height: '100%', '& input': { height: '100%', padding: '0 4px' } }}
    />
  );
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
