import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@istracked/datagrid-react';
import type { FilterState } from '@istracked/datagrid-core';
import { makeEmployees, defaultColumns } from './data';
import { allCellRenderers, storyContainer, gridContainer } from './helpers';
import * as styles from './stories.styles';

const meta: Meta = {
  title: 'Examples/Filtering',
};
export default meta;

export const BasicFiltering: StoryObj = {
  render: () => (
    <div style={storyContainer}>
      <h2 style={styles.heading}>Filterable Columns</h2>
      <p style={styles.subtitle}>
        Columns with <code>filterable: true</code> show a filter icon in the header. The grid supports 12 filter operators.
      </p>
      <div style={gridContainer}>
        <DataGrid
          data={makeEmployees(50)}
          columns={defaultColumns as any}
          rowKey="id"
          cellRenderers={allCellRenderers}
          filtering={{ debounceMs: 200 }}
          sorting
        />
      </div>
    </div>
  ),
};

export const PreAppliedFilter: StoryObj = {
  render: () => {
    const initialFilter: FilterState = {
      logic: 'and',
      filters: [
        { field: 'department', operator: 'eq', value: 'Engineering' },
      ],
    };
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Pre-Applied Filter</h2>
        <p style={styles.subtitle}>
          Grid loads with <code>department = Engineering</code> already applied via <code>initialFilter</code>.
        </p>
        <div style={gridContainer}>
          <DataGrid
            data={makeEmployees(50)}
            columns={defaultColumns as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            filtering
            initialFilter={initialFilter}
            sorting
          />
        </div>
      </div>
    );
  },
};

export const CompositeFilter: StoryObj = {
  render: () => {
    const initialFilter: FilterState = {
      logic: 'or',
      filters: [
        { field: 'department', operator: 'eq', value: 'Engineering' },
        { field: 'department', operator: 'eq', value: 'Design' },
      ],
    };
    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Composite OR Filter</h2>
        <p style={styles.subtitle}>
          Shows rows where department is Engineering <strong>OR</strong> Design.
        </p>
        <div style={gridContainer}>
          <DataGrid
            data={makeEmployees(50)}
            columns={defaultColumns as any}
            rowKey="id"
            cellRenderers={allCellRenderers}
            filtering
            initialFilter={initialFilter}
            sorting
          />
        </div>
      </div>
    );
  },
};
