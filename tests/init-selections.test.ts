import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { init } from '../src/init';
import { update } from '../src/update';
import { readInstallationManifest } from '../src/install-manifest';
import { STATE_PATH } from '../src/version';

function project(): string {
  const root = join(tmpdir(), `joycraft-init-selection-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}

async function withAnswers<T>(answers: string[], run: () => Promise<T>): Promise<T> {
  const stream = Readable.from(answers.map((answer) => `${answer}\n`)) as unknown as NodeJS.ReadStream & { isTTY?: boolean };
  stream.isTTY = true;
  const stdin = Object.getOwnPropertyDescriptor(process, 'stdin')!;
  Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
  try {
    return await run();
  } finally {
    Object.defineProperty(process, 'stdin', stdin);
  }
}

describe('init selection boundary', () => {
  it('captures harness, execution profile, gitignore, and auto-memory in order', async () => {
    const root = project();
    try {
      const result = await withAnswers(
        ['claude', 'y', 'n', 'my-model', 'high', 'private', 'y'],
        () => init(root),
      );

      expect(result.status).toBe('applied');
      expect(result.harnesses).toEqual(['claude']);
      expect(readInstallationManifest(root, 'private')?.harnesses).toEqual(['claude']);
      const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('- claude: Swarms: decompose yes · implement no · model my-model · effort high');
      expect(JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8')).autoMemoryEnabled).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reuses persisted harness and profile choices without asking on an ordinary rerun', async () => {
    const root = project();
    try {
      await init(root, { nonInteractive: true, harnesses: ['codex'], gitignore: 'private' });
      const result = await withAnswers([], () => init(root));

      expect(result.harnesses).toEqual(['codex']);
      expect(result.profile).toBe('private');
      expect(readInstallationManifest(root, 'private')?.harnesses).toEqual(['codex']);
      expect(existsSync(join(root, '.claude'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reuses a legacy state harness and profile selection', async () => {
    const root = project();
    try {
      mkdirSync(join(root, '.agents', 'skills', 'joycraft-tune'), { recursive: true });
      writeFileSync(join(root, '.agents', 'skills', 'joycraft-tune', 'SKILL.md'), 'legacy\n');
      writeFileSync(join(root, '.joycraft-version'), JSON.stringify({
        version: '0.7.0', files: {}, harnesses: ['codex'], gitignoreProfile: 'private',
      }));

      const result = await withAnswers([], () => init(root));

      expect(result.harnesses).toEqual(['codex']);
      expect(result.profile).toBe('private');
      expect(readInstallationManifest(root, 'private')?.harnesses).toEqual(['codex']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns a clean no-op for an explicit empty selection without creating files', async () => {
    const root = project();
    try {
      const result = await init(root, { harnesses: [], nonInteractive: true });

      expect(result.status).toBe('noop');
      expect(result.exitCode).toBe(0);
      expect(result.harnesses).toEqual([]);
      expect(result.diagnostics.join(' ')).toMatch(/No harness selected.*run init again/i);
      expect(existsSync(join(root, 'docs'))).toBe(false);
      expect(existsSync(join(root, 'AGENTS.md'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses the same fresh interactive boundary for canonical update', async () => {
    const root = project();
    try {
      const result = await withAnswers(
        ['codex', '', '', '', '', 'shared'],
        () => update(root),
      );

      expect(result.status).toBe('applied');
      expect(result.harnesses).toEqual(['codex']);
      expect(existsSync(join(root, '.agents', 'skills'))).toBe(true);
      expect(existsSync(join(root, '.claude'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not interview for recovery of a fresh interrupted installation', async () => {
    const root = project();
    try {
      const result = await withAnswers([], () => update(root, { recovery: 'recover' }));
      expect(result.status).toBe('invalid');
      expect(existsSync(join(root, '.agents'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns a preview without mutating a fresh project', async () => {
    const root = project();
    try {
      const result = await update(root, {
        preview: true,
        harnesses: ['codex'],
        gitignore: 'shared',
        executionProfile: { entries: [{ harness: 'codex', swarmDecompose: false, swarmImplement: false, model: 'session default', effort: 'session default' }] },
      });

      expect(result.status).toBe('applied');
      expect(result.plan).toBeDefined();
      expect(existsSync(join(root, 'docs'))).toBe(false);
      expect(existsSync(join(root, '.agents'))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
