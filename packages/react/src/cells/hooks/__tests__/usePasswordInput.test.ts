/**
 * Unit tests for {@link usePasswordInput}.
 *
 * These tests cover the five invariants the hook advertises:
 *   1. `visible` defaults based on `initialVisible`.
 *   2. `toggle()` flips `visible` and updates `inputType` accordingly.
 *   3. `autoComplete` is derived from `confirmMode`.
 *   4. The four ids are stable across renders and follow the documented
 *      `${baseId}-pw1/-pw2/-mismatch` convention.
 *   5. The `idPrefix` option is applied to `baseId` when provided.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePasswordInput } from '../usePasswordInput';

describe('usePasswordInput', () => {
  // -------------------------------------------------------------------------
  // Defaults
  // -------------------------------------------------------------------------

  it('defaults visible to false (password is masked on first render)', () => {
    const { result } = renderHook(() => usePasswordInput());
    expect(result.current.visible).toBe(false);
    expect(result.current.inputType).toBe('password');
  });

  it('respects initialVisible=true', () => {
    const { result } = renderHook(() => usePasswordInput({ initialVisible: true }));
    expect(result.current.visible).toBe(true);
    expect(result.current.inputType).toBe('text');
  });

  // -------------------------------------------------------------------------
  // toggle()
  // -------------------------------------------------------------------------

  it('toggle() flips visible between false and true', () => {
    const { result } = renderHook(() => usePasswordInput());
    expect(result.current.visible).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.visible).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.visible).toBe(false);
  });

  it('inputType follows visible after toggle()', () => {
    const { result } = renderHook(() => usePasswordInput());
    expect(result.current.inputType).toBe('password');
    act(() => result.current.toggle());
    expect(result.current.inputType).toBe('text');
    act(() => result.current.toggle());
    expect(result.current.inputType).toBe('password');
  });

  it('toggle is stable across renders (same reference)', () => {
    const { result, rerender } = renderHook(() => usePasswordInput());
    const firstToggle = result.current.toggle;
    rerender();
    expect(result.current.toggle).toBe(firstToggle);
  });

  // -------------------------------------------------------------------------
  // autoComplete
  // -------------------------------------------------------------------------

  it('autoComplete is "current-password" by default (single-input mode)', () => {
    const { result } = renderHook(() => usePasswordInput());
    expect(result.current.autoComplete).toBe('current-password');
  });

  it('autoComplete is "new-password" when confirmMode=true', () => {
    const { result } = renderHook(() => usePasswordInput({ confirmMode: true }));
    expect(result.current.autoComplete).toBe('new-password');
  });

  // -------------------------------------------------------------------------
  // id stability & naming convention
  // -------------------------------------------------------------------------

  it('derives primaryInputId/confirmInputId/describedById from baseId', () => {
    const { result } = renderHook(() => usePasswordInput());
    const { baseId, primaryInputId, confirmInputId, describedById } = result.current;
    expect(primaryInputId).toBe(`${baseId}-pw1`);
    expect(confirmInputId).toBe(`${baseId}-pw2`);
    expect(describedById).toBe(`${baseId}-mismatch`);
  });

  it('all ids are distinct', () => {
    const { result } = renderHook(() => usePasswordInput());
    const ids = new Set([
      result.current.baseId,
      result.current.primaryInputId,
      result.current.confirmInputId,
      result.current.describedById,
    ]);
    expect(ids.size).toBe(4);
  });

  it('baseId is stable across renders', () => {
    const { result, rerender } = renderHook(() => usePasswordInput());
    const firstBaseId = result.current.baseId;
    rerender();
    expect(result.current.baseId).toBe(firstBaseId);
  });

  it('ids are stable across renders even when visible toggles', () => {
    const { result } = renderHook(() => usePasswordInput());
    const initial = {
      baseId: result.current.baseId,
      primaryInputId: result.current.primaryInputId,
      confirmInputId: result.current.confirmInputId,
      describedById: result.current.describedById,
    };
    act(() => result.current.toggle());
    expect(result.current.baseId).toBe(initial.baseId);
    expect(result.current.primaryInputId).toBe(initial.primaryInputId);
    expect(result.current.confirmInputId).toBe(initial.confirmInputId);
    expect(result.current.describedById).toBe(initial.describedById);
  });

  it('separate call sites yield distinct baseIds', () => {
    const { result: a } = renderHook(() => usePasswordInput());
    const { result: b } = renderHook(() => usePasswordInput());
    expect(a.current.baseId).not.toBe(b.current.baseId);
  });

  // -------------------------------------------------------------------------
  // idPrefix
  // -------------------------------------------------------------------------

  it('prepends idPrefix to baseId when provided', () => {
    const { result } = renderHook(() => usePasswordInput({ idPrefix: 'pw-form-' }));
    expect(result.current.baseId.startsWith('pw-form-')).toBe(true);
    expect(result.current.primaryInputId.startsWith('pw-form-')).toBe(true);
  });
});
