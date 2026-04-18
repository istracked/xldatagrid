#!/usr/bin/env node
/**
 * sync-tokens.mjs
 *
 * Ingests design tokens from the `istracked/tokens` repository into the
 * xldatagrid source tree. The tokens repository is the organisation-wide
 * source of truth for the iAsBuilt palette; this script copies the
 * already-built distribution artefacts (JSON + CSS) into
 * `packages/react/src/styles/tokens/` so the grid's theme layer can consume
 * them without a hard git-submodule or package-manager dependency.
 *
 * Resolution order for the tokens source directory:
 *   1. `ISTRACKED_TOKENS_DIR` environment variable (absolute path).
 *   2. A sibling directory named `tokens` next to the repository root.
 *
 * The script copies:
 *   - `dist/json/light.json`  -> `packages/react/src/styles/tokens/light.json`
 *   - `dist/json/dark.json`   -> `packages/react/src/styles/tokens/dark.json`
 *   - `dist/css/light.css`    -> `packages/react/src/styles/tokens/light.css`
 *   - `dist/css/dark.css`     -> `packages/react/src/styles/tokens/dark.css`
 *
 * Exit code 0 on success, non-zero if the source directory cannot be
 * located or the expected artefacts are missing.
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

function resolveTokensDir() {
  const fromEnv = process.env.ISTRACKED_TOKENS_DIR;
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      throw new Error(`ISTRACKED_TOKENS_DIR is set to ${fromEnv} but that path does not exist.`);
    }
    return fromEnv;
  }
  const sibling = resolve(repoRoot, '..', 'tokens');
  if (existsSync(sibling)) return sibling;
  throw new Error(
    `Unable to locate the istracked/tokens repository. Checked the sibling directory ${sibling}. ` +
    `Set ISTRACKED_TOKENS_DIR to its absolute path and retry.`,
  );
}

const tokensDir = resolveTokensDir();
const targetDir = resolve(repoRoot, 'packages', 'react', 'src', 'styles', 'tokens');
mkdirSync(targetDir, { recursive: true });

const pairs = [
  ['dist/json/light.json', 'light.json'],
  ['dist/json/dark.json', 'dark.json'],
  ['dist/css/light.css', 'light.css'],
  ['dist/css/dark.css', 'dark.css'],
];

for (const [src, dst] of pairs) {
  const source = join(tokensDir, src);
  const target = join(targetDir, dst);
  if (!existsSync(source)) {
    throw new Error(`Expected token artefact not found: ${source}`);
  }
  copyFileSync(source, target);
  console.log(`copied ${src} -> ${target}`);
}

// Emit a small manifest alongside the copies so downstream code (and reviewers)
// can see at a glance which token-repo version was ingested.
const manifest = {
  source: tokensDir,
  syncedAt: new Date().toISOString(),
  files: pairs.map(([, dst]) => dst),
};
writeFileSync(join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote manifest to ${join(targetDir, 'manifest.json')}`);
