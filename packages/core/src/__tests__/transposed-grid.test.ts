import { createTransposedConfig, validatePasswordConfirmation } from '../transposed';
import { TransposedField } from '../types';

describe('createTransposedConfig', () => {
  const fields: TransposedField[] = [
    { id: 'name', label: 'Name', cellType: 'text' },
    { id: 'email', label: 'Email', cellType: 'text', placeholder: 'Enter email' },
    { id: 'active', label: 'Active', cellType: 'boolean', defaultValue: false },
    {
      id: 'role',
      label: 'Role',
      cellType: 'list',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
      ],
    },
  ];

  test('creates correct number of columns (1 label + N entities)', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1', 'entity2'] });
    expect(config.columns.length).toBe(3); // field label + 2 entities
  });

  test('first column is frozen field label', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.columns[0]?.field).toBe('__field_label');
    expect(config.columns[0]?.frozen).toBe('left');
    expect(config.columns[0]?.editable).toBe(false);
  });

  test('entity columns are editable', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.columns[1]?.editable).toBe(true);
  });

  test('creates rowTypes mapping each field to its cellType', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.rowTypes?.length).toBe(4);
    expect(config.rowTypes?.[0]?.cellType).toBe('text');
    expect(config.rowTypes?.[2]?.cellType).toBe('boolean');
    expect(config.rowTypes?.[3]?.cellType).toBe('list');
  });

  test('data rows contain field labels and default values', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.data.length).toBe(4);
    const firstRow = config.data[0] as Record<string, unknown>;
    expect(firstRow.__field_label).toBe('Name');
    expect(firstRow.__field_id).toBe('name');
  });

  test('uses default column widths', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.columns[0]?.width).toBe(200);
    expect(config.columns[1]?.width).toBe(200);
  });

  test('respects custom column widths', () => {
    const config = createTransposedConfig({
      fields,
      entityKeys: ['entity1'],
      fieldColumnWidth: 250,
      entityColumnWidth: 300,
    });
    expect(config.columns[0]?.width).toBe(250);
    expect(config.columns[1]?.width).toBe(300);
  });

  test('sets pivotMode to row', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.pivotMode).toBe('row');
  });

  test('default values are applied to entity columns', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    const activeRow = config.data[2] as Record<string, unknown>;
    expect(activeRow.entity1).toBe(false);
  });

  test('null default values for fields without defaultValue', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    const nameRow = config.data[0] as Record<string, unknown>;
    expect(nameRow.entity1).toBeNull();
  });

  test('rowTypes include labels and options from field definitions', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.rowTypes?.[0]?.label).toBe('Name');
    expect(config.rowTypes?.[3]?.options).toEqual([
      { value: 'admin', label: 'Admin' },
      { value: 'user', label: 'User' },
    ]);
  });

  test('custom field column label', () => {
    const config = createTransposedConfig({
      fields,
      entityKeys: ['entity1'],
      fieldColumnLabel: 'Property',
    });
    expect(config.columns[0]?.title).toBe('Property');
  });

  test('entity columns use key as title', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['user1', 'user2'] });
    expect(config.columns[1]?.title).toBe('user1');
    expect(config.columns[2]?.title).toBe('user2');
  });

  test('entity columns are not sortable or filterable', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.columns[1]?.sortable).toBe(false);
    expect(config.columns[1]?.filterable).toBe(false);
  });

  test('field label column is not sortable or filterable', () => {
    const config = createTransposedConfig({ fields, entityKeys: ['entity1'] });
    expect(config.columns[0]?.sortable).toBe(false);
    expect(config.columns[0]?.filterable).toBe(false);
  });

  test('handles empty fields array', () => {
    const config = createTransposedConfig({ fields: [], entityKeys: ['entity1'] });
    expect(config.data.length).toBe(0);
    expect(config.rowTypes?.length).toBe(0);
    expect(config.columns.length).toBe(2); // label column + 1 entity
  });

  test('handles empty entityKeys array', () => {
    const config = createTransposedConfig({ fields, entityKeys: [] });
    expect(config.columns.length).toBe(1); // only the field label column
  });
});

describe('validatePasswordConfirmation', () => {
  const fields: TransposedField[] = [
    { id: 'password', label: 'Password', cellType: 'password' },
    { id: 'confirmPassword', label: 'Confirm Password', cellType: 'password', confirmField: 'password' },
  ];

  test('returns null when passwords match', () => {
    const data = [
      { __field_id: 'password', entity1: 'secret123' },
      { __field_id: 'confirmPassword', entity1: 'secret123' },
    ];
    const result = validatePasswordConfirmation(fields, data, 'entity1');
    expect(result).toBeNull();
  });

  test('returns error when passwords do not match', () => {
    const data = [
      { __field_id: 'password', entity1: 'secret123' },
      { __field_id: 'confirmPassword', entity1: 'different' },
    ];
    const result = validatePasswordConfirmation(fields, data, 'entity1');
    expect(result).not.toBeNull();
    expect(result?.severity).toBe('error');
  });

  test('returns error message indicating mismatch', () => {
    const data = [
      { __field_id: 'password', entity1: 'abc' },
      { __field_id: 'confirmPassword', entity1: 'xyz' },
    ];
    const result = validatePasswordConfirmation(fields, data, 'entity1');
    expect(result?.message).toBe('Values do not match');
  });

  test('handles missing confirm field gracefully', () => {
    const fieldsNoConfirm: TransposedField[] = [
      { id: 'password', label: 'Password', cellType: 'password' },
    ];
    const data = [{ __field_id: 'password', entity1: 'secret123' }];
    const result = validatePasswordConfirmation(fieldsNoConfirm, data, 'entity1');
    expect(result).toBeNull();
  });

  test('handles missing source field in data gracefully', () => {
    const data = [
      { __field_id: 'confirmPassword', entity1: 'secret123' },
    ];
    const result = validatePasswordConfirmation(fields, data, 'entity1');
    expect(result).toBeNull();
  });
});
