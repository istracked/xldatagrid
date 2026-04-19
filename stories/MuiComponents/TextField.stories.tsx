import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

const meta: Meta<typeof TextField> = {
  title: 'MUI Components/Inputs/TextField',
  component: TextField,
  parameters: {
    docs: {
      description: {
        component:
          'TextField is the primary text-input surface used by xldatagrid editable cells (MuiTextCell, MuiNumericCell, MuiCurrencyCell, MuiPasswordCell, EditableTextField).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {
  args: { label: 'Label', placeholder: 'Type here' },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, padding: 16 }}>
      <TextField size="small" label="Small" defaultValue="small" />
      <TextField size="medium" label="Medium" defaultValue="medium" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, padding: 16 }}>
      <TextField variant="outlined" label="Outlined" defaultValue="outlined" />
      <TextField variant="filled" label="Filled" defaultValue="filled" />
      <TextField variant="standard" label="Standard" defaultValue="standard" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, padding: 16 }}>
      <TextField label="Disabled" defaultValue="can't edit" disabled />
      <TextField label="Error" defaultValue="bad" error helperText="Invalid value" />
      <TextField label="Required" defaultValue="" required helperText="Required field" />
    </div>
  ),
};

export const WithAdornment: Story = {
  render: () => {
    const [value, setValue] = useState('100.00');
    return (
      <div style={{ padding: 16 }}>
        <TextField
          label="Currency"
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            },
          }}
        />
      </div>
    );
  },
};
