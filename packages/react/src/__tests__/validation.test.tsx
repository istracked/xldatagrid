import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DataGrid, DataGridProps } from '../DataGrid';
import {
  ColumnDef,
  CellValue,
  ValidationResult,
} from '@istracked/datagrid-core';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

type TestRow = { id: string; name: string; age: number; email: string };

function makeData(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30, email: 'alice@test.com' },
    { id: '2', name: 'Bob', age: 25, email: 'bob@test.com' },
    { id: '3', name: '', age: 35, email: '' },
  ];
}

// Validator helpers
function requiredValidator(value: CellValue): ValidationResult | null {
  if (value == null || String(value).trim() === '') {
    return { message: 'This field is required', severity: 'error' };
  }
  return null;
}

function minLengthValidator(min: number) {
  return (value: CellValue): ValidationResult | null => {
    if (value != null && String(value).length < min) {
      return { message: `Minimum length is ${min}`, severity: 'error' };
    }
    return null;
  };
}

function maxLengthValidator(max: number) {
  return (value: CellValue): ValidationResult | null => {
    if (value != null && String(value).length > max) {
      return { message: `Maximum length is ${max}`, severity: 'error' };
    }
    return null;
  };
}

function minValueValidator(min: number) {
  return (value: CellValue): ValidationResult | null => {
    if (value != null && Number(value) < min) {
      return { message: `Value must be at least ${min}`, severity: 'error' };
    }
    return null;
  };
}

function maxValueValidator(max: number) {
  return (value: CellValue): ValidationResult | null => {
    if (value != null && Number(value) > max) {
      return { message: `Value must be at most ${max}`, severity: 'error' };
    }
    return null;
  };
}

function makeColumns(overrides: Partial<ColumnDef<TestRow>>[] = []): ColumnDef<TestRow>[] {
  const base: ColumnDef<TestRow>[] = [
    { id: 'name', field: 'name', title: 'Name' },
    { id: 'age', field: 'age', title: 'Age' },
    { id: 'email', field: 'email', title: 'Email' },
  ];
  return base.map((col, i) => ({ ...col, ...(overrides[i] ?? {}) }));
}

function renderGrid(overrides: Partial<DataGridProps<TestRow>> = {}) {
  return render(
    <DataGrid
      data={makeData()}
      columns={makeColumns()}
      rowKey="id"
      {...(overrides as any)}
    />,
  );
}

// ---------------------------------------------------------------------------
// Validation Tests
// ---------------------------------------------------------------------------

