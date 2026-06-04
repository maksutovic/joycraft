import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { init } from '../src/init';
import { upgrade } from '../src/upgrade';
import { readVersion, STATE_PATH } from '../src/version';
import { applyGitignoreProfile, PRIVATE_PROFILE_IGNORES } from '../src/gitignore';

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

describe('gitignore profiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    return () => cleanup(tmpDir);
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
      // CLAUDE.md, AGENTS.md, docs/ must never be ignored
      expect(gi).not.toContain('CLAUDE.md');
      expect(gi).not.toContain('AGENTS.md');
      expect(gi).not.toContain('docs/');
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
      expect(first.sort()).toEqual([...PRIVATE_PROFILE_IGNORES].sort());
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
