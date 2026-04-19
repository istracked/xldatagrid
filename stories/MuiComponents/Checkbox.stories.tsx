import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Checkbox from '@mui/material/Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'MUI Components/Inputs/Checkbox',
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component:
          'Checkbox is the boolean cell editor in xldatagrid (MuiBooleanCell). Typically rendered at size="small".',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <div style={{ padding: 16 }}>
        <Checkbox checked={checked} onChange={(_, v) => setChecked(v)} />
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox size="small" defaultChecked />
      <Checkbox size="medium" defaultChecked />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox defaultChecked color="primary" />
      <Checkbox defaultChecked color="secondary" />
      <Checkbox defaultChecked color="success" />
      <Checkbox defaultChecked color="error" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
      <Checkbox defaultChecked disabled />
      <Checkbox disabled />
      <Checkbox indeterminate />
    </div>
  ),
};
