import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import type { CellRange } from '@istracked/datagrid-core';
import { makeEmployees, defaultColumns } from './data';
import { storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Selection',
};
export default meta;

export const CellSelection: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Cell Selection</h2>
      <p style={styles.subtitle}>Click a cell to select it. Use arrow keys to navigate.</p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(20)}
          columns={defaultColumns as any}
          rowKey="id"
          selectionMode="cell"
          keyboardNavigation
        />
      </div>
    </div>
  ),
};

export const RowSelection: StoryObj = {
  parameters: {
    docs: {
      description: {
        story:
          'Clicking anywhere on a row selects the entire row. When the row-number gutter is enabled, clicking a row-number cell also selects the row — the new sticky-left positioning of the gutter does not change this behaviour; shift/ctrl modifiers still extend or toggle the selection.',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Selection</h2>
      <p style={styles.subtitle}>Click a row to select the entire row.</p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(20)}
          columns={defaultColumns as any}
          rowKey="id"
          selectionMode="row"
          keyboardNavigation
        />
      </div>
    </div>
  ),
};

export const RangeSelection: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Range Selection</h2>
      <p style={styles.subtitle}>
        Click a cell then hold <kbd>Shift</kbd> + arrow keys to extend the selection. <kbd>Ctrl+A</kbd> selects all.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(20)}
          columns={defaultColumns as any}
          rowKey="id"
          selectionMode="range"
          keyboardNavigation
        />
      </div>
    </div>
  ),
};

export const SelectionCallback: StoryObj = {
  render: () => {
    const [sel, setSel] = useState<string>('(none)');
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>onSelectionChange</h2>
        <p style={styles.subtitle}>Selection state is logged below the grid.</p>
        <div style={gridContainer}>
          <MuiDataGrid
            data={makeEmployees(15)}
            columns={defaultColumns as any}
            rowKey="id"
              selectionMode="range"
            keyboardNavigation
            onSelectionChange={(r: CellRange | null) => setSel(r ? JSON.stringify(r) : '(cleared)')}
          />
        </div>
        <pre style={styles.statePre}>{sel}</pre>
      </div>
    );
  },
};
