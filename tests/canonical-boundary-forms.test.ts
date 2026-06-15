import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Spec: docs/features/2026-06-11-single-source-skills/specs/canonicalize-boundary-forms.md
//
// After the Cat D sweep, every reference to the user's boundary file in a
// per-harness skill must use the canonical literal for that harness:
//   - src/claude-skills/  -> CLAUDE.md
//   - src/codex-skills/   -> AGENTS.md
//   - src/pi-skills/      -> AGENTS.md
//
// The five known drift forms are:
//   1. "the project boundary file"   (abstracted prose)
//   2. "CLAUDE.md and/or AGENTS.md"  (allowlisted compound; still drift in per-harness file)
//   3. "CLAUDE.md or AGENTS.md"
//   4. "CLAUDE.md/AGENTS.md"
//   5. bare cross-harness literal (AGENTS.md in claude, CLAUDE.md in codex/pi)
//
// Note: this test enforces the *canonical form per harness*. Genuine references
// to *this Joycraft repo's own* CLAUDE.md (not the user's boundary file) are
// listed as documented exceptions in EXPECTED_REPO_REFS below.

const REPO_ROOT = join(__dirname, '..');
const CLAUDE_DIR = join(REPO_ROOT, 'src', 'claude-skills');
const CODEX_DIR = join(REPO_ROOT, 'src', 'codex-skills');
const PI_DIR = join(REPO_ROOT, 'src', 'pi-skills');

const DRIFT_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: '"the project boundary file"', pattern: /the project boundary file/ },
  {
    name: '"CLAUDE.md and/or AGENTS.md"',
    pattern: /CLAUDE\.md and\/or AGENTS\.md/,
  },
  {
    name: '"CLAUDE.md or AGENTS.md"',
    pattern: /CLAUDE\.md or AGENTS\.md/,
  },
  {
    name: '"CLAUDE.md/AGENTS.md"',
    pattern: /CLAUDE\.md\/AGENTS\.md/,
  },
];

function listSkills(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith('.md'));
}

interface Occurrence {
  file: string;
  lineNumber: number;
  line: string;
}

function findOccurrences(dir: string, pattern: RegExp): Occurrence[] {
  const out: Occurrence[] = [];
  for (const f of listSkills(dir)) {
    const content = readFileSync(join(dir, f), 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        out.push({ file: f, lineNumber: i + 1, line: lines[i] });
      }
    }
  }
  return out;
}

