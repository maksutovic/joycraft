import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Paths Joycraft marks `linguist-generated=true` so GitHub collapses them in
 * PR review and drops them from diff stats. These are workflow exhaust —
 * briefs, specs, discoveries, installed templates — historical artifacts by
 * the time a PR is opened (the spec was reviewed conversationally when it was
 * written). Reviewers can still expand any of them with one click.
 *
 * Deliberately NOT listed (durable knowledge that deserves review eyes):
 * CLAUDE.md, AGENTS.md, docs/context/ (steers every future agent run), and
 * docs/backlog/ (human-authored idea capture).
 */
export const GITATTRIBUTES_COMMENT =
  '# Joycraft: collapse generated workflow docs in PR review (expand with one click)';

export const GITATTRIBUTES_ENTRIES = [
  'docs/features/** linguist-generated=true',
  'docs/bugfixes/** linguist-generated=true',
  'docs/discoveries/** linguist-generated=true',
  'docs/templates/** linguist-generated=true',
];

/**
 * Append-only, create-if-absent, idempotent .gitattributes writer — the same
 * contract as ensureGitignoreEntries: never rewrites, reorders, or removes
 * existing lines; only appends entries not already present (matched exactly,
 * after trimming). The comment header is only added when at least one entry
 * is missing, so a fully-applied file is never touched. Returns the entries
 * actually added (empty when everything was already present).
 */
export function applyGitattributes(targetDir: string): string[] {
  const gitattributesPath = join(targetDir, '.gitattributes');
  const current = existsSync(gitattributesPath) ? readFileSync(gitattributesPath, 'utf-8') : '';
  const present = new Set(current.split('\n').map((l) => l.trim()));
  const missing = GITATTRIBUTES_ENTRIES.filter((e) => !present.has(e.trim()));
  if (missing.length === 0) return [];

  const lines = present.has(GITATTRIBUTES_COMMENT) ? missing : [GITATTRIBUTES_COMMENT, ...missing];
  const sep = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  writeFileSync(gitattributesPath, current + sep + lines.join('\n') + '\n', 'utf-8');
  return missing;
}
