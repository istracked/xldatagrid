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

// jsdom's CSS backend (cssstyle 4.x) silently drops some vendor-prefixed
// properties from `setProperty` because they are not in its allow-list. The
// cell-overflow contract asserts `style.getPropertyValue('-webkit-box-orient')`
// which goes through that allow-list and returns '' in vanilla jsdom. We teach
// the prototype to remember that specific property's value on a per-element
// side map; every other property continues to flow through cssstyle unchanged.
// This keeps the test environment honest (the attribute is readable) without
// affecting production code paths.
{
  type Side = WeakMap<CSSStyleDeclaration, Map<string, string>>;
  const sideValues: Side = new WeakMap();
  const PATCHED_PROPS = new Set(['-webkit-box-orient']);
  const proto = HTMLElement.prototype;
  const styleDesc = Object.getOwnPropertyDescriptor(proto, 'style');
  // Only patch once; some setups reload this module.
  if (styleDesc && !(proto as unknown as { __dgCssPatch?: boolean }).__dgCssPatch) {
    (proto as unknown as { __dgCssPatch?: boolean }).__dgCssPatch = true;
    const anyElem = document.createElement('div');
    const StyleProto = Object.getPrototypeOf(anyElem.style) as CSSStyleDeclaration;
    // Keep the originals UNBOUND so our wrappers can forward `this` to the
    // real CSSStyleDeclaration instance — binding them to the prototype
    // leaves instance-private fields (`_values`, `_priorities`) undefined and
    // crashes cssstyle's own cssText getter.
    const origSet = StyleProto.setProperty;
    const origGet = StyleProto.getPropertyValue;
    const origRemove = StyleProto.removeProperty;
    StyleProto.setProperty = function (
      this: CSSStyleDeclaration,
      name: string,
      value: string | null,
      priority?: string,
    ): void {
      origSet.call(this, name, value ?? '', priority ?? '');
      if (PATCHED_PROPS.has(name) && value) {
        let map = sideValues.get(this);
        if (!map) {
          map = new Map();
          sideValues.set(this, map);
        }
        map.set(name, String(value));
      }
    };
    StyleProto.getPropertyValue = function (
      this: CSSStyleDeclaration,
      name: string,
    ): string {
      const map = sideValues.get(this);
      if (map && map.has(name)) return map.get(name) ?? '';
      return origGet.call(this, name);
    };
    StyleProto.removeProperty = function (
      this: CSSStyleDeclaration,
      name: string,
    ): string {
      const map = sideValues.get(this);
      if (map) map.delete(name);
      return origRemove.call(this, name);
    };
  }
}
