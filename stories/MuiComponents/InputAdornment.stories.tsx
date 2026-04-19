import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

const meta: Meta<typeof InputAdornment> = {
  title: 'MUI Components/Inputs/InputAdornment',
  component: InputAdornment,
  parameters: {
    docs: {
      description: {
        component:
          'InputAdornment renders prefix/suffix content inside inputs — used by xldatagrid for currency symbols (MuiCurrencyCell) and password reveal toggle (MuiPasswordCell).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof InputAdornment>;

export const Start: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <TextField
        size="small"
        defaultValue="100.00"
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
        }}
      />
    </div>
  ),
};

export const End: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <TextField
        size="small"
        defaultValue="42"
        slotProps={{
          input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> },
        }}
      />
    </div>
  ),
};

export const InteractiveEnd: Story = {
  render: () => {
    const [show, setShow] = useState(false);
    return (
      <div style={{ padding: 16 }}>
        <TextField
          size="small"
          type={show ? 'text' : 'password'}
          defaultValue="hunter2"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShow((s) => !s)} aria-label="toggle">
                    {show ? 'Hide' : 'Show'}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </div>
    );
  },
};
