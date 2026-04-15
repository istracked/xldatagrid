/**
 * MUI password cell renderer for the datagrid.
 *
 * @module MuiPasswordCell
 * @packageDocumentation
 */
import React, { useState, useEffect, useRef } from 'react';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Box from '@mui/material/Box';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

const MASK_CHAR = '\u2022';

/**
 * MUI-based password cell renderer with IconButton visibility toggle.
 */
export function MuiPasswordCell<TData = Record<string, unknown>>({
  value,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const strValue = value != null ? String(value) : '';
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState(strValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(strValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditing) {
    const masked = MASK_CHAR.repeat(strValue.length);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box component="span" sx={{ letterSpacing: 2 }}>
          {revealed ? strValue : masked}
        </Box>
        <IconButton
          size="small"
          aria-label={revealed ? 'Hide password' : 'Reveal password'}
          onClick={() => setRevealed((v) => !v)}
          sx={{ padding: '2px', fontSize: 12 }}
        >
          {revealed ? 'Hide' : 'Show'}
        </IconButton>
      </Box>
    );
  }

  return (
    <TextField
      inputRef={inputRef}
      type={revealed ? 'text' : 'password'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(draft);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onCommit(draft)}
      variant="standard"
      size="small"
      fullWidth
      slotProps={{
        input: {
          disableUnderline: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label={revealed ? 'Hide password' : 'Show password'}
                onClick={() => setRevealed((v) => !v)}
                edge="end"
                sx={{ fontSize: 11 }}
              >
                {revealed ? 'Hide' : 'Show'}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      sx={{ height: '100%', '& input': { height: '100%', padding: '0 4px' } }}
    />
  );
}
