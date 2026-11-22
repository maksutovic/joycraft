import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Spec: docs/features/2026-11-21-drift-tidy/specs/12-generator-cuts.md
// Spec: docs/features/2026-11-22-fixes-1-9-1/specs/06-reference-text.md (spec-6 tests)
// Text checks on single payload files; the word cap (AC 5) lives in payload-guard.test.ts.
const payload = join(__dirname, '..', 'payload');
const read = (file: string) => readFileSync(join(payload, file), 'utf8');
const sessionEnd = read('.agents/skills/joycraft-session-end/SKILL.md');
const cleanupSkill = read('.agents/skills/joycraft-cleanup/SKILL.md');
const cleanupRef = read('.joycraft/references/cleanup.md');

describe('skills call tidy and Joycraft writes less', () => {
  it('[AC:spec-12-1] session end runs tidy, fixes only fixable findings, verifies, commits once, and keeps the hold sentence', () => {
    expect(sessionEnd).toContain('cleanup.mjs tidy`');
    expect(sessionEnd).toContain('`fixable: true`');
    expect(sessionEnd).toContain('tidy --verify');
    expect(sessionEnd).toMatch(/make one commit with the message it\s+prints/);
    expect(sessionEnd.replace(/\s+/g, ' ')).toContain('Never archive a feature whose question the user asked to wait');
    // The old rule that session end changes no page is gone from all three texts.
    for (const text of [sessionEnd, cleanupSkill, cleanupRef]) {
      const flat = text.replace(/\s+/g, ' ');
      expect(flat).not.toMatch(/no rule and no page|only reports and makes|reports and makes only the mechanical/);
    }
  });

  it('[AC:spec-12-2] cleanup.md lists no handoff output; knowledge.md labels homes with the four Diataxis kinds', () => {
    expect(cleanupRef).not.toContain('or a handoff');
    const table = read('.joycraft/references/knowledge.md').split('\n').filter(line => line.startsWith('|'));
    expect(table[0]).toMatch(/\|\s*Kind\s*\|/);
    for (const kind of ['explanation', 'reference', 'how-to', 'domain']) {
      expect(table.some(line => line.split('|').map(cell => cell.trim()).includes(kind)), kind).toBe(true);
    }
  });

  it('[AC:spec-12-3] the cleanup skill points "tidy now" to cleanup.mjs tidy', () => {
    expect(cleanupSkill).toMatch(/Tidy now[\s\S]{0,80}cleanup\.mjs tidy/);
  });

  it('[AC:spec-12-4] setup offers checks: in one sentence when the project already uses a checker', () => {
    const sentences = read('.joycraft/references/setup.md').replace(/\s+/g, ' ').split(/(?<=\.)\s/).filter(line => line.includes('`checks:`'));
    expect(sentences).toHaveLength(1);
    expect(sentences[0]).toMatch(/already uses a doc or code checker/);
  });

  it('[AC:spec-6-1] cleanup.md says --checks lists each check\'s kind and whether it is a gate', () => {
    expect(cleanupRef.replace(/\s+/g, ' ')).toContain('its kind, and whether it is a gate');
  });

  it('[AC:spec-6-2] the one setup sentence that offers checks: says knip needs a path:line: message wrapper', () => {
    const sentences = read('.joycraft/references/setup.md').replace(/\s+/g, ' ').split(/(?<=\.)\s/).filter(line => line.includes('`checks:`'));
    expect(sentences).toHaveLength(1);
    expect(sentences[0]).toContain('knip');
    expect(sentences[0]).toContain('path:line: message');
    expect(sentences[0]).toMatch(/knip through a wrapper that prints `path:line: message`/);
  });
});
