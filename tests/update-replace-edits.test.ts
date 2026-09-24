import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { getBundleInventory, type BundleInventoryEntry } from '../src/bundle-inventory';
import { init } from '../src/init';
import { upgrade } from '../src/upgrade';
import { backupDirectoryFor, formatUpdateOutcome, update } from '../src/update';
import { manifestPath, normalizedVendorHash, type InstallationManifest } from '../src/install-manifest';
import { createUpdatePlan } from '../src/update-plan';
import { applyUpdatePlan } from '../src/update-transaction';
import { evaluateAutoSafeEligibility } from '../src/auto-safe-update';

const SKILL = '.claude/skills/joycraft-tune/SKILL.md';
const DENY = '.claude/hooks/joycraft/deny-patterns.txt';
const EXAMPLE_TASK = 'docs/templates/evals/example-task.json';
const REPLACED_ROOT = 'docs/.joycraft/local/replaced/';
const inventory = getBundleInventory(['claude']);

function changed(paths: readonly string[], base: readonly BundleInventoryEntry[] = inventory): BundleInventoryEntry[] {
  return base.map((entry) => paths.includes(entry.path) ? { ...entry, content: `${entry.content ?? ''}\nvendor update\n` } : entry);
}

function contentOf(entries: readonly BundleInventoryEntry[], path: string): string {
  return entries.find((entry) => entry.path === path)!.content!;
}

function put(root: string, relative: string, content: string): void {
  mkdirSync(dirname(join(root, relative)), { recursive: true });
  writeFileSync(join(root, relative), content);
}

function readManifest(root: string): InstallationManifest {
  return JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8')) as InstallationManifest;
}

async function installed(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-replace-edits-'));
  await init(root, { nonInteractive: true, yes: true, harnesses: ['claude'], bundle: { version: '1.0.0', integrity: '', inventory } });
  return root;
}

function upgradeTo(root: string, entries: readonly BundleInventoryEntry[], options: Record<string, unknown> = { nonInteractive: true, yes: true }) {
  return upgrade(root, { ...options, bundle: { version: '1.0.1', integrity: '', inventory: [...entries] } });
}

