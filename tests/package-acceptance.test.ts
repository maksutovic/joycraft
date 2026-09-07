import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { packReleaseArtifact } from '../scripts/release-preparation.mjs';
import {
  HARNESS_SELECTIONS,
  STACKS,
  expectedCompatibilityCheckIds,
  runPackageAcceptance,
} from '../scripts/validate-package.mjs';

const roots: string[] = [];
const repo = resolve(process.cwd());

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function artifactRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-package-acceptance-'));
  roots.push(root);
  return root;
}

function hostOs(): string {
  return process.platform === 'linux' ? 'ubuntu' : process.platform === 'darwin' ? 'macos' : 'windows';
}

function noopManifest(root: string, body = "process.exit(0);"): string {
  const fixture = join(root, 'noop-package');
  mkdirSync(join(fixture, 'dist'), { recursive: true });
  const version = '9.9.9';
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({
    name: 'joycraft', version, type: 'module', bin: { joycraft: 'dist/cli.cjs' }, files: ['dist'],
  }) + '\n');
  writeFileSync(join(fixture, 'dist', 'joycraft-release.json'), JSON.stringify({
    schemaVersion: 1, releaseVersion: version, manifestSchemas: [1], autoSafeEligible: false,
  }) + '\n');
  writeFileSync(join(fixture, 'dist', 'cli.cjs'), `#!/usr/bin/env node\n${body}\n`);
  const [{ filename }] = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json'], { cwd: fixture, encoding: 'utf8' }));
  const tarball = join(fixture, filename);
  const bytes = readFileSync(tarball);
  const artifactDir = join(root, 'noop-artifact');
  const manifestPath = join(artifactDir, 'release-artifact.json');
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(join(artifactDir, basename(tarball)), bytes);
  writeFileSync(manifestPath, JSON.stringify({
    artifactSchemaVersion: 1,
    packageName: 'joycraft',
    version,
    releaseSha: '0123456789abcdef0123456789abcdef01234567',
    tarball: basename(tarball),
    sha512: createHash('sha512').update(bytes).digest('hex'),
    integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    descriptor: { schemaVersion: 1, releaseVersion: version, manifestSchemas: [1], autoSafeEligible: false },
  }, null, 2) + '\n');
  return manifestPath;
}

describe('package compatibility contract', () => {
  it('defines the complete four-stack and seven-selection matrix', () => {
    expect(STACKS).toEqual(['node', 'python', 'rust', 'go']);
    expect(HARNESS_SELECTIONS).toEqual(['claude', 'codex', 'pi', 'copilot', 'omp', 'claude-codex', 'all']);
    expect(expectedCompatibilityCheckIds('ubuntu', '22.23.1')).toHaveLength(28);
    expect(expectedCompatibilityCheckIds('ubuntu', '22.23.1')).toContain('ubuntu:node-22.23.1:node:claude-codex');
  });

  it('runs the real retained package CLI in isolated consumers and writes a complete report', async () => {
    const root = artifactRoot();
    const retained = await packReleaseArtifact({
      cwd: repo,
      artifactDir: join(root, 'artifact'),
      releaseSha: '0123456789abcdef0123456789abcdef01234567',
      expectedVersion: JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version,
      packageName: 'joycraft',
    });
    const output = join(root, 'report.json');
    const result = await runPackageAcceptance({
      manifestPath: retained.manifestPath,
      os: hostOs(),
      node: process.versions.node,
      output,
      root: join(root, 'consumer'),
    });
    expect(result.complete).toBe(true);
    expect(result.checks).toHaveLength(28);
    expect(result.checks.every((check) => check.status === 'passed')).toBe(true);
    expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual(result);
    expect(result.integrity).toBe(`sha512-${createHash('sha512').update(readFileSync(retained.tarball)).digest('base64')}`);
  }, 120_000);

  it('fails closed before npm installation for a mismatched runtime lane', async () => {
    const root = artifactRoot();
    const manifest = join(root, 'missing-manifest.json');
    writeFileSync(manifest, '{}');
    await expect(runPackageAcceptance({
      manifestPath: manifest,
      os: process.platform === 'linux' ? 'ubuntu' : process.platform === 'darwin' ? 'macos' : 'windows',
      node: '0.0.0',
      output: join(root, 'report.json'),
      root: join(root, 'consumer'),
    })).rejects.toThrow(/Node runtime/i);
    expect(existsSync(join(root, 'consumer'))).toBe(false);
  });

  it('reports every row failed when an installed packaged executable is a no-op', async () => {
    const root = artifactRoot();
    const output = join(root, 'noop-report.json');
    const workspace = join(root, 'workspace');
    mkdirSync(workspace, { recursive: true });
    const sentinel = '{"keep":true}\n';
    writeFileSync(join(workspace, 'package.json'), sentinel);
    mkdirSync(join(workspace, '.consumer'), { recursive: true });
    writeFileSync(join(workspace, '.consumer/package.json'), sentinel);
    const result = await runPackageAcceptance({
      manifestPath: noopManifest(root),
      os: hostOs(),
      node: process.versions.node,
      output,
      root: workspace,
    });
    expect(result.complete).toBe(false);
    expect(result.checks).toHaveLength(28);
    expect(result.checks.every((check) => check.status === 'failed')).toBe(true);
    expect(JSON.parse(readFileSync(output, 'utf8')).complete).toBe(false);
    expect(readFileSync(join(workspace, 'package.json'), 'utf8')).toBe(sentinel);
    expect(readFileSync(join(workspace, '.consumer/package.json'), 'utf8')).toBe(sentinel);
  }, 60_000);
  it('retains structured CLI errors when the packaged process exits unsuccessfully', async () => {
    const root = artifactRoot();
    const result = await runPackageAcceptance({
      manifestPath: noopManifest(root, 'console.log(JSON.stringify({status:"failed", errors:["Cannot sync directory"]})); process.exit(1);'),
      os: hostOs(), node: process.versions.node,
      output: join(root, 'failed-report.json'), root: join(root, 'consumer'),
    });
    expect(result.complete).toBe(false);
    expect(result.checks).toHaveLength(28);
    expect(result.checks.every((check) => check.error.includes('Cannot sync directory'))).toBe(true);
  }, 60_000);

});
