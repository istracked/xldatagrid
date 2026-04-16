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
export const MuiListCell = React.memo(function MuiListCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const options = column.options ?? [];
  const [draft, setDraft] = useState<CellValue>(value);
  const displayLabel = options.find((o: { value: string }) => o.value === String(draft ?? ''))?.label ?? (draft != null ? String(draft) : '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

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
      value={draft != null ? String(draft) : ''}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => {
        setOpen(false);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
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
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
