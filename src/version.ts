import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { sanitizeHarnesses, type Harness } from './harness.js';

/**
 * Project-relative path to Joycraft's upgrade-state file.
 *
 * Hidden inside `docs/` — the one directory `init` always creates regardless of
 * which harnesses are selected — so a single-harness install carries no
 * foreign-harness footprint (a Codex-only project has no `.claude/`, etc.). The
 * state is Joycraft's own bookkeeping (version, file hashes, gitignore profile),
 * not a harness artifact, so it lives in a harness-neutral home. Never at the
 * repo root, never committed (init/upgrade gitignore it).
 *
 * Two legacy locations are migrated on upgrade: the original repo-root
 * `.joycraft-version` (see LEGACY_VERSION_FILE) and the later
 * `.claude/.joycraft/state.json` (see LEGACY_CLAUDE_STATE_PATH).
 */
export const STATE_PATH = join('docs', '.joycraft', 'state.json');

/** The original repo-root state path. Kept only so `upgrade` can migrate it. */
export const LEGACY_VERSION_FILE = '.joycraft-version';

/**
 * The interim `.claude/`-nested state path, used before state moved to a
 * harness-neutral `docs/` home. Kept only so `upgrade` can migrate it (and so a
 * Codex/Pi-only re-init stops leaving a stray `.claude/` behind).
 */
export const LEGACY_CLAUDE_STATE_PATH = join('.claude', '.joycraft', 'state.json');

/**
 * Length we truncate stored hashes to. Full SHA-256 is 64 hex chars; 16 hex
 * (64 bits) is ample to detect customization across ~100 managed files and
 * shrinks the state ~4×. Compare truncated-on-both-sides (see upgrade.ts).
 */
const HASH_LENGTH = 16;

/**
 * How much of the Joycraft harness is tracked in git.
 * - `shared`  — commit skills/agents/pi so teammates get the workflow (default).
 * - `private` — gitignore .claude/, .agents/, .pi/; track only CLAUDE.md,
 *   AGENTS.md, and docs/.
 */
export type GitignoreProfile = 'shared' | 'private';

export const DEFAULT_GITIGNORE_PROFILE: GitignoreProfile = 'shared';

/**
 * Narrow an arbitrary value to a GitignoreProfile, or null if unrecognized.
 * Strings are normalized (trim + lowercase) here so every call site — flag,
 * prompt, persisted state — gets the same case-insensitivity for free.
 */
export function parseGitignoreProfile(value: unknown): GitignoreProfile | null {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : value;
  return v === 'shared' || v === 'private' ? v : null;
}

export interface VersionInfo {
  version: string;
  files: Record<string, string>;
  /**
   * The gitignore profile chosen at init/upgrade. Absent on state written by
   * Joycraft versions before this field existed — treat absent as `shared`.
   */
  gitignoreProfile?: GitignoreProfile;
  /**
   * The harnesses installed at init (claude/codex/pi). `upgrade` reads this so
   * it only refreshes the harnesses the project actually uses. Absent on state
   * written before harness selection existed — callers treat absent as "all
   * three" for backward compatibility.
   */
  harnesses?: Harness[];
  /**
   * Whether gate skills auto-open rendered HTML artifacts (`open`/`xdg-open`).
   * Absent means true — auto-open was unconditional before this field existed.
   * Persisted here (not a new file) per D12; tune offers the toggle.
   */
  autoOpen?: boolean;
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
      // Sanitize the profile: ignore unknown/legacy values rather than
      // returning them (absent or bogus → undefined, callers default to shared).
      const profile = parseGitignoreProfile(parsed.gitignoreProfile);
      // Sanitize harnesses similarly: drop unknown tokens; null (not an array)
      // means "no recorded selection" → callers default to all available.
      const harnesses = sanitizeHarnesses(parsed.harnesses);
      return {
        version: parsed.version,
        files: parsed.files,
        ...(profile ? { gitignoreProfile: profile } : {}),
        ...(harnesses ? { harnesses } : {}),
        // Only a real boolean counts; anything else is treated as absent
        // (and absent means true at every call site).
        ...(typeof parsed.autoOpen === 'boolean' ? { autoOpen: parsed.autoOpen } : {}),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeVersion(
  dir: string,
  version: string,
  files: Record<string, string>,
  gitignoreProfile?: GitignoreProfile,
  harnesses?: Harness[],
  autoOpen?: boolean
): void {
  const filePath = join(dir, STATE_PATH);
  // An omitted profile/harness-list/autoOpen means "no new decision", not
  // "clear it": preserve whatever is already persisted so call sites that only
  // refresh version/hashes can never silently strip a saved choice.
  const existing = readVersion(dir);
  const profile = gitignoreProfile ?? existing?.gitignoreProfile;
  const selectedHarnesses = harnesses ?? existing?.harnesses;
  const openSetting = autoOpen ?? existing?.autoOpen;
  // Unknown keys survive rewrites (D12): a newer Joycraft may have stamped
  // fields this version doesn't know about. Known keys are stripped from the
  // raw pass-through so the sanitized values above stay authoritative.
  let unknownKeys: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const {
          version: _v,
          files: _f,
          gitignoreProfile: _g,
          harnesses: _h,
          autoOpen: _a,
          ...rest
        } = raw as Record<string, unknown>;
        unknownKeys = rest;
      }
    } catch {
      // Unreadable state is rewritten from scratch — same as readVersion's null.
    }
  }
  // Store truncated hashes — single source of truth for the on-disk shape.
  const truncated: Record<string, string> = {};
  for (const [path, hash] of Object.entries(files)) {
    truncated[path] = truncateHash(hash);
  }
  const data: VersionInfo = {
    version,
    files: truncated,
    ...(profile ? { gitignoreProfile: profile } : {}),
    ...(selectedHarnesses ? { harnesses: selectedHarnesses } : {}),
    ...(openSetting !== undefined ? { autoOpen: openSetting } : {}),
    ...unknownKeys,
  };
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * The persisted auto-open setting for gate HTML renders. Missing state file or
 * missing/invalid key both mean true — auto-open was unconditional before the
 * setting existed, and that stays the default.
 */
export function getAutoOpen(dir: string): boolean {
  return readVersion(dir)?.autoOpen ?? true;
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
