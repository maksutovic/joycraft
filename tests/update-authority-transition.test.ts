import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  applyUpdatePlan,
  recoverInterruptedUpdate,
  rollbackLastSuccessfulUpdate,
  type AuthorityTransition,
} from '../src/update-transaction';
import { manifestDigest, manifestPath, normalizedVendorHash, rawFileHash, type InstallationManifest } from '../src/install-manifest';
import type { UpdatePlan } from '../src/update-plan';

const skillPath = '.claude/skills/joycraft-demo/SKILL.md';

function manifest(profile: 'shared' | 'private', content = 'old vendor\n'): InstallationManifest {
  return {
    schemaVersion: 1,
    targetVersion: '1.0.0',
    bundleIntegrity: '',
    harnesses: ['claude'],
    profile,
    files: {
      [skillPath]: {
        vendorVersion: '1.0.0',
        vendorHash: normalizedVendorHash(content),
        kind: 'vendor',
        ownership: 'verified',
      },
    },
  };
}

function plan(next: InstallationManifest, oldContent = 'old vendor\n', nextContent = 'new vendor\n'): UpdatePlan {
  return {
    actions: [{
      path: skillPath,
      kind: 'replace',
      selected: true,
      reason: 'test',
      content: nextContent,
      currentPresent: true,
      targetPresent: true,
      rawPrecondition: rawFileHash(oldContent),
      rawTargetHash: rawFileHash(nextContent),
    }],
    preserved: [],
    conflicts: [],
    diagnostics: [],
    nextManifest: next,
    baseManifestDigest: manifestDigest(manifest('shared', oldContent)),
  };
}

function seed(): { root: string; old: InstallationManifest; next: InstallationManifest } {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-authority-transition-'));
  const old = manifest('shared');
  const next = manifest('private', 'new vendor\n');
  mkdirSync(join(root, '.claude/skills/joycraft-demo'), { recursive: true });
  mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
  writeFileSync(join(root, skillPath), 'old vendor\n');
  writeFileSync(join(root, manifestPath('shared')), JSON.stringify(old, null, 2) + '\n');
  return { root, old, next };
}

function transition(old: InstallationManifest): AuthorityTransition {
  return {
    oldAuthority: { profile: 'shared', digest: manifestDigest(old) },
    newAuthority: { profile: 'private', digest: null },
  };
}

