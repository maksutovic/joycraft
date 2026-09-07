import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getBundleInventory } from '../src/bundle-inventory';
import { update, updateStatusExitCode } from '../src/update';
import { manifestPath } from '../src/install-manifest';

function project(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-update-cli-'));
}

describe('unified update command', () => {
  it('requires explicit harness selection for a fresh unattended update', async () => {
    const root = project();
    try {
      const result = await update(root, { nonInteractive: true });
      expect(result.status).toBe('invalid');
      expect(result.diagnostics.join(' ')).toMatch(/harness/i);
      expect(updateStatusExitCode(result.status)).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('applies an explicitly selected local executing bundle without a registry request', async () => {
    const root = project();
    try {
      const target = 'hello from the executing bundle\n';
      const entry = getBundleInventory(['codex']).find((candidate) => candidate.path.endsWith('joycraft-tune/SKILL.md'))!;
      const result = await update(root, {
        nonInteractive: true,
        harnesses: ['codex'],
        bundle: { version: '9.9.9', integrity: '', inventory: [{ ...entry, content: target }] },
      });
      expect(result.status).toBe('applied');
      expect(result.applied).toContain(entry.path);
      expect(readFileSync(join(root, entry.path), 'utf8')).toBe(target);
      expect(readFileSync(join(root, manifestPath('shared')), 'utf8')).toContain('9.9.9');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('preserves customized files in safe unattended mode and exposes conflicts separately', async () => {
    const root = project();
    try {
      const entry = getBundleInventory(['codex']).find((candidate) => candidate.path.endsWith('joycraft-tune/SKILL.md'))!;
      mkdirSync(join(root, '.agents', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(root, entry.path), 'local edit\n');
      const first = await update(root, {
        nonInteractive: true,
        harnesses: ['codex'],
        bundle: { version: '1.0.0', integrity: '', inventory: [{ ...entry, content: 'base\n' }] },
      });
      expect(first.status).toBe('conflict');
      expect(first.conflicts).toContain(entry.path);
      expect(first.preserved).toContain(entry.path);
      expect(updateStatusExitCode(first.status)).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('moves shared manifest authority into a private profile transaction', async () => {
    const root = project();
    try {
      const entry = getBundleInventory(['codex']).find((candidate) => candidate.path.endsWith('joycraft-tune/SKILL.md'))!;
      const bundle = { version: '1.0.0', integrity: '', inventory: [{ ...entry, content: 'base\n' }] };
      expect((await update(root, { nonInteractive: true, harnesses: ['codex'], bundle })).status).toBe('applied');
      const switched = await update(root, { nonInteractive: true, gitignore: 'private', bundle });
      expect(switched.status).toBe('applied');
      expect(readFileSync(join(root, manifestPath('private')), 'utf8')).toContain('"profile": "private"');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
