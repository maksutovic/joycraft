import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_PATH, type GitignoreProfile } from './version.js';

/**
 * The harness directories the `private` profile gitignores. Tracking only
 * CLAUDE.md, AGENTS.md, and docs/ means everything under these three dirs
 * stays local. `.claude/` already covers the hidden state file.
 */
export const PRIVATE_PROFILE_IGNORES = ['.claude/', '.agents/', '.pi/'];

/**
 * Append-only, create-if-absent, idempotent .gitignore writer.
 *
 * Mirrors the "append over modify when touching user files" principle: it never
 * rewrites, reorders, or removes existing lines — it only adds `line` if no
 * existing line matches it exactly (after trimming). Returns true if it wrote.
 *
 * Used by both `init` (to gitignore the relocated state file) and `upgrade`'s
 * legacy-migration step (so migrated projects also stop committing the state).
 */
export function ensureGitignoreEntry(targetDir: string, line: string): boolean {
  const gitignorePath = join(targetDir, '.gitignore');

  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, line + '\n', 'utf-8');
    return true;
  }

  const current = readFileSync(gitignorePath, 'utf-8');
  const already = current.split('\n').some((l) => l.trim() === line.trim());
  if (already) return false;

  // Append on its own line, tolerating a file that may or may not end in \n.
  const sep = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  writeFileSync(gitignorePath, current + sep + line + '\n', 'utf-8');
  return true;
}

/**
 * Apply a gitignore profile's entries to the project's .gitignore.
 *
 * - `shared`  — ignore only the hidden upgrade-state file (current default).
 * - `private` — ignore the whole .claude/, .agents/, .pi/ trees. Since
 *   .claude/ already covers the state file, the per-line writer skips the
 *   redundant state entry to avoid a dead line.
 *
 * Append-only and idempotent (each line goes through ensureGitignoreEntry), so
 * re-running init/upgrade never duplicates entries. Returns the list of lines
 * actually added this call (empty when everything was already present).
 */
export function applyGitignoreProfile(targetDir: string, profile: GitignoreProfile): string[] {
  const added: string[] = [];

  if (profile === 'private') {
    for (const entry of PRIVATE_PROFILE_IGNORES) {
      if (ensureGitignoreEntry(targetDir, entry)) added.push(entry);
    }
    return added;
  }

  // `shared`: only the hidden state file, matching long-standing behavior.
  if (ensureGitignoreEntry(targetDir, STATE_PATH)) added.push(STATE_PATH);
  return added;
}
