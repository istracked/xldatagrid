import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import type { SortState } from '@istracked/datagrid-core';
import { makeEmployees, defaultColumns } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Sorting',
};
export default meta;

export const SingleSort: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Single Column Sort</h2>
      <p style={styles.subtitle}>Click a column header to sort. Click again to reverse.</p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(30)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          sorting={{ mode: 'single' }}
        />
      </div>
    </div>
  ),
};

export const MultiSort: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Multi-Column Sort</h2>
      <p style={styles.subtitle}>
        Hold <kbd>Shift</kbd> and click additional column headers to add secondary sorts. Priority numbers appear next to arrows.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(30)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          sorting={{ mode: 'multi' }}
        />
      </div>
    </div>
  ),
};

export const SortChangeCallback: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>onSortChange Callback</h2>
        <p style={styles.subtitle}>Sort events are logged below the grid.</p>
        <div style={gridContainer}>
          <DataGrid
            data={makeEmployees(15)}
            columns={defaultColumns as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            sorting={{ mode: 'multi' }}
            onSortChange={(s: SortState) =>
              setLog((prev) => [...prev.slice(-4), JSON.stringify(s)])
            }
          />
        </div>
        <pre style={styles.logPre}>
          {log.length ? log.join('\n') : '(sort a column to see events)'}
        </pre>
      </div>
    );
  },
};
