import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateCLAUDEMd, improveCLAUDEMd } from '../src/improve-claude-md';
import type { StackInfo } from '../src/detect';

function tmp(): string {
  const d = join(tmpdir(), `joycraft-improve-claude-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(d, { recursive: true });
  return d;
}

const stack: StackInfo = {
  language: 'unknown',
  packageManager: 'unknown',
  commands: {},
};

describe('areas pointer in CLAUDE.md', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmp();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits areas pointer when docs/areas/ exists', () => {
    mkdirSync(join(dir, 'docs', 'areas', 'auth'), { recursive: true });
    const content = generateCLAUDEMd('test-project', stack, [], { projectDir: dir });
    expect(content).toContain('## Areas');
    expect(content).toContain('docs/areas/');
  });

  it('omits areas pointer when docs/areas/ does not exist', () => {
    const content = generateCLAUDEMd('test-project', stack, [], { projectDir: dir });
    expect(content).not.toContain('## Areas');
  });

  it('areas pointer is idempotent on improve', () => {
    mkdirSync(join(dir, 'docs', 'areas', 'auth'), { recursive: true });
    const initial = generateCLAUDEMd('test', stack, [], { projectDir: dir });
    expect(existsSync(join(dir, 'docs', 'areas', 'auth'))).toBe(true);
    const improved = improveCLAUDEMd(initial, stack, [], { projectDir: dir });
    // Count "## Areas" occurrences — must be exactly 1
    const matches = improved.match(/^## Areas\b/gm) ?? [];
    expect(matches.length).toBe(1);
  });
});
