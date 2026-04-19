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
          'Clicking anywhere on a row selects the entire row. Both row-number gutter clicks and clicks inside the row body are routed through the same chrome-column row-click handler (issue #15), so there is a single "select this row" code path. Shift/Ctrl modifiers still extend or toggle the selection.',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Selection</h2>
      <p style={styles.subtitle}>
        Click anywhere on a row to select the entire row — clicks on a data
        cell and clicks on the row-number gutter share the chrome click
        handler.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(20)}
          columns={defaultColumns as any}
          rowKey="id"
          selectionMode="row"
          keyboardNavigation
          chrome={{ rowNumbers: true }}
        />
      </div>
    </div>
  ),
};

export const RangeSelection: StoryObj = {
  parameters: {
    docs: {
      description: {
        story:
          'Range selection with Shift + click drag. With the default `shiftArrowBehavior: "scroll"`, Shift + arrow keys pan the viewport instead of extending the range — see the `RangeSelectionKeyboard` story for opt-in keyboard-driven range extension.',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Range Selection</h2>
      <p style={styles.subtitle}>
        Click a cell, then Shift + click another cell to select a rectangular range. <kbd>Ctrl+A</kbd> selects all.
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

/**
 * Demonstrates the opt-in `shiftArrowBehavior: 'rangeSelect'` mode where
 * Shift + Arrow extends the rectangle one cell per keystroke while keeping
 * the anchor fixed.
 */
export const RangeSelectionKeyboard: StoryObj = {
  parameters: {
    docs: {
      description: {
        story:
          'Keyboard-driven range selection via `shiftArrowBehavior: "rangeSelect"`. Click a cell, then Shift + arrow keys extend the range one cell at a time; every intermediate cell is included. Multi-cell ranges render with a tinted background so the shape reads as a cohesive block.',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Keyboard Range Selection</h2>
      <p style={styles.subtitle}>
        Click a cell, then hold <kbd>Shift</kbd> + arrow keys to grow the selection rectangle one cell at a time.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(20)}
          columns={defaultColumns as any}
          rowKey="id"
          selectionMode="range"
          keyboardNavigation
          shiftArrowBehavior="rangeSelect"
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
