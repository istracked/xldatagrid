/**
 * End-to-end: column drag-to-reorder drop indicator (#69).
 *
 * Contract (see GitHub #69): while dragging a column header, the hovered
 * target header cell exposes a `data-drop-indicator` attribute resolved
 * against the pointer's horizontal position:
 *
 *   - `data-drop-indicator="left"`  — pointer in the left half of the target
 *   - `data-drop-indicator="right"` — pointer in the right half of the target
 *
 * A thick bar (≥ 3px) renders on the resolved edge. Frozen columns
 * (`data-draggable="false"` or equivalent) must never receive the attribute.
 * The attribute clears on drop / dragleave.
 *
 * Story: `examples-column-operations--column-reorder` — the primary
 * column-reorder example. A `Frozen` story (`--frozen-columns`) is used to
 * cover the frozen-column contract.
 *
 * These tests are expected to FAIL today: the drag already works, but the
 * drop-indicator attribute and bar are not yet implemented.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const REORDER_URL =
  '/iframe.html?viewMode=story&id=examples-column-operations--column-reorder';
const FROZEN_URL =
  '/iframe.html?viewMode=story&id=examples-column-operations--frozen-columns';

async function waitForGrid(page: Page): Promise<void> {
  await page.locator('[role="grid"]').first().waitFor({ state: 'visible' });
}

function headerCell(page: Page, field: string): Locator {
  return page
    .locator(`[role="columnheader"][data-field="${field}"]`)
    .first();
}

async function dragHeaderOnto(
  page: Page,
  source: Locator,
  target: Locator,
  half: 'left' | 'right',
): Promise<void> {
  const srcBox = await source.boundingBox();
  const tgtBox = await target.boundingBox();
  if (!srcBox || !tgtBox) throw new Error('boundingBox unavailable');

  const startX = srcBox.x + srcBox.width / 2;
  const startY = srcBox.y + srcBox.height / 2;
  const endY = tgtBox.y + tgtBox.height / 2;
  const endX =
    half === 'left'
      ? tgtBox.x + tgtBox.width * 0.25
      : tgtBox.x + tgtBox.width * 0.75;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 5, startY, { steps: 2 });
  await page.mouse.move(endX, endY, { steps: 10 });
}

test.describe('Column drop indicator (#69)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REORDER_URL);
    await waitForGrid(page);
  });

  test('column-drop-indicator: dragging a header over the left half of a target column sets data-drop-indicator="left" (#69)', async ({
    page,
  }) => {
    // The columns come from the reorder story; pick two by their data-field.
    // The story headers include at least two reorderable columns — we drag
    // the first header onto the third one to avoid self-drop edge cases.
    const headers = page.locator('[role="columnheader"]');
    const allFields = await headers.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).getAttribute('data-field')),
    );
    const reorderable = allFields.filter((f): f is string => !!f);
    expect(reorderable.length).toBeGreaterThanOrEqual(3);
    const src = headerCell(page, reorderable[0]!);
    const tgt = headerCell(page, reorderable[2]!);

    await dragHeaderOnto(page, src, tgt, 'left');
    await expect(tgt).toHaveAttribute('data-drop-indicator', 'left');

    await page.mouse.up();
  });

  test('column-drop-indicator: dragging over the right half sets data-drop-indicator="right" (#69)', async ({
    page,
  }) => {
    const headers = page.locator('[role="columnheader"]');
    const allFields = await headers.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).getAttribute('data-field')),
    );
    const reorderable = allFields.filter((f): f is string => !!f);
    const src = headerCell(page, reorderable[0]!);
    const tgt = headerCell(page, reorderable[2]!);

    await dragHeaderOnto(page, src, tgt, 'right');
    await expect(tgt).toHaveAttribute('data-drop-indicator', 'right');

    await page.mouse.up();
  });

  test('column-drop-indicator: indicator bar has non-zero computed width ≥ 3px on the resolved edge (#69)', async ({
    page,
  }) => {
    const headers = page.locator('[role="columnheader"]');
    const allFields = await headers.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).getAttribute('data-field')),
    );
    const reorderable = allFields.filter((f): f is string => !!f);
    const src = headerCell(page, reorderable[0]!);
    const tgt = headerCell(page, reorderable[2]!);

    await dragHeaderOnto(page, src, tgt, 'right');

    const bar = tgt.locator('[data-column-drop-indicator]');
    await expect(bar).toHaveCount(1);
    const width = await bar.evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThanOrEqual(3);

    await page.mouse.up();
  });
});

test.describe('Column drop indicator — frozen columns (#69)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FROZEN_URL);
    await waitForGrid(page);
  });

  test('column-drop-indicator: frozen column never receives the indicator attribute (#69)', async ({
    page,
  }) => {
    // The frozen-columns story pins at least one column. Find a frozen
    // header — we rely on the `data-draggable="false"` contract, which the
    // header emits when the column carries `frozen: true`.
    const frozen = page.locator('[role="columnheader"][data-draggable="false"]').first();
    await expect(frozen).toBeVisible();

    // Drag a non-frozen header over the frozen one — the frozen target must
    // NOT accept a drop indicator regardless of pointer position.
    const nonFrozen = page.locator('[role="columnheader"]:not([data-draggable="false"])').first();
    await expect(nonFrozen).toBeVisible();

    await dragHeaderOnto(page, nonFrozen, frozen, 'left');
    await expect(frozen).not.toHaveAttribute('data-drop-indicator', /left|right/);

    await page.mouse.up();
  });
});
