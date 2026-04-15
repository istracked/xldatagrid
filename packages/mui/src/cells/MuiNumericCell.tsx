/**
 * MUI numeric cell renderer for the datagrid.
 *
 * @module MuiNumericCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

function formatNumeric(value: CellValue, useThousands: boolean): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return useThousands ? num.toLocaleString() : String(num);
}

/**
 * MUI-based numeric cell renderer with right-aligned display and constrained input.
 */
export const MuiNumericCell = React.memo(function MuiNumericCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const useThousands = column.format === 'thousands';
  const displayValue = formatNumeric(value, useThousands);
  const rawValue = value === null || value === undefined ? '' : String(value);
  const [draft, setDraft] = useState(rawValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(rawValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditing) {
    return (
      <Typography variant="body2" sx={{ textAlign: 'right', width: '100%' }}>
        {displayValue}
      </Typography>
    );
  }

  const clamp = (num: number): number => {
    let result = num;
    if (column.min !== undefined) result = Math.max(column.min, result);
    if (column.max !== undefined) result = Math.min(column.max, result);
    return result;
  };

  const commit = (raw: string) => {
    if (raw === '') { onCommit(null); return; }
    const num = parseFloat(raw);
    onCommit(isNaN(num) ? null : clamp(num));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^-?\d*\.?\d*$/.test(raw)) setDraft(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit(draft);
    else if (e.key === 'Escape') onCancel();
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = clamp((parseFloat(draft) || 0) + 1);
      setDraft(String(next));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = clamp((parseFloat(draft) || 0) - 1);
      setDraft(String(next));
    }
  };

  return (
    <TextField
      inputRef={inputRef}
      value={draft}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={() => commit(draft)}
      variant="standard"
      size="small"
      fullWidth
      slotProps={{
        input: { disableUnderline: true },
        htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } },
      }}
      sx={{ height: '100%', '& input': { height: '100%', padding: '0 4px' } }}
    />
  );
}) as <TData = Record<string, unknown>>(props: CellRendererProps<TData>) => React.ReactElement;
