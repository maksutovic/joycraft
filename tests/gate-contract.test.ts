import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/**
 * The succinct-gates contract, asserted in one place.
 *
 * Specs 1–4, 7 and 9 each ship their own deep test file (template shape, slot
 * placement, render steps, the decide rule, briefings, the execution profile).
 * Those files prove each mechanism is correct *in detail*. This file proves the
 * six mechanisms are all still *present together* on the roster of skills the
 * brief named — the cross-cutting view no single-spec file has.
 *
 * Why it exists: the 0.7.3 incident shipped twelve stale skills because nothing
 * mechanical guarded the contract. Prose regresses silently; a string assertion
 * does not. Deleting any one marker from any rostered skill turns this file red.
 *
 * Deliberate ceiling (RF-KILL-2): presence and heading anchoring only. No prose
 * quality, no tone, no length, and — critically — no character-offset windows.
 * The heading-anchor helper is mirrored from `tests/output-style-pointer.test.ts`
 * rather than inventing a second idiom.
 *
 * Reads the canonical `src/skills/` sources only. The generated and installed
 * trees are already guarded by the byte-match parity tests.
 */

const read = (name: string) =>
  readFileSync(join(repoRoot, 'src', 'skills', `${name}.md`), 'utf-8');

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every occurrence index of a literal marker. */
const occurrences = (content: string, marker: string) =>
  [...content.matchAll(new RegExp(escapeRe(marker), 'g'))].map((m) => m.index as number);

/**
 * Nearest preceding markdown heading for an index — the anchoring idiom from
 * `tests/output-style-pointer.test.ts`. A plain index comparison, NOT a windowed
 * character slice: no new fragile windows enter the suite through this file.
 */
