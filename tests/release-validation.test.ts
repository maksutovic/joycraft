import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COMPATIBILITY_STACKS,
  HARNESS_SELECTIONS,
  REQUIRED_RUNTIME_LANES,
  aggregateValidationReports,
  createCompatibilityMatrix,
  createRequiredChecksConfig,
} from '../scripts/release-validation.mjs';
import { createPromotionProcessAdapter, promoteVerifiedRelease } from '../scripts/release-promotion.mjs';
import { createReadinessPlan, MIN_FRESHNESS_MS, runRegistryReadiness } from '../scripts/release-verification.mjs';

const identity = {
  releaseSha: 'a'.repeat(40),
  version: '1.2.3',
  integrity: `sha512-${Buffer.alloc(64).toString('base64')}`,
};

async function verifiedReadiness({ packageName, version, integrity, descriptor }: {
  packageName: string; version: string; integrity: string; descriptor: object;
}) {
  const cacheRoot = mkdtempSync('/tmp/joycraft-validation-cache-');
  const consumerRoot = mkdtempSync('/tmp/joycraft-validation-consumer-');
  const plan = createReadinessPlan({ packageName, version, runtimeLanes: [{ node: '24.20.0', npm: '11.19.0' }] });
  return runRegistryReadiness({
    packageName, version, integrity, descriptor, plan, cacheRoot, consumerRoot,
    adapter: {
      viewExactMetadata: async () => ({ name: packageName, version, dist: { integrity } }),
      install: async ({ cwd }: { cwd: string }) => {
        const packageDir = join(cwd, 'node_modules', packageName);
        mkdirSync(join(packageDir, 'dist'), { recursive: true });
        writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: packageName, version }));
        writeFileSync(join(cwd, 'package-lock.json'), JSON.stringify({ packages: { [`node_modules/${packageName}`]: { integrity } } }));
        writeFileSync(join(packageDir, 'dist', 'joycraft-release.json'), JSON.stringify(descriptor));
      },
    },
    startedAt: 0, now: () => MIN_FRESHNESS_MS, sleep: async () => {},
    minFreshnessMs: MIN_FRESHNESS_MS, deadlineMs: MIN_FRESHNESS_MS + 1,
  });
}

