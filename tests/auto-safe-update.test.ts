import { readUpdatePolicy } from '../src/update-check.js';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

import {
  evaluateAutoSafeEligibility,
  type AutoSafeEligibilityInput,
} from '../src/auto-safe-update.js';
import { update } from '../src/update.js';
import { manifestPath, normalizedVendorHash, type InstallationManifest } from '../src/install-manifest.js';
import type { BundleInventoryEntry } from '../src/bundle-inventory.js';
import type { VerifiedReleaseArtifact } from '../src/release-artifact.js';
import { verifyReleaseArtifact } from '../src/release-artifact.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

const path = '.agents/skills/joycraft-tune/SKILL.md';
const integrity = `sha512-${Buffer.alloc(64, 3).toString('base64')}`;
const descriptor = {
  schemaVersion: 1,
  releaseVersion: '1.0.1',
  manifestSchemas: [1],
  autoSafeEligible: true,
};

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-auto-safe-'));
  roots.push(root);
  return root;
}

function put(root: string, relative: string, content: string): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

function inventory(content = 'new\n'): BundleInventoryEntry[] {
  return [{ path, harness: 'codex', kind: 'vendor', ownership: 'managed', active: true, installable: true, content }];
}

function tarball(entries: Array<{ name: string; content: string }>): Buffer {
  const records = entries.map(({ name, content }) => {
    const body = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, 'utf8');
    header.write('0000644\0', 100, 8, 'ascii');
    header.write('0000000\0', 108, 8, 'ascii');
    header.write('0000000\0', 116, 8, 'ascii');
    header.write(body.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
    header.write('00000000000\0', 136, 12, 'ascii');
    header.fill(' ', 148, 156);
    header[156] = 48;
    header.write('ustar\0', 257, 6, 'ascii');
    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
    return Buffer.concat([header, body, padding]);
  });
  return gzipSync(Buffer.concat([...records, Buffer.alloc(1024)]));
}

function manifest(): InstallationManifest {
  return {
    schemaVersion: 1,
    targetVersion: '1.0.0',
    bundleIntegrity: integrity,
    harnesses: ['codex'],
    profile: 'shared',
    files: { [path]: { vendorVersion: '1.0.0', vendorHash: normalizedVendorHash('old\n'), kind: 'vendor', ownership: 'verified' } },
  };
}

