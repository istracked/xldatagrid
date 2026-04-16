import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import { makeEmployees, defaultColumns } from './data';
import { storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Chrome Columns',
};
export default meta;

const subsetColumns = defaultColumns.filter((c: any) =>
  ['name', 'department', 'salary'].includes(c.field),
);

export const ControlsOnly: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Controls Column</h2>
        <p style={styles.subtitle}>
          A controls column with View and Edit actions. Click an action to log it below.
        </p>
        <div style={gridContainer}>
          <MuiDataGrid
            data={makeEmployees(10)}
            columns={subsetColumns as any}
            rowKey="id"
            chrome={{
              controls: {
                actions: [
                  {
                    key: 'view',
                    label: 'View',
                    onClick: (rowId: string, rowIndex: number) =>
                      setLog((p) => [...p.slice(-4), `View row ${rowId} (index ${rowIndex})`]),
                  },
                  {
                    key: 'edit',
                    label: 'Edit',
                    onClick: (rowId: string, rowIndex: number) =>
                      setLog((p) => [...p.slice(-4), `Edit row ${rowId} (index ${rowIndex})`]),
                  },
                ],
              },
            }}
          />
        </div>
        <pre style={styles.logPre}>
          {log.length ? log.join('\n') : '(click a row action)'}
        </pre>
      </div>
    );
  },
};

export const RowNumbersOnly: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Numbers</h2>
      <p style={styles.subtitle}>
        A row-number column is shown on the left. Row selection is enabled.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(10)}
          columns={defaultColumns as any}
          rowKey="id"
          selectionMode="row"
          chrome={{
            rowNumbers: true,
          }}
        />
      </div>
    </div>
  ),
};

export const ControlsAndRowNumbers: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Controls + Row Numbers</h2>
      <p style={styles.subtitle}>
        Both a row-number column and a controls column with a View action.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(10)}
          columns={defaultColumns as any}
          rowKey="id"
          chrome={{
            controls: {
              actions: [
                { key: 'view', label: 'View' },
              ],
            },
            rowNumbers: true,
          }}
        />
      </div>
    </div>
  ),
};

export const CustomActions: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Custom Rendered Actions</h2>
        <p style={styles.subtitle}>
          Actions use custom render functions to display emoji icons instead of text labels.
        </p>
        <div style={gridContainer}>
          <MuiDataGrid
            data={makeEmployees(10)}
            columns={defaultColumns as any}
            rowKey="id"
            chrome={{
              controls: {
                actions: [
                  {
                    key: 'view',
                    label: 'View',
                    render: () => '\u{1F441}',
                    onClick: (rowId: string, rowIndex: number) =>
                      setLog((p) => [...p.slice(-4), `View row ${rowId} (index ${rowIndex})`]),
                  },
                  {
                    key: 'edit',
                    label: 'Edit',
                    render: () => '\u270F\uFE0F',
                    onClick: (rowId: string, rowIndex: number) =>
                      setLog((p) => [...p.slice(-4), `Edit row ${rowId} (index ${rowIndex})`]),
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    render: () => '\u{1F5D1}',
                    onClick: (rowId: string, rowIndex: number) =>
                      setLog((p) => [...p.slice(-4), `Delete row ${rowId} (index ${rowIndex})`]),
                  },
                ],
              },
            }}
          />
        </div>
        <pre style={styles.logPre}>
          {log.length ? log.join('\n') : '(click an action icon)'}
        </pre>
      </div>
    );
  },
};

export const DragReorder: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Drag to Reorder Rows</h2>
        <p style={styles.subtitle}>
          Row numbers are shown with a drag handle. Drag a row to reorder it.
        </p>
        <div style={gridContainer}>
          <MuiDataGrid
            data={makeEmployees(10)}
            columns={defaultColumns as any}
            rowKey="id"
            chrome={{
              rowNumbers: { reorderable: true },
            }}
            onRowReorder={(fromIndex: number, toIndex: number) =>
              setLog((p) => [...p.slice(-4), `Moved row from index ${fromIndex} to ${toIndex}`])
            }
          />
        </div>
        <pre style={styles.logPre}>
          {log.length ? log.join('\n') : '(drag a row to reorder)'}
        </pre>
      </div>
    );
  },
};
