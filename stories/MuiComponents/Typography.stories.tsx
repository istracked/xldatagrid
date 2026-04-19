import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Typography from '@mui/material/Typography';

const meta: Meta<typeof Typography> = {
  title: 'MUI Components/Data Display/Typography',
  component: Typography,
  parameters: {
    docs: {
      description: {
        component:
          'Typography renders read-only cell values in xldatagrid (DisplayTypography wrapper used by MuiNumericCell, MuiCurrencyCell, MuiCalendarCell, MuiUploadCell).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Typography>;

export const Default: Story = {
  args: { children: 'The quick brown fox jumps over the lazy dog.' },
};

export const Variants: Story = {
  render: () => (
    <div style={{ padding: 16, display: 'grid', gap: 4 }}>
      <Typography variant="h5">Heading 5</Typography>
      <Typography variant="subtitle1">Subtitle 1</Typography>
      <Typography variant="body1">Body 1 — standard paragraph text.</Typography>
      <Typography variant="body2">Body 2 — secondary text.</Typography>
      <Typography variant="caption">Caption</Typography>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ padding: 16, display: 'grid', gap: 4 }}>
      <Typography color="primary">Primary text</Typography>
      <Typography color="text.secondary">Secondary text</Typography>
      <Typography color="error">Error text</Typography>
      <Typography color="success.main">Success text</Typography>
    </div>
  ),
};

export const Truncated: Story = {
  render: () => (
    <div style={{ padding: 16, width: 240 }}>
      <Typography noWrap>
        A very long single-line value that must be truncated with ellipsis inside a narrow grid cell.
      </Typography>
    </div>
  ),
};

export const Monospace: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
        $ 1,234.56
      </Typography>
    </div>
  ),
};
