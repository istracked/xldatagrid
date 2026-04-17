import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MuiDataGrid } from '@istracked/datagrid-mui';
import { applyFiltering } from '@istracked/datagrid-core';
import type { FilterState } from '@istracked/datagrid-core';
import { makeEmployees, defaultColumns } from './data';
import { storyContainer, gridContainer } from './helpers';
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
        <MuiDataGrid
          data={makeEmployees(50)}
          columns={defaultColumns as any}
          rowKey="id"
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
          <MuiDataGrid
            data={makeEmployees(50)}
            columns={defaultColumns as any}
            rowKey="id"
            filtering
            initialFilter={initialFilter}
            sorting
          />
        </div>
      </div>
    );
  },
};

// NOTE: A dedicated `DataGridColumnFilterMenu` component is being wired in
// separately. Once integration lands, clicking the filter chevron in a column
// header will open an Excel-style value-list + search + Text Filters dropdown.
// This story exercises the existing `FilterState`-based API so the surrounding
// infrastructure (filterable columns, filter debounce, showColumnMenu) is
// already demonstrated.
export const ExcelStyleFilterDropdown: StoryObj = {
  render: () => {
    const rows = useMemo(() => makeEmployees(80), []);
    const [filter, setFilter] = useState<FilterState | null>(null);

    const filteredCount = useMemo(
      () => applyFiltering(rows, filter).length,
      [rows, filter],
    );

    return (
      <div style={storyContainer}>
        <h2 style={styles.heading}>Excel-Style Filter Dropdown</h2>
        <p style={styles.subtitle}>
          Click the filter chevron in a column header to open the Excel-style dropdown
          (value list + search + Text Filters submenu).
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            padding: '4px 10px',
            borderRadius: 999,
            background: '#e0f2fe',
            color: '#0369a1',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Showing {filteredCount} of {rows.length} rows
          {filter ? ' (filter active)' : ''}
        </div>
        <div style={gridContainer}>
          <MuiDataGrid
            data={rows}
            columns={defaultColumns as any}
            rowKey="id"
            filtering={{ debounceMs: 200 }}
            sorting
            showColumnMenu
            onFilterChange={setFilter}
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
          <MuiDataGrid
            data={makeEmployees(50)}
            columns={defaultColumns as any}
            rowKey="id"
            filtering
            initialFilter={initialFilter}
            sorting
          />
        </div>
      </div>
    );
  },
};