describe('manifest authority transitions', () => {
  it('moves shared authority, migrates local state in the same transaction, and keeps unrelated settings', () => {
    const { root, old, next } = seed();
    try {
      const settingsPath = join(root, '.claude/settings.json');
      writeFileSync(settingsPath, JSON.stringify({ userSetting: true, hooks: { user: 'keep' } }, null, 2) + '\n');
      const legacyPath = join(root, '.joycraft-version');
      writeFileSync(legacyPath, '{"version":"0.7.13"}\n');
      const result = applyUpdatePlan(root, plan(next), {
        authorityTransition: transition(old),
        localOperations: [
          { path: '.joycraft-version', kind: 'delete', currentPresent: true, rawPrecondition: rawFileHash('{"version":"0.7.13"}\n') },
          { path: 'docs/.joycraft/local/legacy-state-backup.json', kind: 'write', content: '{"version":"0.7.13"}\n', currentPresent: false, rawPrecondition: '' },
        ],
      });
      expect(result.status).toBe('applied');
      expect(existsSync(join(root, manifestPath('shared')))).toBe(false);
      expect(JSON.parse(readFileSync(join(root, manifestPath('private')), 'utf8')).profile).toBe('private');
      expect(existsSync(legacyPath)).toBe(false);
      expect(readFileSync(join(root, 'docs/.joycraft/local/legacy-state-backup.json'), 'utf8')).toContain('0.7.13');
      expect(JSON.parse(readFileSync(settingsPath, 'utf8'))).toEqual({ userSetting: true, hooks: { user: 'keep' } });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rolls back a transition interrupted before authority commit', () => {
    const { root, old, next } = seed();
    try {
      expect(() => applyUpdatePlan(root, plan(next), {
        authorityTransition: transition(old),
        failureAt: 'staged',
      })).toThrow();
      const journal = JSON.parse(readFileSync(join(root, 'docs/.joycraft/local/update-journal.json'), 'utf8'));
      expect(journal.oldAuthority).toEqual(expect.objectContaining({ profile: 'shared', path: manifestPath('shared'), digest: manifestDigest(old) }));
      expect(journal.newAuthority).toEqual(expect.objectContaining({ profile: 'private', path: manifestPath('private') }));
      expect(journal.newAuthority.digest).toBe(journal.newManifestDigest);
      const recovered = recoverInterruptedUpdate(root);
      expect(recovered.status).toBe('rolled-back');
      expect(existsSync(join(root, manifestPath('private')))).toBe(false);
      expect(existsSync(join(root, manifestPath('shared')))).toBe(true);
      expect(readFileSync(join(root, skillPath), 'utf8')).toBe('old vendor\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('recovers a private-to-shared transition after authority writes commit', () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-authority-reverse-'));
    try {
      const old = manifest('private');
      const next = manifest('shared', 'new vendor\n');
      mkdirSync(join(root, '.claude/skills/joycraft-demo'), { recursive: true });
      mkdirSync(join(root, 'docs/.joycraft/local'), { recursive: true });
      writeFileSync(join(root, skillPath), 'old vendor\n');
      writeFileSync(join(root, manifestPath('private')), JSON.stringify(old, null, 2) + '\n');
      expect(() => applyUpdatePlan(root, {
        ...plan(next),
        baseManifestDigest: manifestDigest(old),
      }, {
        authorityTransition: {
          oldAuthority: { profile: 'private', digest: manifestDigest(old) },
          newAuthority: { profile: 'shared', digest: null },
        },
        failureAt: 'files-applied',
      })).toThrow();
      const recovered = recoverInterruptedUpdate(root);
      expect(recovered.status).toBe('committed');
      expect(existsSync(join(root, manifestPath('private')))).toBe(false);
      expect(JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8')).profile).toBe('shared');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('guards transition rollback and restores the old authority without changing Git tracking', () => {
    const { root, old, next } = seed();
    try {
      const result = applyUpdatePlan(root, plan(next), { authorityTransition: transition(old) });
      expect(result.status).toBe('applied');
      const rolled = rollbackLastSuccessfulUpdate(root);
      expect(rolled.status).toBe('rolled-back');
      expect(existsSync(join(root, manifestPath('private')))).toBe(false);
      expect(JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8')).profile).toBe('shared');
      expect(readFileSync(join(root, skillPath), 'utf8')).toBe('old vendor\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves a preexisting target authority and refuses corrupt authorities', () => {
    const first = seed();
    try {
      const target = manifest('private', 'someone else\n');
      writeFileSync(join(first.root, manifestPath('private')), JSON.stringify(target, null, 2) + '\n');
      const result = applyUpdatePlan(first.root, plan(first.next), { authorityTransition: transition(first.old) });
      expect(result.status).toBe('conflict');
      expect(existsSync(join(first.root, manifestPath('shared')))).toBe(true);
      expect(JSON.parse(readFileSync(join(first.root, manifestPath('private')), 'utf8')).files[skillPath].vendorHash)
        .toBe(normalizedVendorHash('someone else\n'));
    } finally {
      rmSync(first.root, { recursive: true, force: true });
    }

    const second = seed();
    try {
      writeFileSync(join(second.root, manifestPath('shared')), '{broken');
      const result = applyUpdatePlan(second.root, plan(second.next), {
        authorityTransition: transition(second.old),
      });
      expect(result.status).toBe('conflict');
      expect(existsSync(join(second.root, manifestPath('private')))).toBe(false);
      expect(readFileSync(join(second.root, manifestPath('shared')), 'utf8')).toBe('{broken');
    } finally {
      rmSync(second.root, { recursive: true, force: true });
    }
  });

  it('rejects local writes outside the narrow migration allowlist', () => {
    const { root, old, next } = seed();
    try {
      expect(() => applyUpdatePlan(root, plan(next), {
        authorityTransition: transition(old),
        localOperations: [{ path: 'docs/.joycraft/local/not-approved.json', kind: 'write', content: 'x', currentPresent: false, rawPrecondition: '' }],
      })).toThrow(/allowlisted/i);
      expect(existsSync(join(root, manifestPath('private')))).toBe(false);
      expect(existsSync(join(root, skillPath))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects authority paths as ordinary managed actions for either profile', () => {
    const { root, old, next } = seed();
    try {
      const malicious = {
        ...plan(next),
        actions: [{
          path: manifestPath('shared'), kind: 'write' as const, selected: true, reason: 'malicious',
          content: '{}', currentPresent: true, targetPresent: true,
          rawPrecondition: rawFileHash(readFileSync(join(root, manifestPath('shared')))),
        }],
      };
      expect(() => applyUpdatePlan(root, malicious, { authorityTransition: transition(old) })).toThrow(/transaction state/i);
      expect(existsSync(join(root, manifestPath('private')))).toBe(false);

      const privateOnly = { ...malicious, nextManifest: next };
      expect(() => applyUpdatePlan(root, privateOnly, { profile: 'private' })).toThrow(/transaction state/i);
      expect(existsSync(join(root, manifestPath('shared')))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects a corrupted authority operation journal without changing project files', () => {
    const { root, old, next } = seed();
    try {
      expect(() => applyUpdatePlan(root, plan(next), {
        authorityTransition: transition(old),
        failureAt: 'staged',
      })).toThrow();
      const journalPath = join(root, 'docs/.joycraft/local/update-journal.json');
      const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
      const oldDelete = journal.operations.find((operation: { authority?: boolean; kind?: string }) => operation.authority && operation.kind === 'delete');
      oldDelete.before.bytes.data = journal.newAuthority.bytes.data;
      oldDelete.before.hash = rawFileHash(Buffer.from(oldDelete.before.bytes.data, 'base64'));
      writeFileSync(journalPath, JSON.stringify(journal));
      const recovered = recoverInterruptedUpdate(root);
      expect(recovered.status).toBe('attention');
      expect(existsSync(join(root, manifestPath('shared')))).toBe(true);
      expect(existsSync(join(root, manifestPath('private')))).toBe(false);
      expect(readFileSync(join(root, skillPath), 'utf8')).toBe('old vendor\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
