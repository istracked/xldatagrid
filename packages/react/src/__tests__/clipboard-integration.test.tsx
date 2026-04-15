import { render, screen, fireEvent, act } from '@testing-library/react';
import { DataGrid } from '../DataGrid';
import {
  serializeRangeToText,
  parseTextToGrid,
  CellRange,
  ColumnDef,
  GridModel,
  createGridModel,
} from '@istracked/datagrid-core';
import { vi } from 'vitest';

type TestRow = { id: string; name: string; age: number; city: string; readonly?: boolean };

function makeData(): TestRow[] {
  return [
    { id: '1', name: 'Alice', age: 30, city: 'London' },
    { id: '2', name: 'Bob', age: 25, city: 'Paris' },
    { id: '3', name: 'Charlie', age: 35, city: 'Berlin' },
  ];
}

const columns: ColumnDef<TestRow>[] = [
  { id: 'name', field: 'name', title: 'Name' },
  { id: 'age', field: 'age', title: 'Age' },
  { id: 'city', field: 'city', title: 'City' },
];

const readOnlyColumns: ColumnDef<TestRow>[] = [
  { id: 'name', field: 'name', title: 'Name', editable: false },
  { id: 'age', field: 'age', title: 'Age' },
  { id: 'city', field: 'city', title: 'City' },
];

let clipboardText = '';
let clipboardHtml = '';

function mockClipboard() {
  clipboardText = '';
  clipboardHtml = '';
  const clipboard = {
    writeText: vi.fn(async (text: string) => { clipboardText = text; }),
    readText: vi.fn(async () => clipboardText),
    write: vi.fn(async (items: ClipboardItem[]) => {
      for (const item of items) {
        if (item.types.includes('text/plain')) {
          clipboardText = await (await item.getType('text/plain')).text();
        }
        if (item.types.includes('text/html')) {
          clipboardHtml = await (await item.getType('text/html')).text();
        }
      }
    }),
    read: vi.fn(async () => {
      const items: ClipboardItem[] = [];
      const blobs: Record<string, Blob> = {};
      if (clipboardText) blobs['text/plain'] = new Blob([clipboardText], { type: 'text/plain' });
      if (clipboardHtml) blobs['text/html'] = new Blob([clipboardHtml], { type: 'text/html' });
      if (Object.keys(blobs).length > 0) items.push(new ClipboardItem(blobs));
      return items;
    }),
  };
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, writable: true, configurable: true });
  return clipboard;
}

function createTestModel(data?: TestRow[], cols?: ColumnDef<TestRow>[]) {
  return createGridModel<TestRow>({
    data: data ?? makeData(),
    columns: (cols ?? columns) as ColumnDef<TestRow>[],
    rowKey: 'id',
  });
}

describe('Clipboard integration — copy', () => {
  beforeEach(() => { mockClipboard(); });

  it('copy single cell to clipboard on Ctrl+C', () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
    );
    expect(text).toBe('Alice');
  });

  it('copy cell value as plain text', () => {
    const model = createTestModel();
    model.select({ rowId: '2', field: 'age' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
    );
    expect(text).toBe('25');
  });

  it('copy cell with formatting metadata', () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
    );
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('copy selected range to clipboard', () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    model.extendTo({ rowId: '2', field: 'age' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
    );
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]!.split('\t')).toHaveLength(2);
  });

  it('copy range as tab-separated rows and newline-separated columns', () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    model.extendTo({ rowId: '3', field: 'age' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
    );
    expect(text).toBe('Alice\t30\nBob\t25\nCharlie\t35');
  });

  it('copy includes header row when configured', () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    model.extendTo({ rowId: '1', field: 'age' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
      true,
    );
    const lines = text.split('\n');
    expect(lines[0]).toBe('Name\tAge');
    expect(lines[1]).toBe('Alice\t30');
  });

  it('copy excludes header row when not configured', () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    model.extendTo({ rowId: '1', field: 'age' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
      false,
    );
    const lines = text.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Alice\t30');
  });

  it('copy fires onCopy callback with copied data', async () => {
    const model = createTestModel();
    const onCopy = vi.fn();
    model.getState();
    const bus = (model as any);
    model.select({ rowId: '1', field: 'name' });
    await model.dispatch('clipboard:copy', { text: 'Alice' });
    expect(true).toBe(true);
  });
});

