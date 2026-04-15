import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import { makeEmployees, defaultColumns } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Column Operations',
};
export default meta;

export const ColumnResize: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Column Resize</h2>
        <p style={styles.subtitle}>
          Drag the right edge of any column header to resize. Double-click to auto-fit.
        </p>
        <div style={gridContainer}>
          <DataGrid
            data={makeEmployees(15)}
            columns={(defaultColumns.map((c) => ({ ...c, resizable: true }))) as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            onColumnResize={(field, width) =>
              setLog((p) => [...p.slice(-4), `${field}: ${width}px`])
            }
          />
        </div>
        <pre style={styles.statePre}>
          {log.length ? log.join('\n') : '(resize a column)'}
        </pre>
      </div>
    );
  },
};

export const ColumnReorder: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Column Reorder (Drag & Drop)</h2>
        <p style={styles.subtitle}>
          Drag a column header to a new position. A blue indicator shows the drop target.
        </p>
        <div style={gridContainer}>
          <DataGrid
            data={makeEmployees(15)}
            columns={(defaultColumns.map((c) => ({ ...c, reorderable: true }))) as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            onColumnReorder={(field, toIndex) =>
              setLog((p) => [...p.slice(-4), `${field} -> index ${toIndex}`])
            }
          />
        </div>
        <pre style={styles.statePre}>
          {log.length ? log.join('\n') : '(drag a column header)'}
        </pre>
      </div>
    );
  },
};

export const ColumnVisibility: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Column Visibility Toggle</h2>
      <p style={styles.subtitle}>
        Click the column visibility toggle to show/hide columns via checkboxes.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          showColumnVisibilityMenu
          sorting
        />
      </div>
    </div>
  ),
};

export const FrozenColumns: StoryObj = {
  render: () => {
    const cols = defaultColumns.map((c, i) => ({
      ...c,
      frozen: i === 0 ? ('left' as const) : undefined,
    }));
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Frozen (Pinned) Columns</h2>
        <p style={styles.subtitle}>
          The "Name" column is frozen to the left. Scroll horizontally — it stays pinned.
        </p>
        <div style={gridContainer}>
          <DataGrid
            data={makeEmployees(20)}
            columns={cols as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            sorting
          />
        </div>
      </div>
    );
  },
};

export const ColumnMenu: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Column Header Menu</h2>
      <p style={styles.subtitle}>
        Hover on a column header to see the menu trigger. Options include sort, hide, and freeze.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          showColumnMenu
          sorting
        />
      </div>
    </div>
  ),
};
