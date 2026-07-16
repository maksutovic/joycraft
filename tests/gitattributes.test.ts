import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { init } from '../src/init';
import { upgrade } from '../src/upgrade';
import {
  applyGitattributes,
  GITATTRIBUTES_ENTRIES,
  GITATTRIBUTES_COMMENT,
} from '../src/gitattributes';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-gitattributes-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readGitattributes(dir: string): string {
  const p = join(dir, '.gitattributes');
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

function lines(content: string): string[] {
  return content.split('\n').map((l) => l.trim()).filter(Boolean);
}

describe('gitattributes', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
    // Stub the npm-registry staleness check so upgrade() never hits the network
    // and never bails because a newer version is published.
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.0.0' }),
    }) as unknown as typeof fetch;
    return () => {
      globalThis.fetch = origFetch;
      rmSync(tmpDir, { recursive: true, force: true });
    };
  });

  describe('applyGitattributes', () => {
    it('creates .gitattributes with the comment and all entries when absent', () => {
      const added = applyGitattributes(tmpDir);

      expect(added).toEqual(GITATTRIBUTES_ENTRIES);
      const content = lines(readGitattributes(tmpDir));
      expect(content[0]).toBe(GITATTRIBUTES_COMMENT);
      for (const entry of GITATTRIBUTES_ENTRIES) {
        expect(content).toContain(entry);
      }
    });

    it('is idempotent — a second run adds nothing and leaves the file byte-identical', () => {
      applyGitattributes(tmpDir);
      const before = readGitattributes(tmpDir);

      const added = applyGitattributes(tmpDir);

      expect(added).toEqual([]);
      expect(readGitattributes(tmpDir)).toBe(before);
    });

    it('appends to an existing .gitattributes without touching user lines', () => {
      writeFileSync(join(tmpDir, '.gitattributes'), '*.png binary\n*.pdf diff=astextplain\n');

      applyGitattributes(tmpDir);

      const content = readGitattributes(tmpDir);
      expect(content.startsWith('*.png binary\n*.pdf diff=astextplain\n')).toBe(true);
      for (const entry of GITATTRIBUTES_ENTRIES) {
        expect(lines(content)).toContain(entry);
      }
    });

    it('tolerates a file with no trailing newline', () => {
      writeFileSync(join(tmpDir, '.gitattributes'), '*.png binary');

      applyGitattributes(tmpDir);

      const content = lines(readGitattributes(tmpDir));
      expect(content[0]).toBe('*.png binary');
      expect(content).toContain(GITATTRIBUTES_ENTRIES[0]);
    });

    it('adds only missing entries and never duplicates present ones', () => {
      writeFileSync(
        join(tmpDir, '.gitattributes'),
        `${GITATTRIBUTES_COMMENT}\n${GITATTRIBUTES_ENTRIES[0]}\n`
      );

      const added = applyGitattributes(tmpDir);

      expect(added).toEqual(GITATTRIBUTES_ENTRIES.slice(1));
      const content = lines(readGitattributes(tmpDir));
      const first = content.filter((l) => l === GITATTRIBUTES_ENTRIES[0]);
      expect(first).toHaveLength(1);
      expect(content.filter((l) => l === GITATTRIBUTES_COMMENT)).toHaveLength(1);
    });

    it('does not mark durable-knowledge paths as generated', () => {
      applyGitattributes(tmpDir);

      const content = readGitattributes(tmpDir);
      expect(content).not.toContain('docs/context');
      expect(content).not.toContain('docs/backlog');
      expect(content).not.toContain('CLAUDE.md');
      expect(content).not.toContain('AGENTS.md');
    });
  });

  describe('init integration', () => {
    it('init writes the .gitattributes entries', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });

      const content = lines(readGitattributes(tmpDir));
      for (const entry of GITATTRIBUTES_ENTRIES) {
        expect(content).toContain(entry);
      }
    });

    it('repeated init never duplicates entries', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      await init(tmpDir, { force: false, gitignore: 'shared' });

      const content = lines(readGitattributes(tmpDir));
      for (const entry of GITATTRIBUTES_ENTRIES) {
        expect(content.filter((l) => l === entry)).toHaveLength(1);
      }
    });
  });

  describe('upgrade integration', () => {
    it('upgrade backfills .gitattributes on a project inited before the feature', async () => {
      await init(tmpDir, { force: false, gitignore: 'shared' });
      rmSync(join(tmpDir, '.gitattributes'));

      await upgrade(tmpDir, { yes: true });

      const content = lines(readGitattributes(tmpDir));
      for (const entry of GITATTRIBUTES_ENTRIES) {
        expect(content).toContain(entry);
      }
    });
  });
});
