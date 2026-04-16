import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import { makeEmployees, defaultColumns } from './data';
import { storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Clipboard',
};
export default meta;

export const CopyPaste: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Copy / Paste / Cut</h2>
        <p style={styles.subtitle}>
          Select a cell or range, then use <kbd>Ctrl+C</kbd> to copy, <kbd>Ctrl+X</kbd> to cut, and <kbd>Ctrl+V</kbd> to paste.
          Hold <kbd>Shift</kbd> + arrow keys to extend the selection before copying.
        </p>
        <div style={gridContainer}>
          <MuiDataGrid
            data={makeEmployees(15)}
            columns={defaultColumns as any}
            rowKey="id"
            selectionMode="range"
            keyboardNavigation
            onCellEdit={(rowId, field, value, prev) =>
              setLog((p) => [...p.slice(-9), `[${rowId}].${field}: ${String(prev)} -> ${String(value)}`])
            }
          />
        </div>
        <pre style={styles.logPre}>
          {log.length ? log.join('\n') : '(clipboard events will appear here)'}
        </pre>
      </div>
    );
  },
};

const crossGridContainer: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  flex: 1,
  minHeight: 0,
};

const halfGrid: React.CSSProperties = {
  flex: 1,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  overflow: 'hidden',
};

export const CrossGridPaste: StoryObj = {
  render: () => {
    const [logA, setLogA] = useState<string[]>([]);
    const [logB, setLogB] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Cross-Grid Paste</h2>
        <p style={styles.subtitle}>
          Select and copy cells from the left grid (<kbd>Ctrl+C</kbd>), then click a cell in the right grid and paste (<kbd>Ctrl+V</kbd>).
        </p>
        <div style={crossGridContainer}>
          <div style={halfGrid}>
            <MuiDataGrid
              data={makeEmployees(15)}
              columns={defaultColumns as any}
              rowKey="id"
              selectionMode="range"
              keyboardNavigation
              onCellEdit={(rowId, field, value, prev) =>
                setLogA((p) => [...p.slice(-4), `A: [${rowId}].${field}: ${String(prev)} -> ${String(value)}`])
              }
            />
          </div>
          <div style={halfGrid}>
            <MuiDataGrid
              data={makeEmployees(15)}
              columns={defaultColumns as any}
              rowKey="id"
              selectionMode="range"
              keyboardNavigation
              onCellEdit={(rowId, field, value, prev) =>
                setLogB((p) => [...p.slice(-4), `B: [${rowId}].${field}: ${String(prev)} -> ${String(value)}`])
              }
            />
          </div>
        </div>
        <pre style={styles.logPre}>
          {[...logA, ...logB].length
            ? [...logA, ...logB].join('\n')
            : '(copy from Grid A, paste into Grid B)'}
        </pre>
      </div>
    );
  },
};

export const PasteFromExcel: StoryObj = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Paste from Excel / Google Sheets</h2>
        <p style={styles.subtitle}>
          Copy a range of cells from Excel or Google Sheets, click a target cell below, and press <kbd>Ctrl+V</kbd>.
          Tab-separated text is automatically parsed into rows and columns.
        </p>
        <div style={gridContainer}>
          <MuiDataGrid
            data={makeEmployees(15)}
            columns={defaultColumns as any}
            rowKey="id"
            selectionMode="range"
            keyboardNavigation
            onCellEdit={(rowId, field, value, prev) =>
              setLog((p) => [...p.slice(-9), `[${rowId}].${field}: ${String(prev)} -> ${String(value)}`])
            }
          />
        </div>
        <pre style={styles.logPre}>
          {log.length ? log.join('\n') : '(paste from an external spreadsheet to see events)'}
        </pre>
      </div>
    );
  },
};
