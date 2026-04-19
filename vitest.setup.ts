/**
 * Vitest global setup file, loaded once per worker before any test module runs.
 *
 * The grid's test suites assume a browser-like environment (jsdom) augmented
 * with two extras that jsdom does not provide out of the box: DOM matchers
 * from `@testing-library/jest-dom` and a working IndexedDB implementation for
 * the persisted search-index adapter. This file installs those extras and
 * patches a couple of globals that jsdom leaves undefined so components can
 * mount without crashing during render.
 */

// Registers jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.) on
// Vitest's expect so DOM assertions read naturally in component tests.
import '@testing-library/jest-dom/vitest';
// Installs fake-indexeddb as the global `indexedDB` and related constructors,
// letting the IDB-backed search-index adapter run unmodified under jsdom.
import 'fake-indexeddb/auto';

// jsdom does not implement ResizeObserver. Provide a no-op stub so components
// that use it (e.g. useVirtualization) can mount without errors in tests.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
