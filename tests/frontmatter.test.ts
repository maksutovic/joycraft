import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  emitPersonalFrontmatter,
  emitSharedFrontmatter,
  emitBacklogFrontmatter,
  parseFrontmatter,
  resolveOwner,
} from '../src/frontmatter';

function createTmpDir(): string {
  const dir = join(tmpdir(), `joycraft-frontmatter-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('emitPersonalFrontmatter', () => {
  it('produces full 4-field schema', () => {
    const out = emitPersonalFrontmatter({
      feature: 'auth-redesign',
      createdISO: '2026-05-09',
      status: 'active',
    });
    expect(out.startsWith('---\n')).toBe(true);
    expect(out.endsWith('---\n')).toBe(true);
    expect(out).toContain('status: active');
    expect(out).toContain('created: 2026-05-09');
    expect(out).toContain('feature: auth-redesign');
    expect(out).toContain('owner:');
  });

  it('omits feature when not provided', () => {
    const out = emitPersonalFrontmatter({ createdISO: '2026-05-09', status: 'active' });
    expect(out).not.toContain('feature:');
  });

  it('defaults status to active', () => {
    const out = emitPersonalFrontmatter({ createdISO: '2026-05-09' });
    expect(out).toContain('status: active');
  });

  it('defaults created to today when not provided', () => {
    const out = emitPersonalFrontmatter({});
    const today = new Date().toISOString().slice(0, 10);
    expect(out).toContain(`created: ${today}`);
  });
});

describe('emitSharedFrontmatter', () => {
  it('produces last_updated and last_updated_by', () => {
    const out = emitSharedFrontmatter({ lastUpdatedISO: '2026-05-09' });
    expect(out.startsWith('---\n')).toBe(true);
    expect(out.endsWith('---\n')).toBe(true);
    expect(out).toContain('last_updated: 2026-05-09');
    expect(out).toContain('last_updated_by:');
  });
});

describe('emitBacklogFrontmatter', () => {
  it('produces backlog-specific schema with status default', () => {
    const out = emitBacklogFrontmatter({ createdISO: '2026-05-09' });
    expect(out).toContain('status: backlog');
    expect(out).toContain('created: 2026-05-09');
    expect(out).toContain('owner:');
    expect(out).not.toContain('source:');
  });

  it('includes source when provided', () => {
    const out = emitBacklogFrontmatter({ createdISO: '2026-05-09', source: 'docs/features/x/brief.md' });
    expect(out).toContain('source: docs/features/x/brief.md');
  });
});

describe('parseFrontmatter', () => {
  it('extracts leading YAML block', () => {
    const content = '---\nfoo: bar\nbaz: qux\n---\nbody content here';
    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter).toEqual({ foo: 'bar', baz: 'qux' });
    expect(body).toBe('body content here');
  });

  it('returns null for content without frontmatter', () => {
    const { frontmatter, body } = parseFrontmatter('# heading\n\nbody');
    expect(frontmatter).toBeNull();
    expect(body).toBe('# heading\n\nbody');
  });

  it("doesn't choke on --- later in body", () => {
    const content = '# heading\n\nsome prose\n\n---\n\nmore prose';
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter).toBeNull();
  });

  it('returns null when second --- delimiter is missing', () => {
    const content = '---\nfoo: bar\nno end delimiter\n';
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter).toBeNull();
  });
});

describe('resolveOwner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads from git config when present', async () => {
    const owner = await resolveOwner({
      memoryDir: tmpDir,
      gitConfigName: () => 'Alice Smith',
    });
    expect(owner).toBe('Alice Smith');
  });

  it('falls back to memory file when git config fails', async () => {
    writeFileSync(join(tmpDir, 'joycraft-owner.txt'), 'Bob From Memory', 'utf-8');
    const owner = await resolveOwner({
      memoryDir: tmpDir,
      gitConfigName: () => null,
    });
    expect(owner).toBe('Bob From Memory');
  });

  it('falls back to memory when git config returns empty', async () => {
    writeFileSync(join(tmpDir, 'joycraft-owner.txt'), 'Bob From Memory', 'utf-8');
    const owner = await resolveOwner({
      memoryDir: tmpDir,
      // Empty string after trim treated as null by contract
      gitConfigName: () => null,
    });
    expect(owner).toBe('Bob From Memory');
  });

  it('throws clearly when not interactive and no git/memory', async () => {
    // Force non-TTY
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    try {
      await expect(
        resolveOwner({ memoryDir: tmpDir, gitConfigName: () => null })
      ).rejects.toThrow(/git config user.name|joycraft-owner.txt/);
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
    }
  });
});
