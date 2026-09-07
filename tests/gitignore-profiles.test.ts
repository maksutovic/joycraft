import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { init } from '../src/init';
import { update, updateStatusExitCode } from '../src/update';
import {
  applyGitignoreProfile,
  CHECKER_PATH,
  JOYCRAFT_LOCAL_DIR,
  PRIVATE_MANIFEST_PATH,
  PRIVATE_PROFILE_IGNORES,
  SHARED_MANIFEST_PATH,
  sharedManifestIgnoreWarning,
} from '../src/gitignore';
import { readInstallationManifest, writeInstallationManifest, type InstallationManifest } from '../src/install-manifest';
import { HARNESSES } from '../src/harness';
import { STATE_PATH } from '../src/version';
import { TELEMETRY_PATH } from '../src/telemetry-store';

function project(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-gitignore-'));
}

function cleanup(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function lines(root: string): string[] {
  const path = join(root, '.gitignore');
  return existsSync(path) ? readFileSync(path, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean) : [];
}

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_CEILING_DIRECTORIES: root },
  });
}

function emptyBundle() {
  return { version: '0.7.13', integrity: '', inventory: [] as const };
}

function manifest(profile: 'shared' | 'private'): InstallationManifest {
  return {
    schemaVersion: 1,
    targetVersion: '0.7.13',
    bundleIntegrity: '',
    harnesses: ['claude'],
    profile,
    files: {},
  };
}

function prepareNoopProject(root: string): void {
  mkdirSync(join(root, 'docs', 'backlog'), { recursive: true });
  writeFileSync(join(root, 'docs', 'backlog', 'README.md'), '# backlog\n');
  mkdirSync(join(root, '.claude'), { recursive: true });
  writeFileSync(join(root, '.claude', 'settings.json'), '{}\n');
}

