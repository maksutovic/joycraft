import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getLevel } from '../src/version';

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
