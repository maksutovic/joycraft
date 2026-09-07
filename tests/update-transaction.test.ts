import { describe, expect, it, vi } from 'vitest';

const flushAccess = vi.hoisted(() => ({ enforce: false, flags: new Map<number, unknown>() }));
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>();
  return { ...fs,
    openSync: (...args: Parameters<typeof fs.openSync>) => {
      const fd = fs.openSync(...args);
      flushAccess.flags.set(fd, args[1]);
      return fd;
    },
    fsyncSync: (fd: number) => {
      if (flushAccess.enforce && flushAccess.flags.get(fd) === 'r') {
        throw Object.assign(new Error('EPERM: fsync requires a writable Windows handle'), { code: 'EPERM' });
      }
      return fs.fsyncSync(fd);
    },
  };
});
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  applyUpdatePlan,
  recoverInterruptedUpdate,
  rollbackLastSuccessfulUpdate,
  type TransactionPhase,
} from '../src/update-transaction';
import { manifestPath, normalizedVendorHash, rawFileHash, type InstallationManifest } from '../src/install-manifest';
import type { UpdatePlan } from '../src/update-plan';

const filePath = '.claude/skills/joycraft-demo/SKILL.md';

function project(): string {
  return mkdtempSync(join(tmpdir(), 'joycraft-update-transaction-'));
}

function manifest(content: string, marker?: string): InstallationManifest {
  return {
    schemaVersion: 1,
    targetVersion: '1.0.0',
    bundleIntegrity: '',
    harnesses: ['claude'],
    profile: 'shared',
    files: {
      [filePath]: {
        vendorVersion: '1.0.0',
        vendorHash: normalizedVendorHash(content),
        kind: 'vendor',
        ownership: 'verified',
      },
    },
    ...(marker ? { __joycraftTransactionId: marker } : {}),
  };
}

function plan(oldContent: string, nextContent: string, kind: 'replace' | 'adopt' = 'replace'): UpdatePlan {
  const action = {
    path: filePath,
    kind,
    selected: true,
    reason: 'test',
    ...(kind === 'adopt' ? { content: nextContent } : { content: nextContent }),
    ...(kind === 'replace' ? { rawPrecondition: rawFileHash(oldContent), rawTargetHash: rawFileHash(nextContent) } : {}),
    currentPresent: true,
    targetPresent: true,
  } as UpdatePlan['actions'][number];
  return {
    actions: [action],
    preserved: [],
    conflicts: [],
    diagnostics: [],
    nextManifest: manifest(nextContent),
  };
}

function seed(root: string, oldContent = 'old\n'): void {
  mkdirSync(join(root, '.claude', 'skills', 'joycraft-demo'), { recursive: true });
  writeFileSync(join(root, filePath), oldContent);
  mkdirSync(join(root, 'docs', '.joycraft'), { recursive: true });
  writeFileSync(join(root, manifestPath('shared')), JSON.stringify(manifest(oldContent), null, 2) + '\n');
}

describe('update transactions', () => {
  it('commits when flushing requires write access as on Windows', () => {
    const root = project();
    try {
      seed(root);
      flushAccess.enforce = true;
      const result = applyUpdatePlan(root, plan('old\n', 'new\n'));
      expect(result.status).toBe('applied');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('new\n');
    } finally {
      flushAccess.enforce = false;
      flushAccess.flags.clear();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('applies reviewed writes and publishes the manifest after file verification', () => {
    const root = project();
    try {
      seed(root);
      const phases: TransactionPhase[] = [];
      const result = applyUpdatePlan(root, plan('old\n', 'new\n'), { onPhase: (phase) => phases.push(phase) });
      expect(result.status).toBe('applied');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('new\n');
      expect(JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8')).files[filePath].vendorHash)
        .toBe(normalizedVendorHash('new\n'));
      expect(phases.indexOf('files-verified')).toBeLessThan(phases.indexOf('manifest-renamed'));
      expect(existsSync(join(root, 'docs', '.joycraft', 'local', 'update.lock'))).toBe(false);
      expect(existsSync(join(root, 'docs', '.joycraft', 'local', 'last-successful.json'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps lossless preimages and recovers a crash before manifest publication', () => {
    const root = project();
    try {
      seed(root);
      expect(() => applyUpdatePlan(root, plan('old\n', 'new\n'), { failureAt: 'files-applied' })).toThrow();
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('new\n');
      const journalPath = join(root, 'docs', '.joycraft', 'local', 'update-journal.json');
      const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
      expect(journal.operations[0].before.bytes.encoding).toBe('base64');
      expect(journal.operations[0].before.bytes.data).toBe(Buffer.from('old\n').toString('base64'));
      const recovered = recoverInterruptedUpdate(root);
      expect(recovered.status).toBe('rolled-back');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('old\n');
      expect(existsSync(journalPath)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses the new manifest marker to recover after the manifest rename', () => {
    const root = project();
    try {
      seed(root);
      expect(() => applyUpdatePlan(root, plan('old\n', 'new\n'), { failureAt: 'manifest-renamed' })).toThrow();
      const before = JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8'));
      expect(before.__joycraftTransactionId).toEqual(expect.any(String));
      const recovered = recoverInterruptedUpdate(root);
      expect(recovered.status).toBe('committed');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('new\n');
      expect(existsSync(join(root, 'docs', '.joycraft', 'local', 'update-journal.json'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not overwrite an intervening edit during recovery', () => {
    const root = project();
    try {
      seed(root);
      expect(() => applyUpdatePlan(root, plan('old\n', 'new\n'), { failureAt: 'files-applied' })).toThrow();
      writeFileSync(join(root, filePath), 'user edit\n');
      const recovered = recoverInterruptedUpdate(root);
      expect(recovered.status).toBe('conflict');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('user edit\n');
      expect(existsSync(join(root, 'docs', '.joycraft', 'local', 'update-journal.json'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('guards explicit rollback and retains the successful backup', () => {
    const root = project();
    try {
      seed(root);
      applyUpdatePlan(root, plan('old\n', 'new\n'));
      writeFileSync(join(root, filePath), 'user edit\n');
      expect(rollbackLastSuccessfulUpdate(root).status).toBe('conflict');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('user edit\n');
      writeFileSync(join(root, filePath), 'new\n');
      expect(rollbackLastSuccessfulUpdate(root).status).toBe('rolled-back');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('old\n');
      expect(existsSync(join(root, 'docs', '.joycraft', 'local', 'last-successful.json'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('leaves an existing competing lock untouched', () => {
    const root = project();
    try {
      seed(root);
      mkdirSync(join(root, 'docs', '.joycraft', 'local', 'update.lock'), { recursive: true });
      writeFileSync(join(root, 'docs', '.joycraft', 'local', 'update.lock', 'owner.json'), 'other');
      const result = applyUpdatePlan(root, plan('old\n', 'new\n'));
      expect(result.status).toBe('attention');
      expect(readFileSync(join(root, 'docs', '.joycraft', 'local', 'update.lock', 'owner.json'), 'utf8')).toBe('other');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not write adopt metadata-only actions even when content is supplied', () => {
    const root = project();
    try {
      seed(root);
      const result = applyUpdatePlan(root, plan('old\n', 'new\n', 'adopt'));
      expect(result.status).toBe('applied');
      expect(readFileSync(join(root, filePath), 'utf8')).toBe('old\n');
      expect(JSON.parse(readFileSync(join(root, manifestPath('shared')), 'utf8')).files[filePath].vendorHash)
        .toBe(normalizedVendorHash('new\n'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
