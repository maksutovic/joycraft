import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getLevel, readVersion, writeVersion, hashContent, STATE_PATH } from '../src/version';

describe('getLevel', () => {
  let dir: string;

  function setup(options: { autofix?: boolean; claudeMdContent?: string } = {}) {
    dir = mkdtempSync(join(tmpdir(), 'joycraft-level-'));
    if (options.autofix) {
      const wfDir = join(dir, '.github', 'workflows');
      mkdirSync(wfDir, { recursive: true });
      writeFileSync(join(wfDir, 'autofix.yml'), 'name: autofix');
    }
    if (options.claudeMdContent !== undefined) {
      writeFileSync(join(dir, 'CLAUDE.md'), options.claudeMdContent);
    }
  }

  function cleanup() {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }

  it('returns 5 when autofix.yml exists and CLAUDE.md has External Validation', () => {
    setup({ autofix: true, claudeMdContent: '# Project\n\n## External Validation\n\nHoldout tests.' });
    expect(getLevel(dir)).toBe(5);
    cleanup();
  });

  it('returns 4 when autofix.yml is missing', () => {
    setup({ claudeMdContent: '# Project\n\n## External Validation\n\nHoldout tests.' });
    expect(getLevel(dir)).toBe(4);
    cleanup();
  });

  it('returns 4 when CLAUDE.md lacks External Validation section', () => {
    setup({ autofix: true, claudeMdContent: '# Project\n\nNo validation here.' });
    expect(getLevel(dir)).toBe(4);
    cleanup();
  });

  it('returns 4 when CLAUDE.md does not exist', () => {
    setup({ autofix: true });
    expect(getLevel(dir)).toBe(4);
    cleanup();
  });
});

describe('version state location', () => {
  let dir: string;

  function fresh(): string {
    dir = mkdtempSync(join(tmpdir(), 'joycraft-state-'));
    return dir;
  }

  function cleanup() {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }

  it('STATE_PATH is the hidden nested location, not the repo root', () => {
    expect(STATE_PATH).toBe(join('.claude', '.joycraft', 'state.json'));
  });

  it('writeVersion writes to .claude/.joycraft/state.json and never the root', () => {
    fresh();
    writeVersion(dir, '1.0.0', { 'a.md': hashContent('hello') });

    expect(existsSync(join(dir, '.claude', '.joycraft', 'state.json'))).toBe(true);
    expect(existsSync(join(dir, '.joycraft-version'))).toBe(false);
    cleanup();
  });

  it('writeVersion lazy-creates the nested directory', () => {
    fresh();
    // No .claude/ exists yet — write must create the whole chain.
    expect(existsSync(join(dir, '.claude'))).toBe(false);
    writeVersion(dir, '1.0.0', { 'a.md': hashContent('hello') });
    expect(existsSync(join(dir, '.claude', '.joycraft', 'state.json'))).toBe(true);
    cleanup();
  });

  it('readVersion round-trips what writeVersion wrote at the new path', () => {
    fresh();
    const files = { 'a.md': hashContent('hello'), 'b.md': hashContent('world') };
    writeVersion(dir, '2.3.4', files);

    const info = readVersion(dir);
    expect(info).not.toBeNull();
    expect(info!.version).toBe('2.3.4');
    // Stored hashes are truncated to 16 chars on the way out.
    expect(info!.files['a.md']).toBe(hashContent('hello').slice(0, 16));
    expect(info!.files['b.md']).toBe(hashContent('world').slice(0, 16));
    cleanup();
  });

  it('returns null when no state file exists at the new path', () => {
    fresh();
    expect(readVersion(dir)).toBeNull();
    cleanup();
  });

  it('stores per-file hashes truncated to 16 hex chars', () => {
    fresh();
    writeVersion(dir, '1.0.0', {
      'a.md': hashContent('alpha'),
      'b.md': hashContent('beta'),
    });
    const info = readVersion(dir)!;
    for (const h of Object.values(info.files)) {
      expect(h).toHaveLength(16);
      expect(h).toMatch(/^[0-9a-f]{16}$/);
    }
    cleanup();
  });
});
