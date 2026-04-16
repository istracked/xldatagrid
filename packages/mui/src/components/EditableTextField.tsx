/**
 * Pre-configured MUI TextField for use inside grid cell edit mode.
 *
 * @module EditableTextField
 */
import React from 'react';
import TextField from '@mui/material/TextField';

export interface EditableTextFieldProps {
  inputRef?: React.Ref<HTMLInputElement>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  /** Passed to TextField type prop (e.g., 'date', 'password'). */
  type?: string;
  placeholder?: string;
  /** Extra slotProps.input properties merged with defaults. */
  inputSlotProps?: Record<string, unknown>;
  /** Extra slotProps.htmlInput properties. */
  htmlInputSlotProps?: Record<string, unknown>;
  /** Extra sx merged with defaults. */
  sx?: Record<string, unknown>;
}

/**
 * Thin wrapper around MUI TextField with the standard grid-cell defaults applied.
 * Defaults: variant="standard", size="small", fullWidth, disableUnderline.
 */
export const EditableTextField = React.memo(function EditableTextField({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onBlur,
  type,
  placeholder,
  inputSlotProps,
  htmlInputSlotProps,
  sx,
}: EditableTextFieldProps) {
  const mergedSx = {
    height: '100%',
    '& input': { height: '100%', padding: '0 4px' },
    ...sx,
  };

  const mergedInputSlotProps = {
    disableUnderline: true,
    ...inputSlotProps,
  };

  return (
    <TextField
      inputRef={inputRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      type={type}
      placeholder={placeholder}
      variant="standard"
      size="small"
      fullWidth
      slotProps={{
        input: mergedInputSlotProps,
        ...(htmlInputSlotProps ? { htmlInput: htmlInputSlotProps } : {}),
      }}
      sx={mergedSx}
    />
  );
});
