import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import {
  STATE_PATH,
  parseGitignoreProfile,
  DEFAULT_GITIGNORE_PROFILE,
  type GitignoreProfile,
} from './version.js';

/**
 * The harness directories the `private` profile gitignores. Tracking only
 * CLAUDE.md, AGENTS.md, and docs/ means everything under these three dirs
 * stays local. `.claude/` already covers the hidden state file.
 *
 * Single source of truth: every user-facing string that names these dirs
 * (prompts, summaries, the untrack hint, CLI help) derives from this list via
 * the constants below, so adding a harness dir can't leave stale messages.
 */
export const PRIVATE_PROFILE_IGNORES = ['.claude/', '.agents/', '.pi/'];

/** Human-readable list of the private-profile dirs, for prompts and summaries. */
export const PRIVATE_DIRS_DISPLAY = PRIVATE_PROFILE_IGNORES.join(', ');

/** Copy-pasteable command to untrack already-committed harness files. */
export const PRIVATE_UNTRACK_COMMAND = `git rm -r --cached ${PRIVATE_PROFILE_IGNORES.map((d) => d.replace(/\/$/, '')).join(' ')}`;

/**
 * Append-only, create-if-absent, idempotent .gitignore writer.
 *
 * Mirrors the "append over modify when touching user files" principle: it never
 * rewrites, reorders, or removes existing lines — it only appends the entries
 * not already present (matched exactly, after trimming). One read + at most one
 * write per call. Returns the entries actually added (empty when everything was
 * already present).
 */
export function ensureGitignoreEntries(targetDir: string, entries: string[]): string[] {
  const gitignorePath = join(targetDir, '.gitignore');
  const current = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const present = new Set(current.split('\n').map((l) => l.trim()));
  const missing = entries.filter((e) => !present.has(e.trim()));
  if (missing.length === 0) return [];

  // Append on their own lines, tolerating a file that may or may not end in \n.
  const sep = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  writeFileSync(gitignorePath, current + sep + missing.join('\n') + '\n', 'utf-8');
  return missing;
}

/** Single-entry convenience wrapper around ensureGitignoreEntries. */
export function ensureGitignoreEntry(targetDir: string, line: string): boolean {
  return ensureGitignoreEntries(targetDir, [line]).length > 0;
}

/**
 * Apply a gitignore profile's entries to the project's .gitignore.
 *
 * The hidden upgrade-state file (`STATE_PATH`) is tool-managed, regenerated on
 * every init/upgrade, and must never be committed — under BOTH profiles. It now
 * lives at `docs/.joycraft/state.json`; since `docs/` is always tracked, the
 * state entry is no longer covered transitively by any harness-dir ignore, so
 * both profiles list it explicitly.
 *
 * - `shared`  — ignore only the hidden state file (commit the harness dirs).
 * - `private` — ignore the .claude/, .agents/, .pi/ trees AND the state file.
 *
 * Append-only and idempotent (via ensureGitignoreEntries), so re-running
 * init/upgrade never duplicates entries. Returns the list of lines actually
 * added this call.
 */
export function applyGitignoreProfile(targetDir: string, profile: GitignoreProfile): string[] {
  if (profile === 'private') {
    return ensureGitignoreEntries(targetDir, [...PRIVATE_PROFILE_IGNORES, STATE_PATH]);
  }
  // `shared`: only the hidden state file, matching long-standing behavior.
  return ensureGitignoreEntries(targetDir, [STATE_PATH]);
}

/** A resolved profile plus how it was arrived at. */
export interface ResolvedGitignoreProfile {
  profile: GitignoreProfile;
  /**
   * True when the profile is an actual decision: a --gitignore flag, a
   * persisted choice, or an interactive answer. False when it is the
   * non-interactive fallback default — callers must NOT persist a fallback,
   * or the one-time prompt would be permanently suppressed for the project.
   */
  decided: boolean;
}

/** Validate a raw --gitignore flag value. Throws the user-facing error on unknown values. */
export function validateGitignoreFlag(flag: string): GitignoreProfile {
  const parsed = parseGitignoreProfile(flag);
  if (!parsed) {
    throw new Error(`Unknown gitignore profile '${flag}'. Use 'shared' or 'private'.`);
  }
  return parsed;
}

/**
 * Prompt for a gitignore profile. An empty answer takes the default; an
 * unrecognized answer re-asks instead of being silently coerced — a typo must
 * not get persisted as a permanent choice.
 */
async function promptGitignoreProfile(intro: string): Promise<GitignoreProfile> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(intro);
  console.log('  shared  — commit skills so your team gets the same workflow (default)');
  console.log(`  private — gitignore ${PRIVATE_DIRS_DISPLAY}; track only CLAUDE.md, AGENTS.md, docs/`);
  return new Promise((resolve) => {
    const ask = (): void => {
      rl.question(`Profile [shared/private] (${DEFAULT_GITIGNORE_PROFILE}): `, (answer) => {
        if (answer.trim() === '') {
          rl.close();
          resolve(DEFAULT_GITIGNORE_PROFILE);
          return;
        }
        const parsed = parseGitignoreProfile(answer);
        if (parsed) {
          rl.close();
          resolve(parsed);
          return;
        }
        console.log(
          `Unrecognized answer '${answer.trim()}' — type 'shared' or 'private', or press Enter for ${DEFAULT_GITIGNORE_PROFILE}.`
        );
        ask();
      });
    };
    ask();
  });
}

/**
 * Resolve the gitignore profile by precedence — the single resolver shared by
 * init and upgrade so the two commands can never drift:
 *   1. --gitignore flag (validated; throws on unknown value)
 *   2. profile persisted in state.json (re-init / upgrade keep the prior choice)
 *   3. interactive prompt (the caller decides when prompting is allowed)
 *   4. fallback default `shared`, reported with decided=false
 */
export async function resolveGitignoreProfile(opts: {
  /** Raw --gitignore value from the CLI, if provided. */
  flag?: string;
  /** Profile previously persisted in state.json, if any. */
  persisted?: GitignoreProfile;
  /** Whether prompting is allowed (TTY, and the command permits interaction). */
  interactive: boolean;
  /** First line printed above the prompt; init and upgrade word it differently. */
  promptIntro: string;
}): Promise<ResolvedGitignoreProfile> {
  if (opts.flag !== undefined) {
    return { profile: validateGitignoreFlag(opts.flag), decided: true };
  }
  if (opts.persisted) {
    return { profile: opts.persisted, decided: true };
  }
  if (opts.interactive) {
    return { profile: await promptGitignoreProfile(opts.promptIntro), decided: true };
  }
  return { profile: DEFAULT_GITIGNORE_PROFILE, decided: false };
}