describe('required compatibility validation', () => {
  it('defines the approved seven runtime lanes and 28 checks per lane', () => {
    expect(REQUIRED_RUNTIME_LANES).toHaveLength(7);
    expect(REQUIRED_RUNTIME_LANES).toEqual(expect.arrayContaining([
      { os: 'ubuntu', runner: 'ubuntu-latest', node: '22.23.1' },
      { os: 'ubuntu', runner: 'ubuntu-latest', node: '24.20.0' },
      { os: 'ubuntu', runner: 'ubuntu-latest', node: '22.0.0' },
      { os: 'macos', runner: 'macos-latest', node: '22.23.1' },
      { os: 'macos', runner: 'macos-latest', node: '24.20.0' },
      { os: 'windows', runner: 'windows-latest', node: '22.23.1' },
      { os: 'windows', runner: 'windows-latest', node: '24.20.0' },
    ]));
    expect(COMPATIBILITY_STACKS).toEqual(['node', 'python', 'rust', 'go']);
    expect(HARNESS_SELECTIONS).toEqual(['claude', 'codex', 'pi', 'copilot', 'omp', 'claude-codex', 'all']);
    const matrix = createCompatibilityMatrix(identity);
    expect(matrix).toHaveLength(196);
    expect(new Set(matrix.map(cell => cell.id)).size).toBe(196);
    expect(matrix[0]).toEqual(expect.objectContaining({
      id: 'ubuntu:node-22.23.1:node:claude',
      ...identity,
    }));
  });

  it('aggregates only independent required checks and fails closed on identity or status drift', () => {
    const cells = createCompatibilityMatrix(identity);
    const requiredChecks = createRequiredChecksConfig(identity).requiredChecks;
    const reports = cells.map(cell => ({
      schemaVersion: 1,
      ...cell,
      checks: [{ id: cell.id, status: 'passed' }],
    }));
    const result = aggregateValidationReports({ identity, reports, requiredChecks });
    expect(result).toEqual(expect.objectContaining({ schemaVersion: 1, complete: true, ...identity }));
    expect(result.checks).toHaveLength(196);

    expect(() => aggregateValidationReports({ identity, reports: reports.slice(1), requiredChecks })).toThrow(/missing/i);
    expect(() => aggregateValidationReports({ identity, reports: reports.map((report, index) => index === 0 ? { ...report, checks: [{ id: report.checks[0].id, status: 'failed' }] } : report), requiredChecks })).toThrow(/failed/i);
    expect(() => aggregateValidationReports({ identity, reports: [{ ...reports[0], releaseSha: 'b'.repeat(40) }, ...reports.slice(1)], requiredChecks })).toThrow(/identity|SHA/i);
  });

  it('checks in the independent matrix and makes its report a promotion dependency', () => {
    const configured = JSON.parse(readFileSync('.github/release-required-checks.json', 'utf8'));
    expect(configured).toEqual(createRequiredChecksConfig());
    const workflow = readFileSync('.github/workflows/test.yml', 'utf8');
    const publish = readFileSync('.github/workflows/publish.yml', 'utf8');
    expect(workflow).toContain('workflow_call:');
    expect(workflow).toContain('node scripts/validate-package.mjs');
    expect(workflow).toContain('node scripts/release-validation.mjs aggregate');
    expect(publish).toContain('uses: ./.github/workflows/test.yml');
    expect(publish).toMatch(/publish:[\s\S]*needs:\s*\[pack, compatibility\]/);
    expect(publish).toContain('joycraft-required-validation-${{ inputs.release_sha || github.sha }}');
    expect(workflow).toContain('run: pnpm test');
    for (const lane of REQUIRED_RUNTIME_LANES) {
      expect(workflow).toContain(`- os: ${lane.os}\n            runner: ${lane.runner}\n            node: ${lane.node}`);
    }
    expect(REQUIRED_RUNTIME_LANES.flatMap(lane => COMPATIBILITY_STACKS.flatMap(stack => HARNESS_SELECTIONS.map(selection => `${lane.os}:node-${lane.node}:${stack}:${selection}`)))).toEqual(configured.requiredChecks);
  });

  it('feeds the producer output through the promotion consumer fail-closed', async () => {
    const cells = createCompatibilityMatrix(identity);
    const requiredChecks = createRequiredChecksConfig().requiredChecks;
    const reports = cells.map(cell => ({ schemaVersion: 1, ...cell, checks: [{ id: cell.id, status: 'passed' }] }));
    const expected = {
      ...identity,
      releaseSha: identity.releaseSha,
      packageName: 'joycraft',
      tarball: '/tmp/joycraft.tgz',
      descriptor: { schemaVersion: 1, releaseVersion: identity.version, manifestSchemas: [1], autoSafeEligible: false },
    };
    const report = aggregateValidationReports({ identity, reports, requiredChecks });
    let latestReads = 0;
    const adapter = createPromotionProcessAdapter({
      run: async (command: string, args: string[]) => {
        if (command === 'npm' && args[0] === 'view' && args[1] === 'joycraft') return { stdout: JSON.stringify(latestReads++ === 0 ? '1.2.2' : '1.2.3'), stderr: '' };
        if (command === 'gh' && args[0] === 'release' && args[1] === 'view') return { stdout: JSON.stringify({ tagName: 'v1.2.3', targetCommitish: identity.releaseSha }), stderr: '' };
        return { stdout: '', stderr: '' };
      },
    });
    adapter.verifyFreshLatest = async () => true;
    await expect(promoteVerifiedRelease({
      expected, report, requiredChecks, readinessCheck: () => verifiedReadiness({ packageName: expected.packageName, version: expected.version, integrity: expected.integrity, descriptor: expected.descriptor }), credential: { token: 'test' },
      completedSteps: ['promotion', 'release'], adapter,
    })).resolves.toEqual(expect.objectContaining({ promoted: true, version: identity.version }));
    await expect(promoteVerifiedRelease({
      expected, report: { ...report, checks: report.checks.slice(1) }, requiredChecks, readinessCheck: () => verifiedReadiness({ packageName: expected.packageName, version: expected.version, integrity: expected.integrity, descriptor: expected.descriptor }),
      credential: { token: 'test' }, adapter,
    })).rejects.toThrow(/validation/i);
    await expect(promoteVerifiedRelease({
      expected, report: { ...report, checks: report.checks.map((check, index) => index === 0 ? { ...check, status: 'failed' } : check) }, requiredChecks, readinessCheck: () => verifiedReadiness({ packageName: expected.packageName, version: expected.version, integrity: expected.integrity, descriptor: expected.descriptor }),
      credential: { token: 'test' }, adapter,
    })).rejects.toThrow(/failed/i);
    await expect(promoteVerifiedRelease({
      expected, report: { ...report, integrity: 'sha512-other' }, requiredChecks, readinessCheck: () => verifiedReadiness({ packageName: expected.packageName, version: expected.version, integrity: expected.integrity, descriptor: expected.descriptor }),
      credential: { token: 'test' }, adapter,
    })).rejects.toThrow(/integrity/i);
  });
});
