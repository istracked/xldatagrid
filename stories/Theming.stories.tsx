import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import { makeEmployees, defaultColumns } from './data';
import { storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Theming',
};
export default meta;

export const LightTheme: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Light Theme (Default)</h2>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          theme="light"
          sorting
          selectionMode="cell"
        />
      </div>
    </div>
  ),
};

export const DarkTheme: StoryObj = {
  render: () => (
    <div style={{ ...storyContainer, ...styles.themingDarkWrapper }}>
      <h2 style={styles.heading}>Dark Theme</h2>
      <div style={{ ...gridContainer, ...styles.themingDarkGridBorder }}>
        <MuiDataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          theme="dark"
          sorting
          selectionMode="cell"
        />
      </div>
    </div>
  ),
};

export const CustomTheme: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Custom Theme (Purple)</h2>
      <p style={styles.subtitle}>
        Pass a <code>Record&lt;string, string&gt;</code> to set CSS custom properties.
      </p>
      <div style={gridContainer}>
        <MuiDataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          theme={{
            '--dg-primary-color': '#7c3aed',
            '--dg-bg-color': '#faf5ff',
            '--dg-text-color': '#1e1b4b',
            '--dg-border-color': '#ddd6fe',
            '--dg-header-bg': '#ede9fe',
            '--dg-selection-color': '#7c3aed',
            '--dg-hover-bg': '#f5f3ff',
          }}
          sorting
          selectionMode="cell"
        />
      </div>
    </div>
  ),
};

export const ThemeSwitcher: StoryObj = {
  render: () => {
    const [dark, setDark] = useState(false);
    return (
      <div style={{ ...storyContainer, ...styles.themingSwitcherWrapper(dark) }}>
        <div style={styles.flexRowCenter}>
          <h2 style={styles.heading}>Theme Switcher</h2>
          <button
            onClick={() => setDark((d) => !d)}
            style={styles.themingSwitcherButton(dark)}
          >
            Toggle to {dark ? 'Light' : 'Dark'}
          </button>
        </div>
        <div style={{ ...gridContainer, ...styles.themingSwitcherGridBorder(dark) }}>
          <MuiDataGrid
            data={makeEmployees(20)}
            columns={defaultColumns as any}
            rowKey="id"
              theme={dark ? 'dark' : 'light'}
            sorting
            selectionMode="cell"
            keyboardNavigation
          />
        </div>
      </div>
    );
  },
};

export const Theme_Excel365Scoped: StoryObj = {
  name: 'Excel 365 — scoped opt-in (class and data-attr)',
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Excel 365 — Scoped Opt-In</h2>
      <p style={styles.subtitle}>
        The Excel-365 tokens live under <code>.dg-theme-excel365</code> and{' '}
        <code>[data-theme="excel365"]</code> — <strong>not</strong> on{' '}
        <code>:root</code>. That means importing the stylesheet has no effect
        on unrelated grids, and multiple themes can coexist on one page
        without leaking tokens across grid instances.
      </p>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <p style={styles.subtitle}>
            <strong>Class form:</strong>{' '}
            <code>&lt;div className="dg-theme-excel365"&gt;</code> wrapping the
            grid.
          </p>
          <div className="dg-theme-excel365" style={{ ...gridContainer }}>
            <MuiDataGrid
              data={makeEmployees(15)}
              columns={defaultColumns as any}
              rowKey="id"
              sorting
              selectionMode="cell"
              chrome={{ rowNumbers: { position: 'left' } }}
            />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <p style={styles.subtitle}>
            <strong>Data-attribute form:</strong> <code>theme="excel365"</code>{' '}
            on the grid, which renders{' '}
            <code>data-theme="excel365"</code> on the root.
          </p>
          <div style={{ ...gridContainer }}>
            <MuiDataGrid
              data={makeEmployees(15)}
              columns={defaultColumns as any}
              rowKey="id"
              theme="excel365"
              sorting
              selectionMode="cell"
              chrome={{ rowNumbers: { position: 'left' } }}
            />
          </div>
        </div>
      </div>

      <p style={styles.subtitle}>
        Default-themed grid below demonstrates that the Excel-365 tokens are
        <strong> not </strong> leaking onto unrelated instances on the same
        page.
      </p>
      <div style={{ ...gridContainer }}>
        <MuiDataGrid
          data={makeEmployees(8)}
          columns={defaultColumns as any}
          rowKey="id"
          theme="light"
          sorting
          selectionMode="cell"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The Excel-365 tokens are scoped to `.dg-theme-excel365` and `[data-theme="excel365"]` — they are **not** defined on `:root`. This story demonstrates both opt-in forms side by side: a `<div className="dg-theme-excel365">` wrapper on the left, and the `theme="excel365"` prop (which emits `data-theme="excel365"` on the grid root) on the right. A third, default-themed grid is rendered below to confirm that the Excel tokens do not leak onto unrelated instances, so multiple themes can coexist on one page.',
      },
    },
  },
};

export const Theme_RowNumberBg: StoryObj = {
  name: 'Row number gutter token (--dg-row-number-bg)',
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Row Number Gutter Token</h2>
      <p style={styles.subtitle}>
        The new <code>--dg-row-number-bg</code> token controls the row-number
        gutter background. Under the Excel-365 theme it defaults to the Excel
        gutter grey <code>#f3f2f1</code>.
      </p>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <p style={styles.subtitle}>
            <strong>Excel-365 default:</strong> gutter uses{' '}
            <code>#f3f2f1</code>.
          </p>
          <div style={{ ...gridContainer }}>
            <MuiDataGrid
              data={makeEmployees(12)}
              columns={defaultColumns as any}
              rowKey="id"
              theme="excel365"
              sorting
              selectionMode="cell"
              chrome={{ rowNumbers: { position: 'left' } }}
            />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <p style={styles.subtitle}>
            <strong>Custom override:</strong>{' '}
            <code>--dg-row-number-bg: #fef3c7</code> (warm amber).
          </p>
          <div style={{ ...gridContainer }}>
            <MuiDataGrid
              data={makeEmployees(12)}
              columns={defaultColumns as any}
              rowKey="id"
              theme={{
                '--dg-row-number-bg': '#fef3c7',
                '--dg-row-number-text': '#78350f',
              }}
              sorting
              selectionMode="cell"
              chrome={{ rowNumbers: { position: 'left' } }}
            />
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows the new `--dg-row-number-bg` token, which colours the row-number gutter. Under the Excel-365 theme the token defaults to the Excel gutter grey `#f3f2f1`; consumers can override it per grid by passing a `theme` object containing the token. The row-number cell falls back to `--dg-header-bg` when the token is unset, so non-Excel themes remain visually consistent with their header styling.',
      },
    },
  },
};
