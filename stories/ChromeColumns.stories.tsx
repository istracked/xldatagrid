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

// Wide column set used by the row-number gutter stories to force horizontal
// scrolling, which exercises the sticky-left pin behaviour of the gutter.
const wideColumns = defaultColumns.map((c: any) => ({
  ...c,
  width: Math.max(c.width ?? 140, 180) + 80,
}));

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

export const RowNumbers_LeftGutter: StoryObj = {
  parameters: {
    docs: {
      description: {
        story: 'scroll horizontally; the gutter stays pinned',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Numbers — Left Gutter (Excel 365 default)</h2>
      <p style={styles.subtitle}>
        Default position is <code>left</code>. The column set is intentionally
        wide: scroll horizontally and notice that the row-number gutter stays
        pinned at <code>left: 0</code> while the data columns scroll beneath it.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(20)}
          columns={wideColumns as any}
          rowKey="id"
          chrome={{
            rowNumbers: true,
          }}
        />
      </div>
    </div>
  ),
};

export const RowNumbers_RightGutter: StoryObj = {
  parameters: {
    docs: {
      description: {
        story:
          'Opt-in right-side gutter via `chrome.rowNumbers.position: "right"`. The gutter floats after the last data column and scrolls with the body.',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Numbers — Right Gutter (opt-in)</h2>
      <p style={styles.subtitle}>
        Opt in to legacy/right placement with{' '}
        <code>{'chrome: { rowNumbers: { position: \'right\' } }'}</code>.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          chrome={{
            rowNumbers: { position: 'right' },
          }}
        />
      </div>
    </div>
  ),
};

export const RowNumbers_WithControlsColumn: StoryObj = {
  parameters: {
    docs: {
      description: {
        story:
          'Left gutter sitting immediately after a controls column. The gutter\'s `stickyLeft` offset equals the controls-column width, so both chrome columns stay pinned during horizontal scroll, with the row-number gutter aligned to the right edge of the controls column.',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Numbers — With Controls Column</h2>
      <p style={styles.subtitle}>
        Controls column + left row-number gutter. Scroll horizontally: both
        chrome columns stay pinned, and the gutter sits at the controls-column
        width, not at <code>0</code>.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(20)}
          columns={wideColumns as any}
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

export const RowNumbers_StyledByTheme: StoryObj = {
  parameters: {
    docs: {
      description: {
        story:
          'Rendered with the `dg-theme-excel365` class. The Excel-gutter grey comes from the `--dg-row-number-bg` token defined in the theme stylesheet; it is NOT set via inline styles on the cell.',
      },
    },
  },
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Numbers — Styled by Theme</h2>
      <p style={styles.subtitle}>
        The row-number gutter background resolves from{' '}
        <code>--dg-row-number-bg</code>, which is only defined under the{' '}
        <code>.dg-theme-excel365</code> scope. No inline colour is applied to
        the cell.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          className="dg-theme-excel365"
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
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
