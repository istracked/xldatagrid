import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDraftState } from '../useDraftState';
import { useSelectState } from '../useSelectState';
import { useArrayState } from '../useArrayState';

// ---------------------------------------------------------------------------
// useDraftState
// ---------------------------------------------------------------------------

describe('useDraftState', () => {
  const defaultOpts = {
    initialValue: 'hello',
    isEditing: false,
    onCommit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('returns initial draft from initialValue', () => {
    const { result } = renderHook(() => useDraftState(defaultOpts));
    expect(result.current.draft).toBe('hello');
  });

  it('resets draft when isEditing transitions to true', () => {
    const { result, rerender } = renderHook(
      (props) => useDraftState(props),
      { initialProps: { ...defaultOpts, initialValue: 'initial' } }
    );
    act(() => result.current.setDraft('changed'));
    expect(result.current.draft).toBe('changed');
    rerender({ ...defaultOpts, initialValue: 'initial', isEditing: true });
    expect(result.current.draft).toBe('initial');
  });

  it('commit() calls onCommit with current draft', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDraftState({ ...defaultOpts, onCommit, isEditing: true }));
    act(() => result.current.setDraft('world'));
    act(() => result.current.commit());
    expect(onCommit).toHaveBeenCalledWith('world');
  });

  it('commit(raw) calls onCommit with provided value', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDraftState({ ...defaultOpts, onCommit }));
    act(() => result.current.commit('override'));
    expect(onCommit).toHaveBeenCalledWith('override');
  });

  it('transformCommit is applied before onCommit', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useDraftState({ ...defaultOpts, onCommit, isEditing: true, transformCommit: (d) => Number(d) })
    );
    act(() => result.current.setDraft('42'));
    act(() => result.current.commit());
    expect(onCommit).toHaveBeenCalledWith(42);
  });

  it('handleKeyDown Enter commits', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDraftState({ ...defaultOpts, onCommit, isEditing: true }));
    act(() => {
      result.current.handleKeyDown({ key: 'Enter', preventDefault: vi.fn() } as any);
    });
    expect(onCommit).toHaveBeenCalled();
  });

  it('handleKeyDown Escape cancels', () => {
    const onCancel = vi.fn();
    const { result } = renderHook(() => useDraftState({ ...defaultOpts, onCancel }));
    act(() => {
      result.current.handleKeyDown({ key: 'Escape', preventDefault: vi.fn() } as any);
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it('handleBlur commits', () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDraftState({ ...defaultOpts, onCommit }));
    act(() => result.current.handleBlur());
    expect(onCommit).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useSelectState
// ---------------------------------------------------------------------------

describe('useSelectState', () => {
  it('initializes draft from value', () => {
    const { result } = renderHook(() => useSelectState({ value: 'active', isEditing: false }));
    expect(result.current.draft).toBe('active');
  });

  it('syncs draft when value changes', () => {
    const { result, rerender } = renderHook(
      (props) => useSelectState(props),
      { initialProps: { value: 'a', isEditing: false } }
    );
    rerender({ value: 'b', isEditing: false });
    expect(result.current.draft).toBe('b');
  });

  it('sets open to true when isEditing becomes true', () => {
    const { result, rerender } = renderHook(
      (props) => useSelectState(props),
      { initialProps: { value: 'a', isEditing: false } }
    );
    expect(result.current.open).toBe(false);
    rerender({ value: 'a', isEditing: true });
    expect(result.current.open).toBe(true);
  });

  it('sets open to false when isEditing becomes false', () => {
    const { result, rerender } = renderHook(
      (props) => useSelectState(props),
      { initialProps: { value: 'a', isEditing: true } }
    );
    rerender({ value: 'a', isEditing: false });
    expect(result.current.open).toBe(false);
  });

  it('allows manual setDraft', () => {
    const { result } = renderHook(() => useSelectState({ value: 'a', isEditing: false }));
    act(() => result.current.setDraft('manual'));
    expect(result.current.draft).toBe('manual');
  });
});

// ---------------------------------------------------------------------------
// useArrayState
// ---------------------------------------------------------------------------

const parseTags = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  return [];
};

describe('useArrayState', () => {
  it('initializes items from parse(value)', () => {
    const { result } = renderHook(() => useArrayState({ value: ['a', 'b'], isEditing: false, parse: parseTags }));
    expect(result.current.items).toEqual(['a', 'b']);
  });

  it('re-parses when isEditing becomes true', () => {
    const { result, rerender } = renderHook(
      (props) => useArrayState(props),
      { initialProps: { value: ['a'], isEditing: false, parse: parseTags } }
    );
    act(() => result.current.setItems(['modified']));
    rerender({ value: ['a'], isEditing: true, parse: parseTags });
    expect(result.current.items).toEqual(['a']);
  });

  it('allows manual setItems', () => {
    const { result } = renderHook(() => useArrayState({ value: [], isEditing: true, parse: parseTags }));
    act(() => result.current.setItems(['x', 'y']));
    expect(result.current.items).toEqual(['x', 'y']);
  });

  it('does not re-parse when isEditing stays false', () => {
    const { result, rerender } = renderHook(
      (props) => useArrayState(props),
      { initialProps: { value: ['a'], isEditing: false, parse: parseTags } }
    );
    act(() => result.current.setItems(['modified']));
    rerender({ value: ['a'], isEditing: false, parse: parseTags });
    expect(result.current.items).toEqual(['modified']);
  });
});
