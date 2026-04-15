import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import type { ContextMenuConfig } from '@istracked/datagrid-core';
import { makeEmployees, defaultColumns } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Context Menu',
};
export default meta;

export const DefaultContextMenu: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Default Context Menu</h2>
      <p style={styles.subtitle}>
        Right-click any cell to open the built-in context menu.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          contextMenu
          sorting
          selectionMode="cell"
          keyboardNavigation
        />
      </div>
    </div>
  ),
};

export const CustomContextMenu: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    const menuConfig: ContextMenuConfig = {
      items: [
        {
          key: 'copy',
          label: 'Copy Cell',
          shortcut: 'Ctrl+C',
          onClick: ({ rowId, field }) => setLog((p) => [...p.slice(-4), `Copy: [${rowId}].${field}`]),
        },
        {
          key: 'paste',
          label: 'Paste',
          shortcut: 'Ctrl+V',
          onClick: () => setLog((p) => [...p.slice(-4), 'Paste triggered']),
          dividerAfter: true,
        },
        {
          key: 'delete-row',
          label: 'Delete Row',
          danger: true,
          onClick: ({ rowId }) => setLog((p) => [...p.slice(-4), `Delete row: ${rowId}`]),
        },
        {
          key: 'export',
          label: 'Export',
          children: [
            { key: 'csv', label: 'As CSV', onClick: () => setLog((p) => [...p.slice(-4), 'Export CSV']) },
            { key: 'pdf', label: 'As PDF', onClick: () => setLog((p) => [...p.slice(-4), 'Export PDF']) },
          ],
          onClick: () => {},
        },
      ],
    };
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Custom Context Menu Items</h2>
        <p style={styles.subtitle}>
          Right-click to see custom items including a nested "Export" submenu and a danger "Delete Row" action.
        </p>
        <div style={gridContainer}>
          <DataGrid
            data={makeEmployees(10)}
            columns={defaultColumns as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            contextMenu={menuConfig}
            sorting
            selectionMode="cell"
          />
        </div>
        <pre style={styles.logPre}>
          {log.length ? log.join('\n') : '(right-click and choose an action)'}
        </pre>
      </div>
    );
  },
};