describe('Canonical Cat D boundary forms (spec: canonicalize-boundary-forms)', () => {
  describe('no drift forms remain in any per-harness skill', () => {
    for (const dir of [
      { name: 'src/claude-skills', path: CLAUDE_DIR },
      { name: 'src/codex-skills', path: CODEX_DIR },
      { name: 'src/pi-skills', path: PI_DIR },
    ]) {
      for (const { name: driftName, pattern } of DRIFT_PATTERNS) {
        it(`${dir.name}: contains no ${driftName}`, () => {
          const hits = findOccurrences(dir.path, pattern);
          expect(
            hits,
            `${dir.name} contains ${driftName} at:\n` +
              hits
                .map((h) => `  ${h.file}:${h.lineNumber}  ${h.line.trim()}`)
                .join('\n'),
          ).toEqual([]);
        });
      }
    }
  });

  describe('per-harness canonical: cross-harness literals must not appear', () => {
    // In src/claude-skills/, the user's boundary file is CLAUDE.md.
    // AGENTS.md must not appear EXCEPT when describing this Joycraft repo's
    // own behavior of generating AGENTS.md for Codex projects (Codex Path
    // sections, agents-md generator references, etc.).
    it('src/claude-skills: AGENTS.md only appears in documented Codex-path contexts', () => {
      const hits = findOccurrences(CLAUDE_DIR, /AGENTS\.md/);
      // Allowlist: occurrences that legitimately reference AGENTS.md
      // because the skill itself reasons about Codex projects, not because
      // the claude-harness user's boundary file is AGENTS.md.
      const allowedFiles = new Set([
        // optimize audits both Claude and Codex sessions
        'joycraft-optimize.md',
        // tune scaffolds AGENTS.md as part of Tier 1 setup
        'joycraft-tune.md',
      ]);
      const unexpected = hits.filter((h) => !allowedFiles.has(h.file));
      expect(
        unexpected,
        `Unexpected AGENTS.md references in src/claude-skills (claude harness should use CLAUDE.md):\n` +
          unexpected
            .map((h) => `  ${h.file}:${h.lineNumber}  ${h.line.trim()}`)
            .join('\n'),
      ).toEqual([]);
    });

    // In src/codex-skills/ and src/pi-skills/, the user's boundary file is
    // AGENTS.md. CLAUDE.md must not appear EXCEPT when describing this
    // Joycraft repo's own behavior or comparing platforms.
    it('src/codex-skills: CLAUDE.md only appears in documented platform-comparison contexts', () => {
      const hits = findOccurrences(CODEX_DIR, /CLAUDE\.md/);
      const allowedFiles = new Set([
        // optimize/tune audit / compare across platforms
        'joycraft-optimize.md',
        'joycraft-tune.md',
        // collaborative-setup, decompose, implement, implement-feature,
        // session-end, verify reference CLAUDE.md only in
        // platform-comparison or cross-harness autonomy-rule contexts
        'joycraft-collaborative-setup.md',
        'joycraft-decompose.md',
        'joycraft-implement.md',
        'joycraft-implement-feature.md',
      ]);
      const unexpected = hits.filter((h) => !allowedFiles.has(h.file));
      expect(
        unexpected,
        `Unexpected CLAUDE.md references in src/codex-skills (codex harness should use AGENTS.md):\n` +
          unexpected
            .map((h) => `  ${h.file}:${h.lineNumber}  ${h.line.trim()}`)
            .join('\n'),
      ).toEqual([]);
    });

    it('src/pi-skills: CLAUDE.md only appears in documented platform-comparison contexts', () => {
      const hits = findOccurrences(PI_DIR, /CLAUDE\.md/);
      const allowedFiles = new Set([
        'joycraft-optimize.md',
        'joycraft-tune.md',
        'joycraft-collaborative-setup.md',
        'joycraft-decompose.md',
        'joycraft-implement.md',
        'joycraft-implement-feature.md',
      ]);
      const unexpected = hits.filter((h) => !allowedFiles.has(h.file));
      expect(
        unexpected,
        `Unexpected CLAUDE.md references in src/pi-skills (pi harness should use AGENTS.md):\n` +
          unexpected
            .map((h) => `  ${h.file}:${h.lineNumber}  ${h.line.trim()}`)
            .join('\n'),
      ).toEqual([]);
    });
  });

  describe('user-boundary references in dual-harness skills use the per-harness literal', () => {
    // For skills that handle "the project's boundary file" generically,
    // after the sweep the claude harness should say "CLAUDE.md" and the
    // codex/pi harness should say "AGENTS.md" in those same sentences.
    // We exercise this on joycraft-add-context line 45 ("Read the project's
    // boundary file") and joycraft-gather-context line 19, both of which
    // were the canonical drift offenders in research.md.
    const DUAL_HARNESS_SKILLS = [
      'joycraft-add-context.md',
      'joycraft-gather-context.md',
      'joycraft-add-fact.md',
      'joycraft-session-end.md',
      'joycraft-verify.md',
    ];

    for (const skill of DUAL_HARNESS_SKILLS) {
      it(`${skill}: claude variant references CLAUDE.md somewhere (user-boundary form)`, () => {
        const content = readFileSync(join(CLAUDE_DIR, skill), 'utf-8');
        expect(/CLAUDE\.md/.test(content)).toBe(true);
      });
      it(`${skill}: codex variant references AGENTS.md somewhere (user-boundary form)`, () => {
        const content = readFileSync(join(CODEX_DIR, skill), 'utf-8');
        expect(/AGENTS\.md/.test(content)).toBe(true);
      });
      it(`${skill}: pi variant references AGENTS.md somewhere (user-boundary form)`, () => {
        const content = readFileSync(join(PI_DIR, skill), 'utf-8');
        expect(/AGENTS\.md/.test(content)).toBe(true);
      });
    }
  });
});