function artifact(options: { version?: string; autoSafeEligible?: boolean } = {}): VerifiedReleaseArtifact {
  const version = options.version ?? '1.0.1';
  const candidateDescriptor = { ...descriptor, releaseVersion: version, autoSafeEligible: options.autoSafeEligible ?? true };
  const bytes = tarball([
    { name: 'package/package.json', content: JSON.stringify({ name: 'joycraft', version }) },
    { name: 'package/dist/joycraft-release.json', content: JSON.stringify(candidateDescriptor) },
  ]);
  return verifyReleaseArtifact({ packageName: 'joycraft', version, integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`, tarballUrl: `https://registry.npmjs.org/joycraft/-/joycraft-${version}.tgz` }, bytes);
}

function input(overrides: Partial<AutoSafeEligibilityInput> = {}): AutoSafeEligibilityInput {
  const candidate = 'candidate' in overrides ? overrides.candidate : artifact();
  return {
    policy: 'auto-safe',
    candidate,
    executingVersion: candidate?.release.version ?? '1.0.1',
    executingIntegrity: candidate?.release.integrity,
    executingDescriptor: candidate?.descriptor,
    manifestSchema: 1,
    plan: { actions: [], preserved: [], conflicts: [], diagnostics: [], nextManifest: manifest(), baseManifestDigest: null },
    existingManifest: manifest(),
    ...overrides,
  };
}

describe('auto-safe update policy', () => {
  it('reads authorization only from local settings and defaults to notify', () => {
    const root = project();
    put(root, manifestPath('shared'), JSON.stringify(manifest()));
    expect(readUpdatePolicy(root)).toBe('notify');
    put(root, 'docs/.joycraft/local/settings.json', JSON.stringify({ updatePolicy: 'auto-safe' }));
    expect(readUpdatePolicy(root)).toBe('auto-safe');
    put(root, manifestPath('shared'), JSON.stringify({ ...manifest(), updatePolicy: 'auto-safe' }));
    rmSync(join(root, 'docs/.joycraft/local/settings.json'));
    expect(readUpdatePolicy(root)).toBe('notify');
  });

  it('accepts a complete verified stable conflict-free gate', () => {
    expect(evaluateAutoSafeEligibility(input())).toEqual({ eligible: true, diagnostics: [] });
  });

  it('permits metadata reconciliation that leaves existing configuration bytes unchanged', () => {
    const plan = input().plan;
    plan.actions.push({ path: '.claude/settings.json', kind: 'reconcile', selected: true, reason: 'unchanged owned configuration', currentPresent: true, targetPresent: true, rawPrecondition: 'same-hash', rawTargetHash: 'same-hash', patch: { ownedKey: 'autoMemoryEnabled' } });
    expect(evaluateAutoSafeEligibility(input({ plan }))).toEqual({ eligible: true, diagnostics: [] });
  });

  it.each([
    ['notify policy', { policy: 'notify' as const }],
    ['off policy', { policy: 'off' as const }],
    ['missing proof', { candidate: undefined }],
    ['descriptor declares ineligible', { candidate: artifact({ autoSafeEligible: false }) }],
    ['unsupported manifest protocol', { manifestSchema: 2 }],
    ['conflict', { plan: { ...input().plan, conflicts: [{ path, kind: 'conflict', selected: false, reason: 'customized', currentPresent: true, targetPresent: true }] } }],
    ['repair', { plan: { ...input().plan, actions: [{ path, kind: 'repair', selected: true, reason: 'deleted', currentPresent: false, targetPresent: true }] } }],
    ['user config patch', { plan: { ...input().plan, actions: [{ path: '.claude/settings.json', kind: 'replace', selected: true, reason: 'settings', currentPresent: true, targetPresent: true, patch: { ownedKey: 'autoMemoryEnabled' } }] } }],
    ['explicit replacement', { replaceCustomized: [path] }],
    ['explicit migration', { migration: true }],
    ['prerelease', { candidate: artifact({ version: '1.0.2-beta.1' }) }],
    ['downgrade', { candidate: artifact({ version: '0.9.9' }) }],
    ['legacy bridge', { legacyBridge: true }],
    ['profile configuration', { profileChanges: true }],
    ['local migration', { localOperations: true }],
    ['authority transition', { authorityTransition: true }],
    ['missing manifest', { existingManifest: undefined }],
    ['missing executing descriptor', { executingDescriptor: undefined }],
  ] as const)('%s is ineligible', (_name, changes) => {
    const result = evaluateAutoSafeEligibility(input(changes));
    expect(result.eligible).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('rejects proof that does not match the executing exact version or integrity', () => {
    expect(evaluateAutoSafeEligibility(input({ executingVersion: '1.0.2' })).eligible).toBe(false);
    expect(evaluateAutoSafeEligibility(input({ executingIntegrity: 'sha512-other' })).eligible).toBe(false);
  });

  it('rejects an unverified or mismatched descriptor even when its fields look eligible', () => {
    const candidate = { ...artifact(), descriptor: { schemaVersion: 1, releaseVersion: '1.0.2', manifestSchemas: [1], autoSafeEligible: true } } as VerifiedReleaseArtifact;
    expect(evaluateAutoSafeEligibility(input({ candidate })).eligible).toBe(false);
  });
});

describe('update preview and automatic enforcement', () => {
  it('returns a read-only plan without applying files or bookkeeping', async () => {
    const root = project();
    put(root, path, 'old\n');
    put(root, manifestPath('shared'), JSON.stringify(manifest()));
    put(root, '.gitignore', 'docs/.joycraft/local/\ndocs/.joycraft/state.json\ndocs/.joycraft/telemetry.json\n');
    put(root, '.gitattributes', '# Joycraft: collapse generated workflow docs in PR review (expand with one click)\ndocs/features/** linguist-generated=true\ndocs/bugfixes/** linguist-generated=true\ndocs/discoveries/** linguist-generated=true\ndocs/templates/** linguist-generated=true\n');
    const beforeManifest = readFileSync(join(root, manifestPath('shared')), 'utf8');
    const result = await update(root, { preview: true, nonInteractive: true, bundle: { version: '1.0.1', integrity, inventory: inventory() } });
    expect(result.plan).toBeDefined();
    expect(result.transaction).toBeUndefined();
    expect(readFileSync(join(root, path), 'utf8')).toBe('old\n');
    expect(readFileSync(join(root, manifestPath('shared')), 'utf8')).toBe(beforeManifest);
  });

  it.each([
    ['recovery', { recovery: 'recover' as const }],
    ['init', { legacyInit: true }],
    ['force', { legacyInit: true, force: true }],
    ['repair', { repair: [path] }],
    ['replacement', { replaceCustomized: [path] }],
    ['harness selection', { harnesses: ['codex'] as const }],
  ] as const)('rejects automatic %s before any branch can mutate', async (_name, options) => {
    const root = project();
    put(root, path, 'old\n');
    put(root, manifestPath('shared'), JSON.stringify(manifest()));
    put(root, 'docs/.joycraft/local/settings.json', JSON.stringify({ updatePolicy: 'auto-safe' }));
    const before = readFileSync(join(root, path), 'utf8');
    const result = await update(root, { ...options, automatic: true, nonInteractive: true, verifiedArtifact: artifact(), bundle: { version: '1.0.1', integrity, inventory: inventory() } });
    expect(result.exitCode).toBe(1);
    expect(readFileSync(join(root, path), 'utf8')).toBe(before);
  });

  it('does not apply automatic updates without a verified artifact proof', async () => {
    const root = project();
    put(root, path, 'old\n');
    put(root, manifestPath('shared'), JSON.stringify(manifest()));
    put(root, 'docs/.joycraft/local/settings.json', JSON.stringify({ updatePolicy: 'auto-safe' }));
    const result = await update(root, { automatic: true, nonInteractive: true, bundle: { version: '1.0.1', integrity, inventory: inventory() } });
    expect(result.exitCode).toBe(1);
    expect(readFileSync(join(root, path), 'utf8')).toBe('old\n');
  });

  it('does not trust a verified candidate when the executing bundle omits its descriptor', async () => {
    const root = project();
    put(root, path, 'old\n');
    put(root, manifestPath('shared'), JSON.stringify(manifest()));
    put(root, 'docs/.joycraft/local/settings.json', JSON.stringify({ updatePolicy: 'auto-safe' }));
    const candidate = artifact();
    const result = await update(root, { automatic: true, nonInteractive: true, verifiedArtifact: candidate, bundle: { version: '1.0.1', integrity: candidate.release.integrity, inventory: inventory() } });
    expect(result.exitCode).toBe(1);
    expect(readFileSync(join(root, path), 'utf8')).toBe('old\n');
  });

  it('reports a planned conflict without applying it in automatic mode', async () => {
    const root = project();
    put(root, path, 'local edit\n');
    put(root, manifestPath('shared'), JSON.stringify(manifest()));
    put(root, '.gitignore', 'docs/.joycraft/local/\ndocs/.joycraft/state.json\ndocs/.joycraft/telemetry.json\n');
    put(root, '.gitattributes', '# Joycraft: collapse generated workflow docs in PR review (expand with one click)\ndocs/features/** linguist-generated=true\ndocs/bugfixes/** linguist-generated=true\ndocs/discoveries/** linguist-generated=true\ndocs/templates/** linguist-generated=true\n');
    put(root, 'docs/.joycraft/local/settings.json', JSON.stringify({ updatePolicy: 'auto-safe' }));
    const candidate = artifact();
    const result = await update(root, { automatic: true, nonInteractive: true, verifiedArtifact: candidate, bundle: { version: '1.0.1', integrity: candidate.release.integrity, descriptor, inventory: inventory() } });
    expect(result.status).toBe('conflict');
    expect(result.exitCode).toBe(2);
    expect(readFileSync(join(root, path), 'utf8')).toBe('local edit\n');
  });

  it('applies one exact verified conflict-free update only with local auto-safe', async () => {
    const root = project();
    put(root, path, 'old\n');
    put(root, manifestPath('shared'), JSON.stringify(manifest()));
    put(root, '.gitignore', 'docs/.joycraft/local/\ndocs/.joycraft/state.json\ndocs/.joycraft/telemetry.json\n');
    put(root, '.gitattributes', '# Joycraft: collapse generated workflow docs in PR review (expand with one click)\ndocs/features/** linguist-generated=true\ndocs/bugfixes/** linguist-generated=true\ndocs/discoveries/** linguist-generated=true\ndocs/templates/** linguist-generated=true\n');
    put(root, 'docs/.joycraft/local/settings.json', JSON.stringify({ updatePolicy: 'auto-safe' }));
    const candidate = artifact();
    const result = await update(root, { automatic: true, nonInteractive: true, verifiedArtifact: candidate, bundle: { version: '1.0.1', integrity: candidate.release.integrity, descriptor, inventory: inventory() } });
    expect(result.exitCode).toBe(0);
    expect(result.applied).toContain(path);
    expect(readFileSync(join(root, path), 'utf8')).toBe('new\n');
  });
});
