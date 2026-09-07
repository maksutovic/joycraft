import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveRequiredValidationReport } from '../scripts/release-report.mjs';
import { packReleaseArtifact } from '../scripts/release-preparation.mjs';

const integrity = `sha512-${Buffer.alloc(64).toString('base64')}`;
const expected = { releaseSha: 'a'.repeat(40), version: '1.2.3', integrity };
const requiredChecks = ['node22-linux-node', 'node24-linux-node'];
const temporaryRoots: string[] = [];

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-required-validation-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

function report(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    ...expected,
    complete: true,
    checks: requiredChecks.map(id => ({ id, status: 'passed' })),
    ...overrides,
  };
}

function artifact(root: string, attempt: number, contents: unknown = report()) {
  const directory = join(root, `joycraft-required-validation-${expected.releaseSha}-${attempt}`);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'report.json'), JSON.stringify(contents));
  return directory;
}

describe('required validation report resolution', () => {
  it('accepts the prior attempt report when a failed publish job is rerun alone', () => {
    const root = tempRoot();
    artifact(root, 1);

    expect(resolveRequiredValidationReport({ root, expected, requiredChecks })).toEqual(expect.objectContaining({
      releaseSha: expected.releaseSha,
      version: expected.version,
      integrity,
      complete: true,
    }));
  });

  it('selects the newest numeric artifact attempt', () => {
    const root = tempRoot();
    artifact(root, 2, report({ checks: requiredChecks.map(id => ({ id, status: 'success' })), attempt: 2 }));
    artifact(root, 10, report({ attempt: 10 }));

    expect(resolveRequiredValidationReport({ root, expected, requiredChecks })).toEqual(expect.objectContaining({ attempt: 10 }));
  });

  it('does not fall back to an earlier green report when the newest attempt has a failed check', () => {
    const root = tempRoot();
    artifact(root, 1);
    artifact(root, 2, report({ checks: [{ id: requiredChecks[0], status: 'failed' }, { id: requiredChecks[1], status: 'passed' }] }));

    expect(() => resolveRequiredValidationReport({ root, expected, requiredChecks })).toThrow(/failed/i);
  });

  it.each([
    ['wrong SHA', report({ releaseSha: 'b'.repeat(40) })],
    ['wrong version', report({ version: '1.2.4' })],
    ['wrong integrity', report({ integrity: `sha512-${Buffer.alloc(64, 1).toString('base64')}` })],
    ['incomplete checks', report({ checks: [{ id: requiredChecks[0], status: 'passed' }] })],
  ])('fails closed for a latest report with %s', (_description, invalidReport) => {
    const root = tempRoot();
    artifact(root, 1, invalidReport);

    expect(() => resolveRequiredValidationReport({ root, expected, requiredChecks })).toThrow();
  });

  it('fails closed when the report is missing or artifact names are ambiguous', () => {
    const root = tempRoot();
    const missing = join(root, `joycraft-required-validation-${expected.releaseSha}-1`);
    mkdirSync(missing);
    expect(() => resolveRequiredValidationReport({ root, expected, requiredChecks })).toThrow(/missing/i);

    writeFileSync(join(root, `joycraft-required-validation-${expected.releaseSha}-2`), 'not an artifact directory');
    expect(() => resolveRequiredValidationReport({ root, expected, requiredChecks })).toThrow(/ambiguous/i);
  });

  it('fails closed when the newest report is malformed', () => {
    const root = tempRoot();
    artifact(root, 1);
    const latest = artifact(root, 2);
    writeFileSync(join(latest, 'report.json'), '{not json');

    expect(() => resolveRequiredValidationReport({ root, expected, requiredChecks })).toThrow(/malformed/i);
  });

  it('rejects a producer attempt number that cannot be safely ordered', () => {
    const root = tempRoot();
    artifact(root, 1);
    artifact(root, 9_007_199_254_740_993);

    expect(() => resolveRequiredValidationReport({ root, expected, requiredChecks })).toThrow(/unsafe/i);
  });

  it('executes the publish validation shell step against a retained local tarball and a prior producer attempt', async () => {
    const root = tempRoot();
    const packageRoot = join(root, 'package');
    const releaseArtifact = join(packageRoot, 'release-artifact');
    mkdirSync(join(packageRoot, 'dist'), { recursive: true });
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: 'joycraft', version: expected.version }));
    writeFileSync(join(packageRoot, 'dist', 'joycraft-release.json'), JSON.stringify({ schemaVersion: 1, releaseVersion: expected.version, manifestSchemas: [1], autoSafeEligible: false }));
    const packed = await packReleaseArtifact({ cwd: packageRoot, artifactDir: releaseArtifact, releaseSha: expected.releaseSha, expectedVersion: expected.version, packageName: 'joycraft' });

    mkdirSync(join(packageRoot, 'scripts'), { recursive: true });
    for (const file of ['release-preparation.mjs', 'release-verification.mjs', 'release-report.mjs']) {
      copyFileSync(join(process.cwd(), 'scripts', file), join(packageRoot, 'scripts', file));
    }
    mkdirSync(join(packageRoot, '.github'), { recursive: true });
    writeFileSync(join(packageRoot, '.github', 'release-required-checks.json'), JSON.stringify({ requiredChecks }));
    artifact(join(packageRoot, 'required-validation'), 1, report({ integrity: packed.integrity }));
    const output = join(packageRoot, 'github-output');
    writeFileSync(output, '');

    const workflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'publish.yml'), 'utf8');
    const match = workflow.match(/- name: Validate exact artifact and required report[\s\S]*?run: \|\n([\s\S]*?)\n {6}- name:/);
    expect(match?.[1]).toBeTruthy();
    const shellStep = match![1].replace(/^ {10}/gm, '');
    const result = spawnSync('bash', ['-c', shellStep], {
      cwd: packageRoot,
      encoding: 'utf8',
      env: { ...process.env, RELEASE_SHA: expected.releaseSha, RELEASE_VERSION: expected.version, GITHUB_RUN_ATTEMPT: '2', GITHUB_OUTPUT: output },
    });

    expect(result.status, result.stderr).toBe(0);
    const resultOutput = readFileSync(output, 'utf8');
    const outputTarball = resultOutput.match(/^tarball=(.+)$/m)?.[1];
    expect(outputTarball).toBe(realpathSync(packed.tarball));
    expect(resultOutput).toContain(`version=${expected.version}`);

    artifact(join(packageRoot, 'required-validation'), 2, report({ integrity: packed.integrity, complete: false }));
    const rejected = spawnSync('bash', ['-c', shellStep], {
      cwd: packageRoot,
      encoding: 'utf8',
      env: { ...process.env, RELEASE_SHA: expected.releaseSha, RELEASE_VERSION: expected.version, GITHUB_RUN_ATTEMPT: '2', GITHUB_OUTPUT: output },
    });
    expect(rejected.status).not.toBe(0);
    expect(rejected.stderr).toMatch(/incomplete/i);
  });

  it('keeps the report download contract tied to producer attempts, not the consumer attempt', () => {
    const workflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'publish.yml'), 'utf8');
    const start = workflow.indexOf('- name: Download required compatibility report');
    const end = workflow.indexOf('\n      - name:', start + 1);
    const download = workflow.slice(start, end < 0 ? undefined : end);
    expect(download).toContain('pattern: joycraft-required-validation-${{ inputs.release_sha || github.sha }}-*');
    expect(download).toContain('merge-multiple: false');
    expect(download).not.toContain('github.run_attempt');
  });
});