const headingAt = (content: string, index: number) =>
  (content.slice(0, index).match(/^#{1,4} .*$/gm) ?? []).at(-1) ?? '';

// ---------------------------------------------------------------------------
// The roster
// ---------------------------------------------------------------------------

/**
 * Expected marker counts are explicit, never "exactly once".
 *
 * The spec's What section said "exactly once", but the canonical sources
 * legitimately carry several gate moments per skill, so a blanket once-rule
 * would fail correct skills:
 *
 *  - new-feature: two gates (Phase 2 brief, Phase 4 hand-off).
 *  - research: three per-harness blocks (claude, codex|copilot, pi), one gate
 *    each; a single shared block would vanish from the other emitted variants.
 *
 * Pinning the exact number still catches the drift the spec's Edge Cases table
 * cares about — a copy-pasted duplicate moves the count and fails.
 */
const SLOT_TEMPLATE_SKILLS: Record<string, number> = {
  'joycraft-new-feature': 2,
  'joycraft-design': 1,
  'joycraft-decompose': 1,
  'joycraft-research': 3,
  'joycraft-decide': 1,
  'joycraft-tune': 1,
  'joycraft-optimize': 1,
  // Eighth gate, added 2026-07-29: the interview's draft brief is a review
  // gate too — field-verified on diligent-cwt when the human had to ask for
  // the artifact the other seven gates already produce.
  'joycraft-interview': 1,
};

/** Render-step skills: all eight gates except decide, which renders a dossier. */
const RENDER_SKILLS: Record<string, number> = {
  'joycraft-new-feature': 1,
  'joycraft-design': 1,
  'joycraft-decompose': 1,
  'joycraft-research': 3,
  'joycraft-tune': 1,
  'joycraft-optimize': 1,
  'joycraft-interview': 1,
};

/** Question-bearing skills that must terminate decisions before presenting. */
const PRE_PRESENTATION_SKILLS = [
  'joycraft-new-feature',
  'joycraft-design',
  'joycraft-decompose',
  'joycraft-research',
  'joycraft-bugfix',
] as const;

/** Skills that hand a pasteable briefing back to the human. */
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

/** Skills wired to the Execution Profile region of the boundary file. */
const EXECUTION_PROFILE_SKILLS = [
  'joycraft-decompose',
  'joycraft-new-feature',
  'joycraft-implement-feature',
] as const;

const CAP_SENTENCE = 'Ten lines maximum';
const TEMPLATE = 'REVIEW_GATE_TEMPLATE.html';
const HEADLESS = 'print the absolute path and continue';
const PRE_PRESENTATION = 'before presenting';
const BRIEFING_MARKER = 'Done when:';
const SENTINEL = 'joycraft:execution-profile';

/** Headings that constitute a gate's output moment. */
const OUTPUT_MOMENT = /report|present|render|hand ?off|gate|brief|design|decompos|research|assessment|overhead|decision/i;

// ---------------------------------------------------------------------------
// Group 1 — slot template presence
// ---------------------------------------------------------------------------

describe('group 1: every gate skill carries the inline slot template', () => {
  for (const [name, expected] of Object.entries(SLOT_TEMPLATE_SKILLS)) {
    it(`${name}.md carries the cap sentence at each of its ${expected} gate(s)`, () => {
      expect(occurrences(read(name), CAP_SENTENCE)).toHaveLength(expected);
    });

    it(`${name}.md anchors every slot template under an output-moment heading`, () => {
      const content = read(name);
      const sited = occurrences(content, CAP_SENTENCE).map((i) => headingAt(content, i));
      expect(sited.length, 'template present').toBeGreaterThan(0);
      for (const heading of sited) {
        expect(
          OUTPUT_MOMENT.test(heading),
          `slot template in ${name} sits under a non-gate heading: ${JSON.stringify(heading)}`,
        ).toBe(true);
      }
    });
  }

  it('covers the seven gate skills the brief named plus interview (follow-on)', () => {
    expect(Object.keys(SLOT_TEMPLATE_SKILLS)).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// Group 2 — render step presence
// ---------------------------------------------------------------------------

describe('group 2: every render-step skill cites the shared template', () => {
  for (const [name, expected] of Object.entries(RENDER_SKILLS)) {
    it(`${name}.md reads ${TEMPLATE} at each gate`, () => {
      expect(occurrences(read(name), TEMPLATE)).toHaveLength(expected);
    });

    it(`${name}.md degrades headlessly rather than failing`, () => {
      expect(occurrences(read(name), HEADLESS).length).toBeGreaterThanOrEqual(expected);
    });

    it(`${name}.md states the markdown stays canonical (D4)`, () => {
      // D4: the md is the record, the HTML is a render. Asserted within the
      // render block, anchored by its heading — never by character offset.
      const content = read(name);
      for (const index of occurrences(content, TEMPLATE)) {
        const heading = headingAt(content, index);
        expect(
          OUTPUT_MOMENT.test(heading),
          `render step in ${name} sits under ${JSON.stringify(heading)}`,
        ).toBe(true);
        const block = content.slice(index, content.indexOf('\n## ', index) + 1 || undefined);
        expect(block.toLowerCase()).toContain('canonical');
      }
    });
  }

  it('covers the seven render skills — decide is excluded by design', () => {
    expect(Object.keys(RENDER_SKILLS)).toHaveLength(7);
    expect(Object.keys(RENDER_SKILLS)).not.toContain('joycraft-decide');
  });

  it('joycraft-decide renders its dossier, not the review-gate template', () => {
    expect(read('joycraft-decide')).not.toContain(TEMPLATE);
  });
});

// ---------------------------------------------------------------------------
// Group 3 — decide pre-presentation rule
// ---------------------------------------------------------------------------

describe('group 3: question-bearing skills terminate decisions before presenting', () => {
  for (const name of PRE_PRESENTATION_SKILLS) {
    it(`${name}.md states the rule fires before presenting`, () => {
      expect(read(name)).toContain(PRE_PRESENTATION);
    });
  }

  it('covers exactly the five question-bearing skills', () => {
    expect(PRE_PRESENTATION_SKILLS).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// Group 4 — handoff briefing presence
// ---------------------------------------------------------------------------

describe('group 4: every handoff skill ships a briefing block', () => {
  for (const name of HANDOFF_SKILLS) {
    it(`${name}.md carries the briefing marker inside a fenced block`, () => {
      const content = read(name);
      const hits = occurrences(content, BRIEFING_MARKER);
      expect(hits.length, 'briefing marker present').toBeGreaterThan(0);

      // Fences are counted line-by-line: these files carry info-string fences
      // (```bash, ```markdown) and pairing bare delimiters by regex mis-aligns.
      const fenced = hits.filter((index) => {
        const before = content.slice(0, index).split('\n');
        const opens = before.filter((l) => l.trimStart().startsWith('```')).length;
        return opens % 2 === 1;
      });
      expect(
        fenced.length,
        `${name}: briefing marker present but never inside a fence`,
      ).toBeGreaterThan(0);
    });

    it(`${name}.md ships both a template and a filled example`, () => {
      // Two occurrences by design: the placeholder template plus a worked,
      // gate-specific example a cold agent can pattern-match against.
      expect(occurrences(read(name), BRIEFING_MARKER).length).toBeGreaterThanOrEqual(2);
    });
  }

  it('covers exactly the eight handoff-emitting skills', () => {
    expect(HANDOFF_SKILLS).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// Group 5 — execution-profile injection
// ---------------------------------------------------------------------------

describe('group 5: execution profile reaches the skills that spawn or hand off', () => {
  for (const name of EXECUTION_PROFILE_SKILLS) {
    it(`${name}.md references the ${SENTINEL} sentinel`, () => {
      expect(read(name)).toContain(SENTINEL);
    });
  }

  it('joycraft-implement-feature maps the line onto spawn params', () => {
    const content = read('joycraft-implement-feature');
    expect(content).toContain('Execution:');
    expect(content).toMatch(/\bmodel\b/);
    expect(content).toMatch(/\beffort\b/);
    expect(content).toMatch(/spawn param/i);
  });

  it('covers exactly the three execution-profile skills', () => {
    expect(EXECUTION_PROFILE_SKILLS).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Group 6 — negative control
// ---------------------------------------------------------------------------

describe('group 6: joycraft-setup is a router and carries no gate machinery', () => {
  // Same exclusion logic as `tests/output-style-pointer.test.ts`: setup is an
  // 18-line router with no output moment of its own. If a marker ever lands
  // here, the contract has been applied by pattern-match rather than by intent.
  const markers = {
    'slot template': CAP_SENTENCE,
    'render step': TEMPLATE,
    'headless no-op': HEADLESS,
    'pre-presentation rule': PRE_PRESENTATION,
    'execution-profile sentinel': SENTINEL,
  };

  for (const [label, marker] of Object.entries(markers)) {
    it(`joycraft-setup carries no ${label}`, () => {
      expect(read('joycraft-setup')).not.toContain(marker);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 7 — interview playback & question contract (follow-on, 2026-07-29)
// ---------------------------------------------------------------------------

describe('group 7: interview carries the playback and question contract', () => {
  const content = () => read('joycraft-interview');

  it('carries the fixed-slot playback under the playback heading', () => {
    const c = content();
    for (const marker of ['Mission: <1 line>', 'Confirm or correct — then I write the draft.']) {
      const hits = occurrences(c, marker);
      expect(hits.length, `${marker} present`).toBe(1);
      expect(/play ?back/i.test(headingAt(c, hits[0]))).toBe(true);
    }
  });

  it('states the playback is a blocking gate', () => {
    expect(content()).toContain('blocking gate');
  });

  it('carries the never-relist and three-line question rules', () => {
    const c = content();
    expect(c).toContain('Never re-list an open question');
    expect(c).toContain('Accept, override, or park?');
  });

  it('keeps the per-turn cap out — batching is protected behavior', () => {
    expect(content()).toContain('No per-turn cap');
  });

  it('delegates no playback volume to the style pointer (pointer sits at other moments)', () => {
    // The pointer mechanism was the root cause of the 2026-07-29 playback
    // wall; volume and placement now live in the inline template. The two
    // remaining citations (hand-off tone, draft-brief guideline) are asserted
    // by tests/style-pointer-placement.test.ts — here we only pin that none
    // sits under the playback heading.
    const c = content();
    for (const index of occurrences(c, 'output-style.md')) {
      expect(/play ?back/i.test(headingAt(c, index))).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Group 8 — question directive (harden-question-directive, 2026-07-31)
// ---------------------------------------------------------------------------

/**
 * Every human-facing question moment in the five gate skills must route through
 * the harness's native question UI: the AskUserQuestion tool on claude, the
 * structured chat fallback on codex/pi/copilot. Before this spec only
 * `joycraft-decide` said so, and users intermittently got plain Q1/Q2/Q3 chat
 * lists — the top complaint in the 2026-07-31 team-usage feedback.
 *
 * Asserted on the *generated* trees, not just the canonical source: the whole
 * point is that the claude variant carries the tool name and the codex/pi
 * variants carry the fallback instead, which only the per-harness render shows.
 */
const QUESTION_DIRECTIVE_SKILLS = [
  'joycraft-interview',
  'joycraft-new-feature',
  'joycraft-tune',
  'joycraft-design',
  'joycraft-bugfix',
] as const;

const readVariant = (harness: string, name: string) =>
  readFileSync(join(repoRoot, 'src', `${harness}-skills`, `${name}.md`), 'utf-8');

const QUESTION_TOOL = 'AskUserQuestion';
const FALLBACK_MARKER = 'structured forced-choice questions asked directly in chat';
const TWO_OPTION_RULE = 'Every question has ≥2 real options';
const PATTERN_B = '<choice> because';

describe('group 8: every gate skill carries the question directive', () => {
  for (const name of QUESTION_DIRECTIVE_SKILLS) {
    it(`${name}.md directs the claude variant to the ${QUESTION_TOOL} tool`, () => {
      expect(readVariant('claude', name)).toContain(QUESTION_TOOL);
    });

    for (const harness of ['codex', 'pi', 'copilot']) {
      it(`${name}.md gives the ${harness} variant the chat fallback, not the tool`, () => {
        const content = readVariant(harness, name);
        expect(content, `${harness} variant must not name a claude-only tool`).not.toContain(
          QUESTION_TOOL,
        );
        expect(content).toContain(FALLBACK_MARKER);
      });
    }

    it(`${name}.md states the two-option minimum and Pattern B wording`, () => {
      // Asserted on the canonical source: both rules are harness-independent
      // prose and must survive into every variant.
      const content = read(name);
      expect(content).toContain(TWO_OPTION_RULE);
      expect(content).toContain(PATTERN_B);
    });
  }

  it('covers exactly the five gate skills the spec named', () => {
    expect(QUESTION_DIRECTIVE_SKILLS).toHaveLength(5);
  });

  it('joycraft-decide still carries the directive it set the pattern for', () => {
    expect(readVariant('claude', 'joycraft-decide')).toContain(QUESTION_TOOL);
    expect(readVariant('codex', 'joycraft-decide')).toContain(FALLBACK_MARKER);
  });
});

// ---------------------------------------------------------------------------
// Roster drift
// ---------------------------------------------------------------------------

describe('roster drift', () => {
  /**
   * The spec's Edge Cases table calls this out: the test is allowlist-driven,
   * so a future eighth gate skill added without markers is NOT caught here.
   * This assertion at least fails loudly when a *rostered* skill disappears or
   * is renamed, which is the drift mode that actually shipped in 0.7.3.
   */
  const rostered = new Set([
    ...Object.keys(SLOT_TEMPLATE_SKILLS),
    ...Object.keys(RENDER_SKILLS),
    ...PRE_PRESENTATION_SKILLS,
    ...HANDOFF_SKILLS,
    ...EXECUTION_PROFILE_SKILLS,
    ...QUESTION_DIRECTIVE_SKILLS,
  ]);

  for (const name of rostered) {
    it(`${name}.md exists under src/skills/`, () => {
      expect(() => read(name)).not.toThrow();
    });
  }
});
