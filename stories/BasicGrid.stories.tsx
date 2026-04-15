import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import { makeEmployees, defaultColumns } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Basic Grid',
};
export default meta;

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

export const Default: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Basic DataGrid</h2>
      <p style={styles.subtitle}>
        50 rows, sorting enabled, filterable columns. Double-click a cell to edit.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(50)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          sorting={{ mode: 'multi' }}
          filtering
          selectionMode="cell"
          keyboardNavigation
        />
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Read Only
// ---------------------------------------------------------------------------

export const ReadOnly: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Read-Only Grid</h2>
      <p style={styles.subtitle}>
        All editing disabled. Sort and select still work.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(20)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          readOnly
          sorting
        />
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Large Dataset
// ---------------------------------------------------------------------------

export const LargeDataset: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Large Dataset (500 rows)</h2>
      <p style={styles.subtitle}>
        Virtualized rendering for performance. Scroll to verify smooth behaviour.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(500)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          sorting={{ mode: 'multi' }}
          selectionMode="range"
          keyboardNavigation
        />
      </div>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

export const EmptyGrid: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Empty Grid</h2>
      <p style={styles.subtitle}>
        No data rows — the grid shows column headers only.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={[]}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
        />
      </div>
    </div>
  ),
};
