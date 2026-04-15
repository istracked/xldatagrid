import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import { makeEmployees, defaultColumns } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
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
        <DataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
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
        <DataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
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
        <DataGrid
          data={makeEmployees(15)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
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
          <DataGrid
            data={makeEmployees(20)}
            columns={defaultColumns as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
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
