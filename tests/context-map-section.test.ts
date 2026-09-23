import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  generateContextMapSection,
  improveCLAUDEMd,
  generateCLAUDEMd,
  insertModelProfilePointer,
} from '../src/improve-claude-md';
import { formatInitOutcome, init } from '../src/init';
import {
  MODEL_PROFILE_CONTEXT_MAP_ROW,
  MODEL_PROFILE_HARNESSES,
  MODEL_PROFILE_PATH,
  MODEL_PROFILE_TEMPLATE_KEY,
  selectsModelProfile,
} from '../src/model-profile';
import { TEMPLATE_HARNESS_GATES } from '../src/bundle-inventory';

const PROFILE_PATH = 'docs/templates/reference/model-profile-claude-fable-5-1.md';
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

  it('ineligible selection: no data rows — only the header + separator', () => {
    for (const out of [generateContextMapSection(), generateContextMapSection(false)]) {
      const tableRows = out.split('\n').filter((l: string) => l.trim().startsWith('|'));
      // header row + separator row only
      expect(tableRows.length).toBe(2);
      // no dangling pointer to a fact-doc or to the model profile
      expect(out).not.toContain('docs/context/production-map.md');
      expect(out).not.toContain(PROFILE_PATH);
    }
  });

  it('eligible selection: header + separator + exactly one model-profile row', () => {
    const out = generateContextMapSection(true);
    expect(out).toContain('## Context Map');
    expect(out.toLowerCase()).toMatch(/lean|link out|don.t inline/);
    const tableRows = out.split('\n').filter((l: string) => l.trim().startsWith('|'));
    expect(tableRows.length).toBe(3);
    expect(tableRows[1]).toMatch(/^\|\s*-+\s*\|/);
    expect(tableRows[2]).toBe(MODEL_PROFILE_CONTEXT_MAP_ROW);
    expect(countOccurrences(out, new RegExp(PROFILE_PATH.replace(/[.]/g, '\\.'), 'g'))).toBe(1);
  });
});

describe('model profile pointer row constants', () => {
  it('cites the installed project-relative path, and the gate list is claude/pi/omp', () => {
    expect(MODEL_PROFILE_PATH).toBe(PROFILE_PATH);
    expect(MODEL_PROFILE_CONTEXT_MAP_ROW).toBe(
      '| `docs/templates/reference/model-profile-claude-fable-5-1.md` | Working with Claude Fable 5.1 — finishing whole tasks, scope, progress updates, prose |',
    );
    expect([...MODEL_PROFILE_HARNESSES]).toEqual(['claude', 'pi', 'omp']);
    // One list: the template gate reads the same constant.
    expect(TEMPLATE_HARNESS_GATES[MODEL_PROFILE_TEMPLATE_KEY]).toBe(MODEL_PROFILE_HARNESSES);
    expect(selectsModelProfile(['codex'])).toBe(false);
    expect(selectsModelProfile(['copilot', 'codex'])).toBe(false);
    for (const h of ['claude', 'pi', 'omp'] as const) expect(selectsModelProfile([h])).toBe(true);
  });
});

describe('generateCLAUDEMd gates the model-profile row', () => {
  it('emits the row once when modelProfilePointer is set', () => {
    const out = generateCLAUDEMd('My Project', STACK, [], { modelProfilePointer: true });
    expect(out.split(PROFILE_PATH).length - 1).toBe(1);
    expect(out).toContain(MODEL_PROFILE_CONTEXT_MAP_ROW);
  });

  it('omits the row by default (codex-only selection)', () => {
    expect(generateCLAUDEMd('My Project', STACK)).not.toContain(PROFILE_PATH);
    expect(generateCLAUDEMd('My Project', STACK, [], { multiTool: true })).not.toContain(PROFILE_PATH);
  });
});

