import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { init } from '../src/init';
import { upgrade } from '../src/upgrade';
import { readVersion, STATE_PATH } from '../src/version';
import { applyGitignoreProfile, PRIVATE_PROFILE_IGNORES } from '../src/gitignore';
import { Readable } from 'node:stream';

const LEGACY_VERSION_FILE = '.joycraft-version';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-gitignore-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function readGitignore(dir: string): string {
  const p = join(dir, '.gitignore');
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

function lines(content: string): string[] {
  return content.split('\n').map((l) => l.trim()).filter(Boolean);
}

/**
 * Make `dir` look like a project inited before the gitignore-profile feature:
 * strip the gitignoreProfile field from state.json directly. (writeVersion
 * deliberately preserves an existing profile when the arg is omitted, so the
 * strip must edit the file, not go through the API.)
 */
function stripSavedProfile(dir: string): void {
  const statePath = join(dir, STATE_PATH);
  const state = JSON.parse(readFileSync(statePath, 'utf-8'));
  delete state.gitignoreProfile;
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  if (readVersion(dir)?.gitignoreProfile !== undefined) {
    throw new Error('test setup: expected no saved profile after strip');
  }
}

/**
 * Run upgrade with the interactive prompt simulated: isTTY true + a fake stdin
 * that supplies `answers` line by line (more than one exercises the re-ask on
 * invalid input). Mirrors the stdin/stdout-boundary pattern in
 * tests/upgrade.test.ts. Returns captured console.log output.
 *
 * yes is false here on purpose: --yes promises a fully unattended run, so it
 * suppresses the profile prompt these tests exist to exercise.
 */
async function upgradeWithAnswer(dir: string, ...answers: string[]): Promise<string> {
  const fakeStdin = Readable.from(answers.map((a) => `${a}\n`)) as unknown as NodeJS.ReadStream & { isTTY?: boolean };
  fakeStdin.isTTY = true;
  const stdinDesc = Object.getOwnPropertyDescriptor(process, 'stdin')!;
  Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });

  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
  try {
    await upgrade(dir, { yes: false });
  } finally {
    console.log = origLog;
    Object.defineProperty(process, 'stdin', stdinDesc);
  }
  return logs.join('\n');
}

