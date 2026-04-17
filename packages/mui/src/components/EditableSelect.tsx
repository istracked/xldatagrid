/**
 * Pre-configured MUI Select for use inside grid cell edit mode.
 *
 * @module EditableSelect
 */
import React from 'react';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';

export interface EditableSelectProps {
  value: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (e: SelectChangeEvent<string>) => void;
  onBlur: () => void;
  children: React.ReactNode;
  ref?: React.Ref<HTMLSelectElement>;
}

/**
 * Thin wrapper around MUI Select with the standard grid-cell defaults applied.
 * Defaults: variant="standard", size="small", fullWidth, disableUnderline.
 */
export const EditableSelect = React.memo(
  React.forwardRef<HTMLSelectElement, EditableSelectProps>(function EditableSelect(
    { value, open, onOpen, onClose, onChange, onBlur, children },
    ref,
  ) {
    return (
      <Select
        ref={ref}
        value={value}
        open={open}
        onOpen={onOpen}
        onClose={onClose}
        onChange={onChange}
        onBlur={onBlur}
        variant="standard"
        size="small"
        fullWidth
        disableUnderline
        sx={{ fontSize: 13, height: '100%' }}
      >
        {children}
      </Select>
    );
  }),
);
