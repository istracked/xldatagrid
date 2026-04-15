/**
 * MUI tags cell renderer for the datagrid.
 *
 * @module MuiTagsCell
 * @packageDocumentation
 */
import React, { useState, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import type { CellValue } from '@istracked/datagrid-core';
import type { CellRendererProps } from '@istracked/datagrid-react';

function parseTags(value: CellValue): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * MUI-based tags cell renderer using Autocomplete with Chip display.
 */
export function MuiTagsCell<TData = Record<string, unknown>>({
  value,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps<TData>) {
  const initialTags = parseTags(value);
  const [tags, setTags] = useState<string[]>(initialTags);

  useEffect(() => {
    if (isEditing) {
      setTags(parseTags(value));
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditing) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {initialTags.map((tag) => (
          <Chip key={tag} label={tag} size="small" sx={{ fontSize: 12 }} />
        ))}
      </Box>
    );
  }

  return (
    <Autocomplete<string, true, false, true>
      multiple
      freeSolo
      value={tags}
      onChange={(_e: React.SyntheticEvent, newValue: string[]) => {
        setTags(newValue);
      }}
      onBlur={() => onCommit(tags)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      }}
      options={[] as string[]}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          size="small"
          placeholder="Add tag..."
        />
      )}
      sx={{ width: '100%' }}
      size="small"
    />
  );
}
