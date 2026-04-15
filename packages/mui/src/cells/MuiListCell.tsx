/**
 * MUI list cell renderer for the datagrid.
 *
 * @module MuiListCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

/**
 * MUI-based list cell renderer using Select with MenuItem.
 */
export function MuiListCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const options = column.options ?? [];
  const displayLabel = options.find((o: { value: string }) => o.value === String(value ?? ''))?.label ?? (value != null ? String(value) : '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isEditing) setOpen(true);
    else setOpen(false);
  }, [isEditing]);

  if (!isEditing) {
    return (
      <Typography variant="body2" noWrap title={displayLabel}>
        {displayLabel || (
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            {column.placeholder ?? 'Select...'}
          </Typography>
        )}
      </Typography>
    );
  }

  return (
    <Select
      value={value != null ? String(value) : ''}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => {
        setOpen(false);
        onCancel();
      }}
      onChange={(e) => onCommit(e.target.value)}
      variant="standard"
      size="small"
      fullWidth
      disableUnderline
      sx={{ fontSize: 13, height: '100%' }}
    >
      {options.map((opt: { value: string; label: string }) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
      {options.length === 0 && (
        <MenuItem disabled value="">
          No options
        </MenuItem>
      )}
    </Select>
  );
}
