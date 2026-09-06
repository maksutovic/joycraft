import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = join(__dirname, '..', 'src', 'claude-skills');
const OMP_SKILLS_DIR = join(__dirname, '..', 'src', 'omp-skills');

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

const claudeSkills = readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md'));
const ompSkills = readdirSync(OMP_SKILLS_DIR).filter((f) => f.endsWith('.md'));

function readOmp(file: string): string {
  return readFileSync(join(OMP_SKILLS_DIR, file), 'utf-8');
}

describe('omp skill parity', () => {
  describe('every Claude skill has a corresponding omp skill', () => {
    for (const file of claudeSkills) {
      it(`${file} exists in omp-skills/`, () => {
        expect(ompSkills).toContain(file);
      });
    }
  });

  describe('no orphan omp skills', () => {
    for (const file of ompSkills) {
      it(`${file} exists in skills/`, () => {
        expect(claudeSkills).toContain(file);
      });
    }
  });

  describe('name field matches between Claude and omp skills', () => {
    const shared = claudeSkills.filter((f) => ompSkills.includes(f));
    for (const file of shared) {
      it(`${file} has matching name field`, () => {
        const claudeFm = parseFrontmatter(readFileSync(join(SKILLS_DIR, file), 'utf-8'));
        const ompFm = parseFrontmatter(readOmp(file));
        expect(ompFm.name).toBe(claudeFm.name);
      });
    }
  });

  describe('no banned Claude-specific tool references in omp skills', () => {
    const banned = ['TodoWrite', 'EnterWorktree', 'LSP'];
    for (const file of ompSkills) {
      it(`${file} does not reference banned tools`, () => {
        const content = readOmp(file);
        for (const tool of banned) {
          const regex = new RegExp(`\\b${tool}\\b`);
          expect(
            regex.test(content),
            `Found banned tool reference "${tool}" in ${file}`,
          ).toBe(false);
        }
      });
    }
  });

  describe('OMP_SKILLS export has 22 entries', () => {
    it('OMP_SKILLS has exactly 22 skills', async () => {
      const { OMP_SKILLS } = await import('../src/bundled-files');
      expect(Object.keys(OMP_SKILLS).length).toBe(22);
    });
  });

  describe('5-way skill name parity', () => {
    it('Claude, Codex, Pi, Copilot, and omp have identical skill file names', async () => {
      const { SKILLS, CODEX_SKILLS, PI_SKILLS, COPILOT_SKILLS, OMP_SKILLS } = await import(
        '../src/bundled-files'
      );
      const claudeNames = Object.keys(SKILLS).sort();
      expect(Object.keys(CODEX_SKILLS).sort()).toEqual(claudeNames);
      expect(Object.keys(PI_SKILLS).sort()).toEqual(claudeNames);
      expect(Object.keys(COPILOT_SKILLS).sort()).toEqual(claudeNames);
      expect(Object.keys(OMP_SKILLS).sort()).toEqual(claudeNames);
    });
  });

  // --- Harness-block audit: the invariants that make omp variants correct ---
  //
  // Harness blocks are allow-lists: a block whose selector omits `omp` is
  // stripped from the omp variant entirely. Nothing else in the suite notices
  // a wrong verdict, so these assertions are the audit's only guard rail.
  // See docs/features/2026-09-02-omp-support/specs/audit-harness-blocks-for-omp.md.

  describe('omp invocation syntax (D8)', () => {
    for (const file of ompSkills) {
      it(`${file} uses no $joycraft- (Codex) invocation syntax`, () => {
        expect(
          readOmp(file).match(/\$joycraft-/g),
          `Found $joycraft- in ${file} — omp uses /skill:joycraft-`,
        ).toBeNull();
      });
    }

    for (const file of ompSkills) {
      it(`${file} uses no bare /joycraft- (Claude/Copilot) invocation syntax`, () => {
        // Match /joycraft- at start-of-line, after whitespace, or after a
        // backtick — but not as a path component (docs/joycraft-...).
        expect(
          readOmp(file).match(/(?:^|[\s`])\/joycraft-/gm),
          `Found /joycraft- in ${file} — omp uses /skill:joycraft-`,
        ).toBeNull();
      });
    }
  });

  describe('omp session-boundary command is /new, never /clear (D8)', () => {
    for (const file of ompSkills) {
      it(`${file} names no /clear command`, () => {
        expect(
          readOmp(file).includes('/clear'),
          `Found /clear in ${file} — omp clears context with /new`,
        ).toBe(false);
      });
    }
  });

  describe('omp skills dir is .omp/skills (D8)', () => {
    for (const file of ompSkills) {
      it(`${file} names no other harness's skills dir`, () => {
        const content = readOmp(file);
        for (const dir of ['.pi/skills', '.agents/skills', '.github/skills', '.claude/skills']) {
          expect(content.includes(dir), `Found ${dir} in ${file}`).toBe(false);
        }
      });
    }
  });

  describe('no Pi headless runtime reaches omp (D9)', () => {
    for (const file of ompSkills) {
      it(`${file} does not name the joycraft-implement-loop driver`, () => {
        expect(
          readOmp(file).includes('joycraft-implement-loop'),
          `${file} names the Pi loop driver — omp has no headless runtime until the runtime port ships`,
        ).toBe(false);
      });
    }

    for (const file of ompSkills) {
      it(`${file} does not name a \`pi -p\` process`, () => {
        expect(
          readOmp(file).includes('pi -p'),
          `${file} names \`pi -p\` — omp has no headless loop`,
        ).toBe(false);
      });
    }

    for (const file of ompSkills) {
      it(`${file} does not name the Pi-only researcher/verifier agents`, () => {
        const content = readOmp(file);
        for (const agent of ['joycraft-researcher', 'joycraft-verifier']) {
          expect(
            content.includes(agent),
            `${file} names the ${agent} agent — omp installs no .omp/agents/ tree (D1)`,
          ).toBe(false);
        }
      });
    }
  });

  describe('omp reads no .pi/ path (D9)', () => {
    // `joycraft-tune` is the deliberate exception: its private-profile prose
    // enumerates the *project's* gitignored harness dirs (.claude/, .agents/,
    // .pi/, .omp/). That list describes the repo, not a path omp should read,
    // and it must stay in sync with PRIVATE_PROFILE_IGNORES in src/gitignore.ts.
    const PROJECT_DIR_LIST_EXEMPT = new Set(['joycraft-tune.md']);

    for (const file of ompSkills.filter((f) => !PROJECT_DIR_LIST_EXEMPT.has(f))) {
      it(`${file} names no .pi/ path`, () => {
        expect(
          readOmp(file).includes('.pi/'),
          `${file} tells omp to read a .pi/ path — omp does not read the Pi tree`,
        ).toBe(false);
      });
    }

    it('joycraft-tune names .pi/ only inside the private-profile dir list', () => {
      const content = readOmp('joycraft-tune.md');
      const lines = content.split('\n').filter((l) => l.includes('.pi/'));
      expect(lines.length, 'unexpected number of .pi/ lines in omp joycraft-tune').toBe(2);
      for (const line of lines) {
        expect(line, 'a .pi/ mention outside the private-profile dir list').toMatch(
          /private/i,
        );
        expect(line, 'the private-profile dir list must also name .omp/').toContain('.omp/');
      }
    });
  });

  describe('optimize names an omp MCP path, never Pi\'s (spec: optimize MCP row)', () => {
    const content = readOmp('joycraft-optimize.md');

    it('names the omp config file', () => {
      expect(content).toContain('~/.omp/agent/config.yml');
    });

    it('does not instruct reading ~/.pi/config.json', () => {
      expect(content).not.toContain('~/.pi/config.json');
    });

    it('names no other harness MCP config path', () => {
      for (const path of ['~/.codex/config.toml', '~/.claude/settings.json', 'github-copilot/mcp.json']) {
        expect(content.includes(path), `Found ${path} in the omp optimize variant`).toBe(false);
      }
    });
  });

  describe('tune private-profile prose covers .omp/ (D9)', () => {
    const content = readOmp('joycraft-tune.md');

    it('names .omp/ in the private-profile dir list', () => {
      expect(content).toContain('.omp/');
    });

    it('the untrack command includes .omp', () => {
      expect(content).toContain('git rm -r --cached .claude .agents .pi .omp');
    });
  });

  describe('every omp skill carries a non-empty description (omp rejects skills without one)', () => {
    for (const file of ompSkills) {
      it(`${file} has a non-empty description:`, () => {
        const fm = parseFrontmatter(readOmp(file));
        expect(fm.description ?? '', `${file} would be refused by omp's skill provider`).not.toBe(
          '',
        );
      });
    }
  });

  describe('gate skills keep the structured-chat question fallback, not a Claude tool name', () => {
    // omp's `ask` tool is explicitly out of scope for this feature, so every
    // gate skill's omp variant must render the codex|pi|copilot|omp fallback.
    const GATE_SKILLS = [
      'joycraft-bugfix.md',
      'joycraft-decide.md',
      'joycraft-design.md',
      'joycraft-interview.md',
      'joycraft-new-feature.md',
      'joycraft-tune.md',
    ];

    for (const file of GATE_SKILLS) {
      it(`${file} carries the structured-chat fallback`, () => {
        expect(readOmp(file)).toContain('structured forced-choice questions asked directly in chat');
      });

      it(`${file} does not name the AskUserQuestion tool`, () => {
        expect(
          readOmp(file).includes('AskUserQuestion'),
          `${file} names a Claude-only tool in the omp variant`,
        ).toBe(false);
      });
    }
  });

  describe('no unrendered harness markers survive the transform', () => {
    for (const file of ompSkills) {
      it(`${file} contains no harness block delimiter`, () => {
        const content = readOmp(file);
        expect(content).not.toMatch(/<!--\s*\/?harness[:\s]/);
      });
    }
  });

  describe('no absolute paths (templates are copied into user projects)', () => {
    for (const file of ompSkills) {
      it(`${file} names no absolute path`, () => {
        expect(readOmp(file)).not.toMatch(/\/Users\/|\/home\//);
      });
    }
  });
});