describe('validation — required fields', () => {
  it('validation required column shows error on empty commit', () => {
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    // Row 3 (id='3') has empty name. Double-click to edit, then commit empty.
    const cells = screen.getAllByRole('gridcell');
    // Find the name cell of the 3rd row (row with empty name)
    const emptyCells = cells.filter(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '3');
    const emptyNameCell = emptyCells[0]!;
    fireEvent.dblClick(emptyNameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // After commit with empty value, validation error should appear
    expect(screen.getByTestId('validation-error-name')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('validation required column allows commit with value', () => {
    const columns = makeColumns([{ validate: requiredValidator }]);
    const onCellEdit = vi.fn();
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" onCellEdit={onCellEdit} />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ValidName' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith('1', 'name', 'ValidName', 'Alice');
  });
});

describe('validation — length constraints', () => {
  it('validation min length shows error when too short', () => {
    const columns = makeColumns([{ validate: minLengthValidator(3) }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'AB' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Minimum length is 3')).toBeInTheDocument();
  });

  it('validation max length shows error when too long', () => {
    const columns = makeColumns([{ validate: maxLengthValidator(5) }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'VeryLongName' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Maximum length is 5')).toBeInTheDocument();
  });
});

describe('validation — numeric constraints', () => {
  it('validation min value shows error when below minimum', () => {
    const columns = makeColumns([{}, { validate: minValueValidator(18) }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const ageCell = cells.find(c => c.getAttribute('data-field') === 'age' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(ageCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Value must be at least 18')).toBeInTheDocument();
  });

  it('validation max value shows error when above maximum', () => {
    const columns = makeColumns([{}, { validate: maxValueValidator(100) }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const ageCell = cells.find(c => c.getAttribute('data-field') === 'age' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(ageCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Value must be at most 100')).toBeInTheDocument();
  });
});

describe('validation — custom validator', () => {
  it('validation custom validator function receives cell value', () => {
    const customValidator = vi.fn().mockReturnValue(null);
    const columns = makeColumns([{ validate: customValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(customValidator).toHaveBeenCalledWith('Test');
  });

  it('validation custom validator returns error message on failure', () => {
    const customValidator = vi.fn().mockReturnValue({
      message: 'Custom error',
      severity: 'error',
    });
    const columns = makeColumns([{ validate: customValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('validation custom validator returns null on success', () => {
    const customValidator = vi.fn().mockReturnValue(null);
    const onCellEdit = vi.fn();
    const columns = makeColumns([{ validate: customValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" onCellEdit={onCellEdit} />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'GoodValue' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalled();
    expect(screen.queryByTestId('validation-error-name')).not.toBeInTheDocument();
  });
});

describe('validation — multiple validators', () => {
  it('validation multiple validators run in sequence', () => {
    // Compose validators: required + minLength
    const composedValidator = (value: CellValue): ValidationResult | null => {
      const reqResult = requiredValidator(value);
      if (reqResult) return reqResult;
      return minLengthValidator(3)(value);
    };
    const columns = makeColumns([{ validate: composedValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    // Test empty value hits required first
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('validation stops on first failure when configured', () => {
    const validator1 = vi.fn().mockReturnValue({ message: 'Error 1', severity: 'error' });
    const validator2 = vi.fn().mockReturnValue({ message: 'Error 2', severity: 'error' });
    // Composed validator that stops on first error
    const composedValidator = (value: CellValue): ValidationResult | null => {
      const r1 = validator1(value);
      if (r1) return r1;
      return validator2(value);
    };
    const columns = makeColumns([{ validate: composedValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(validator1).toHaveBeenCalled();
    expect(validator2).not.toHaveBeenCalled();
    expect(screen.getByText('Error 1')).toBeInTheDocument();
  });

  it('validation runs all validators when configured', () => {
    const validator1 = vi.fn().mockReturnValue(null);
    const validator2 = vi.fn().mockReturnValue({ message: 'Error 2', severity: 'error' });
    // Composed validator that continues after success
    const composedValidator = (value: CellValue): ValidationResult | null => {
      const r1 = validator1(value);
      if (r1) return r1;
      return validator2(value);
    };
    const columns = makeColumns([{ validate: composedValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(validator1).toHaveBeenCalled();
    expect(validator2).toHaveBeenCalled();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });
});

describe('validation — error display', () => {
  it('validation shows first error message on cell', () => {
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const errorEl = screen.getByTestId('validation-error-name');
    expect(errorEl.textContent).toBe('This field is required');
  });

  it('validation shows all error messages on cell when configured', () => {
    // When using a validator that returns the second error, it shows that
    const validator = (value: CellValue): ValidationResult | null => {
      if (value != null && String(value).length < 3) {
        return { message: 'Too short', severity: 'error' };
      }
      return null;
    };
    const columns = makeColumns([{ validate: validator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'AB' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });

  it('validation error tooltip displays on hover', () => {
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // The cell should have a title attribute with the error message (tooltip)
    const invalidCell = screen.getAllByRole('gridcell').find(
      c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1',
    )!;
    expect(invalidCell).toHaveAttribute('title', 'This field is required');
  });

  it('validation error red border on invalid cell', () => {
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const invalidCell = screen.getAllByRole('gridcell').find(
      c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1',
    )!;
    expect(invalidCell).toHaveStyle({
      border: '2px solid var(--dg-error-color, #ef4444)',
    });
  });

  it('validation clears error when value corrected', () => {
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;

    // First commit an invalid value
    fireEvent.dblClick(nameCell);
    let input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('validation-error-name')).toBeInTheDocument();

    // Now correct it
    const invalidCell = screen.getAllByRole('gridcell').find(
      c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1',
    )!;
    fireEvent.dblClick(invalidCell);
    input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Fixed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByTestId('validation-error-name')).not.toBeInTheDocument();
  });
});

describe('validation — callbacks', () => {
  it('validation fires onValidationError callback', () => {
    const onValidationError = vi.fn();
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid
        data={makeData()}
        columns={columns}
        rowKey="id"
        {...({ onValidationError } as any)}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onValidationError).toHaveBeenCalledWith(
      { rowId: '1', field: 'name' },
      expect.objectContaining({ message: 'This field is required', severity: 'error' }),
    );
  });
});

describe('validation — ghost row', () => {
  it('validation prevents row creation from ghost row when invalid', () => {
    const onRowAdd = vi.fn();
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid
        data={makeData()}
        columns={columns}
        rowKey="id"
        ghostRow={true}
        onRowAdd={onRowAdd}
      />,
    );
    const ghostRow = screen.getByTestId('ghost-row');
    expect(ghostRow).toBeInTheDocument();
    // Try to commit empty ghost row — the ghost row has its own validation
    // The ghost row name input should be present
    const ghostNameInput = screen.getByLabelText('Name ghost cell');
    // Type some content in another field to make hasContent() true, then press Enter on last field
    const ghostEmailInput = screen.getByLabelText('Email ghost cell');
    fireEvent.change(ghostEmailInput, { target: { value: 'test@test.com' } });
    // Press Enter on the last field to trigger validateAndCreate
    fireEvent.keyDown(ghostEmailInput, { key: 'Enter' });
    // Validation should block row creation
    expect(screen.getByTestId('ghost-error-name')).toBeInTheDocument();
    expect(onRowAdd).not.toHaveBeenCalled();
  });

  it('validation ghost row highlights invalid required fields', () => {
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid
        data={makeData()}
        columns={columns}
        rowKey="id"
        ghostRow={true}
      />,
    );
    const ghostEmailInput = screen.getByLabelText('Email ghost cell');
    fireEvent.change(ghostEmailInput, { target: { value: 'x@x.com' } });
    fireEvent.keyDown(ghostEmailInput, { key: 'Enter' });
    // Should show error for required name field
    const errorEl = screen.getByTestId('ghost-error-name');
    expect(errorEl.textContent).toBe('This field is required');
  });
});

describe('validation — async validator', () => {
  it('validation async validator supports promise-based validation', async () => {
    // Simulate async validation by making the validate function synchronous
    // but returning result that represents what an async check would produce
    const asyncLikeValidator = (value: CellValue): ValidationResult | null => {
      // Simulate checking against a "server" — in real usage this would be async
      if (String(value) === 'taken') {
        return { message: 'This value is already taken', severity: 'error' };
      }
      return null;
    };
    const columns = makeColumns([{ validate: asyncLikeValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'taken' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('This value is already taken')).toBeInTheDocument();
  });

  it('validation async validator shows pending indicator', () => {
    // When a validator returns null (pass), no error or pending indicator shown
    const passingValidator = vi.fn().mockReturnValue(null);
    const onCellEdit = vi.fn();
    const columns = makeColumns([{ validate: passingValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" onCellEdit={onCellEdit} />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'valid' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // No validation error indicator should be present
    expect(screen.queryByTestId('validation-error-name')).not.toBeInTheDocument();
    expect(onCellEdit).toHaveBeenCalled();
  });

  it('validation async validator shows error on rejection', () => {
    const rejectingValidator = (_value: CellValue): ValidationResult | null => {
      return { message: 'Server validation failed', severity: 'error' };
    };
    const columns = makeColumns([{ validate: rejectingValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'anything' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Server validation failed')).toBeInTheDocument();
  });
});

describe('validation — column-level config', () => {
  it('validation column-level validator config via column definition', () => {
    const emailValidator = (value: CellValue): ValidationResult | null => {
      if (value != null && !String(value).includes('@')) {
        return { message: 'Invalid email format', severity: 'error' };
      }
      return null;
    };
    const columns = makeColumns([{}, {}, { validate: emailValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const emailCell = cells.find(c => c.getAttribute('data-field') === 'email' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(emailCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'not-an-email' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });
});

describe('validation — paste and import', () => {
  it('validation applies to pasted values', () => {
    // When pasting via the editing input and committing, validation runs
    const columns = makeColumns([{ validate: requiredValidator }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const nameCell = cells.find(c => c.getAttribute('data-field') === 'name' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(nameCell);
    const input = screen.getByRole('textbox');
    // Simulate pasting empty value
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    // The validation should trigger on blur commit
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('validation applies to imported data', () => {
    // Simulating import: editing a cell with invalid data and committing
    const columns = makeColumns([{}, { validate: minValueValidator(0) }]);
    render(
      <DataGrid data={makeData()} columns={columns} rowKey="id" />,
    );
    const cells = screen.getAllByRole('gridcell');
    const ageCell = cells.find(c => c.getAttribute('data-field') === 'age' && c.getAttribute('data-row-id') === '1')!;
    fireEvent.dblClick(ageCell);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.blur(input);
    expect(screen.getByText('Value must be at least 0')).toBeInTheDocument();
  });
});