describe('upgrade installs the latest Joycraft file and backs up the edited copy', () => {
  it.each([
    ['--yes', { yes: true }],
    ['--non-interactive', { nonInteractive: true }],
  ])('replaces an edited skill whose target changed (%s)', async (_flag, options) => {
    const root = await installed();
    try {
      const target = changed([SKILL]);
      const custom = 'my edited skill\n';
      put(root, SKILL, custom);

      const result = await upgradeTo(root, target, options);
      expect(result.status).toBe('applied');
      expect(result.exitCode).toBe(0);
      expect(result.conflicts).toEqual([]);
      expect(readFileSync(join(root, SKILL), 'utf8')).toBe(contentOf(target, SKILL));

      const replaced = result.replaced?.find((entry) => entry.path === SKILL);
      expect(replaced?.backup.startsWith(REPLACED_ROOT)).toBe(true);
      expect(replaced?.backup.endsWith(`/${SKILL}.bak`)).toBe(true);
      expect(readFileSync(join(root, replaced!.backup), 'utf8')).toBe(custom);
      expect(result.applied).toContain(SKILL);
      expect(result.applied.some((path) => path.startsWith(REPLACED_ROOT))).toBe(false);
      expect(readManifest(root).files[SKILL]).toMatchObject({
        ownership: 'verified',
        vendorHash: normalizedVendorHash(contentOf(target, SKILL)),
      });
      expect(formatUpdateOutcome(result)).toMatch(
        /\n {2}Replaced your edited copies \(saved in docs\/\.joycraft\/local\/replaced\/\d{8}-\d{6}(-\d+)?\/\): .*\.claude\/skills\/joycraft-tune\/SKILL\.md/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('replaces an edited skill with unknown ownership and verifies the new row', async () => {
    const root = await installed();
    try {
      const manifest = readManifest(root);
      manifest.files[SKILL] = { ...manifest.files[SKILL], ownership: 'unknown', vendorHash: normalizedVendorHash('something else\n') };
      put(root, manifestPath('shared'), JSON.stringify(manifest, null, 2) + '\n');
      const custom = 'custom content with unknown ownership\n';
      put(root, SKILL, custom);

      const result = await upgradeTo(root, inventory);
      expect(result.exitCode).toBe(0);
      expect(readFileSync(join(root, SKILL), 'utf8')).toBe(contentOf(inventory, SKILL));
      const backup = result.replaced?.find((entry) => entry.path === SKILL)?.backup;
      expect(readFileSync(join(root, backup!), 'utf8')).toBe(custom);
      expect(readManifest(root).files[SKILL].ownership).toBe('verified');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('never replaces or backs up user-owned files', async () => {
    const root = await installed();
    try {
      const edits: Record<string, string> = {
        'CLAUDE.md': '# my claude\n',
        'AGENTS.md': '# my agents\n',
        [DENY]: 'my-pattern\n',
        [EXAMPLE_TASK]: '{"id":"mine"}\n',
      };
      for (const [path, content] of Object.entries(edits)) put(root, path, content);
      const settingsBefore = readFileSync(join(root, '.claude/settings.json'), 'utf8');

      const result = await upgradeTo(root, changed([DENY, EXAMPLE_TASK]));
      expect(result.exitCode).toBe(0);
      // Memory files may gain the additive Context Map pointer; their content is never replaced.
      for (const [path, content] of Object.entries(edits)) expect(readFileSync(join(root, path), 'utf8').startsWith(content), path).toBe(true);
      for (const path of [DENY, EXAMPLE_TASK]) expect(readFileSync(join(root, path), 'utf8')).toBe(edits[path]);
      expect(readFileSync(join(root, '.claude/settings.json'), 'utf8')).toBe(settingsBefore);
      expect(result.replaced ?? []).toEqual([]);
      expect(existsSync(join(root, REPLACED_ROOT))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('restores the edited copy and removes the backup on rollback', async () => {
    const root = await installed();
    try {
      const custom = 'edit to roll back to\n';
      put(root, SKILL, custom);
      const result = await upgradeTo(root, changed([SKILL]));
      const backup = result.replaced!.find((entry) => entry.path === SKILL)!.backup;

      const rollback = await update(root, { recovery: 'rollback', nonInteractive: true });
      expect(rollback.exitCode).toBe(0);
      expect(readFileSync(join(root, SKILL), 'utf8')).toBe(custom);
      expect(existsSync(join(root, backup))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports replaced files in JSON output', async () => {
    const root = await installed();
    try {
      put(root, SKILL, 'edited\n');
      const result = await upgradeTo(root, changed([SKILL]));
      const json = JSON.parse(formatUpdateOutcome(result, true));
      expect(json.replaced).toEqual([{ path: SKILL, backup: expect.stringMatching(/^docs\/\.joycraft\/local\/replaced\/.+\.bak$/) }]);
      expect(json.applied.some((path: string) => path.startsWith(REPLACED_ROOT))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('planner backup rule', () => {
  const path = 'skills/one/SKILL.md';
  const base = 'base\n';
  const manifest: InstallationManifest = {
    schemaVersion: 1,
    targetVersion: '1.0.0',
    bundleIntegrity: '',
    harnesses: ['claude'],
    profile: 'shared',
    files: { [path]: { vendorVersion: '1.0.0', vendorHash: normalizedVendorHash(base), kind: 'vendor', ownership: 'verified' } },
  };
  const entry = (content: string): BundleInventoryEntry => ({ path, harness: 'claude', kind: 'vendor', ownership: 'managed', active: true, installable: true, content });
  const plan = (current: string, target: string, options = {}) => createUpdatePlan({
    snapshot: { files: { [path]: { content: current } } },
    manifest,
    inventory: [entry(target)],
    options: { backupDirectory: 'docs/.joycraft/local/replaced/x', ...options },
  });

  it('keeps a local-only edit when the target did not change', () => {
    const result = plan('local\n', base);
    expect(result.actions.find((action) => action.path === path)?.kind).toBe('preserve');
    expect(result.actions.some((action) => action.backupOf)).toBe(false);
  });

  it('pairs a replacement of edited bytes with a backup of the exact bytes', () => {
    const current = Buffer.from('local\r\nedit\r\n');
    const result = createUpdatePlan({
      snapshot: { files: { [path]: { content: current } } },
      manifest,
      inventory: [entry('target\n')],
      options: { backupDirectory: 'docs/.joycraft/local/replaced/x' },
    });
    const replace = result.actions.find((action) => action.path === path)!;
    const backup = result.actions.find((action) => action.backupOf === path)!;
    expect(replace).toMatchObject({ kind: 'replace', selected: true, backupPath: `docs/.joycraft/local/replaced/x/${path}.bak` });
    expect(backup).toMatchObject({ kind: 'create', selected: true, path: replace.backupPath, currentPresent: false });
    expect(Buffer.compare(Buffer.from(backup.content as Buffer), current)).toBe(0);
    expect(result.conflicts).toEqual([]);
    expect(result.nextManifest.files[replace.backupPath!]).toBeUndefined();
  });

  it('backs up an explicit --replace-customized of a local-only edit', () => {
    const result = plan('local\n', base, { replaceCustomized: [path] });
    expect(result.actions.find((action) => action.path === path)).toMatchObject({ kind: 'replace', selected: true });
    expect(result.actions.some((action) => action.backupOf === path)).toBe(true);
  });

  it('does not back up a pristine copy', () => {
    const result = plan(base, 'target\n');
    expect(result.actions.find((action) => action.path === path)?.kind).toBe('replace');
    expect(result.actions.some((action) => action.backupOf)).toBe(false);
  });

  it('makes a backup replacement ineligible for automatic updates', () => {
    const result = plan('local\n', 'target\n');
    const eligibility = evaluateAutoSafeEligibility({ policy: 'auto-safe', executingVersion: '1.0.1', plan: result });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.diagnostics).toContain('Replacing edited files requires an explicit update.');
  });
});

describe('backup directory', () => {
  it('uses a UTC timestamp and a numeric suffix when the directory already exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-backup-dir-'));
    try {
      const now = new Date(Date.UTC(2026, 8, 23, 19, 34, 5));
      expect(backupDirectoryFor(root, now)).toBe('docs/.joycraft/local/replaced/20260923-193405');
      mkdirSync(join(root, 'docs/.joycraft/local/replaced/20260923-193405'), { recursive: true });
      expect(backupDirectoryFor(root, now)).toBe('docs/.joycraft/local/replaced/20260923-193405-2');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lets the transaction write under replaced/ but nowhere else in local state', () => {
    const root = mkdtempSync(join(tmpdir(), 'joycraft-backup-control-'));
    try {
      const empty: InstallationManifest = { schemaVersion: 1, targetVersion: '1.0.0', bundleIntegrity: '', harnesses: ['claude'], profile: 'shared', files: {} };
      const planFor = (path: string) => createUpdatePlan({
        snapshot: { files: {} },
        manifest: empty,
        inventory: [{ path, harness: 'claude', kind: 'vendor', ownership: 'managed', active: true, installable: true, content: 'x\n' }],
        options: { baseManifestDigest: null },
      });
      for (const blocked of ['docs/.joycraft/local/update.lock', 'docs/.joycraft/local/backups/a.bin', 'docs/.joycraft/local/last-successful.json', 'docs/.joycraft/local/manifest.json']) {
        expect(() => applyUpdatePlan(root, planFor(blocked)), blocked).toThrow(/transaction state/);
      }
      const allowed = applyUpdatePlan(root, planFor('docs/.joycraft/local/replaced/20260923-000000/a.bak'));
      expect(allowed.status).toBe('applied');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
