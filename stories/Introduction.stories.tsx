import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Introduction',
};
export default meta;

export const Welcome: StoryObj = {
  render: () => (
    <div style={styles.introWrapper}>
      <h1 style={styles.introTitle}>@istracked/datagrid — Kitchen Sink</h1>
      <p style={styles.introSubtitle}>
        A comprehensive, enterprise-grade datagrid built in React 19 with Jotai state management.
      </p>

      <h2>Features</h2>
      <table style={styles.introTable}>
        <thead>
          <tr>
            <th style={styles.introTh}>Category</th>
            <th style={styles.introTh}>Features</th>
          </tr>
        </thead>
        <tbody>
          {features.map(([cat, feat]) => (
            <tr key={cat}>
              <td style={styles.introTd}><strong>{cat}</strong></td>
              <td style={styles.introTd}>{feat}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Browse the sidebar</h2>
      <p>
        Stories are organised by feature area under <strong>Examples/</strong>. The <strong>Pages/Kitchen Sink</strong> story combines every feature into a single interactive grid.
      </p>
    </div>
  ),
};

const features: [string, string][] = [
  ['Cell Types', 'Text, Numeric, Currency, Boolean, Calendar, Status, Tags, ChipSelect, CompoundChipList, List, Password, RichText, Upload, SubGrid, Actions'],
  ['Editing', 'Inline cell editing, Ghost row (new-row entry), Undo / Redo, Validation'],
  ['Selection', 'Cell, Row, Range, None modes'],
  ['Sorting', 'Single-click, Multi-sort (shift-click)'],
  ['Filtering', '12 operators, Composite AND/OR, Debounced'],
  ['Grouping', 'Row grouping with aggregates (sum, avg, count, min, max), Column groups, Collapsible'],
  ['Columns', 'Resize, Reorder (drag), Freeze left/right, Visibility toggle, Header menu'],
  ['Extensions', 'Regex Validation, Cell Comments, Column Resize constraints, Export (CSV, Excel, PDF)'],
  ['Theming', 'Light, Dark, Custom CSS variables'],
  ['Advanced', 'Master-Detail, Context Menu, Keyboard navigation, Clipboard, Ghost row positioning'],
];
