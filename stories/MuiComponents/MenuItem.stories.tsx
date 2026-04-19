import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';

const meta: Meta<typeof MenuItem> = {
  title: 'MUI Components/Inputs/MenuItem',
  component: MenuItem,
  parameters: {
    docs: {
      description: {
        component:
          'MenuItem populates Select dropdowns and menu lists in xldatagrid (MuiStatusCell, MuiListCell).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof MenuItem>;

export const InSelect: Story = {
  render: () => {
    const [value, setValue] = useState('Banana');
    return (
      <div style={{ padding: 16, width: 220 }}>
        <Select size="small" value={value} onChange={(e) => setValue(String(e.target.value))} fullWidth>
          <MenuItem value="Apple">Apple</MenuItem>
          <MenuItem value="Banana">Banana</MenuItem>
          <MenuItem value="Cherry">Cherry</MenuItem>
        </Select>
      </div>
    );
  },
};

export const Standalone: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <Paper sx={{ width: 220 }}>
        <MenuList>
          <MenuItem>Draft</MenuItem>
          <MenuItem selected>Active</MenuItem>
          <MenuItem disabled>Archived</MenuItem>
        </MenuList>
      </Paper>
    </div>
  ),
};

export const Dense: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <Paper sx={{ width: 220 }}>
        <MenuList dense>
          <MenuItem dense>Cell</MenuItem>
          <MenuItem dense>Row</MenuItem>
          <MenuItem dense>Range</MenuItem>
        </MenuList>
      </Paper>
    </div>
  ),
};