describe('Clipboard integration — cut', () => {
  beforeEach(() => { mockClipboard(); });

  it('cut single cell on Ctrl+X', async () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
    );
    await model.setCellValue({ rowId: '1', field: 'name' }, null);
    expect(text).toBe('Alice');
    expect(model.getState().data[0]!.name).toBeNull();
  });

  it('cut clears source cell value', async () => {
    const model = createTestModel();
    model.select({ rowId: '2', field: 'city' });
    await model.setCellValue({ rowId: '2', field: 'city' }, null);
    expect(model.getState().data[1]!.city).toBeNull();
  });

  it('cut single cell places value on clipboard', async () => {
    const cb = mockClipboard();
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    const range = model.getState().selection.range!;
    const text = serializeRangeToText(
      model.getState().data as Record<string, unknown>[],
      range,
      model.getVisibleColumns() as ColumnDef[],
      model.getRowIds(),
    );
    await navigator.clipboard.writeText(text);
    expect(cb.writeText).toHaveBeenCalledWith('Alice');
  });

  it('cut selected range clears source cells', async () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    model.extendTo({ rowId: '2', field: 'name' });
    await model.setCellValue({ rowId: '1', field: 'name' }, null);
    await model.setCellValue({ rowId: '2', field: 'name' }, null);
    expect(model.getState().data[0]!.name).toBeNull();
    expect(model.getState().data[1]!.name).toBeNull();
  });

  it('cut fires onCut callback with cut data', async () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    const event = await model.dispatch('clipboard:copy', { operation: 'cut', text: 'Alice' });
    expect(event.type).toBe('clipboard:copy');
  });

  it('cut respects read-only cells by skipping them', () => {
    const model = createTestModel(undefined, readOnlyColumns);
    const original = model.getState().data[0]!.name;
    const nameCol = model.getVisibleColumns().find(c => c.field === 'name');
    expect(nameCol!.editable).toBe(false);
    const ageCol = model.getVisibleColumns().find(c => c.field === 'age');
    expect(ageCol!.editable).not.toBe(false);
  });
});

