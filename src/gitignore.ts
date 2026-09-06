import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import {
  STATE_PATH,
  parseGitignoreProfile,
  DEFAULT_GITIGNORE_PROFILE,
  type GitignoreProfile,
} from './version.js';
import { TELEMETRY_PATH } from './telemetry-store.js';

/**
 * The harness directories the `private` profile gitignores. Tracking only
 * CLAUDE.md, AGENTS.md, and docs/ means everything under these dirs stays
 * local. `.claude/` already covers the hidden state file.
 *
 * `.github/skills/joycraft-*` is gitignored, NOT `.github/` or
 * `.github/skills/` — `.github/` holds Actions workflows, issue templates,
 * and other non-harness config, and `.github/skills/` may contain the
 * user's own non-Joycraft Copilot skills.
 *
 * `.omp/` gets no such narrowing: unlike `.github/`, it has no non-harness
 * tenancy — Joycraft writes only `.omp/skills/` there and nothing else — so
 * the whole dir is ignored, matching `.claude/`, `.agents/`, and `.pi/`.
 *
 * Single source of truth: every user-facing string that names these dirs
 * (prompts, summaries, the untrack hint, CLI help) derives from this list via
 * the constants below, so adding a harness dir can't leave stale messages.
 */
export const PRIVATE_PROFILE_IGNORES = ['.claude/', '.agents/', '.pi/', '.github/skills/joycraft-*/', '.omp/'];

/** Project-relative homes for the schema-1 installation facts and checker. */
export const SHARED_MANIFEST_PATH = 'docs/.joycraft/manifest.json';
export const PRIVATE_MANIFEST_PATH = 'docs/.joycraft/local/manifest.json';
export const CHECKER_PATH = 'docs/.joycraft/check.mjs';
export const JOYCRAFT_LOCAL_DIR = 'docs/.joycraft/local/';

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
 * Explain why the shared installation manifest is not visible to Git.
 *
 * This intentionally asks Git to resolve the effective rule instead of
 * parsing `.gitignore` ourselves: an ignore can come from a broad directory,
 * a wildcard, or an exclude file configured by the user. The check is
 * read-only and uses `--no-index` so it also diagnoses an untracked manifest.
 * A null result means the manifest is not hidden by the effective rules (or
 * that this directory is not currently a Git worktree).
 */
export function sharedManifestIgnoreWarning(targetDir: string): string | null {
  try {
    // Git's verbose mode can print the final negation rule even when the path
    // is effectively visible. Establish the actual status first; only then
    // ask for the rule that explains a genuinely ignored path.
    execFileSync(
      'git',
      ['check-ignore', '--no-index', '-q', '--', SHARED_MANIFEST_PATH],
      { cwd: targetDir, stdio: ['ignore', 'ignore', 'ignore'] }
    );

    let output = '';
    try {
      output = execFileSync(
        'git',
        ['check-ignore', '--no-index', '-v', '--', SHARED_MANIFEST_PATH],
        { cwd: targetDir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
      ).trim();
    } catch {
      // The quiet check is authoritative. A verbose explanation can fail on
      // older Git versions, so retain a useful generic diagnostic instead.
    }

    // `git check-ignore -v` prints: source:line:pattern<TAB>pathname.
    // Preserve Git's useful source/rule text in the diagnostic, while keeping
    // the message actionable for a shared install.
    const rule = output.split('\t')[0] ?? output;
    const detail = rule && !/:(?:\d+:)?!/.test(rule)
      ? ` (${rule})`
      : '';
    return `Shared Joycraft manifest ${SHARED_MANIFEST_PATH} is hidden by the effective Git ignore rule${detail}. Teammates and clones may not receive the shared installation facts; remove or narrow that rule if this install should be shared.`;
  } catch {
    // A project can be initialized before Git is installed or before it has a
    // worktree. The profile writer must remain usable in either case.
    return null;
  }
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
 * - `private` — ignore the .claude/, .agents/, .pi/, .github/skills/joycraft-*, .omp/ trees AND the state file.
 *
 * Append-only and idempotent (via ensureGitignoreEntries), so re-running
 * init/upgrade never duplicates entries. Returns the list of lines actually
 * added this call.
 */
export function applyGitignoreProfile(targetDir: string, profile: GitignoreProfile): string[] {
  // Machine-owned files under docs/.joycraft/ — since docs/ is always tracked,
  // both profiles must list them explicitly (telemetry.json additionally holds
  // per-machine work patterns that must never publish). The local directory is
  // ignored by BOTH profiles so preferences, locks, journals, caches, and
  // private manifests never become shared installation facts.
  const machineOwned = [STATE_PATH, TELEMETRY_PATH, JOYCRAFT_LOCAL_DIR];
  if (profile === 'private') {
    // The checker is a managed shared artifact. A private install still gets
    // one locally, but it must not be committed with the project.
    return ensureGitignoreEntries(targetDir, [...PRIVATE_PROFILE_IGNORES, CHECKER_PATH, ...machineOwned]);
  }
  // `shared`: keep the manifest and checker trackable. Existing broad user
  // rules are preserved; sharedManifestIgnoreWarning reports if they hide it.
  return ensureGitignoreEntries(targetDir, machineOwned);
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
