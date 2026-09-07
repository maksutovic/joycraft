import { expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { update } from '../src/update.js';
import { checkForUpdate } from '../src/update-check.js';
import type { BundleInventoryEntry } from '../src/bundle-inventory.js';

it('distinguishes preserved local edits from pending vendor changes across actual updates', async () => {
  const root = mkdtempSync(join(tmpdir(), 'joycraft-check-integration-'));
  const path = '.agents/skills/joycraft-fixture/SKILL.md';
  const inventory = (content: string): BundleInventoryEntry[] => [{
    path, harness: 'codex', kind: 'vendor', ownership: 'managed', active: true, installable: true, content,
  }];
  const refresh = (version: string, content: string, replaceCustomized?: string[]) => update(root, {
    harnesses: ['codex'], nonInteractive: true, replaceCustomized,
    bundle: { version, inventory: inventory(content) },
  });
  const check = () => checkForUpdate(root, { fetchLatest: async () => ({ version: '9.0.0' }) });
  try {
    expect((await refresh('1.0.0', 'vendor original\n')).exitCode).toBe(0);
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), 'my customization\n');
    expect((await refresh('2.0.0', 'vendor original\n')).exitCode).toBe(0);
    expect((await check()).status).toBe('available');
    expect((await refresh('3.0.0', 'vendor changed\n')).exitCode).toBe(2);
    expect(await check()).toEqual(expect.objectContaining({ status: 'pending-conflicts', conflicts: [path] }));
    expect((await refresh('3.0.0', 'vendor changed\n', [path])).exitCode).toBe(0);
    expect((await check()).status).toBe('available');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
