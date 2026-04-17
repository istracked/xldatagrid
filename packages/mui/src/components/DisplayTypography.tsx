/**
 * Display-mode Typography with placeholder fallback for grid cells.
 *
 * @module DisplayTypography
 */
import React from 'react';
import Typography from '@mui/material/Typography';

export interface DisplayTypographyProps {
  value: string;
  placeholder?: string;
  /** Extra sx merged with defaults (e.g., textAlign: 'right'). */
  sx?: Record<string, unknown>;
  noWrap?: boolean;
}

/**
 * Renders the cell value as MUI Typography variant="body2".
 * When value is empty, renders placeholder in text.secondary color.
 */
export const DisplayTypography = React.memo(function DisplayTypography({
  value,
  placeholder,
  sx,
  noWrap,
}: DisplayTypographyProps) {
  const mergedSx = { width: '100%', lineHeight: '100%', ...sx };

  return (
    <Typography variant="body2" noWrap={noWrap} sx={mergedSx} title={value || undefined}>
      {value || (
        <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
          {placeholder ?? ''}
        </Typography>
      )}
    </Typography>
  );
});
