/**
 * MUI calendar cell renderer for the datagrid.
 *
 * @module MuiCalendarCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

function parseDate(value: CellValue): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * MUI-based calendar cell renderer using a native date input via MUI TextField.
 */
export const MuiCalendarCell = React.memo(function MuiCalendarCell<TData = Record<string, unknown>>({
  value,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const date = parseDate(value);
  const isoValue = date ? toIsoDateString(date) : '';
  const [draft, setDraft] = useState(isoValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(isoValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditing) {
    return (
      <Typography variant="body2" noWrap title={formatDate(date)}>
        {formatDate(date) || (
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            Pick a date
          </Typography>
        )}
      </Typography>
    );
  }

  return (
    <TextField
      inputRef={inputRef}
      type="date"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft || null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(draft || null);
        if (e.key === 'Escape') onCancel();
      }}
      variant="standard"
      size="small"
      fullWidth
      slotProps={{ input: { disableUnderline: true } }}
      sx={{ height: '100%', '& input': { height: '100%', padding: '0 4px' } }}
    />
  );
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