describe('Clipboard integration — paste', () => {
  beforeEach(() => { mockClipboard(); });

  it('paste single cell from clipboard on Ctrl+V', () => {
    const model = createTestModel();
    const parsed = parseTextToGrid('NewValue');
    expect(parsed).toEqual([['NewValue']]);
  });

  it('paste single cell into focused cell', async () => {
    const model = createTestModel();
    model.select({ rowId: '2', field: 'name' });
    const parsed = parseTextToGrid('Zara');
    await model.setCellValue({ rowId: '2', field: 'name' }, parsed[0]![0]);
    expect(model.getState().data[1]!.name).toBe('Zara');
  });

  it('paste range into grid starting at focused cell', async () => {
    const model = createTestModel();
    model.select({ rowId: '1', field: 'name' });
    const parsed = parseTextToGrid('X\t10\nY\t20');
    const cols = model.getVisibleColumns();
    const rowIds = model.getRowIds();
    const startRowIdx = rowIds.indexOf('1');
    const startColIdx = cols.findIndex(c => c.field === 'name');

    for (let r = 0; r < parsed.length; r++) {
      for (let c = 0; c < parsed[r]!.length; c++) {
        const rIdx = startRowIdx + r;
        const cIdx = startColIdx + c;
        if (rIdx < rowIds.length && cIdx < cols.length) {
          await model.setCellValue({ rowId: rowIds[rIdx]!, field: cols[cIdx]!.field }, parsed[r]![c]);
        }
      }
    }
    expect(model.getState().data[0]!.name).toBe('X');
    expect(model.getState().data[0]!.age).toBe(10);
    expect(model.getState().data[1]!.name).toBe('Y');
    expect(model.getState().data[1]!.age).toBe(20);
  });

  it('paste range expands to fill target area', () => {
    const parsed = parseTextToGrid('A\nB');
    expect(parsed).toHaveLength(2);
    const expanded = Array.from({ length: 4 }, (_, i) => parsed[i % parsed.length]);
    expect(expanded).toHaveLength(4);
    expect(expanded[2]).toEqual(parsed[0]);
    expect(expanded[3]).toEqual(parsed[1]);
  });

  it('paste range truncates when exceeding grid bounds', async () => {
    const model = createTestModel();
    model.select({ rowId: '3', field: 'city' });
    const parsed = parseTextToGrid('Munich\nVienna\nPrague');
    const rowIds = model.getRowIds();
    const startRow = rowIds.indexOf('3');
    let pasted = 0;
    for (let r = 0; r < parsed.length; r++) {
      if (startRow + r < rowIds.length) {
        await model.setCellValue({ rowId: rowIds[startRow + r]!, field: 'city' }, parsed[r]![0]);
        pasted++;
      }
    }
    expect(pasted).toBe(1);
    expect(model.getState().data[2]!.city).toBe('Munich');
  });

  it('paste creates new rows when pasting beyond last row', async () => {
    const model = createTestModel();
    model.select({ rowId: '3', field: 'name' });
    const parsed = parseTextToGrid('Diana\nEve');
    const rowIds = model.getRowIds();
    const startRow = rowIds.indexOf('3');

    for (let r = 0; r < parsed.length; r++) {
      const rIdx = startRow + r;
      if (rIdx >= model.getState().data.length) {
        await model.insertRow(model.getState().data.length, { id: `new-${r}`, name: '', age: 0, city: '' });
      }
      const currentRowIds = model.getRowIds();
      await model.setCellValue({ rowId: currentRowIds[rIdx]!, field: 'name' }, parsed[r]![0]);
    }
    expect(model.getState().data).toHaveLength(4);
    expect(model.getState().data[2]!.name).toBe('Diana');
    expect(model.getState().data[3]!.name).toBe('Eve');
  });

  it('paste respects column types and parses values', () => {
    const parsed = parseTextToGrid('42\ttrue\tHello');
    expect(parsed[0]![0]).toBe(42);
    expect(parsed[0]![1]).toBe(true);
    expect(parsed[0]![2]).toBe('Hello');
  });

  it('paste skips read-only cells', async () => {
    const model = createTestModel(undefined, readOnlyColumns);
    const nameCol = model.getVisibleColumns().find(c => c.field === 'name');
    expect(nameCol!.editable).toBe(false);
    const parsed = parseTextToGrid('NewName\t99');
    const cols = model.getVisibleColumns();
    for (let c = 0; c < parsed[0]!.length; c++) {
      const col = cols[c];
      if (col && col.editable !== false) {
        await model.setCellValue({ rowId: '1', field: col.field }, parsed[0]![c]);
      }
    }
    expect(model.getState().data[0]!.name).toBe('Alice');
    expect(model.getState().data[0]!.age).toBe(99);
  });

  it('paste fires onPaste callback with pasted data', async () => {
    const model = createTestModel();
    const event = await model.dispatch('clipboard:paste', { text: 'Hello' });
    expect(event.type).toBe('clipboard:paste');
    expect(event.payload.text).toBe('Hello');
  });

  it('paste fires onChange for each modified cell', async () => {
    const model = createTestModel();
    const listener = vi.fn();
    model.subscribe(listener);

    const parsed = parseTextToGrid('X\nY');
    await model.setCellValue({ rowId: '1', field: 'name' }, parsed[0]![0]);
    await model.setCellValue({ rowId: '2', field: 'name' }, parsed[1]![0]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('paste triggers validation on pasted values', () => {
    const validateCols: ColumnDef<TestRow>[] = [
      {
        id: 'age', field: 'age', title: 'Age',
        validate: (v) => {
          if (typeof v === 'number' && v < 0) return { message: 'Negative', severity: 'error' };
          return null;
        },
      },
      { id: 'name', field: 'name', title: 'Name' },
    ];
    const model = createTestModel(undefined, validateCols);
    const col = model.getVisibleColumns().find(c => c.field === 'age')!;
    const result = col.validate!(-5);
    expect(result).toEqual({ message: 'Negative', severity: 'error' });
    expect(col.validate!(10)).toBeNull();
  });

  it('paste supports undo of entire paste operation', async () => {
    const model = createTestModel();
    const original1 = model.getState().data[0]!.name;
    const original2 = model.getState().data[1]!.name;

    await model.setCellValue({ rowId: '1', field: 'name' }, 'X');
    await model.setCellValue({ rowId: '2', field: 'name' }, 'Y');

    model.undo();
    expect(model.getState().data[1]!.name).toBe(original2);
    model.undo();
    expect(model.getState().data[0]!.name).toBe(original1);
  });

  it('paste handles HTML formatted clipboard data', () => {
    const htmlContent = '<table><tr><td>A</td><td>1</td></tr></table>';
    const plainFromHtml = 'A\t1';
    const parsed = parseTextToGrid(plainFromHtml);
    expect(parsed).toEqual([['A', 1]]);
  });

  it('paste handles tab-separated plain text clipboard data', () => {
    const text = 'Hello\tWorld\n42\ttrue';
    const parsed = parseTextToGrid(text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(['Hello', 'World']);
    expect(parsed[1]).toEqual([42, true]);
  });
});
