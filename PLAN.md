# Post-merge hardening plan (wave 1 + catch-up)

## Background

Between roughly T-10h and T-0h a burst of feature PRs was merged into
`main` without a critical review pass. A brutal team retrospective after
the fact surfaced a cluster of correctness and quality gaps that the
rush had papered over: DOM-sink XSS in the rich-text cell renderer,
IME-composition bugs that broke CJK/typing-through editors, missing
`defaultPrevented` guards on keyboard handlers, a public-API surface
with no guard test, accessibility regressions (focus-visible,
`aria-describedby` wiring, axe violations), subgrid virtualisation that
dropped `aria-owns` / `aria-controls`, type-safety holes (`as any`
clusters on the chrome-resolver path), and a CI that did not enforce
pre-commit parity. To close these in a controlled way we ran a
TDD-first hardening pass across ten parallel workstreams. Each
workstream opened its own branch, wrote RED tests first, then shipped
the fix in the same commit so the pre-commit hook could force green.

## Phase 0 - Baseline

- `tsc -b packages/*/tsconfig.build.json`: 22 errors -> 0 after PR #37
  (chore: fix baseline TypeScript errors).
- `tsc --noEmit` (broad, including tests + playground): 4,743 errors.
  Deliberately out of scope for this pass; tracked as a separate
  follow-up because the fix-set is orthogonal to the hardening
  workstreams and touches editor/playground tooling.
- Test count at baseline: 1,637.
- PLAN.md (this file) was meant to land in Phase 0 but did not. Closed
  by the `catchup/plan-doc-and-yaml-lint` wave.

## Phase 1 - RED tests (parallel agents)

Ten agents ran in parallel, each owning a single workstream:

- **Agent A - XSS.** Rich-text / markdown cell renderer failed under
  crafted HTML (`<img onerror>`, `javascript:` hrefs, sanitisation
  escapes). RED tests asserted sanitised output; GREEN shipped a
  DOMPurify pass on the render path.
- **Agent B - IME + `defaultPrevented`.** Composition events were not
  respected in the editable-cell Enter/Escape handlers, and keyboard
  handlers fired through `defaultPrevented` events. RED tests covered
  `compositionstart` / `compositionend` and the event-default guard;
  GREEN added both checks.
- **Agent C - public-API guard.** Public exports had drifted (private
  internals leaked, intended exports broken). RED test enumerates the
  public surface; GREEN locks it down.
- **Agent D - chrome composition.** Chrome-resolver memoisation missed
  per-row identity, causing stale resolutions when multiple chromes
  composed. RED covered the composition scenarios; GREEN fixed the
  memo key.
- **Agent E - `stripField` depth + prune.** Filter `stripField` helper
  had no depth cap and no prune of now-empty groups, allowing a hostile
  filter tree to DoS the renderer. RED capped depth and pruned; GREEN
  shipped the guard.
- **Agent F - a11y (focus-visible, `aria-describedby`, axe).**
  Focus-visible styling was missing on the editable-cell chrome,
  `aria-describedby` was not wired to the in-cell error text, and axe
  reported contrast + role violations on the default theme.
- **Agent G - subgrid virtualisation + ARIA.** Subgrid lost
  `aria-owns` / `aria-controls` when rows were virtualised, and the
  virtualiser dropped header rows on fast scroll.
- **Agent H - token-sync manifest.** Design-token drift was silent;
  hand-edits to `packages/react/src/styles/tokens/` did not fail CI.
  Added a SHA-256 `contentHash` manifest and a `tokens:check` script.
- **Agent I - CI parity.** CI did not run the same commands as the
  pre-commit hook, so `git commit --no-verify` was effectively
  uncheckable. Added the `verify-precommit-parity` job that runs
  typecheck + build + test in lockstep with `.git/hooks/pre-commit`.
  Agent I did **not** ship a YAML-lint guard against future workflow
  regressions; closed by the `catchup/plan-doc-and-yaml-lint` wave
  (this PR).
- **Agent J - test hygiene + properties.** Introduced fast-check
  property tests for range extension and for the stripField depth
  guard, plus deduped brittle snapshot tests that had been copy-pasted
  across packages.

## Phase 2 - GREEN

All ten agents shipped the fix in the same commit as the RED tests.
The pre-commit hook (`tsc -b` + `pnpm build` + `pnpm test`) refuses any
commit where the test suite is not fully green, which is how GREEN was
enforced mechanically rather than by reviewer attention.

## Phase 3 - Refactor

- `usePasswordInput` extracted from the inline password-cell implementation
  so the hook can be unit-tested in isolation. Landed via the catch-up
  wave rather than the main hardening wave.
- Chrome-resolver named-object overload (PR #42): backward-compatible
  overload so consumers can pass `{ chrome, context }` explicitly.
- `as any` cleanup on the chrome-resolver path (PR #39): removed the
  subset of casts that the D/H workstreams had to touch.

## Phase 4 - Integration

All ten workstream branches reconciled into
`review/post-merge-hardening` (PR #38). Five of the branches merged
cleanly; `stripField` needed a manual reconciliation into core because
Agent E and Agent C both touched neighbouring files. The reconciled
branch opened as PR #38 against `main`.

## Phase 5 - Follow-ups

- PR #40 - turndown + DOMPurify on the HTML-to-markdown path.
- PR #41 - Playwright e2e + Chromatic visual regression workflow
  (`.github/workflows/e2e.yml`).
- PR #39 - `as any` cleanup on the chrome-resolver path.
- PR #42 - chrome-resolver backward-compat overload.
- Catch-up wave: chrome composition scenarios (additional property
  tests), range-extend properties, axe-core integration, the
  `usePasswordInput` extraction, PLAN.md (this file), and the
  actionlint CI guard.

## Gaps / known deferrals

- `tsc --noEmit` broad-scope 4,743 errors. Out of scope for this
  hardening pass; tracked as its own follow-up because it requires a
  coordinated editor/playground/tsconfig cleanup rather than a
  per-workstream fix.
- Remaining ~110 `as any` / `as unknown` casts across packages. PR #39
  closed the chrome-resolver subset; the rest is tracked for a future
  type-safety sweep.
