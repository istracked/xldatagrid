import { muiCellRendererMap } from '..';

describe('muiCellRendererMap', () => {
  test('contains all expected cell types', () => {
    const expectedTypes = [
      'text', 'numeric', 'currency', 'boolean', 'calendar',
      'status', 'tags', 'chipSelect', 'compoundChipList', 'list',
      'password', 'richText', 'upload', 'subGrid', 'actions',
    ];
    for (const type of expectedTypes) {
      const renderer = muiCellRendererMap[type];
      expect(renderer).toBeDefined();
      expect(typeof renderer === 'function' || (typeof renderer === 'object' && renderer !== null && '$$typeof' in renderer)).toBe(true);
    }
  });

  test('has exactly 15 cell types', () => {
    expect(Object.keys(muiCellRendererMap).length).toBe(15);
  });

  test('each renderer is a named function', () => {
    for (const [key, renderer] of Object.entries(muiCellRendererMap)) {
      expect(renderer).toBeDefined();
      expect(typeof renderer === 'function' || (typeof renderer === 'object' && renderer !== null && '$$typeof' in renderer)).toBe(true);
    }
  });
});
