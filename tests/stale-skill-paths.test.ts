import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const CLAUDE_DIR = join(ROOT, 'src', 'claude-skills');
const CODEX_DIR = join(ROOT, 'src', 'codex-skills');

function read(dir: string, file: string): string {
  return readFileSync(join(dir, file), 'utf-8');
}

describe('no legacy docs/specs/ in shipped skills', () => {
  for (const dir of [CLAUDE_DIR, CODEX_DIR]) {
    const label = dir.endsWith('codex-skills') ? 'codex-skills' : 'claude-skills';
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      it(`${label}/${file} contains no docs/specs/ reference`, () => {
        expect(read(dir, file)).not.toContain('docs/specs/');
      });
    }
  }
});

describe('Codex decompose layout parity', () => {
  it('references the per-feature brief + specs output, no docs/briefs/', () => {
    const c = read(CODEX_DIR, 'joycraft-decompose.md');
    expect(c).toContain('docs/features/');
    expect(c).toMatch(/docs\/features\/[^\s]*specs\//);
    expect(c).not.toContain('docs/briefs/');
  });
});

describe('Codex bugfix path parity', () => {
  it('writes bugfix specs to docs/bugfixes/<area>/ with area frontmatter + README', () => {
    const c = read(CODEX_DIR, 'joycraft-bugfix.md');
    expect(c).toContain('docs/bugfixes/');
    expect(c).toMatch(/area:/);
    expect(c).toContain('README');
  });
});

describe('Codex new-feature path parity', () => {
  it('writes decomposed specs to docs/features/<slug>/specs/', () => {
    const c = read(CODEX_DIR, 'joycraft-new-feature.md');
    expect(c).toMatch(/docs\/features\/[^\s]*specs\//);
  });
});

describe('Codex session-end scans per-feature / bugfixes', () => {
  it('no docs/briefs/ and references per-feature brief', () => {
    const c = read(CODEX_DIR, 'joycraft-session-end.md');
    expect(c).not.toContain('docs/briefs/');
    expect(c).toContain('docs/features/');
  });
});

describe('$ sigil preserved in edited Codex files', () => {
  const edited = [
    'joycraft-verify.md',
    'joycraft-implement.md',
    'joycraft-implement-level5.md',
    'joycraft-collaborative-setup.md',
    'joycraft-session-end.md',
    'joycraft-decompose.md',
    'joycraft-bugfix.md',
    'joycraft-new-feature.md',
  ];
  for (const file of edited) {
    it(`${file} uses no /joycraft- invocation syntax`, () => {
      const c = read(CODEX_DIR, file);
      expect(c).not.toMatch(/(?:^|[\s`])\/joycraft-/m);
    });
  }
});
