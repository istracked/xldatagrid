/**
 * MUI chip select cell renderer for the datagrid.
 *
 * @module MuiChipSelectCell
 * @packageDocumentation
 */
import React, { useState, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

function parseArray(value: CellValue): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.startsWith('[')) {
    try { return JSON.parse(value); } catch { /* fall through */ }
  }
  if (value != null && value !== '') return [String(value)];
  return [];
}

/**
 * MUI-based chip select cell renderer using Autocomplete multiple with Chip.
 */
export function MuiChipSelectCell<TData = Record<string, unknown>>({
  value,
  column,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const options = column.options ?? [];
  const selected = parseArray(value);
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    if (isEditing) {
      setDraft(parseArray(value));
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelFor = (val: string) => options.find((o: { value: string; label: string }) => o.value === val)?.label ?? val;

  if (!isEditing) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {selected.length === 0 ? (
          <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>
            {column.placeholder ?? 'Select...'}
          </Box>
        ) : (
          selected.map((val) => (
            <Chip key={val} label={labelFor(val)} size="small" color="primary" variant="outlined" sx={{ fontSize: 11 }} />
          ))
        )}
      </Box>
    );
  }

  const availableOptions = options.map((o: { value: string }) => o.value);

  return (
    <Autocomplete<string, true, false, false>
      multiple
      value={draft}
      onChange={(_e: React.SyntheticEvent, newValue: string[]) => setDraft(newValue)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && !(e.target as HTMLInputElement).value) onCommit(draft);
      }}
      options={availableOptions}
      getOptionLabel={(opt: string) => labelFor(opt)}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          size="small"
          placeholder={column.placeholder ?? 'Select...'}
        />
      )}
      sx={{ width: '100%' }}
      size="small"
    />
  );
}
