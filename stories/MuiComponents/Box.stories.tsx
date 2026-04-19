import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

const meta: Meta<typeof Box> = {
  title: 'MUI Components/Layout/Box',
  component: Box,
  parameters: {
    docs: {
      description: {
        component:
          'Box is the generic layout primitive xldatagrid cells use (via the `sx` prop) to arrange chips, controls, and inline content without writing CSS.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Box>;

export const Default: Story = {
  render: () => (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      Box content
    </Box>
  ),
};

export const FlexRow: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 1, p: 2 }}>
      <Chip label="One" size="small" />
      <Chip label="Two" size="small" />
      <Chip label="Three" size="small" />
    </Box>
  ),
};

export const WrappingChipList: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 2, maxWidth: 220 }}>
      {['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'].map((t) => (
        <Chip key={t} label={t} size="small" />
      ))}
    </Box>
  ),
};

export const WithSxStyles: Story = {
  render: () => (
    <Box
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        color: 'text.primary',
        border: '1px dashed',
        borderColor: 'primary.main',
        borderRadius: 1,
        fontFamily: 'monospace',
      }}
    >
      sx={'{ p: 2, bgcolor, border }'}
    </Box>
  ),
};
