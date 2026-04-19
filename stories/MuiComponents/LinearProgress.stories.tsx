import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import LinearProgress from '@mui/material/LinearProgress';

const meta: Meta<typeof LinearProgress> = {
  title: 'MUI Components/Feedback/LinearProgress',
  component: LinearProgress,
  parameters: {
    docs: {
      description: {
        component:
          'LinearProgress reports upload progress inside xldatagrid cells (MuiUploadCell) — used both indeterminate and with a numeric value.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof LinearProgress>;

export const Indeterminate: Story = {
  render: () => (
    <div style={{ padding: 16, width: 240 }}>
      <LinearProgress />
    </div>
  ),
};

export const Determinate: Story = {
  render: () => (
    <div style={{ padding: 16, width: 240 }}>
      <LinearProgress variant="determinate" value={42} />
    </div>
  ),
};

export const Buffer: Story = {
  render: () => (
    <div style={{ padding: 16, width: 240 }}>
      <LinearProgress variant="buffer" value={35} valueBuffer={55} />
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ padding: 16, width: 240, display: 'grid', gap: 8 }}>
      <LinearProgress color="primary" />
      <LinearProgress color="secondary" />
      <LinearProgress color="success" variant="determinate" value={80} />
      <LinearProgress color="error" variant="determinate" value={20} />
    </div>
  ),
};
