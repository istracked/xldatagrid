import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

const meta: Meta<typeof Accordion> = {
  title: 'MUI Components/Surfaces/Accordion',
  component: Accordion,
  parameters: {
    docs: {
      description: {
        component:
          'Accordion, AccordionSummary, and AccordionDetails power the collapsible sub-grid cell in xldatagrid (MuiSubGridCell).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: 16, width: 360 }}>
      <Accordion>
        <AccordionSummary>Summary</AccordionSummary>
        <AccordionDetails>Expanded details go here.</AccordionDetails>
      </Accordion>
    </div>
  ),
};

export const DefaultExpanded: Story = {
  render: () => (
    <div style={{ padding: 16, width: 360 }}>
      <Accordion defaultExpanded>
        <AccordionSummary>Already open</AccordionSummary>
        <AccordionDetails>Renders expanded on mount.</AccordionDetails>
      </Accordion>
    </div>
  ),
};

export const WithChipSummary: Story = {
  render: () => (
    <div style={{ padding: 16, width: 420 }}>
      <Accordion>
        <AccordionSummary>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>Sub-items</span>
            <Chip label="3" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <div>Row A</div>
            <div>Row B</div>
            <div>Row C</div>
          </Box>
        </AccordionDetails>
      </Accordion>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ padding: 16, width: 360 }}>
      <Accordion disabled>
        <AccordionSummary>Disabled</AccordionSummary>
        <AccordionDetails>Cannot expand.</AccordionDetails>
      </Accordion>
    </div>
  ),
};