describe('gitignore profiles through the unified update path', () => {
  it('shared profile tracks the shared manifest and checker while ignoring local state', () => {
    const root = project();
    try {
      const added = applyGitignoreProfile(root, 'shared');
      expect(added).toContain(STATE_PATH);
      expect(added).toContain(TELEMETRY_PATH);
      expect(added).toContain(JOYCRAFT_LOCAL_DIR);
      expect(added).not.toContain(SHARED_MANIFEST_PATH);
      expect(added).not.toContain(CHECKER_PATH);
      expect(lines(root)).not.toContain(PRIVATE_MANIFEST_PATH);
    } finally {
      cleanup(root);
    }
  });

  it('private profile ignores harnesses, local manifest, checker, and state without ignoring docs', () => {
    const root = project();
    try {
      const added = applyGitignoreProfile(root, 'private');
      for (const entry of PRIVATE_PROFILE_IGNORES) expect(added).toContain(entry);
      expect(added).toContain(JOYCRAFT_LOCAL_DIR);
      expect(added).toContain(CHECKER_PATH);
      expect(lines(root)).toContain(STATE_PATH);
      expect(lines(root)).not.toContain('docs/');
      expect(lines(root)).not.toContain(SHARED_MANIFEST_PATH);
    } finally {
      cleanup(root);
    }
  });

  it('is append-only and preserves unrelated ignore rules', () => {
    const root = project();
    try {
      writeFileSync(join(root, '.gitignore'), 'node_modules/\ndist/\n');
      const first = applyGitignoreProfile(root, 'private');
      expect(lines(root)).toEqual(expect.arrayContaining(['node_modules/', 'dist/', '.claude/']));
      expect(applyGitignoreProfile(root, 'private')).toEqual([]);
      expect(first.length).toBeGreaterThan(0);
    } finally {
      cleanup(root);
    }
  });

  it('reports a broad effective ignore hiding the shared manifest', () => {
    const root = project();
    try {
      writeFileSync(join(root, '.gitignore'), 'docs/.joycraft/\n');
      git(root, 'init', '-q');
      const warning = sharedManifestIgnoreWarning(root);
      expect(warning).toContain(SHARED_MANIFEST_PATH);
      expect(warning).toContain('docs/.joycraft/');
    } finally {
      cleanup(root);
    }
  });

  it('does not report a warning when a negated manifest rule is visible', () => {
    const root = project();
    try {
      writeFileSync(join(root, '.gitignore'), 'docs/.joycraft/*\n!docs/.joycraft/manifest.json\n');
      git(root, 'init', '-q');
      expect(sharedManifestIgnoreWarning(root)).toBeNull();
    } finally {
      cleanup(root);
    }
  });

  it('requires explicit harnesses for fresh unattended update but retains init all-harness compatibility', async () => {
    const root = project();
    try {
      const fresh = await update(root, { nonInteractive: true, bundle: emptyBundle() });
      expect(fresh.status).toBe('invalid');
      expect(fresh.exitCode).toBe(1);
      expect(fresh.diagnostics.join('\n')).toContain('explicit harness selection');

      const initialized = await init(root, { nonInteractive: true, bundle: emptyBundle() });
      expect(initialized.harnesses).toEqual([...HARNESSES]);
      expect(initialized.profile).toBe('shared');
      expect(readInstallationManifest(root, 'shared')?.harnesses).toEqual([...HARNESSES]);
    } finally {
      cleanup(root);
    }
  });

  it('reuses the canonical private manifest profile without consulting legacy state', async () => {
    const root = project();
    try {
      prepareNoopProject(root);
      writeInstallationManifest(root, manifest('private'));
      expect(readInstallationManifest(root, 'private')?.profile).toBe('private');
      const result = await update(root, { nonInteractive: true, bundle: emptyBundle() });
      expect(result.profile).toBe('private');
      expect(lines(root)).toContain('.claude/');
      expect(result.exitCode).toBe(0);
    } finally {
      cleanup(root);
    }
  });

  it('switches manifest authority without running Git untracking', async () => {
    const root = project();
    try {
      prepareNoopProject(root);
      writeInstallationManifest(root, manifest('shared'));
      applyGitignoreProfile(root, 'shared');
      git(root, 'init', '-q');
      git(root, 'config', 'user.email', 'test@test.dev');
      git(root, 'config', 'user.name', 'Test');
      git(root, 'add', SHARED_MANIFEST_PATH, '.gitignore');
      git(root, 'commit', '-q', '-m', 'shared authority');

      const result = await update(root, { nonInteractive: true, gitignore: 'private', bundle: emptyBundle() });
      expect(result.exitCode).toBe(0);
      expect(readInstallationManifest(root, 'private')?.profile).toBe('private');
      expect(readInstallationManifest(root, 'shared')).toBeNull();
      // Moving authority does not rewrite Git's index or untrack files; a
      // later explicit cleanup remains the user's decision.
      expect(git(root, 'ls-files', SHARED_MANIFEST_PATH).trim()).toBe(SHARED_MANIFEST_PATH);
    } finally {
      cleanup(root);
    }
  });

  it('does not untrack already tracked harness files on private profile setup', () => {
    const root = project();
    try {
      mkdirSync(join(root, '.claude', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(root, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'custom\n');
      applyGitignoreProfile(root, 'private');
      git(root, 'init', '-q');
      git(root, 'config', 'user.email', 'test@test.dev');
      git(root, 'config', 'user.name', 'Test');
      git(root, 'add', '-f', '.claude/skills/joycraft-tune/SKILL.md');
      git(root, 'commit', '-q', '-m', 'preexisting tracked harness');
      expect(git(root, 'ls-files', '.claude/skills/joycraft-tune/SKILL.md').trim()).toBe('.claude/skills/joycraft-tune/SKILL.md');
      applyGitignoreProfile(root, 'private');
      expect(git(root, 'ls-files', '.claude/skills/joycraft-tune/SKILL.md').trim()).toBe('.claude/skills/joycraft-tune/SKILL.md');
    } finally {
      cleanup(root);
    }
  });

  it('returns exit code 1 for an invalid profile before changing project files', async () => {
    const root = project();
    try {
      const result = await update(root, { nonInteractive: true, gitignore: 'bogus', bundle: emptyBundle() });
      expect(result.status).toBe('invalid');
      expect(result.exitCode).toBe(updateStatusExitCode('invalid'));
      expect(lines(root)).toEqual([]);
      expect(existsSync(join(root, SHARED_MANIFEST_PATH))).toBe(false);
    } finally {
      cleanup(root);
    }
  });

  it('accepts padded and case-insensitive profile input through update', async () => {
    const root = project();
    try {
      const result = await update(root, {
        nonInteractive: true,
        harnesses: 'claude',
        gitignore: '  PRIVATE  ',
        bundle: emptyBundle(),
      });
      expect(result.profile).toBe('private');
      expect(result.exitCode).toBe(0);
      expect(lines(root)).toContain('.claude/');
    } finally {
      cleanup(root);
    }
  });
});

describe('low-level profile contracts retained during command unification', () => {
  it('keeps .omp as a whole private-profile directory rather than a joycraft glob', () => {
    expect(PRIVATE_PROFILE_IGNORES).toContain('.omp/');
    expect(PRIVATE_PROFILE_IGNORES.some((entry) => entry.startsWith('.omp/joycraft'))).toBe(false);
  });

  it('keeps private profile reruns quiet and idempotent', () => {
    const root = project();
    try {
      const first = applyGitignoreProfile(root, 'private');
      expect(first).toContain('.claude/');
      expect(applyGitignoreProfile(root, 'private')).toEqual([]);
    } finally {
      cleanup(root);
    }
  });

  it('does not warn for a private harness ignore that leaves shared authority visible', () => {
    const root = project();
    try {
      writeFileSync(join(root, '.gitignore'), '.claude/\n');
      git(root, 'init', '-q');
      expect(sharedManifestIgnoreWarning(root)).toBeNull();
    } finally {
      cleanup(root);
    }
  });

  it('preserves a shared manifest and checker through a real Git clone', () => {
    const source = project();
    const clone = join(source, 'clone');
    try {
      mkdirSync(join(source, 'docs', '.joycraft'), { recursive: true });
      applyGitignoreProfile(source, 'shared');
      writeFileSync(join(source, SHARED_MANIFEST_PATH), JSON.stringify(manifest('shared')) + '\n');
      writeFileSync(join(source, CHECKER_PATH), 'export {};\n');
      git(source, 'init', '-q');
      git(source, 'config', 'user.email', 'test@test.dev');
      git(source, 'config', 'user.name', 'Test');
      git(source, 'add', '.gitignore', SHARED_MANIFEST_PATH, CHECKER_PATH);
      git(source, 'commit', '-q', '-m', 'shared installation');
      git(source, 'clone', '-q', source, clone);
      expect(existsSync(join(clone, SHARED_MANIFEST_PATH))).toBe(true);
      expect(existsSync(join(clone, CHECKER_PATH))).toBe(true);
      expect(readInstallationManifest(clone, 'shared')?.profile).toBe('shared');
    } finally {
      cleanup(source);
    }
  });

  it('keeps private local artifacts ignored while leaving shared authority visible', () => {
    const root = project();
    try {
      mkdirSync(join(root, 'docs', '.joycraft', 'local'), { recursive: true });
      applyGitignoreProfile(root, 'private');
      writeFileSync(join(root, PRIVATE_MANIFEST_PATH), '{}\n');
      writeFileSync(join(root, CHECKER_PATH), 'export {};\n');
      writeFileSync(join(root, SHARED_MANIFEST_PATH), '{}\n');
      git(root, 'init', '-q');
      for (const path of [PRIVATE_MANIFEST_PATH, CHECKER_PATH, STATE_PATH]) {
        expect(() => git(root, 'check-ignore', '--no-index', '-q', '--', path)).not.toThrow();
      }
      expect(() => git(root, 'check-ignore', '--no-index', '-q', '--', SHARED_MANIFEST_PATH)).toThrow();
    } finally {
      cleanup(root);
    }
  });

  it('switches private authority back to shared without changing tracked files', async () => {
    const root = project();
    try {
      prepareNoopProject(root);
      writeInstallationManifest(root, manifest('private'));
      applyGitignoreProfile(root, 'private');
      mkdirSync(join(root, '.claude', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(root, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), 'tracked\n');
      git(root, 'init', '-q');
      git(root, 'config', 'user.email', 'test@test.dev');
      git(root, 'config', 'user.name', 'Test');
      git(root, 'add', '-f', '.claude/skills/joycraft-tune/SKILL.md');
      git(root, 'commit', '-q', '-m', 'tracked harness');

      const result = await update(root, { nonInteractive: true, gitignore: 'shared', bundle: emptyBundle() });
      expect(result.exitCode).toBe(0);
      expect(readInstallationManifest(root, 'shared')?.profile).toBe('shared');
      expect(git(root, 'ls-files', '.claude/skills/joycraft-tune/SKILL.md').trim()).toBe('.claude/skills/joycraft-tune/SKILL.md');
    } finally {
      cleanup(root);
    }
  });
});
