import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Project-relative path to Joycraft's upgrade-state file.
 *
 * Hidden inside `.claude/` — the dir `init` always creates for every harness —
 * directly analogous to npm's own hidden lockfile at
 * `node_modules/.package-lock.json`. Never at the repo root, never committed
 * (init/upgrade gitignore it). The old root location was `.joycraft-version`
 * (see LEGACY_VERSION_FILE); `upgrade` migrates it on first run.
 */
export const STATE_PATH = join('.claude', '.joycraft', 'state.json');

/** The pre-relocation root path. Kept only so `upgrade` can migrate it. */
export const LEGACY_VERSION_FILE = '.joycraft-version';

/**
 * Length we truncate stored hashes to. Full SHA-256 is 64 hex chars; 16 hex
 * (64 bits) is ample to detect customization across ~100 managed files and
 * shrinks the state ~4×. Compare truncated-on-both-sides (see upgrade.ts).
 */
const HASH_LENGTH = 16;

export interface VersionInfo {
  version: string;
  files: Record<string, string>;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Truncate a (full) content hash to the stored length. Idempotent for already-short input. */
export function truncateHash(hash: string): string {
  return hash.slice(0, HASH_LENGTH);
}

export function readVersion(dir: string): VersionInfo | null {
  const filePath = join(dir, STATE_PATH);
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.version === 'string' && typeof parsed.files === 'object') {
      return parsed as VersionInfo;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeVersion(dir: string, version: string, files: Record<string, string>): void {
  const filePath = join(dir, STATE_PATH);
  // Store truncated hashes — single source of truth for the on-disk shape.
  const truncated: Record<string, string> = {};
  for (const [path, hash] of Object.entries(files)) {
    truncated[path] = truncateHash(hash);
  }
  const data: VersionInfo = { version, files: truncated };
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Detect the current Joycraft harness level for a project directory.
 * Returns 5 if Level 5 artifacts (autofix workflow + External Validation) are present, 4 otherwise.
 */
export function getLevel(dir: string): number {
  const hasAutofix = existsSync(join(dir, '.github', 'workflows', 'autofix.yml'));
  if (!hasAutofix) return 4;
  const claudeMdPath = join(dir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) return 4;
  const content = readFileSync(claudeMdPath, 'utf-8');
  return content.includes('## External Validation') ? 5 : 4;
}
