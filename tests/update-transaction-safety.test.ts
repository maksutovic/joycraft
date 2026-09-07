import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';
import { createUpdatePlan } from '../src/update-plan';
import { applyUpdatePlan, recoverInterruptedUpdate, rollbackLastSuccessfulUpdate, type TransactionPhase } from '../src/update-transaction';
import { manifestPath, normalizedVendorHash, type InstallationManifest } from '../src/install-manifest';
import type { BundleInventoryEntry } from '../src/bundle-inventory';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, renameSync: vi.fn(actual.renameSync) };
});

const managedPath = '.agents/skills/joycraft-test/SKILL.md';
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(present = true) {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-transaction-safety-'));
  roots.push(root);
  mkdirSync(join(root, '.agents/skills/joycraft-test'), { recursive: true });
  mkdirSync(join(root, 'docs/.joycraft'), { recursive: true });
  const old = 'old vendor\n';
  if (present) writeFileSync(join(root, managedPath), old);
  const manifest: InstallationManifest = {
    schemaVersion: 1, targetVersion: '1.0.0', bundleIntegrity: '', harnesses: ['codex'], profile: 'shared',
    files: { [managedPath]: { vendorVersion: '1.0.0', vendorHash: normalizedVendorHash(old), kind: 'vendor', ownership: 'verified' } },
  };
  const manifestBytes = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(join(root, manifestPath()), manifestBytes);
  const inventory: BundleInventoryEntry[] = [{ path: managedPath, harness: 'codex', kind: 'vendor', ownership: 'managed', active: true, installable: true, content: 'new vendor\n' }];
  return { root, old, manifest, manifestBytes, inventory };
}