describe('gitignore profiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    // Stub the npm-registry staleness check: a published version newer than the
    // local package would make upgrade() bail before the code under test runs,
    // and test results must not depend on registry state or network.
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.0.0' }),
    }) as unknown as typeof fetch;
    return () => {
      globalThis.fetch = origFetch;
      cleanup(tmpDir);
    };
  });

  describe('shared profile (default)', () => {
    it('gitignores only the hidden state file, not the harness dirs', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });

      const gi = lines(readGitignore(tmpDir));
      expect(gi).toContain(STATE_PATH);
      expect(gi).not.toContain('.claude/');
      expect(gi).not.toContain('.agents/');
      expect(gi).not.toContain('.pi/');
    });

    it('is the default when no flag and not a TTY', async () => {
      // vitest runs with stdin.isTTY undefined → falsy → no prompt → default shared
      await init(tmpDir, { force: false });
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('shared');
      expect(lines(readGitignore(tmpDir))).not.toContain('.claude/');
    });
  });

  describe('private profile', () => {
    it('gitignores .claude/, .agents/, .pi/ and not docs or harness docs', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });

      const gi = lines(readGitignore(tmpDir));
      for (const entry of PRIVATE_PROFILE_IGNORES) {
        expect(gi).toContain(entry);
      }
      // CLAUDE.md, AGENTS.md, the docs/ tree must never be ignored wholesale
      expect(gi).not.toContain('CLAUDE.md');
      expect(gi).not.toContain('AGENTS.md');
      expect(gi).not.toContain('docs/');
    });

    it('also gitignores the hidden state file (it now lives in tracked docs/)', async () => {
      // STATE_PATH moved from .claude/.joycraft/ to docs/.joycraft/. Under
      // private the harness-dir ignores no longer cover it transitively, so it
      // must be listed explicitly — the state file is never committed, either
      // profile.
      await init(tmpDir, { force: false, gitignore: 'private' });
      expect(lines(readGitignore(tmpDir))).toContain(STATE_PATH);
    });

    it('does not warn about .claude/ being gitignored (it is the intent)', async () => {
      // Pre-seed a .gitignore that already ignores .claude/ — under shared this
      // triggers the "teammates won't get skills" warning; under private it must not.
      writeFileSync(join(tmpDir, '.gitignore'), '.claude/\n', 'utf-8');

      const logs: string[] = [];
      const orig = console.log;
      console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
      try {
        await init(tmpDir, { force: false, gitignore: 'private' });
      } finally {
        console.log = orig;
      }
      const output = logs.join('\n');
      expect(output).not.toContain("teammates won't get Joycraft skills");
    });

    it('still warns under shared when .claude/ is pre-gitignored', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), '.claude/\n', 'utf-8');

      const logs: string[] = [];
      const orig = console.log;
      console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
      try {
        await init(tmpDir, { force: false, gitignore: 'shared' });
      } finally {
        console.log = orig;
      }
      expect(logs.join('\n')).toContain("teammates won't get Joycraft skills");
    });
  });

  describe('persistence', () => {
    it('persists the chosen profile in state.json', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
    });

    it('re-init without a flag reuses the persisted profile', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });
      // Second init, no flag, non-TTY → must reuse 'private', not fall back to shared
      await init(tmpDir, { force: true });
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
      expect(lines(readGitignore(tmpDir))).toContain('.claude/');
    });

    it('upgrade re-applies the persisted private profile without prompting', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });
      // Wipe the .gitignore to prove upgrade re-applies the entries
      writeFileSync(join(tmpDir, '.gitignore'), '', 'utf-8');

      await upgrade(tmpDir, { yes: true });

      const gi = lines(readGitignore(tmpDir));
      for (const entry of PRIVATE_PROFILE_IGNORES) {
        expect(gi).toContain(entry);
      }
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
    });
  });

  describe('upgrade prompt when undecided', () => {
    it('asks on upgrade when no profile was ever saved (TTY), then persists the answer', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      stripSavedProfile(tmpDir); // simulate a pre-feature project

      const output = await upgradeWithAnswer(tmpDir, 'private');

      // It prompted...
      expect(output).toContain('how much of the harness is tracked in git');
      // ...applied the chosen profile...
      expect(lines(readGitignore(tmpDir))).toContain('.claude/');
      // ...and persisted it so it never asks again.
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
    });

    it('empty answer defaults to shared and persists', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      stripSavedProfile(tmpDir);

      await upgradeWithAnswer(tmpDir, '');

      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('shared');
      expect(lines(readGitignore(tmpDir))).not.toContain('.claude/');
    });

    it('does NOT prompt when a profile is already saved', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });
      // Saved profile present → upgrade must stay silent even with a fake TTY stdin.
      const output = await upgradeWithAnswer(tmpDir, 'shared');

      expect(output).not.toContain('how much of the harness is tracked in git');
      // The saved 'private' is honored, NOT overridden by the unread "shared" answer.
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
    });

    it('non-interactive (no TTY) undecided upgrade defaults to shared without prompting', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      stripSavedProfile(tmpDir);

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
      try {
        // vitest's process.stdin.isTTY is undefined → non-interactive path
        await upgrade(tmpDir, { yes: true });
      } finally {
        console.log = origLog;
      }

      expect(logs.join('\n')).not.toContain('how much of the harness is tracked in git');
      expect(lines(readGitignore(tmpDir))).not.toContain('.claude/');
      // Stays undecided so a later interactive upgrade can still ask.
      expect(readVersion(tmpDir)?.gitignoreProfile).toBeUndefined();
    });

    it('persists a freshly-chosen profile even when no files changed', async () => {
      // Up-to-date project (init just ran) with the profile stripped → the
      // "Already up to date" early return must still save the prompted choice.
      await init(tmpDir, { force: false, gitignore: 'shared' });
      stripSavedProfile(tmpDir);

      const output = await upgradeWithAnswer(tmpDir, 'private');

      expect(output).toContain('Already up to date');
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
      // Re-run upgrade: now decided, so it must NOT ask again.
      const second = await upgradeWithAnswer(tmpDir, 'shared');
      expect(second).not.toContain('how much of the harness is tracked in git');
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
    });

    it('--yes suppresses the prompt even on a TTY and leaves the project undecided', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      stripSavedProfile(tmpDir);

      // TTY present, but --yes promises an unattended run: no prompt may fire.
      // Empty stdin means a prompt would hang — finishing at all proves no read.
      const fakeStdin = Readable.from([]) as unknown as NodeJS.ReadStream & { isTTY?: boolean };
      fakeStdin.isTTY = true;
      const stdinDesc = Object.getOwnPropertyDescriptor(process, 'stdin')!;
      Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
      try {
        await upgrade(tmpDir, { yes: true });
      } finally {
        console.log = origLog;
        Object.defineProperty(process, 'stdin', stdinDesc);
      }

      expect(logs.join('\n')).not.toContain('how much of the harness is tracked in git');
      expect(readVersion(tmpDir)?.gitignoreProfile).toBeUndefined();
    });

    it('re-asks on an unrecognized answer instead of silently defaulting to shared', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      stripSavedProfile(tmpDir);

      // First answer is a typo; the prompt must reject it and accept the retry.
      const output = await upgradeWithAnswer(tmpDir, 'priv', 'private');

      expect(output).toContain("Unrecognized answer 'priv'");
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
      expect(lines(readGitignore(tmpDir))).toContain('.claude/');
    });
  });

  describe('upgrade --gitignore flag', () => {
    it('switches a decided project to private non-interactively', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });

      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => { logs.push(args.join(' ')); };
      try {
        // No TTY, no prompt — the flag alone must decide and persist.
        await upgrade(tmpDir, { yes: true, gitignore: 'private' });
      } finally {
        console.log = origLog;
      }

      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
      const gi = lines(readGitignore(tmpDir));
      for (const entry of PRIVATE_PROFILE_IGNORES) {
        expect(gi).toContain(entry);
      }
      // Switching to private prints the untrack reminder (never runs git itself).
      expect(logs.join('\n')).toContain('git rm -r --cached');
    });

    it('decides an undecided project from the flag without a TTY', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      stripSavedProfile(tmpDir);

      await upgrade(tmpDir, { yes: true, gitignore: 'shared' });

      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('shared');
    });

    it('rejects an unknown flag value before touching anything', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      const before = readFileSync(join(tmpDir, STATE_PATH), 'utf-8');

      await expect(upgrade(tmpDir, { yes: true, gitignore: 'bogus' }))
        .rejects.toThrow(/Unknown gitignore profile 'bogus'/);

      expect(readFileSync(join(tmpDir, STATE_PATH), 'utf-8')).toBe(before);
    });
  });

  describe('legacy state migration interplay', () => {
    it('migrating a legacy root .joycraft-version preserves a saved private profile', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });
      // Simulate a stray legacy root file coexisting with profile-bearing state
      // (e.g. restored from an old commit). Migration must not clobber the profile.
      const state = readVersion(tmpDir)!;
      writeFileSync(
        join(tmpDir, LEGACY_VERSION_FILE),
        JSON.stringify({ version: state.version, files: state.files }, null, 2) + '\n',
        'utf-8'
      );

      await upgrade(tmpDir, { yes: true });

      expect(existsSync(join(tmpDir, LEGACY_VERSION_FILE))).toBe(false);
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
    });

    it('legacy migration under private gitignores both the harness dirs and the state file', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });
      const state = readVersion(tmpDir)!;
      writeFileSync(
        join(tmpDir, LEGACY_VERSION_FILE),
        JSON.stringify({ version: state.version, files: state.files }, null, 2) + '\n',
        'utf-8'
      );
      // Wipe .gitignore so only this upgrade run's writes are observed.
      writeFileSync(join(tmpDir, '.gitignore'), '', 'utf-8');

      await upgrade(tmpDir, { yes: true });

      const gi = lines(readGitignore(tmpDir));
      expect(gi).toContain('.claude/');
      // The state file now lives in tracked docs/, so the harness-dir ignores no
      // longer cover it — it must be listed explicitly under private too.
      expect(gi).toContain(STATE_PATH);
    });
  });

  describe('validation', () => {
    it('rejects an unknown profile value', async () => {
      await expect(init(tmpDir, { force: false, gitignore: 'bogus' }))
        .rejects.toThrow(/Unknown gitignore profile 'bogus'/);
    });

    it('does not scaffold when the profile is invalid', async () => {
      await init(tmpDir, { force: false, gitignore: 'nope' }).catch(() => {});
      // Profile is resolved before any scaffolding, so nothing should be written
      expect(existsSync(join(tmpDir, 'CLAUDE.md'))).toBe(false);
      expect(existsSync(join(tmpDir, '.claude'))).toBe(false);
    });

    it('accepts case-insensitive and padded values', async () => {
      await init(tmpDir, { force: false, gitignore: '  PRIVATE  ' });
      expect(readVersion(tmpDir)?.gitignoreProfile).toBe('private');
    });
  });

  describe('idempotency', () => {
    it('applyGitignoreProfile adds nothing on a second call', () => {
      const first = applyGitignoreProfile(tmpDir, 'private');
      // private now writes the harness dirs AND the hidden state file.
      expect(first.sort()).toEqual([...PRIVATE_PROFILE_IGNORES, STATE_PATH].sort());
      const second = applyGitignoreProfile(tmpDir, 'private');
      expect(second).toEqual([]);
    });

    it('re-running init never duplicates gitignore lines', async () => {
      await init(tmpDir, { force: false, gitignore: 'private' });
      await init(tmpDir, { force: true });
      const gi = lines(readGitignore(tmpDir));
      const claudeCount = gi.filter((l) => l === '.claude/').length;
      expect(claudeCount).toBe(1);
    });

    it('preserves pre-existing unrelated gitignore lines', async () => {
      writeFileSync(join(tmpDir, '.gitignore'), 'node_modules/\ndist/\n', 'utf-8');
      await init(tmpDir, { force: false, gitignore: 'private' });
      const gi = lines(readGitignore(tmpDir));
      expect(gi).toContain('node_modules/');
      expect(gi).toContain('dist/');
      expect(gi).toContain('.claude/');
    });
  });
});
