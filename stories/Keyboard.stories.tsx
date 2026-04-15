import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import { makeEmployees, defaultColumns } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Keyboard Navigation',
};
export default meta;

export const FullKeyboardSupport: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Keyboard Navigation</h2>
      <div style={styles.keyboardDescriptionBlock}>
        <table style={styles.keyboardTable}>
          <thead>
            <tr>
              <th style={styles.keyboardTh}>Key</th>
              <th style={styles.keyboardTh}>Action</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Arrow keys', 'Move selection'],
              ['Shift + Arrow', 'Extend range selection'],
              ['Tab / Shift+Tab', 'Move to next/previous cell'],
              ['Enter', 'Start editing / commit + move down'],
              ['Escape', 'Cancel edit / clear selection'],
              ['F2', 'Start editing current cell'],
              ['Space', 'Toggle boolean cells'],
              ['Delete', 'Clear cell value'],
              ['Ctrl+A', 'Select all cells'],
              ['Ctrl+Z', 'Undo'],
              ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'],
              ['Home / End', 'First/last column in row'],
              ['Ctrl+Home / Ctrl+End', 'First/last cell in grid'],
            ].map(([key, desc]) => (
              <tr key={key}>
                <td style={styles.keyboardTdKey}><kbd>{key}</kbd></td>
                <td style={styles.keyboardTdDesc}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(20)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          selectionMode="range"
          keyboardNavigation
          sorting
        />
      </div>
    </div>
  ),
};
