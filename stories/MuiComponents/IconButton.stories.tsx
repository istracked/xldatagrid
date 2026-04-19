import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import IconButton from '@mui/material/IconButton';
import Undo from '@mui/icons-material/Undo';
import Redo from '@mui/icons-material/Redo';
import FilterList from '@mui/icons-material/FilterList';

const meta: Meta<typeof IconButton> = {
  title: 'MUI Components/Buttons/IconButton',
  component: IconButton,
  parameters: {
    docs: {
      description: {
        component:
          'IconButton wraps inline actions in xldatagrid cells (MuiActionsCell, MuiPasswordCell reveal toggle). Paired with @mui/icons-material glyphs.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <IconButton aria-label="filter">
        <FilterList />
      </IconButton>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16, alignItems: 'center' }}>
      <IconButton size="small" aria-label="small"><Undo fontSize="small" /></IconButton>
      <IconButton size="medium" aria-label="medium"><Undo /></IconButton>
      <IconButton size="large" aria-label="large"><Undo fontSize="large" /></IconButton>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16 }}>
      <IconButton color="primary" aria-label="primary"><Undo /></IconButton>
      <IconButton color="secondary" aria-label="secondary"><Redo /></IconButton>
      <IconButton color="error" aria-label="error"><FilterList /></IconButton>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <IconButton disabled aria-label="disabled"><Undo /></IconButton>
    </div>
  ),
};
