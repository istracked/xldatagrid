import { serializeRangeToText, parseTextToGrid, formatCellValue } from '../clipboard';
import { ColumnDef, CellRange } from '../types';

const cols: ColumnDef[] = [
  { id: 'c1', field: 'name', title: 'Name' },
  { id: 'c2', field: 'age', title: 'Age' },
  { id: 'c3', field: 'city', title: 'City' },
];

const rowIds = ['r1', 'r2', 'r3'];

const data: Record<string, unknown>[] = [
  { name: 'Alice', age: 30, city: 'London' },
  { name: 'Bob', age: 25, city: 'Paris' },
  { name: 'Carol', age: 35, city: 'Berlin' },
];

describe('formatCellValue', () => {
  it('formats null as empty string', () => {
    expect(formatCellValue(null)).toBe('');
  });

  it('formats undefined as empty string', () => {
    expect(formatCellValue(undefined)).toBe('');
  });

  it('formats a number', () => {
    expect(formatCellValue(42)).toBe('42');
  });

  it('formats a string', () => {
    expect(formatCellValue('hello')).toBe('hello');
  });

  it('formats a boolean true', () => {
    expect(formatCellValue(true)).toBe('true');
  });

  it('formats a boolean false', () => {
    expect(formatCellValue(false)).toBe('false');
  });

  it('formats a Date as ISO string', () => {
    const d = new Date('2024-01-15T00:00:00.000Z');
    expect(formatCellValue(d)).toBe('2024-01-15T00:00:00.000Z');
  });
});

describe('parseTextToGrid', () => {
  it('parses single cell', () => {
    expect(parseTextToGrid('hello')).toEqual([['hello']]);
  });

  it('parses tab-separated values on one line', () => {
    expect(parseTextToGrid('a\tb\tc')).toEqual([['a', 'b', 'c']]);
  });

  it('parses multiple lines', () => {
    const result = parseTextToGrid('a\tb\nc\td');
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('converts numeric strings to numbers', () => {
    expect(parseTextToGrid('42')).toEqual([[42]]);
  });

  it('converts float strings to numbers', () => {
    expect(parseTextToGrid('3.14')).toEqual([[3.14]]);
  });

  it('converts "true" to boolean true', () => {
    expect(parseTextToGrid('true')).toEqual([[true]]);
  });

  it('converts "false" to boolean false', () => {
    expect(parseTextToGrid('false')).toEqual([[false]]);
  });

  it('converts empty tab-separated cell to null', () => {
    expect(parseTextToGrid('a\t\tc')).toEqual([['a', null, 'c']]);
  });

  it('ignores empty lines', () => {
    expect(parseTextToGrid('a\n\nb')).toEqual([['a'], ['b']]);
  });

  it('preserves string that looks partially numeric', () => {
    expect(parseTextToGrid('42abc')).toEqual([['42abc']]);
  });

  it('parses mixed types in one row', () => {
    const result = parseTextToGrid('Alice\t30\ttrue');
    expect(result).toEqual([['Alice', 30, true]]);
  });
});

describe('serializeRangeToText', () => {
  it('serializes a single cell', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'name' },
    };
    expect(serializeRangeToText(data, range, cols, rowIds)).toBe('Alice');
  });

  it('serializes a multi-column single-row range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    expect(serializeRangeToText(data, range, cols, rowIds)).toBe('Alice\t30');
  });

  it('serializes a multi-row single-column range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r3', field: 'name' },
    };
    expect(serializeRangeToText(data, range, cols, rowIds)).toBe('Alice\nBob\nCarol');
  });

  it('serializes a full multi-row multi-column range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r2', field: 'age' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds);
    expect(result).toBe('Alice\t30\nBob\t25');
  });

  it('includes headers when requested', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds, true);
    expect(result).toBe('Name\tAge\nAlice\t30');
  });

  it('excludes headers by default', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds);
    expect(result).not.toContain('Name');
  });

  it('handles inverted anchor/focus order', () => {
    const range: CellRange = {
      anchor: { rowId: 'r2', field: 'age' },
      focus: { rowId: 'r1', field: 'name' },
    };
    const result = serializeRangeToText(data, range, cols, rowIds);
    expect(result).toBe('Alice\t30\nBob\t25');
  });

  it('formats null cell values as empty string', () => {
    const dataWithNull: Record<string, unknown>[] = [
      { name: null, age: 30, city: 'London' },
    ];
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r1', field: 'age' },
    };
    const rowIds2 = ['r1'];
    expect(serializeRangeToText(dataWithNull, range, cols, rowIds2)).toBe('\t30');
  });

  it('serializes the entire grid via selectAll-style range', () => {
    const range: CellRange = {
      anchor: { rowId: 'r1', field: 'name' },
      focus: { rowId: 'r3', field: 'city' },
    };
    const lines = serializeRangeToText(data, range, cols, rowIds).split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Alice\t30\tLondon');
    expect(lines[1]).toBe('Bob\t25\tParis');
    expect(lines[2]).toBe('Carol\t35\tBerlin');
  });
});
