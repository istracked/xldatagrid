import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

const meta: Meta<typeof Chip> = {
  title: 'MUI Components/Data Display/Chip',
  component: Chip,
  parameters: {
    docs: {
      description: {
        component:
          'Chip displays tag-list values in xldatagrid (MuiTagsCell, MuiChipSelectCell, MuiCompoundChipListCell, MuiStatusCell, MuiSubGridCell). Usually size="small".',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: { label: 'Tag', size: 'small' },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16 }}>
      <Chip label="Filled" size="small" variant="filled" />
      <Chip label="Outlined" size="small" variant="outlined" />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16, flexWrap: 'wrap' }}>
      <Chip label="Draft" size="small" color="default" />
      <Chip label="Active" size="small" color="primary" />
      <Chip label="Success" size="small" color="success" />
      <Chip label="Warning" size="small" color="warning" />
      <Chip label="Error" size="small" color="error" />
    </div>
  ),
};

export const Deletable: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 2 }}>
      {['Apple', 'Banana', 'Cherry'].map((t) => (
        <Chip key={t} label={t} size="small" onDelete={() => undefined} />
      ))}
    </Box>
  ),
};

export const Clickable: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <Chip label="Click me" size="small" onClick={() => undefined} color="primary" />
    </div>
  ),
};
