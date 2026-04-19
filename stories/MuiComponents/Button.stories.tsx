import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Button from '@mui/material/Button';

const meta: Meta<typeof Button> = {
  title: 'MUI Components/Buttons/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          'Button is used by xldatagrid action cells (MuiActionsCell, MuiCompoundChipListCell, MuiUploadCell) — typically small with variant="outlined" or "contained".',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: 'Click me' },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16 }}>
      <Button variant="text">Text</Button>
      <Button variant="outlined">Outlined</Button>
      <Button variant="contained">Contained</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16, alignItems: 'center' }}>
      <Button size="small" variant="contained">Small</Button>
      <Button size="medium" variant="contained">Medium</Button>
      <Button size="large" variant="contained">Large</Button>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16 }}>
      <Button variant="contained" color="primary">Primary</Button>
      <Button variant="contained" color="secondary">Secondary</Button>
      <Button variant="contained" color="success">Success</Button>
      <Button variant="contained" color="error">Error</Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, padding: 16 }}>
      <Button variant="outlined" disabled>Outlined</Button>
      <Button variant="contained" disabled>Contained</Button>
    </div>
  ),
};
