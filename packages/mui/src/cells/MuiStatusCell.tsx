/**
 * MUI status cell renderer for the datagrid.
 *
 * @module MuiStatusCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import type { CellValue, StatusOption } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';
import { colorDot } from './MuiStatusCell.styles';

/**
 * MUI-based status cell renderer using Select with MenuItem and Chip display.
 */
export const MuiStatusCell = React.memo(function MuiStatusCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const options: StatusOption[] = column.options ?? [];
  const [draft, setDraft] = useState<CellValue>(value);
  const current = options.find((o) => o.value === draft);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <Chip
        label={current?.label ?? String(draft ?? '')}
        size="small"
        sx={{
          backgroundColor: current?.color ?? '#e5e7eb',
          color: '#111',
          fontSize: 12,
          height: 24,
        }}
      />
    );
  }

  return (
    <Select
      ref={selectRef}
      value={draft != null ? String(draft) : ''}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => {
        setOpen(false);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={() => {
        onCommit(draft);
      }}
      variant="standard"
      size="small"
      fullWidth
      disableUnderline
      sx={{ fontSize: 13, height: '100%' }}
    >
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.color && (
            <span style={colorDot(opt.color)} />
          )}
          {opt.label}
        </MenuItem>
      ))}
    </Select>
  );
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
