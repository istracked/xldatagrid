import { calculateVisibleRows, calculateVisibleColumns } from '../virtualization';

describe('calculateVisibleRows', () => {
  it('renders only visible rows within viewport', () => {
    const result = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 0,
    });
    // viewport shows 5 rows (200/40), indices 0-4
    expect(result.endIndex - result.startIndex + 1).toBeLessThanOrEqual(6);
    expect(result.startIndex).toBe(0);
  });

  it('does not render rows above scroll position (beyond overscan)', () => {
    const result = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 400,
      overscan: 0,
    });
    // scrollTop 400 means first visible row is index 10
    expect(result.startIndex).toBe(10);
  });

  it('does not render rows below viewport boundary (beyond overscan)', () => {
    const result = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 0,
    });
    // viewport is 200px / 40px = 5 rows; Math.ceil(200/40) = 5, so endIndex = 0 + 5 + 0 = 5
    expect(result.endIndex).toBe(5);
  });

  it('updates rendered rows on scroll down', () => {
    const before = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 0,
    });
    const after = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 400,
      overscan: 0,
    });
    expect(after.startIndex).toBeGreaterThan(before.startIndex);
    expect(after.endIndex).toBeGreaterThan(before.endIndex);
  });

  it('updates rendered rows on scroll up', () => {
    const before = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 400,
      overscan: 0,
    });
    const after = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 0,
    });
    expect(after.startIndex).toBeLessThan(before.startIndex);
    expect(after.endIndex).toBeLessThan(before.endIndex);
  });

  it('maintains correct row offsets after fast scroll', () => {
    const result = calculateVisibleRows({
      totalRows: 1000,
      rowHeight: 40,
      viewportHeight: 400,
      scrollTop: 5000,
      overscan: 0,
    });
    // startIndex should be 5000/40 = 125
    expect(result.offset).toBe(result.startIndex * 40);
  });

  it('handles scroll to end of dataset', () => {
    const result = calculateVisibleRows({
      totalRows: 50,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 1800, // (50-5)*40 = 1800
      overscan: 0,
    });
    expect(result.endIndex).toBe(49);
  });

  it('handles scroll back to top', () => {
    const result = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 0,
    });
    expect(result.startIndex).toBe(0);
    expect(result.offset).toBe(0);
  });

  it('renders overscan rows above viewport', () => {
    const result = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 400, // first visible = row 10
      overscan: 3,
    });
    // With overscan=3, startIndex should be max(0, 10-3) = 7
    expect(result.startIndex).toBe(7);
  });

  it('renders overscan rows below viewport', () => {
    const result = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 3,
    });
    // visibleCount = ceil(200/40) = 5; endIndex = 0 + 5 + 3 = 8
    expect(result.endIndex).toBe(8);
  });

  it('recalculates on container resize (different viewportHeight)', () => {
    const small = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 0,
    });
    const large = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 400,
      scrollTop: 0,
      overscan: 0,
    });
    expect(large.endIndex).toBeGreaterThan(small.endIndex);
  });

  it('handles ten thousand rows and returns a reasonable startIndex/endIndex range', () => {
    const result = calculateVisibleRows({
      totalRows: 10000,
      rowHeight: 40,
      viewportHeight: 800,
      scrollTop: 200000, // mid-dataset
      overscan: 3,
    });
    const rangeSize = result.endIndex - result.startIndex + 1;
    // Should only render a small window, not all 10000 rows
    expect(rangeSize).toBeLessThan(50);
    expect(result.startIndex).toBeGreaterThan(0);
    expect(result.endIndex).toBeLessThan(10000);
  });

  it('totalSize equals totalRows * rowHeight', () => {
    const result = calculateVisibleRows({
      totalRows: 200,
      rowHeight: 35,
      viewportHeight: 400,
      scrollTop: 0,
    });
    expect(result.totalSize).toBe(200 * 35);
  });

  it('offset is startIndex * rowHeight', () => {
    const result = calculateVisibleRows({
      totalRows: 100,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 800,
      overscan: 2,
    });
    expect(result.offset).toBe(result.startIndex * 40);
  });

  it('handles zero rows', () => {
    const result = calculateVisibleRows({
      totalRows: 0,
      rowHeight: 40,
      viewportHeight: 400,
      scrollTop: 0,
    });
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(-1);
    expect(result.totalSize).toBe(0);
    expect(result.offset).toBe(0);
  });
});

describe('calculateVisibleColumns', () => {
  const makeColumns = (widths: number[]) => widths.map(width => ({ width }));

  it('column virtualization calculates visible columns', () => {
    const columns = makeColumns([100, 100, 100, 100, 100]);
    const result = calculateVisibleColumns({
      columns,
      viewportWidth: 200,
      scrollLeft: 0,
      overscan: 0,
    });
    expect(result.startIndex).toBe(0);
    // viewport 200px with overscan=1 default: endIndex includes the overscan column beyond the edge
    expect(result.endIndex).toBeLessThanOrEqual(3);
  });

  it('column virtualization handles scroll left', () => {
    const columns = makeColumns([100, 100, 100, 100, 100]);
    const result = calculateVisibleColumns({
      columns,
      viewportWidth: 200,
      scrollLeft: 200,
      overscan: 0,
    });
    // scrolled 200px means columns 0-1 are off screen, startIndex = 2
    expect(result.startIndex).toBe(2);
  });

  it('column virtualization overscan columns', () => {
    const columns = makeColumns([100, 100, 100, 100, 100]);
    const result = calculateVisibleColumns({
      columns,
      viewportWidth: 100,
      scrollLeft: 200, // column 2 is at the left edge
      overscan: 1,
    });
    // Without overscan startIndex = 2; with overscan=1 it should be 1
    expect(result.startIndex).toBe(1);
  });

  it('handles variable column widths', () => {
    const columns = makeColumns([50, 200, 75, 300, 100]);
    const result = calculateVisibleColumns({
      columns,
      viewportWidth: 300,
      scrollLeft: 50, // first col (50px) scrolled out
      overscan: 0,
    });
    expect(result.startIndex).toBe(1); // second column starts at offset 50
  });

  it('totalSize equals sum of all column widths', () => {
    const columns = makeColumns([80, 120, 200, 60]);
    const result = calculateVisibleColumns({
      columns,
      viewportWidth: 300,
      scrollLeft: 0,
    });
    expect(result.totalSize).toBe(80 + 120 + 200 + 60);
  });

  it('offset equals sum of widths before startIndex', () => {
    const columns = makeColumns([100, 100, 100, 100, 100]);
    const result = calculateVisibleColumns({
      columns,
      viewportWidth: 200,
      scrollLeft: 200,
      overscan: 0,
    });
    // startIndex = 2, offset should be 200
    expect(result.offset).toBe(result.startIndex * 100);
  });

  it('handles zero columns', () => {
    const result = calculateVisibleColumns({
      columns: [],
      viewportWidth: 400,
      scrollLeft: 0,
    });
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(-1);
    expect(result.totalSize).toBe(0);
    expect(result.offset).toBe(0);
  });
});
