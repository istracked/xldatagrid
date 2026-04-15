import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransposedGrid } from '../TransposedGrid';
import type { TransposedField } from '@istracked/datagrid-core';

describe('TransposedGrid', () => {
  const fields: TransposedField[] = [
    { id: 'name', label: 'Name', cellType: 'text' },
    { id: 'email', label: 'Email', cellType: 'text' },
    { id: 'active', label: 'Active', cellType: 'boolean', defaultValue: false },
  ];

  test('renders without crashing', () => {
    const { container } = render(
      <TransposedGrid fields={fields} entityKeys={['entity1']} />,
    );
    expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
  });

  test('renders text field labels in first column', () => {
    render(<TransposedGrid fields={fields} entityKeys={['entity1']} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  test('renders rows for all fields including boolean', () => {
    const { container } = render(
      <TransposedGrid fields={fields} entityKeys={['entity1']} />,
    );
    // Each field becomes a row; boolean rows render with their cellType renderer
    const rows = container.querySelectorAll('[role="row"][data-row-id]');
    expect(rows.length).toBe(3);
    expect(rows[0]?.getAttribute('data-row-id')).toBe('name');
    expect(rows[1]?.getAttribute('data-row-id')).toBe('email');
    expect(rows[2]?.getAttribute('data-row-id')).toBe('active');
  });

  test('renders entity column headers', () => {
    render(<TransposedGrid fields={fields} entityKeys={['entity1', 'entity2']} />);
    expect(screen.getByText('entity1')).toBeInTheDocument();
    expect(screen.getByText('entity2')).toBeInTheDocument();
  });

  test('applies values from props', () => {
    const values = {
      name: { entity1: 'John' },
      email: { entity1: 'john@example.com' },
    };
    render(
      <TransposedGrid fields={fields} entityKeys={['entity1']} values={values} />,
    );
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  test('renders with custom field column label', () => {
    render(
      <TransposedGrid
        fields={fields}
        entityKeys={['entity1']}
        fieldColumnLabel="Property"
      />,
    );
    expect(screen.getByText('Property')).toBeInTheDocument();
  });

  test('renders with empty fields', () => {
    const { container } = render(
      <TransposedGrid fields={[]} entityKeys={['entity1']} />,
    );
    expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
  });
});