describe('transaction safety with production plans', () => {
  it('rejects a raw file edit made after planning without publishing newer metadata', () => {
    const { root, old, manifest, manifestBytes, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    writeFileSync(join(root, managedPath), 'user intervened\n');
    const result = applyUpdatePlan(root, plan);
    expect(result.status).toBe('conflict');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe('user intervened\n');
    expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(manifestBytes);
  });

  it('rejects a plan based on an older manifest even when file bytes are unchanged', () => {
    const { root, old, manifest, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    const newer = JSON.stringify({ ...manifest, targetVersion: '1.0.1' }, null, 2) + '\n';
    writeFileSync(join(root, manifestPath()), newer);
    expect(applyUpdatePlan(root, plan).status).toBe('conflict');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(old);
    expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(newer);
  });

  it.each(['files-applied', 'manifest-renamed'] as const)('recovers a same-version repair interrupted at %s', (failureAt) => {
    const { root, old, manifest, manifestBytes, inventory } = fixture(false);
    inventory[0].content = old;
    const plan = createUpdatePlan({ snapshot: { files: {} }, manifest, inventory, options: { repair: [managedPath] } });
    expect(plan.nextManifest).toEqual(manifest);
    expect(() => applyUpdatePlan(root, plan, { failureAt })).toThrow();
    const result = recoverInterruptedUpdate(root);
    if (failureAt === 'files-applied') {
      expect(result.status).toBe('rolled-back');
      expect(existsSync(join(root, managedPath))).toBe(false);
      expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(manifestBytes);
    } else {
      expect(result.status).toBe('committed');
      expect(readFileSync(join(root, managedPath), 'utf8')).toBe(old);
      expect(readFileSync(join(root, manifestPath()), 'utf8')).not.toBe(manifestBytes);
    }
  });

  it('preserves a future-schema manifest and the working files', () => {
    const { root, old, manifest, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    const future = JSON.stringify({ ...manifest, schemaVersion: 100 });
    writeFileSync(join(root, manifestPath()), future);
    const result = applyUpdatePlan(root, plan);
    expect(['applied', 'committed', 'rolled-back']).not.toContain(result.status);
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(old);
    expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(future);
  });

  it('does not bless changed bytes during a metadata-only reconciliation', () => {
    const { root, old, manifest, manifestBytes, inventory } = fixture();
    inventory[0].content = old;
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory, options: { targetVersion: '1.0.1' } });
    expect(plan.actions[0].kind).toBe('reconcile');
    writeFileSync(join(root, managedPath), 'new local customization\n');
    expect(applyUpdatePlan(root, plan).status).toBe('conflict');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe('new local customization\n');
    expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(manifestBytes);
  });

  it('preserves a file that appeared after a new-file plan was created', () => {
    const { root, manifest, inventory } = fixture(false);
    manifest.files = {};
    writeFileSync(join(root, manifestPath()), JSON.stringify(manifest, null, 2) + '\n');
    const plan = createUpdatePlan({ snapshot: { files: {} }, manifest, inventory });
    expect(plan.actions[0].kind).toBe('create');
    writeFileSync(join(root, managedPath), 'new user file\n');
    expect(applyUpdatePlan(root, plan).status).toBe('conflict');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe('new user file\n');
  });

  it('requires recovery before another apply can replace its journal', () => {
    const { root, old, manifest, inventory } = fixture();
    const first = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    expect(() => applyUpdatePlan(root, first, { failureAt: 'files-applied' })).toThrow();
    const journalPath = join(root, 'docs/.joycraft/local/update-journal.json');
    const journal = readFileSync(journalPath, 'utf8');
    const next = createUpdatePlan({ snapshot: { files: { [managedPath]: inventory[0].content! } }, manifest, inventory });
    expect(applyUpdatePlan(root, next).status).toBe('attention');
    expect(readFileSync(journalPath, 'utf8')).toBe(journal);
  });

  it('leaves a true no-op manifest and backup history unchanged', () => {
    const { root, old, manifest, manifestBytes, inventory } = fixture();
    inventory[0].content = old;
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    expect(applyUpdatePlan(root, plan).status).toBe('noop');
    expect(readFileSync(join(root, manifestPath()), 'utf8')).toBe(manifestBytes);
    expect(existsSync(join(root, 'docs/.joycraft/local/last-successful.json'))).toBe(false);
  });

  it('refuses committed-state cleanup if a file no longer matches the committed bytes', () => {
    const { root, old, manifest, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    expect(() => applyUpdatePlan(root, plan, { failureAt: 'manifest-renamed' })).toThrow();
    writeFileSync(join(root, managedPath), old);
    expect(recoverInterruptedUpdate(root).status).toBe('conflict');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(old);
    expect(existsSync(join(root, 'docs/.joycraft/local/update-journal.json'))).toBe(true);
  });

  it('refuses corrupted preimage bytes instead of restoring them over a managed file', () => {
    const { root, old, manifest, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    expect(() => applyUpdatePlan(root, plan, { failureAt: 'files-applied' })).toThrow();
    const journalPath = join(root, 'docs/.joycraft/local/update-journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
    journal.operations[0].before.bytes.data = Buffer.from('corrupt preimage\n').toString('base64');
    writeFileSync(journalPath, JSON.stringify(journal));
    expect(recoverInterruptedUpdate(root).status).toBe('attention');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(inventory[0].content);
    expect(existsSync(journalPath)).toBe(true);
  });

  it('retains rollback capability when recovery completes post-commit bookkeeping', () => {
    const { root, old, manifest, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    expect(() => applyUpdatePlan(root, plan, { failureAt: 'manifest-renamed' })).toThrow();
    expect(recoverInterruptedUpdate(root).status).toBe('committed');
    expect(rollbackLastSuccessfulUpdate(root).status).toBe('rolled-back');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(old);
  });

  it('replaces the prior rollback pointer when a later commit is recovered', () => {
    const { root, old, manifest, inventory } = fixture();
    applyUpdatePlan(root, createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory }));
    const firstContent = inventory[0].content!;
    const firstManifest = JSON.parse(readFileSync(join(root, manifestPath()), 'utf8')) as InstallationManifest;
    inventory[0].content = 'third vendor\n';
    const next = createUpdatePlan({ snapshot: { files: { [managedPath]: firstContent } }, manifest: firstManifest, inventory });
    expect(() => applyUpdatePlan(root, next, { failureAt: 'manifest-renamed' })).toThrow();
    expect(recoverInterruptedUpdate(root).status).toBe('committed');
    expect(rollbackLastSuccessfulUpdate(root).status).toBe('rolled-back');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(firstContent);
  });

  it('creates nested target parents as part of staging a new managed artifact', () => {
    const { root, manifest, inventory } = fixture();
    const nested = '.agents/skills/joycraft-new/deep/SKILL.md';
    manifest.files = {};
    writeFileSync(join(root, manifestPath()), JSON.stringify(manifest, null, 2) + '\n');
    inventory[0].path = nested;
    const plan = createUpdatePlan({ snapshot: { files: {} }, manifest, inventory });
    expect(applyUpdatePlan(root, plan).status).toBe('applied');
    expect(readFileSync(join(root, nested), 'utf8')).toBe(inventory[0].content);
  });

  it('applies an explicit missing-authority plan for a first installation', () => {
    const { root, manifest, inventory } = fixture(false);
    manifest.files = {};
    rmSync(join(root, manifestPath()));
    const plan = createUpdatePlan({ snapshot: { files: {} }, manifest, inventory });
    plan.baseManifestDigest = null;
    expect(applyUpdatePlan(root, plan).status).toBe('applied');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(inventory[0].content);
    expect(rollbackLastSuccessfulUpdate(root).status).toBe('rolled-back');
    expect(existsSync(join(root, managedPath))).toBe(false);
    expect(existsSync(join(root, manifestPath()))).toBe(false);
  });

  it('recovers the first file if the filesystem rejects the second replacement', () => {
    const { root, old, manifest, inventory } = fixture();
    const secondPath = '.agents/skills/joycraft-test/second.md';
    writeFileSync(join(root, secondPath), old);
    manifest.files[secondPath] = { ...manifest.files[managedPath] };
    writeFileSync(join(root, manifestPath()), JSON.stringify(manifest, null, 2) + '\n');
    inventory.push({ ...inventory[0], path: secondPath });
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old, [secondPath]: old } }, manifest, inventory });
    const originalRename = fs.renameSync;
    const failure = vi.mocked(renameSync).mockImplementation((from, to) => {
      if (String(to).replaceAll('\\', '/').endsWith(secondPath)) {
        throw Object.assign(new Error('simulated filesystem failure'), { code: 'EIO' });
      }
      originalRename(from, to);
    });
    try {
      expect(() => applyUpdatePlan(root, plan)).toThrow('simulated filesystem failure');
    } finally {
      failure.mockImplementation(originalRename);
    }
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(inventory[0].content);
    expect(readFileSync(join(root, secondPath), 'utf8')).toBe(old);
    expect(recoverInterruptedUpdate(root).status).toBe('rolled-back');
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(old);
    expect(readFileSync(join(root, secondPath), 'utf8')).toBe(old);
  });

  it('keeps a live process lock and reclaims its matching journal lock only after the owner exits', async () => {
    const { root, old, manifest, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    expect(() => applyUpdatePlan(root, plan, { failureAt: 'files-applied' })).toThrow();
    const journal = JSON.parse(readFileSync(join(root, 'docs/.joycraft/local/update-journal.json'), 'utf8'));
    const child = spawn(process.execPath, ['-e', "setInterval(() => {}, 1000); process.send('ready');"], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    const stop = async (processToStop: ChildProcess) => {
      if (processToStop.exitCode !== null || processToStop.signalCode !== null) return;
      await new Promise<void>((resolve) => {
        processToStop.once('exit', () => resolve());
        processToStop.kill();
      });
    };
    try {
      await new Promise<void>((resolve, reject) => { child.once('message', () => resolve()); child.once('error', reject); });
      const lock = join(root, 'docs/.joycraft/local/update.lock');
      mkdirSync(lock);
      const owner = JSON.stringify({ operationId: journal.operationId, pid: child.pid, startedAt: new Date().toISOString() });
      writeFileSync(join(lock, 'owner.json'), owner);
      expect(recoverInterruptedUpdate(root).status).toBe('attention');
      expect(readFileSync(join(lock, 'owner.json'), 'utf8')).toBe(owner);
      await stop(child);
      expect(recoverInterruptedUpdate(root).status).toBe('rolled-back');
      expect(readFileSync(join(root, managedPath), 'utf8')).toBe(old);
      expect(existsSync(lock)).toBe(false);
    } finally {
      await stop(child);
    }
  });

  it.each<TransactionPhase>([
    'lock-acquired', 'journal-written', 'backups-written', 'staged', 'files-applied',
    'files-verified', 'manifest-renamed', 'journal-bookkept', 'cleanup', 'complete',
  ])('recovers consistent bytes after an interruption at %s', (failureAt) => {
    const { root, old, manifest, inventory } = fixture();
    const plan = createUpdatePlan({ snapshot: { files: { [managedPath]: old } }, manifest, inventory });
    expect(() => applyUpdatePlan(root, plan, { failureAt })).toThrow();
    const committed = JSON.parse(readFileSync(join(root, manifestPath()), 'utf8')).files[managedPath].vendorHash === normalizedVendorHash(inventory[0].content!);
    const recovered = recoverInterruptedUpdate(root);
    expect(['failed', 'attention', 'conflict']).not.toContain(recovered.status);
    expect(readFileSync(join(root, managedPath), 'utf8')).toBe(committed ? inventory[0].content : old);
    expect(existsSync(join(root, 'docs/.joycraft/local/update-journal.json'))).toBe(false);
  });
});
