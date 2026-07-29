import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const read = (name: string) =>
  readFileSync(join(repoRoot, 'src', 'skills', `${name}.md`), 'utf-8');

/**
 * Spec 7 (handoff-briefing-prompts, decision D5): every skill that hands off to
 * a fresh session ends with a fenced, copy-pasteable *briefing prompt* rather
 * than a bare `/clear` + command. The block carries five parts in order:
 * command line, pickup sentence, decided/don't-reopen, start/order, and
 * hazard + done-when.
 *
 * Spec 5 (gate-contract-tests) owns the durable cross-skill oracle; these
 * assertions are the mechanical check for *this* spec — presence, ordering,
 * the ~8-line cap (the briefing is itself a gate output, so D2's brevity
 * discipline applies), and that no handoff ends at a bare command.
 *
 * `src/skills/` only: the generated trees and installed copies stay stale
 * until spec 6 syncs them.
 */

const HANDOFF_SKILLS = [
  'joycraft-new-feature',
  'joycraft-interview',
  'joycraft-decompose',
  'joycraft-design',
  'joycraft-research',
  'joycraft-decide',
  'joycraft-bugfix',
  'joycraft-session-end',
] as const;

// Skills that continue in-session never hand a command back to the human, so
// they must NOT grow a briefing block.
const IN_SESSION_SKILLS = [
  'joycraft-implement',
  'joycraft-implement-feature',
  'joycraft-spec-done',
] as const;

/** The instruction sentence that introduces the briefing at every handoff. */
const BRIEFING_MARKER = 'a prompt the human pastes into the fresh session';

/**
 * Briefing prompts are plain ``` fences whose body carries the Done-when slot.
 * Everything else in these files (bash fences, markdown templates) is ignored.
 *
 * Fences must be scanned line-by-line, not paired by regex: these skills also
 * carry info-string fences (```bash, ```markdown), and a regex that only pairs
 * bare ``` delimiters mistakes an info fence's *closing* line for an opening
 * one and pairs every later fence off by one.
 */
function briefingFences(content: string): string[] {
  const fences: string[] = [];
  const lines = content.split('\n');
  let open: { info: string; body: string[] } | null = null;
  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);
    if (!fence) {
      if (open) open.body.push(line);
      continue;
    }
    if (open) {
      if (open.info === '' && open.body.some((l) => l.includes('Done when:'))) {
        fences.push(open.body.join('\n'));
      }
      open = null;
    } else {
      open = { info: fence[1].trim(), body: [] };
    }
  }
  return fences;
}

describe('handoff briefing prompts (spec 7 / D5)', () => {
  for (const name of HANDOFF_SKILLS) {
    describe(name, () => {
      const content = read(name);

      it('instructs the briefing block at its handoff', () => {
        expect(content).toContain(BRIEFING_MARKER);
      });

      it('keeps the /clear instruction — the briefing replaces what follows it', () => {
        expect(content).toMatch(/\{\{clear\}\}|\/clear/);
      });

      it('carries both a template and a filled example briefing', () => {
        expect(briefingFences(content).length).toBeGreaterThanOrEqual(2);
      });

      it('every briefing fence carries the five parts in order', () => {
        for (const fence of briefingFences(content)) {
          const lines = fence.split('\n');
          // Part 1: the command line comes first
          expect(
            lines[0].trim(),
            `${name}: briefing does not open with a command line`,
          ).toMatch(/^\{\{skill_prefix\}\}|^\/joycraft-/);
          // Blank line, then the prompt body
          expect(lines[1].trim(), `${name}: no blank line after the command`).toBe('');
          const body = lines.slice(2).join('\n');
          const order: [string, RegExp][] = [
            ['pickup sentence', /You are picking up /],
            ['decided / do-not-reopen', /do not reopen/],
            ['start', /Start: /],
            ['order', /Order: /],
            ['hazard', /Hazard: /],
            ['done-when', /Done when: /],
          ];
          let cursor = 0;
          for (const [label, marker] of order) {
            const hit = body.slice(cursor).search(marker);
            expect(
              hit,
              `${name}: briefing is missing or out of order at "${label}"`,
            ).toBeGreaterThanOrEqual(0);
            cursor += hit + 1;
          }
        }
      });

      it('keeps every briefing within ~8 lines (D2 brevity applies)', () => {
        for (const fence of briefingFences(content)) {
          const nonEmpty = fence.split('\n').filter((l) => l.trim() !== '');
          expect(
            nonEmpty.length,
            `${name}: briefing exceeds the 8-line cap`,
          ).toBeLessThanOrEqual(8);
        }
      });

      it('ships a filled, gate-specific example — not only placeholders', () => {
        const filled = briefingFences(content).filter((f) => !f.includes('<'));
        expect(filled.length, `${name}: no filled example briefing`).toBeGreaterThanOrEqual(1);
      });

      it('leaves no bare-command handoff — every /clear hint is followed by a briefing', () => {
        const clearIdx = content.lastIndexOf('first.');
        const briefingIdx = content.lastIndexOf(BRIEFING_MARKER);
        expect(
          briefingIdx,
          `${name}: the briefing must follow the /clear instruction, not precede it`,
        ).toBeGreaterThan(clearIdx);
      });
    });
  }

  for (const name of IN_SESSION_SKILLS) {
    it(`${name} keeps its in-session flow — no briefing block`, () => {
      expect(read(name)).not.toContain(BRIEFING_MARKER);
    });
  }
});
