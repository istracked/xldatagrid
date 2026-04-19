/**
 * XSS hardening tests for htmlToMarkdown.
 *
 * Each test targets a class of injection that the pre-fix implementation let
 * through. All tests should FAIL against the unpatched code (RED) and PASS
 * after the sanitisation patch (GREEN).
 */
import { htmlToMarkdown } from '../htmlToMarkdown';

describe('htmlToMarkdown – XSS hardening', () => {
  // ── 1. javascript: href ────────────────────────────────────────────────────
  it('replaces javascript: href with #', () => {
    const out = htmlToMarkdown('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
    // The link text must still appear
    expect(out).toContain('click');
  });

  // ── 2. data: URI in href ───────────────────────────────────────────────────
  it('replaces data: URI href with #', () => {
    const out = htmlToMarkdown('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(out).not.toContain('data:');
    expect(out).toContain('x');
  });

  // ── 3. vbscript: and about: schemes ───────────────────────────────────────
  it('blocks vbscript: href', () => {
    const out = htmlToMarkdown('<a href="vbscript:MsgBox(1)">v</a>');
    expect(out).not.toContain('vbscript:');
  });

  it('blocks about: href', () => {
    const out = htmlToMarkdown('<a href="about:blank">a</a>');
    expect(out).not.toContain('about:');
  });

  // ── 4. inline event handlers stripped from any tag ─────────────────────────
  it('strips onerror= attribute from <img>', () => {
    const out = htmlToMarkdown('<img src="x" onerror="alert(1)">');
    expect(out).not.toMatch(/onerror/i);
  });

  it('strips onclick= attribute from arbitrary tags', () => {
    const out = htmlToMarkdown('<span onclick="evil()">text</span>');
    expect(out).not.toMatch(/onclick/i);
  });

  it('strips onload= attribute', () => {
    const out = htmlToMarkdown('<body onload="steal()">content</body>');
    expect(out).not.toMatch(/onload/i);
  });

  // ── 5. malformed nesting produces no unterminated markers or HTML ──────────
  it('handles malformed <b><i>t</b></i> without leaking raw HTML', () => {
    const out = htmlToMarkdown('<b><i>t</b></i>');
    // Must not contain any raw angle-bracket tags in the output
    expect(out).not.toMatch(/<\/?[a-zA-Z]/);
    // Must not contain unterminated markers (an odd count of ** or *)
    const boldMarkers = (out.match(/\*\*/g) ?? []).length;
    const italicOnly = (out.match(/(?<!\*)\*(?!\*)/g) ?? []).length;
    expect(boldMarkers % 2).toBe(0);
    expect(italicOnly % 2).toBe(0);
  });

  // ── 6. HTML comments with embedded <script> ────────────────────────────────
  it('strips HTML comments and does not leak comment delimiters or script content', () => {
    const out = htmlToMarkdown(
      '<p>safe<!-- <script>evil()</script> -->text</p>',
    );
    expect(out).not.toContain('<!--');
    expect(out).not.toContain('-->');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('evil()');
    // The visible text nodes should survive
    expect(out).toContain('safe');
    expect(out).toContain('text');
  });
});
