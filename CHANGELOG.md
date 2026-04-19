# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Security
- RichTextCell now blocks `javascript:`, `data:`, `vbscript:`, and `about:` URL schemes in markdown links. Inline event-handler attributes (`onerror`, `onclick`, etc.) are stripped from HTML paste before markdown conversion. (WS-A, post-merge hardening)

### Fixed
- IME composition (CJK input) no longer triggers spurious cell commits on Enter/Tab. (WS-B)
- Row-click now honours `event.defaultPrevented` — custom cell renderers calling `stopPropagation()`/`preventDefault()` properly suppress row selection. (WS-B)
- `stripField` recursion now bounded (MAX_FILTER_DEPTH=100) and prunes empty composite branches. (WS-E)
- BooleanSelectedCell now shows a visible focus outline (WCAG 2.4.7 AA). (WS-F)
- PasswordConfirmCell exposes `autoComplete="new-password"` and links inputs to the mismatch alert via `aria-describedby`. (WS-F)
- Subgrid expansion no longer drops the body out of virtualisation; only the expanded inner rows render. (WS-G)
- Keyboard scoping now uses ref-equality, eliminating collisions with consumer `role="grid"` wrappers. (WS-G)

### Added
- Public exports for `useDraftState`, `useSelectState`, `useArrayState` hooks. (WS-C)
- Token-sync content-hash and drift-check (`pnpm tokens:check`). (WS-H)
- Property-based tests (fast-check) for `stripField` and `getEndJumpCell`. (WS-J)

### Removed (BREAKING, from PR #22)
- `DataGridColumnMenuProps.isSortingEnabled`, `.onSortAsc`, `.onSortDesc` — sort actions now live in the Excel-365 filter dropdown. Migrate by removing these props from `<DataGridColumnMenu>` usages.

## [0.1.0] — 2026-04-15
- Initial release of xldatagrid monorepo.
