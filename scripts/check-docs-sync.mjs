#!/usr/bin/env node
// Docs-sync gate — the check half of the `release-docs-sync` maintainer skill.
//
// Fails when the branch changes product files (src/, templates/, scripts/)
// but CHANGELOG.md is untouched, unless the PR body carries an explicit
// opt-out line:   Docs: none — <reason>
//
// README.md cannot be judged mechanically; the failure message reminds the
// author to run /release-docs-sync, which decides README + AGENTS.md too.
//
// Usage:
//   node scripts/check-docs-sync.mjs [--base <ref>] [--body <text>] [--body-file <path>]
// Exit 0 = pass, 1 = docs missing.  Called by CI (docs-sync.yml) and by the
// Claude Code PreToolUse hook (.claude/hooks/pr-docs-gate.mjs).

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PRODUCT_PATHS = [/^src\//, /^templates\//, /^scripts\//];
const OPT_OUT = /^\s*Docs:\s*none\b/im;

export function changedFiles(base) {
  const out = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf-8' });
  return out.split('\n').map((l) => l.trim()).filter(Boolean);
}

export function evaluate(files, body) {
  const product = files.filter((f) => PRODUCT_PATHS.some((re) => re.test(f)));
  if (product.length === 0) return { ok: true, reason: 'no product files changed' };
  if (files.includes('CHANGELOG.md')) return { ok: true, reason: 'CHANGELOG.md updated' };
  if (OPT_OUT.test(body)) return { ok: true, reason: 'PR body opts out with "Docs: none"' };
  return { ok: false, product };
}

function resolveBase(explicit) {
  if (explicit) return explicit;
  for (const ref of ['origin/main', 'main']) {
    try {
      execSync(`git rev-parse --verify -q ${ref}`, { stdio: 'ignore' });
      return ref;
    } catch {}
  }
  return 'main';
}

function main() {
  const args = process.argv.slice(2);
  let base, body = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base') base = args[++i];
    else if (args[i] === '--body') body = args[++i] ?? '';
    else if (args[i] === '--body-file') body = readFileSync(args[++i], 'utf-8');
  }
  base = resolveBase(base);
  const result = evaluate(changedFiles(base), body);
  if (result.ok) {
    console.log(`docs-sync: ok (${result.reason})`);
    return 0;
  }
  console.error(
    [
      'docs-sync: BLOCKED — product files changed but CHANGELOG.md was not touched.',
      '',
      '  Changed product files:',
      ...result.product.slice(0, 15).map((f) => `    ${f}`),
      ...(result.product.length > 15 ? [`    … and ${result.product.length - 15} more`] : []),
      '',
      '  Run /release-docs-sync first. It reads the diff and decides which of',
      '  CHANGELOG.md, README.md, and AGENTS.md need an entry, then writes them.',
      '',
      '  If this change is genuinely internal (refactor, tests, CI, generated files),',
      '  put this line in the PR body and the gate passes:',
      '',
      '    Docs: none — <one-line reason>',
      '',
    ].join('\n'),
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
