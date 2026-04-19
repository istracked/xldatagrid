import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

const options = ['Apple', 'Banana', 'Cherry', 'Durian', 'Elderberry', 'Fig'];

const meta: Meta<typeof Autocomplete> = {
  title: 'MUI Components/Inputs/Autocomplete',
  parameters: {
    docs: {
      description: {
        component:
          'Autocomplete drives the multi-value editors in xldatagrid (MuiTagsCell, MuiChipSelectCell, EditableAutocomplete) — used with multiple and freeSolo to capture chip lists.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ padding: 16, width: 320 }}>
      <Autocomplete
        options={options}
        renderInput={(params) => <TextField {...params} label="Fruit" size="small" />}
      />
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div style={{ padding: 16, width: 360 }}>
      <Autocomplete
        multiple
        options={options}
        defaultValue={['Apple', 'Banana']}
        renderInput={(params) => <TextField {...params} label="Fruits" size="small" />}
      />
    </div>
  ),
};

export const FreeSolo: Story = {
  render: () => (
    <div style={{ padding: 16, width: 360 }}>
      <Autocomplete
        multiple
        freeSolo
        options={options}
        defaultValue={['Custom tag', 'Apple']}
        renderInput={(params) => <TextField {...params} label="Tags" size="small" />}
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ padding: 16, width: 320 }}>
      <Autocomplete
        disabled
        options={options}
        defaultValue="Apple"
        renderInput={(params) => <TextField {...params} label="Fruit (disabled)" size="small" />}
      />
    </div>
  ),
};
