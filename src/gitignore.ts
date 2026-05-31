import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
