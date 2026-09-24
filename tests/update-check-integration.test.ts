import { expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    // A vendor change over the local edit installs the new version and backs up the edit.
    const replaced = await refresh('3.0.0', 'vendor changed\n');
    expect(replaced.exitCode).toBe(0);
    expect(readFileSync(join(root, path), 'utf8')).toBe('vendor changed\n');
    expect(readFileSync(join(root, replaced.replaced![0].backup), 'utf8')).toBe('my customization\n');
    expect((await check()).status).toBe('available');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
