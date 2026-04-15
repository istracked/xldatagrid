/**
 * MUI currency cell renderer for the datagrid.
 *
 * @module MuiCurrencyCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

function parseCurrencyFormat(format?: string): { symbol: string; negativeRed: boolean } {
  if (!format) return { symbol: '$', negativeRed: true };
  const parts = format.split(':');
  const code = parts[0];
  const sym = parts[1];
  return {
    symbol: sym ?? code ?? '$',
    negativeRed: !format.includes('no-red'),
  };
}

function formatDisplay(value: CellValue, symbol: string): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  const abs = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return num < 0 ? `-${symbol}${abs}` : `${symbol}${abs}`;
}

/**
 * MUI-based currency cell renderer with InputAdornment for the currency symbol.
 */
export function MuiCurrencyCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const { symbol, negativeRed } = parseCurrencyFormat(column.format);
  const numericValue = value === null || value === undefined ? '' : String(value);
  const [draft, setDraft] = useState(numericValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(numericValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditing) {
    const num = Number(value);
    const isNegative = !isNaN(num) && num < 0;
    return (
      <Typography
        variant="body2"
        sx={{
          textAlign: 'right',
          width: '100%',
          color: isNegative && negativeRed ? 'error.main' : undefined,
        }}
      >
        {formatDisplay(value, symbol)}
      </Typography>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^-?\d*\.?\d*$/.test(raw)) setDraft(raw);
  };

  const commit = () => {
    if (draft === '' || draft === '-') { onCommit(null); return; }
    const num = parseFloat(draft);
    onCommit(isNaN(num) ? null : num);
  };

  return (
    <TextField
      inputRef={inputRef}
      value={draft}
      onChange={handleChange}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') onCancel();
      }}
      onBlur={commit}
      variant="standard"
      size="small"
      fullWidth
      slotProps={{
        input: {
          disableUnderline: true,
          startAdornment: <InputAdornment position="start">{symbol}</InputAdornment>,
        },
        htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } },
      }}
      sx={{ height: '100%', '& input': { height: '100%', padding: '0 4px' } }}
    />
  );
}
