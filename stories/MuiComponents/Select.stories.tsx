import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

const meta: Meta<typeof Select> = {
  title: 'MUI Components/Inputs/Select',
  parameters: {
    docs: {
      description: {
        component:
          'Select backs the dropdown editors in xldatagrid (MuiStatusCell, MuiListCell, EditableSelect) — usually with size="small" and native MenuItems.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const statuses = ['Draft', 'Active', 'Archived'];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('Active');
    return (
      <div style={{ padding: 16, width: 220 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={value} onChange={(e) => setValue(String(e.target.value))}>
            {statuses.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, padding: 16 }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Small</InputLabel>
        <Select label="Small" defaultValue="Active">
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="medium" sx={{ minWidth: 140 }}>
        <InputLabel>Medium</InputLabel>
        <Select label="Medium" defaultValue="Active">
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  ),
};

export const Standard: Story = {
  render: () => (
    <div style={{ padding: 16, width: 220 }}>
      <FormControl variant="standard" fullWidth>
        <InputLabel>Standard</InputLabel>
        <Select label="Standard" defaultValue="Draft">
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ padding: 16, width: 220 }}>
      <FormControl fullWidth size="small" disabled>
        <InputLabel>Disabled</InputLabel>
        <Select label="Disabled" defaultValue="Active">
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div style={{ padding: 16, width: 220 }}>
      <FormControl fullWidth size="small" error>
        <InputLabel>Status</InputLabel>
        <Select label="Status" defaultValue="">
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  ),
};
