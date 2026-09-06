import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  adoptLegacyInstallation,
  manifestPath,
  normalizedVendorHash,
  parseInstallationManifest,
  rawFileHash,
  readInstallationManifest,
  validateManifest,
  writeInstallationManifest,
  type InstallationManifest,
} from '../src/install-manifest';
import { createHash } from 'node:crypto';

const validManifest: InstallationManifest = {
  schemaVersion: 1,
  targetVersion: '0.8.0',
  bundleIntegrity: `sha512-${createHash('sha512').update('bundle').digest('base64')}`,
  harnesses: ['claude', 'codex'],
  profile: 'shared',
  files: {
    '.claude/skills/joycraft-tune/SKILL.md': {
      vendorVersion: '0.8.0',
      vendorHash: normalizedVendorHash('# tune\n'),
      kind: 'vendor',
      ownership: 'verified',
    },
    'docs/AGENTS.md': {
      vendorVersion: '0.8.0',
      vendorHash: normalizedVendorHash('managed\n'),
      kind: 'config-patch',
      ownership: 'unknown',
      ownedRegion: 'joycraft:managed',
    },
  },
};

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-manifest-'));
}

describe('installation manifest schema 1', () => {
  it('validates and round-trips the portable schema', () => {
    expect(validateManifest(validManifest)).toBe(true);
    const root = tempProject();
    try {
      writeInstallationManifest(root, validManifest);
      expect(readInstallationManifest(root)).toEqual(validManifest);
      expect(JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8'))).toEqual(validManifest);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts canonical sha512 SRI and rejects another digest family', () => {
    const valid = { ...validManifest, bundleIntegrity: `sha512-${createHash('sha512').update('bundle').digest('base64')}` };
    expect(validateManifest(valid)).toBe(true);
    expect(validateManifest({ ...valid, bundleIntegrity: `sha256-${'a'.repeat(64)}` })).toBe(false);
    expect(validateManifest({ ...valid, bundleIntegrity: 'sha512-not-base64!' })).toBe(false);
  });

  it('accepts the schemaVersion spelling and rejects invalid persisted paths', () => {
    for (const path of ['/absolute.md', '../outside.md', 'a/../b.md', 'a\\b.md', 'C:/outside.md', 'C:relative.md', 'safe\0name.md']) {
      const candidate = { ...validManifest, files: { [path]: validManifest.files['docs/AGENTS.md'] } };
      expect(validateManifest(candidate), path).toBe(false);
      expect(() => parseInstallationManifest(candidate)).toThrow();
    }
  });

  it('uses exact shared and private authority paths', () => {
    expect(manifestPath('shared')).toBe('docs/.joycraft/manifest.json');
    expect(manifestPath('private')).toBe('docs/.joycraft/local/manifest.json');
  });

  it('requires a vendor hash for verified ownership', () => {
    const path = '.claude/skills/joycraft-tune/SKILL.md';
    const candidate = {
      ...validManifest,
      files: {
        [path]: { ...validManifest.files[path], vendorHash: '', ownership: 'verified' as const },
      },
    };
    expect(validateManifest(candidate)).toBe(false);
  });
});

describe('installation manifest persistence diagnostics', () => {
  it('leaves corrupt and future-schema bytes untouched and reports them', () => {
    const root = tempProject();
    try {
      const path = join(root, manifestPath('shared'));
      mkdirSync(join(root, 'docs', '.joycraft'), { recursive: true });
      const corrupt = '{ definitely not json';
      writeFileSync(path, corrupt);
      expect(readInstallationManifest(root)).toBeNull();
      expect(readFileSync(path, 'utf8')).toBe(corrupt);

      const future = JSON.stringify({ ...validManifest, schemaVersion: 99 });
      writeFileSync(path, future);
      expect(readInstallationManifest(root)).toBeNull();
      expect(readFileSync(path, 'utf8')).toBe(future);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite corrupt, future, or invalid existing manifests', () => {
    const root = tempProject();
    try {
      const path = join(root, manifestPath('shared'));
      mkdirSync(join(root, 'docs', '.joycraft'), { recursive: true });
      for (const bytes of [
        '{ corrupt',
        JSON.stringify({ ...validManifest, schemaVersion: 99 }),
        JSON.stringify({ ...validManifest, targetVersion: '' }),
      ]) {
        writeFileSync(path, bytes);
        expect(() => writeInstallationManifest(root, validManifest)).toThrow();
        expect(readFileSync(path, 'utf8')).toBe(bytes);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses to write a manifest through a profile different from its authority', () => {
    const root = tempProject();
    try {
      expect(() => writeInstallationManifest(root, validManifest, 'private')).toThrow(/profile/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('conservative legacy adoption', () => {
  it('adopts only artifact-bearing harness roots and trusted vendor bytes', () => {
    const root = tempProject();
    try {
      const target = '# Joycraft skill\n';
      const historical = '# Historical Joycraft skill\n';
      const unknown = '# customized\n';
      mkdirSync(join(root, '.claude', 'skills', 'joycraft-tune'), { recursive: true });
      mkdirSync(join(root, '.agents', 'skills', 'joycraft-tune'), { recursive: true });
      mkdirSync(join(root, '.pi', 'skills', 'joycraft-tune'), { recursive: true });
      mkdirSync(join(root, '.github', 'skills', 'joycraft-tune'), { recursive: true });
      mkdirSync(join(root, '.omp', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(root, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), target);
      writeFileSync(join(root, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'), historical);
      writeFileSync(join(root, '.pi', 'skills', 'joycraft-tune', 'SKILL.md'), unknown);
      writeFileSync(join(root, '.github', 'skills', 'joycraft-tune', 'SKILL.md'), target);
      mkdirSync(join(root, 'docs'), { recursive: true });
      writeFileSync(join(root, 'docs', 'AGENTS.md'), 'managed docs\n');
      // The omp root is present but contains no named Joycraft artifact.
      rmSync(join(root, '.omp', 'skills', 'joycraft-tune'), { recursive: true, force: true });
      mkdirSync(join(root, '.omp', 'other'), { recursive: true });
      writeFileSync(join(root, '.omp', 'other', 'README.md'), unknown);

      const inventory = [
        { path: '.claude/skills/joycraft-tune/SKILL.md', kind: 'vendor' as const },
        { path: '.agents/skills/joycraft-tune/SKILL.md', kind: 'vendor' as const },
        { path: '.pi/skills/joycraft-tune/SKILL.md', kind: 'vendor' as const },
        { path: '.github/skills/joycraft-tune/SKILL.md', kind: 'vendor' as const },
        { path: '.omp/other/README.md', kind: 'vendor' as const },
        { path: 'docs/AGENTS.md', kind: 'config-patch' as const, ownedRegion: 'joycraft:managed' },
      ];
      const result = adoptLegacyInstallation(root, {
        inventory,
        candidateContent: {
          '.claude/skills/joycraft-tune/SKILL.md': { content: target, vendorVersion: '0.8.0' },
          '.agents/skills/joycraft-tune/SKILL.md': { content: target, vendorVersion: '0.8.0' },
          '.pi/skills/joycraft-tune/SKILL.md': { content: target, vendorVersion: '0.8.0' },
          '.github/skills/joycraft-tune/SKILL.md': { content: target, vendorVersion: '0.8.0' },
          '.omp/other/README.md': { content: target, vendorVersion: '0.8.0' },
          'docs/AGENTS.md': { content: 'managed docs\n', vendorVersion: '0.8.0' },
        },
        catalogue: [
          { path: '.agents/skills/joycraft-tune/SKILL.md', version: '0.7.13', vendorHash: normalizedVendorHash(historical) },
        ],
      });

      expect(result.manifest.harnesses).toEqual(['claude', 'codex', 'pi', 'copilot']);
      expect(result.manifest.files['.claude/skills/joycraft-tune/SKILL.md'].ownership).toBe('verified');
      expect(result.manifest.files['.agents/skills/joycraft-tune/SKILL.md'].vendorVersion).toBe('0.7.13');
      expect(result.manifest.files['.agents/skills/joycraft-tune/SKILL.md'].vendorHash).toBe(normalizedVendorHash(historical));
      expect(result.manifest.files['.pi/skills/joycraft-tune/SKILL.md'].ownership).toBe('unknown');
      expect(result.manifest.files['.github/skills/joycraft-tune/SKILL.md'].ownership).toBe('verified');
      expect(result.manifest.files['docs/AGENTS.md'].ownership).toBe('verified');
      expect(result.manifest.files['.omp/other/README.md']).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves legacy hash-only state as namespaced data without verifying ownership', () => {
    const root = tempProject();
    try {
      mkdirSync(join(root, '.claude', 'skills', 'joycraft-tune'), { recursive: true });
      const content = '# customized\n';
      writeFileSync(join(root, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), content);
      const result = adoptLegacyInstallation(root, {
        inventory: [{ path: '.claude/skills/joycraft-tune/SKILL.md', kind: 'vendor' as const }],
        legacyState: { version: '0.7.13', files: { '.claude/skills/joycraft-tune/SKILL.md': rawFileHash(content) }, future: true },
      });
      expect(result.manifest.files['.claude/skills/joycraft-tune/SKILL.md'].ownership).toBe('unknown');
      expect(result.localSettings.legacy?.state).toEqual(expect.objectContaining({ future: true }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('loads legacy state automatically and keeps malformed bytes available', () => {
    const root = tempProject();
    try {
      mkdirSync(join(root, '.claude', 'skills', 'joycraft-tune'), { recursive: true });
      const content = '# customized\n';
      writeFileSync(join(root, '.claude', 'skills', 'joycraft-tune', 'SKILL.md'), content);
      mkdirSync(join(root, 'docs', '.joycraft'), { recursive: true });
      const corrupt = '{ old state';
      writeFileSync(join(root, 'docs', '.joycraft', 'state.json'), corrupt);
      const result = adoptLegacyInstallation(root, {
        inventory: [{ path: '.claude/skills/joycraft-tune/SKILL.md', kind: 'vendor' as const }],
      });
      expect(result.localSettings.legacy?.state).toBe(corrupt);
      expect(result.manifest.files['.claude/skills/joycraft-tune/SKILL.md'].ownership).toBe('unknown');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not infer a harness from an unrelated workflow filename', () => {
    const root = tempProject();
    try {
      mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
      writeFileSync(join(root, '.github', 'workflows', 'joycraft-ci.yml'), 'name: unrelated\n');
      writeFileSync(join(root, '.github', 'workflows', 'other.yml'), 'name: unrelated\n');
      const result = adoptLegacyInstallation(root, {
        inventory: [{ path: '.github/workflows/joycraft-ci.yml', kind: 'vendor' }],
        candidateContent: { '.github/workflows/joycraft-ci.yml': 'name: unrelated\n' },
      });
      expect(result.manifest.harnesses).toEqual([]);
      expect(result.manifest.files).toEqual({});
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('adopts a named Oh My Pi skill as a verified harness artifact', () => {
    const root = tempProject();
    try {
      const path = '.omp/skills/joycraft-tune/SKILL.md';
      const content = '# Joycraft skill\n';
      mkdirSync(join(root, '.omp', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(root, ...path.split('/')), content);
      const result = adoptLegacyInstallation(root, {
        inventory: [{ path, kind: 'vendor' }],
        candidateContent: { [path]: { content, vendorVersion: '0.8.0' } },
      });
      expect(result.manifest.harnesses).toEqual(['omp']);
      expect(result.manifest.files[path]).toEqual(expect.objectContaining({
        ownership: 'verified',
        vendorVersion: '0.8.0',
      }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves explicit legacy profile and harness selection while keeping preferences local', () => {
    const root = tempProject();
    try {
      mkdirSync(join(root, '.codex', 'skills'), { recursive: true });
      const result = adoptLegacyInstallation(root, {
        inventory: [],
        legacyState: {
          version: '0.7.13',
          files: {},
          gitignoreProfile: 'PRIVATE',
          harnesses: ['codex'],
          autoOpen: false,
          updatePolicy: 'manual',
          unknownPreference: { keep: true },
        },
      });
      expect(result.manifest.profile).toBe('private');
      expect(result.manifest.harnesses).toEqual(['codex']);
      expect(result.localSettings.autoOpen).toBe(false);
      expect(result.localSettings.updatePolicy).toBe('manual');
      expect(result.localSettings.legacy?.state).toEqual({ unknownPreference: { keep: true } });
      expect(result.manifest).not.toHaveProperty('localSettings');
      expect(result.manifest).not.toHaveProperty('diagnostics');
      expect(result.manifest).not.toHaveProperty('conflicts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('vendor and transaction hashes', () => {
  it('normalizes CRLF vendor text while keeping raw bytes distinct', () => {
    expect(normalizedVendorHash('one\r\ntwo\r\n')).toBe(normalizedVendorHash('one\ntwo\n'));
    expect(rawFileHash(Buffer.from('one\r\ntwo\r\n'))).not.toBe(rawFileHash(Buffer.from('one\ntwo\n')));
  });
});
