/**
 * Per-cell hover tooltip surfaced after a short idle delay.
 *
 * Feature 5 contract (enforced by
 * `packages/react/src/__tests__/hover-tooltip.test.tsx`):
 *
 *   1. Hovering a data cell schedules a show after ~400 ms. Leaving before
 *      the delay elapses cancels the pending timer.
 *   2. Tooltip body is the cell's rendered text by default, OR `ColumnDef.note`
 *      when provided. The `note` may be a string literal or a function
 *      `(row) => string`; the function form wins over default content.
 *   3. The tooltip is portaled to `document.body` (not mounted inside the
 *      cell DOM) so it can escape the grid's overflow / stacking context.
 *   4. ARIA: the tooltip node has `role="tooltip"` and a stable `id`. While
 *      visible, the hovered cell receives `aria-describedby="<tooltip-id>"`;
 *      the attribute is removed on hide.
 *   5. Dismissal pathways: mouseleave, Escape anywhere, any document scroll,
 *      or focus change elsewhere. Any pending show timer is also cleared on
 *      mouseleave so a quick bounce never "remembers" the hover.
 *
 * Composition note: cells already own validation-tooltip `onMouseEnter` /
 * `onMouseLeave` handlers. The `useHoverTooltip` hook returns handlers that
 * callers must chain with the existing ones — the hook does NOT replace the
 * validation side of the interaction.
 *
 * @module HoverTooltip
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Delay (ms) before a hover tooltip appears. Matches the spec's 400 ms target
 * and the Windows "long hover" convention used by Office apps.
 */
export const HOVER_TOOLTIP_DELAY_MS = 400;

/**
 * State returned by `useHoverTooltip` for the consuming cell to apply.
 */
interface HoverTooltipHandlers {
  /** Must be composed with any existing `onMouseEnter` on the cell. */
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  /** Must be composed with any existing `onMouseLeave` on the cell. */
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => void;
  /**
   * Id of the tooltip node while visible, or `undefined` when hidden. Assign
   * to `aria-describedby` on the cell.
   */
  ariaDescribedBy: string | undefined;
  /**
   * JSX to render once. Internally it portals to `document.body` when the
   * tooltip is visible; when hidden it emits `null`. Safe to drop anywhere
   * inside the cell's render tree.
   */
  tooltipNode: React.ReactNode;
}

/**
 * Options accepted by `useHoverTooltip`.
 */
interface UseHoverTooltipOptions {
  /**
   * Resolves the tooltip body text. Called at show-time (after the delay),
   * not on every hover — lets consumers cheaply pass a `() => expensive()`
   * without burning cycles on aborted hovers.
   *
   * Returning an empty / nullish value suppresses the tooltip entirely.
   */
  resolveContent: () => string | null | undefined;
}

/**
 * Hook that drives a single cell's hover tooltip lifecycle.
 *
 * Internally schedules a `setTimeout` on mouseenter, installs document-level
 * listeners (scroll, keydown Escape, focusin) while visible, and produces a
 * portaled `<div role="tooltip">` wired up to `document.body`.
 *
 * The consumer is responsible for:
 *   - Chaining the returned `onMouseEnter` / `onMouseLeave` with any existing
 *     handlers on the cell (e.g. the validation-tooltip pair).
 *   - Applying `ariaDescribedBy` to the cell's `aria-describedby` attribute.
 *   - Rendering `tooltipNode` somewhere in the cell's JSX (any depth works;
 *     the portal escapes into `document.body`).
 */
export function useHoverTooltip(
  options: UseHoverTooltipOptions,
): HoverTooltipHandlers {
  const { resolveContent } = options;
  const tooltipId = useId();
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<string>('');
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always work with the latest resolveContent without re-binding effects.
  const resolveContentRef = useRef(resolveContent);
  resolveContentRef.current = resolveContent;

  const cancelPendingShow = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    cancelPendingShow();
    setVisible(false);
  }, [cancelPendingShow]);

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      cancelPendingShow();
      // Capture the cell's bounding box synchronously — by the time the
      // timer fires, `e.currentTarget` may have been nulled by React's
      // pooled-event semantics on older versions. We keep a snapshot.
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const resolved = resolveContentRef.current();
        if (resolved == null || resolved === '') return;
        setContent(String(resolved));
        // Position the tooltip slightly below the cell. Consumers can
        // reposition via CSS on `role="tooltip"`.
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
        setVisible(true);
      }, HOVER_TOOLTIP_DELAY_MS);
    },
    [cancelPendingShow],
  );

  const onMouseLeave = useCallback(() => {
    hide();
  }, [hide]);

  // Install global dismissal listeners only while the tooltip is visible.
  // Keeping them off while hidden avoids leaking work on every mouseover
  // across hundreds of grid cells.
  useEffect(() => {
    if (!visible) return;

    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    const onDocScroll = () => hide();
    const onDocFocusIn = () => {
      // Any focus change — into or out of the grid — closes the hover tip.
      // Matches the Office-style convention where keyboard intent supersedes
      // a mouse hover.
      hide();
    };

    document.addEventListener('keydown', onDocKeyDown, true);
    document.addEventListener('scroll', onDocScroll, true);
    document.addEventListener('focusin', onDocFocusIn, true);
    return () => {
      document.removeEventListener('keydown', onDocKeyDown, true);
      document.removeEventListener('scroll', onDocScroll, true);
      document.removeEventListener('focusin', onDocFocusIn, true);
    };
  }, [visible, hide]);

  // Cleanup on unmount — prevents a stale timer from firing against an
  // unmounted component.
  useEffect(() => {
    return () => cancelPendingShow();
  }, [cancelPendingShow]);

  const tooltipNode = visible
    ? createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            // Intentionally plain inline styles — consumers can theme via
            // CSS selectors on `[role="tooltip"]`. We set a high z-index so
            // the tooltip floats above the grid and any sticky chrome.
            zIndex: 10000,
            padding: '4px 8px',
            borderRadius: 4,
            background: 'var(--dg-tooltip-bg, #1f2937)',
            color: 'var(--dg-tooltip-fg, #ffffff)',
            fontSize: 12,
            lineHeight: '16px',
            pointerEvents: 'none',
            maxWidth: 320,
          }}
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  return {
    onMouseEnter,
    onMouseLeave,
    ariaDescribedBy: visible ? tooltipId : undefined,
    tooltipNode,
  };
}
