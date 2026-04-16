import React, { useState, useCallback, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import { createExcelMode } from '@istracked/datagrid-extensions';
import type { ExcelModeConfig } from '@istracked/datagrid-extensions';
import { makeEmployees, defaultColumns, Employee } from './data';
import { storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Excel Mode',
};
export default meta;

// ---------------------------------------------------------------------------
// Shared control panel
// ---------------------------------------------------------------------------

interface ExcelModeControlsProps {
  autoSave: boolean;
  enterDirection: 'down' | 'right';
  tabWrap: boolean;
  editOnKeypress: boolean;
  onAutoSaveChange: (v: boolean) => void;
  onEnterDirectionChange: (v: 'down' | 'right') => void;
  onTabWrapChange: (v: boolean) => void;
  onEditOnKeypressChange: (v: boolean) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 4,
  border: '1px solid #e2e8f0',
  fontSize: 13,
};

function ExcelModeControls({
  autoSave,
  enterDirection,
  tabWrap,
  editOnKeypress,
  onAutoSaveChange,
  onEnterDirectionChange,
  onTabWrapChange,
  onEditOnKeypressChange,
}: ExcelModeControlsProps) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={autoSave}
          onChange={(e) => onAutoSaveChange(e.target.checked)}
        />
        Auto-save
      </label>
      <label style={labelStyle}>
        Enter direction:
        <select
          style={selectStyle}
          value={enterDirection}
          onChange={(e) => onEnterDirectionChange(e.target.value as 'down' | 'right')}
        >
          <option value="down">Down</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={tabWrap}
          onChange={(e) => onTabWrapChange(e.target.checked)}
        />
        Tab wrap
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={editOnKeypress}
          onChange={(e) => onEditOnKeypressChange(e.target.checked)}
        />
        Edit on keypress
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default story — full interactive controls
// ---------------------------------------------------------------------------

export const Default: StoryObj = {
  render: () => {
    const [data, setData] = useState(() => makeEmployees(20));
    const [autoSave, setAutoSave] = useState(true);
    const [enterDirection, setEnterDirection] = useState<'down' | 'right'>('down');
    const [tabWrap, setTabWrap] = useState(true);
    const [editOnKeypress, setEditOnKeypress] = useState(true);
    const [log, setLog] = useState<string[]>([]);

    const addLog = useCallback((msg: string) => {
      setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30));
    }, []);

    const handleCellChange = useCallback(
      (rowId: string, field: string, value: any) => {
        setData((prev) =>
          prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
        );
        if (autoSave) {
          addLog(`Auto-saved: row ${rowId}, ${field} = ${JSON.stringify(value)}`);
        }
      },
      [autoSave, addLog],
    );

    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Excel Mode Extension</h2>
        <p style={styles.subtitle}>
          Spreadsheet-style navigation: Tab moves right (wraps to next row), Enter moves{' '}
          {enterDirection === 'down' ? 'down' : 'right'}. Toggle the controls below to change
          behaviour.
        </p>
        <ExcelModeControls
          autoSave={autoSave}
          enterDirection={enterDirection}
          tabWrap={tabWrap}
          editOnKeypress={editOnKeypress}
          onAutoSaveChange={setAutoSave}
          onEnterDirectionChange={setEnterDirection}
          onTabWrapChange={setTabWrap}
          onEditOnKeypressChange={setEditOnKeypress}
        />
        <div style={gridContainer}>
          <MuiDataGrid
            data={data}
            columns={defaultColumns as any}
            rowKey="id"
            selectionMode="cell"
            keyboardNavigation
            onCellValueChange={handleCellChange}
          />
        </div>
        {log.length > 0 && (
          <pre style={styles.logPre}>
            {log.join('\n')}
          </pre>
        )}
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// Enter-goes-right variant
// ---------------------------------------------------------------------------

export const EnterGoesRight: StoryObj = {
  render: () => {
    const [data, setData] = useState(() => makeEmployees(10));

    const handleCellChange = useCallback((rowId: string, field: string, value: any) => {
      setData((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
      );
    }, []);

    const ext = useRef(
      createExcelMode({
        enterDirection: 'right',
        tabWrap: true,
        editOnKeypress: true,
      }),
    );

    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Excel Mode — Enter Goes Right</h2>
        <p style={styles.subtitle}>
          Configured so that pressing Enter moves the selection right instead of down — useful for
          horizontal data entry workflows.
        </p>
        <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
          <span style={{ background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
            Enter: right
          </span>
          <span style={{ background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
            Tab wrap: on
          </span>
          <span style={{ background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
            Edit on keypress: on
          </span>
        </div>
        <div style={gridContainer}>
          <MuiDataGrid
            data={data}
            columns={defaultColumns as any}
            rowKey="id"
            selectionMode="cell"
            keyboardNavigation
            onCellValueChange={handleCellChange}
          />
        </div>
      </div>
    );
  },
};
