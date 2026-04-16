import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Reference/MUI Components',
};
export default meta;

const cellRenderers: [string, string, string][] = [
  ['MuiTextCell', 'TextField, Typography', 'text'],
  ['MuiNumericCell', 'TextField, Typography', 'numeric'],
  ['MuiCurrencyCell', 'TextField, InputAdornment, Typography', 'currency'],
  ['MuiBooleanCell', 'Checkbox', 'boolean'],
  ['MuiCalendarCell', 'TextField (date), Typography', 'calendar'],
  ['MuiStatusCell', 'Select, MenuItem, Chip', 'status'],
  ['MuiTagsCell', 'Autocomplete, Chip, TextField, Box', 'tags'],
  ['MuiChipSelectCell', 'Autocomplete, Chip, TextField, Box', 'chipSelect'],
  ['MuiCompoundChipListCell', 'Chip, Box, Button, TextField', 'compoundChipList'],
  ['MuiListCell', 'Select, MenuItem, Typography', 'list'],
  ['MuiPasswordCell', 'TextField, IconButton, InputAdornment, Box', 'password'],
  ['MuiRichTextCell', 'Box', 'richText'],
  ['MuiUploadCell', 'Button, LinearProgress, Box, Typography', 'upload'],
  ['MuiSubGridCell', 'Accordion, AccordionSummary, AccordionDetails, Chip, Box', 'subGrid'],
  ['MuiActionsCell', 'IconButton, Tooltip, Box, Button', 'actions'],
];

const wrapperComponents: [string, string][] = [
  ['MuiDataGrid', 'Wraps DataGrid with automatic MUI cell renderers'],
  ['MuiDataGridThemeProvider', 'Bridges MUI theme to datagrid CSS variables'],
  ['bridgeMuiTheme', 'Converts MUI theme shape to CSS custom properties'],
];

export const ComponentList: StoryObj = {
  render: () => (
    <div style={styles.introWrapper}>
      <h1 style={styles.introTitle}>MUI Component Reference</h1>
      <p style={styles.introSubtitle}>
        Every MUI component wrapped by datagrid-mui cell renderers, plus the top-level wrapper utilities.
      </p>

      <h2>Cell Renderers</h2>
      <table style={styles.introTable}>
        <thead>
          <tr>
            <th style={styles.introTh}>Our Component</th>
            <th style={styles.introTh}>MUI Components Used</th>
            <th style={styles.introTh}>Cell Type</th>
          </tr>
        </thead>
        <tbody>
          {cellRenderers.map(([name, mui, cellType]) => (
            <tr key={name}>
              <td style={styles.introTd}><strong>{name}</strong></td>
              <td style={styles.introTd}>{mui}</td>
              <td style={{ ...styles.introTd, fontFamily: 'monospace' }}>{cellType}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Wrapper Components</h2>
      <table style={styles.introTable}>
        <thead>
          <tr>
            <th style={styles.introTh}>Export</th>
            <th style={styles.introTh}>Description</th>
          </tr>
        </thead>
        <tbody>
          {wrapperComponents.map(([name, desc]) => (
            <tr key={name}>
              <td style={styles.introTd}><strong>{name}</strong></td>
              <td style={styles.introTd}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};
