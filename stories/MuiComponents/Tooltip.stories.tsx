import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Undo from '@mui/icons-material/Undo';

const meta: Meta<typeof Tooltip> = {
  title: 'MUI Components/Data Display/Tooltip',
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          'Tooltip labels inline icon controls in xldatagrid (MuiActionsCell). Always attach to a focusable child for accessibility.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: 32 }}>
      <Tooltip title="Undo last change">
        <IconButton aria-label="undo"><Undo /></IconButton>
      </Tooltip>
    </div>
  ),
};

export const Placements: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, padding: 48 }}>
      <Tooltip title="Top" placement="top"><Button variant="outlined">Top</Button></Tooltip>
      <Tooltip title="Right" placement="right"><Button variant="outlined">Right</Button></Tooltip>
      <Tooltip title="Bottom" placement="bottom"><Button variant="outlined">Bottom</Button></Tooltip>
      <Tooltip title="Left" placement="left"><Button variant="outlined">Left</Button></Tooltip>
    </div>
  ),
};

export const Arrow: Story = {
  render: () => (
    <div style={{ padding: 32 }}>
      <Tooltip title="With arrow" arrow>
        <Button variant="outlined">Hover me</Button>
      </Tooltip>
    </div>
  ),
};

export const DisabledChildWrapper: Story = {
  render: () => (
    <div style={{ padding: 32 }}>
      <Tooltip title="Disabled buttons need a wrapping span">
        <span>
          <Button variant="contained" disabled>Disabled</Button>
        </span>
      </Tooltip>
    </div>
  ),
};