describe('insertModelProfilePointer: scoped single-row insertion', () => {
  const CUSTOM = [
    '# Acme',
    '',
    'Hand-written intro.  ',
    '',
    '## Behavioral Boundaries',
    '',
    '- never do X',
    '',
    '## Context Map',
    '',
    'Our own teaching line.',
    '',
    '| Document | Read it when… |',
    '|----------|---------------|',
    '| `docs/context/reference/db.md` | Touching the schema |',
    '| `docs/context/reference/api.md` | Touching the API |',
    '',
    '## Zebra Section',
    '',
    'trailing   ',
    '',
  ].join('\n');

  it('returns the same string plus exactly one row appended to the table', () => {
    const out = insertModelProfilePointer(CUSTOM);
    const expected = CUSTOM.replace(
      '| `docs/context/reference/api.md` | Touching the API |\n',
      '| `docs/context/reference/api.md` | Touching the API |\n' + MODEL_PROFILE_CONTEXT_MAP_ROW + '\n',
    );
    expect(out).toBe(expected);
  });

  it('is idempotent: a second pass returns identical bytes', () => {
    const once = insertModelProfilePointer(CUSTOM);
    expect(insertModelProfilePointer(once)).toBe(once);
  });

  it('leaves a file that already names the path anywhere byte-identical', () => {
    const prose = CUSTOM + '\nSee docs/templates/reference/model-profile-claude-fable-5-1.md for Fable notes.\n';
    expect(insertModelProfilePointer(prose)).toBe(prose);
  });

  it('matches a differently-cased Context Map header', () => {
    const input = '# P\n\n## context map\n\n| Document | Read it when… |\n|---|---|\n\n## Next\n';
    const out = insertModelProfilePointer(input);
    expect(out).toBe('# P\n\n## context map\n\n| Document | Read it when… |\n|---|---|\n' + MODEL_PROFILE_CONTEXT_MAP_ROW + '\n\n## Next\n');
  });

  it('preserves CRLF line endings throughout', () => {
    const crlf = CUSTOM.replace(/\n/g, '\r\n');
    const out = insertModelProfilePointer(crlf);
    expect(out).toBe(crlf.replace(
      '| Touching the API |\r\n',
      '| Touching the API |\r\n' + MODEL_PROFILE_CONTEXT_MAP_ROW + '\r\n',
    ));
    expect(out.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('appends the section plus the row when there is no Context Map section', () => {
    const input = '# My Project\n\nSome intro.\n';
    const out = insertModelProfilePointer(input);
    expect(out.startsWith(input)).toBe(true);
    expect(out).toContain('## Context Map');
    expect(countOccurrences(out, /^##\s+Context Map\b/gim)).toBe(1);
    expect(out.split(PROFILE_PATH).length - 1).toBe(1);
    expect(out.endsWith(MODEL_PROFILE_CONTEXT_MAP_ROW + '\n')).toBe(true);
  });

  it('gives an empty file the section plus the row and nothing else', () => {
    const out = insertModelProfilePointer('');
    expect(out).toBe(generateContextMapSection(true) + '\n');
  });
});

describe('improveCLAUDEMd threads the model-profile row', () => {
  it('inserts one row into an existing Context Map and otherwise merges exactly as without the flag', () => {
    const full = generateCLAUDEMd('My Project', STACK);
    const out = improveCLAUDEMd(full, STACK, [], { modelProfilePointer: true });
    expect(out.split(PROFILE_PATH).length - 1).toBe(1);
    expect(out).toBe(improveCLAUDEMd(insertModelProfilePointer(full), STACK));
  });

  it('returns the customized file plus one row when every section already exists', () => {
    const custom = improveCLAUDEMd('# Acme\n\n## Context Map\n\n| Document | Read it when… |\n|---|---|\n| `a.md` | A |\n', STACK);
    const out = improveCLAUDEMd(custom, STACK, [], { modelProfilePointer: true });
    expect(out).toBe(custom.replace('| `a.md` | A |\n', '| `a.md` | A |\n' + MODEL_PROFILE_CONTEXT_MAP_ROW + '\n'));
  });

  it('adds the Context Map with the row when the section is missing', () => {
    const out = improveCLAUDEMd('# My Project\n\nSome intro.\n', STACK, [], { modelProfilePointer: true });
    expect(out.split(PROFILE_PATH).length - 1).toBe(1);
  });

  it('does not add the row when ineligible', () => {
    const out = improveCLAUDEMd('# My Project\n\nSome intro.\n', STACK);
    expect(out).not.toContain(PROFILE_PATH);
  });

  it('does not duplicate a pointer already named in prose when the section is missing', () => {
    const input = '# My Project\n\nRead docs/templates/reference/model-profile-claude-fable-5-1.md first.\n';
    const out = improveCLAUDEMd(input, STACK, [], { modelProfilePointer: true });
    expect(out.split(PROFILE_PATH).length - 1).toBe(1);
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
    let result: Awaited<ReturnType<typeof init>>;
    try {
      result = await init(dir, { force: false });
    } finally {
      console.log = origLog;
    }
    const joined = `${logs.join('\n')}\n${formatInitOutcome(result)}`;
    // Scope to the "Next steps:" section — the created-files list above it also names skills.
    const nextSteps = joined.slice(joined.indexOf('Next steps:'));
    const firstCmd = nextSteps.match(/\/joycraft-(setup|tune|new-feature|interview|decompose|implement|session-end)\b/);
    expect(firstCmd?.[0]).toBe('/joycraft-setup');
    rmSync(dir, { recursive: true, force: true });
  });
});
