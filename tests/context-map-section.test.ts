import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generateContextMapSection,
  improveCLAUDEMd,
  generateCLAUDEMd,
} from '../src/improve-claude-md';
import { init } from '../src/init';
import type { StackInfo } from '../src/detect';

const STACK: StackInfo = {
  language: 'node',
  framework: undefined,
  packageManager: 'pnpm',
  commands: { build: 'pnpm build', test: 'pnpm test', lint: undefined, typecheck: 'pnpm typecheck' },
} as StackInfo;

function tmp(): string {
  const dir = join(tmpdir(), `joycraft-ctxmap-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function countOccurrences(haystack: string, needle: RegExp): number {
  return (haystack.match(needle) ?? []).length;
}

describe('generateContextMapSection helper', () => {
  it('returns the H2 header, a lean-docs teaching line, and an empty table skeleton', () => {
    const out = generateContextMapSection();
    expect(out).toContain('## Context Map');
    // lean-docs teaching line
    expect(out.toLowerCase()).toMatch(/lean|link out|don.t inline/);
    // table skeleton with the "read it when" column
    expect(out).toMatch(/Read it when/i);
    expect(out).toMatch(/\|\s*-+\s*\|/); // separator row
  });

  it('has no data rows — only the header + separator', () => {
    const out = generateContextMapSection();
    const tableRows = out.split('\n').filter((l: string) => l.trim().startsWith('|'));
    // header row + separator row only
    expect(tableRows.length).toBe(2);
    // no dangling pointer to a fact-doc
    expect(out).not.toContain('docs/context/production-map.md');
  });
});

describe('fresh CLAUDE.md generation includes Context Map', () => {
  it('generateCLAUDEMd output contains the section', () => {
    expect(generateCLAUDEMd('My Project', STACK)).toContain('## Context Map');
  });
});

describe('improveCLAUDEMd merge adds Context Map when absent and is idempotent', () => {
  it('appends the section to a CLAUDE.md that lacks it', () => {
    const input = '# My Project\n\nSome intro.\n';
    const out = improveCLAUDEMd(input, STACK);
    expect(out).toContain('## Context Map');
  });

  it('does not duplicate when the file already has one', () => {
    const input = '# My Project\n\n## Context Map\n\n| Document | Read it when… |\n|----------|---------------|\n';
    const out = improveCLAUDEMd(input, STACK);
    expect(countOccurrences(out, /^##\s+Context Map\b/gim)).toBe(1);
  });

  it('matches a differently-cased existing header (case-insensitive)', () => {
    const input = '# My Project\n\n## context map\n\n| Document | Read it when… |\n|----------|---------------|\n';
    const out = improveCLAUDEMd(input, STACK);
    expect(countOccurrences(out, /^##\s+context\s*map\b/gim)).toBe(1);
  });
});

describe('Getting-Started table leads with /joycraft-setup', () => {
  it('the first command row references /joycraft-setup', () => {
    const out = generateCLAUDEMd('My Project', STACK);
    const rows = out.split('\n').filter((l) => /^\|\s*`\/joycraft-/.test(l));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toContain('/joycraft-setup');
  });
});

describe('init printed next-steps lead with /joycraft-setup', () => {
  let dir: string;
  beforeEach(() => {
    dir = tmp();
  });

  it('the first /joycraft- command in the printed next-steps is /joycraft-setup', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));
    try {
      await init(dir, { force: false });
    } finally {
      console.log = origLog;
    }
    const joined = logs.join('\n');
    // Scope to the "Next steps:" section — the created-files list above it also names skills.
    const nextSteps = joined.slice(joined.indexOf('Next steps:'));
    const firstCmd = nextSteps.match(/\/joycraft-(setup|tune|new-feature|interview|decompose|implement|session-end)\b/);
    expect(firstCmd?.[0]).toBe('/joycraft-setup');
    rmSync(dir, { recursive: true, force: true });
  });
});
