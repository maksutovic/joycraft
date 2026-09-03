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

describe('backlog pointer in CLAUDE.md', () => {
  it('generated CLAUDE.md points at docs/backlog/ for deferred work', () => {
    const content = generateCLAUDEMd('test-project', stack);
    expect(content).toContain('docs/backlog/');
  });
});

describe('private setup note in CLAUDE.md', () => {
  it('states init is non-destructive and only creates missing files', () => {
    const content = generateCLAUDEMd('test-project', stack, [], { privateProfile: true });
    expect(content).toContain('After cloning, run');
    expect(content).toContain('only creates missing files');
    expect(content).toContain('--force');
    expect(content).toContain('untouched');
  });

  it('is omitted under the shared profile', () => {
    const content = generateCLAUDEMd('test-project', stack, [], { privateProfile: false });
    expect(content).not.toContain('After cloning, run');
  });

  it('is appended idempotently on improve (one note, marker preserved)', () => {
    const initial = generateCLAUDEMd('test', stack, [], { privateProfile: true });
    const improved = improveCLAUDEMd(initial, stack, [], { privateProfile: true });
    const matches = improved.match(/After cloning, run/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

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

describe('product identity section in CLAUDE.md', () => {
  const identity = {
    values: ['Ship small, dated changes'],
    glossary: { Harness: 'The set of always-injected instruction files' },
    taste: ['Prose over ceremony'],
  };

  it('appends one ## Product Identity section with all three subsections when content is supplied', () => {
    const base = generateCLAUDEMd('test-project', stack);
    const result = improveCLAUDEMd(base, stack, [], { identity });

    const headers = result.match(/^## Product Identity\b/gm) ?? [];
    expect(headers.length).toBe(1);
    expect(result).toContain('### Values');
    expect(result).toContain('### Glossary');
    expect(result).toContain('### Taste');
    expect(result).toContain('Ship small, dated changes');
    expect(result).toContain('Harness');
    expect(result).toContain('Prose over ceremony');
  });

  it('stamps the section with a date and a review pointer', () => {
    const base = generateCLAUDEMd('test-project', stack);
    const result = improveCLAUDEMd(base, stack, [], { identity });
    expect(result).toMatch(/_Added \d{4}-\d{2}-\d{2} — review at next optimize run_/);
  });

  it('emits only the subsections that have content', () => {
    const base = generateCLAUDEMd('test-project', stack);
    const result = improveCLAUDEMd(base, stack, [], {
      identity: { glossary: { Harness: 'always-injected instruction files' } },
    });
    expect(result).toContain('## Product Identity');
    expect(result).toContain('### Glossary');
    expect(result).not.toContain('### Values');
    expect(result).not.toContain('### Taste');
  });

  it('does not append when a header already matches the product identity regex', () => {
    const base = generateCLAUDEMd('test-project', stack) + '\n## Our Product Identity\n\nmine\n';
    const result = improveCLAUDEMd(base, stack, [], { identity });
    const headers = result.match(/^##.*Product Identity\b/gm) ?? [];
    expect(headers.length).toBe(1);
    expect(result).toContain('## Our Product Identity');
    expect(result).not.toContain('### Values');
  });

  it('emits nothing — no section, no TODO — when no identity content is supplied', () => {
    const base = generateCLAUDEMd('test-project', stack);
    const result = improveCLAUDEMd(base, stack, []);
    expect(result).not.toContain('Product Identity');
    expect(result).not.toMatch(/TODO.*[Ii]dentity/);
    expect(generateCLAUDEMd('test-project', stack)).not.toContain('Product Identity');
  });

  it('treats empty strings and empty arrays as no content', () => {
    const base = generateCLAUDEMd('test-project', stack);
    const result = improveCLAUDEMd(base, stack, [], {
      identity: { values: ['', '  '], glossary: {}, taste: [] },
    });
    expect(result).not.toContain('Product Identity');
  });
});
