import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXECUTION_PROFILE_HEADING } from '../src/execution-profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const read = (name: string) =>
  readFileSync(join(repoRoot, 'src', 'skills', `${name}.md`), 'utf-8');

/**
 * Spec: inject-profile-into-briefings (decision D7).
 *
 * The D5 handoff briefings (spec 7) are the transport between sessions; the
 * Execution Profile (spec 8) is where the human's "use subagents on opus-5 at
 * medium" answer lives. This spec closes the loop: decompose and new-feature
 * read the profile and quote it verbatim as one `Execution:` line, and
 * implement-feature honors that line when spawning subagents.
 *
 * `src/skills/` only — generated trees and installed copies stay stale until
 * the sync spec.
 */

/** The sentinel name that marks the profile region inside AGENTS.md. */
const SENTINEL = 'joycraft:execution-profile';

/** Skills whose briefing must instruct the profile read. */
const BRIEFING_SKILLS = ['joycraft-decompose', 'joycraft-new-feature'] as const;

describe('execution profile injected into handoff briefings', () => {
  for (const name of BRIEFING_SKILLS) {
    describe(name, () => {
      const content = read(name);

      it('references the execution-profile sentinel', () => {
        expect(content).toContain(SENTINEL);
      });

      it('names the AGENTS.md section to read', () => {
        expect(content).toContain(EXECUTION_PROFILE_HEADING);
      });

      it('states the fallback: no section or swarms off means no line', () => {
        const idx = content.indexOf(SENTINEL);
        const window = content.slice(idx, idx + 1200);
        expect(window).toMatch(/add no line|no line/i);
        expect(window).toMatch(/missing|absent/i);
      });

      it('requires the profile be quoted verbatim', () => {
        const idx = content.indexOf(SENTINEL);
        expect(content.slice(idx, idx + 1200)).toMatch(/verbatim/i);
      });

      it('introduces the Execution: line as part of the briefing', () => {
        expect(content).toMatch(/\*\*Execution:\*\*|Execution: /);
      });
    });
  }

  describe('joycraft-implement-feature', () => {
    const content = read('joycraft-implement-feature');

    it('honors an Execution: line from the invoking prompt', () => {
      expect(content).toMatch(/Execution:/);
    });

    it('maps the line onto subagent model and effort spawn params', () => {
      const idx = content.indexOf('Execution:');
      const window = content.slice(Math.max(0, idx - 400), idx + 900);
      expect(window).toMatch(/model/i);
      expect(window).toMatch(/effort/i);
    });

    it('states the inherit-the-session default when no line is present', () => {
      const idx = content.indexOf('Execution:');
      const window = content.slice(Math.max(0, idx - 400), idx + 900);
      expect(window).toMatch(/inherit/i);
    });

    it('never recommends a model — the profile is data only', () => {
      expect(content).not.toMatch(/recommend(ed)? model|suggest a model/i);
    });
  });

  describe('briefing budget', () => {
    // Same fence scan as tests/handoff-briefing-prompts.test.ts: bare ```
    // fences whose body carries the Done-when slot.
    function briefingFences(content: string): string[] {
      const fences: string[] = [];
      let open: { info: string; body: string[] } | null = null;
      for (const line of content.split('\n')) {
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

    for (const name of BRIEFING_SKILLS) {
      it(`${name}: briefings stay within the 8-line budget with the Execution line`, () => {
        const fences = briefingFences(read(name));
        expect(fences.length).toBeGreaterThanOrEqual(2);
        for (const fence of fences) {
          const nonEmpty = fence.split('\n').filter((l) => l.trim() !== '');
          expect(nonEmpty.length, `${name}: briefing exceeds the 8-line cap`).toBeLessThanOrEqual(
            8,
          );
        }
      });

      it(`${name}: the filled example carries an Execution line`, () => {
        const filled = briefingFences(read(name)).filter((f) => !f.includes('<'));
        expect(filled.length).toBeGreaterThanOrEqual(1);
        expect(
          filled.some((f) => /^Execution: /m.test(f)),
          `${name}: no filled example shows the Execution line`,
        ).toBe(true);
      });
    }
  });
});
