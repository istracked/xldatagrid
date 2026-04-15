import { muiCellRendererMap } from '../cells';

describe('muiCellRendererMap', () => {
  test('contains all expected cell types', () => {
    const expectedTypes = [
      'text', 'numeric', 'currency', 'boolean', 'calendar',
      'status', 'tags', 'chipSelect', 'compoundChipList', 'list',
      'password', 'richText', 'upload', 'subGrid', 'actions',
    ];
    for (const type of expectedTypes) {
      expect(muiCellRendererMap[type]).toBeDefined();
      expect(typeof muiCellRendererMap[type]).toBe('function');
    }
  });

  test('has exactly 15 cell types', () => {
    expect(Object.keys(muiCellRendererMap).length).toBe(15);
  });

  test('each renderer is a named function', () => {
    for (const [key, renderer] of Object.entries(muiCellRendererMap)) {
      expect(renderer).toBeDefined();
      expect(typeof renderer).toBe('function');
    }
  });
});
