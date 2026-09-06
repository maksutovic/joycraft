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
 *  - research: three per-harness blocks (claude, codex|copilot|omp, pi), one
 *    gate each; a single shared block would vanish from the other emitted
 *    variants.
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

  it('delegates no playback volume to the style pointer (playback citation is tone-only)', () => {
    // The pointer mechanism was the root cause of the 2026-07-29 playback
    // wall; volume and placement live in the inline template. D6 (2026-08-11,
    // ste-human-output) adds a tone-only citation at the playback gate, so a
    // citation may sit under the playback heading ONLY if it delegates tone
    // alone — its sentence must keep volume and placement with the template.
    const c = content();
    for (const index of occurrences(c, 'output-style.md')) {
      if (/play ?back/i.test(headingAt(c, index))) {
        const sentence = c.slice(Math.max(0, index - 200), index + 200);
        expect(
          sentence,
          'playback citation must pin volume and placement to the inline template',
        ).toContain('volume and placement are fixed');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Group 8 — question directive (harden-question-directive, 2026-07-31)
// ---------------------------------------------------------------------------

/**
 * Every human-facing question moment in the five gate skills must route through
 * the harness's native question UI: the AskUserQuestion tool on claude, the
 * structured chat fallback on codex/pi/copilot/omp. Before this spec only
 * `joycraft-decide` said so, and users intermittently got plain Q1/Q2/Q3 chat
 * lists — the top complaint in the 2026-07-31 team-usage feedback.
 *
 * Asserted on the *generated* trees, not just the canonical source: the whole
 * point is that the claude variant carries the tool name and the four
 * non-claude variants carry the fallback instead, which only the per-harness
 * render shows.
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

    for (const harness of ['codex', 'pi', 'copilot', 'omp']) {
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
// Group 10 — execution-profile offer asks model and effort (fix-model-question-skip)
// ---------------------------------------------------------------------------

/**
 * A real user answered tune's swarm questions on 2026-07-31 and was never asked
 * model or effort: the offer was one prose paragraph that bundled all four
 * questions into a single sentence, and the trailing free-text clauses got
 * reformatted away. The fix is structural — four separately enumerated question
 * steps — so these assertions pin the enumeration, not the prose around it.
 */
describe('group 10: the execution-profile offer enumerates model and effort', () => {
  /**
   * The offer's question block, sliced by heading rather than by character
   * window (same anchoring rule as the rest of this file): from the offer's
   * bold label to the fenced example section that follows it.
   */
  const offerBlock = () => {
    const c = read('joycraft-tune');
    const start = c.indexOf('**Execution profile offer:**');
    expect(start, 'offer label present').toBeGreaterThan(-1);
    const end = c.indexOf('**Private-profile note:**', start);
    return c.slice(start, end === -1 ? undefined : end);
  };

  it('asks the four questions as separately enumerated steps', () => {
    const block = offerBlock();
    for (const step of ['Q1', 'Q2', 'Q3', 'Q4']) {
      expect(block, `${step} enumerated`).toContain(step);
    }
  });

  it('gives model and effort their own question lines', () => {
    const block = offerBlock();
    const lines = block.split('\n');
    const modelLine = lines.find((l) => /^-?\s*\*\*Q3/.test(l.trim()));
    const effortLine = lines.find((l) => /^-?\s*\*\*Q4/.test(l.trim()));
    expect(modelLine, 'Q3 is its own line').toBeTruthy();
    expect(effortLine, 'Q4 is its own line').toBeTruthy();
    expect(modelLine!.toLowerCase()).toContain('model');
    expect(effortLine!.toLowerCase()).toContain('effort');
    // The regression shape: model and effort riding as trailing clauses of the
    // same sentence as the swarm questions.
    expect(modelLine).not.toMatch(/swarm/i);
    expect(effortLine).not.toMatch(/swarm/i);
  });

  it('routes the offer through the question directive', () => {
    const block = offerBlock();
    expect(block).toMatch(/question directive/i);
  });

  it('keeps model and effort free text with the session default offered', () => {
    // Whitespace-collapsed: the canonical source is hard-wrapped at ~78 cols,
    // so a sentence-level assertion must not depend on where a line breaks.
    const block = offerBlock().replace(/\s+/g, ' ');
    expect(block).toContain('session default');
    expect(block).toMatch(/free text/i);
    expect(block).toMatch(/never present a menu of model names/i);
  });

  it('states the questions are asked even when every swarm answer is no', () => {
    expect(offerBlock()).toMatch(/never skipped|even if|regardless/i);
  });

  it('reaches the claude variant with the question tool named', () => {
    const variant = readVariant('claude', 'joycraft-tune');
    expect(variant).toContain('**Q3');
    expect(variant).toContain('**Q4');
    expect(variant).toContain(QUESTION_TOOL);
  });
});

// ---------------------------------------------------------------------------
// Group 9 — custom output templates (support-custom-output-templates, 2026-07-31)
// ---------------------------------------------------------------------------

/**
 * A team with its own PRD format drops it into `docs/templates/output/` and the
 * document-producing gates follow it instead of the bundled structure. The
 * lookup is a skill instruction, not code: rendering stays agent-hand-filled
 * (no md→HTML library, AGENTS.md NEVER on runtime deps), so what we can assert
 * mechanically is that every document-producing gate *tells the agent to look*.
 *
 * Anchored by heading like the rest of this file — the lookup has to sit at the
 * skill's output moment, not in an unrelated preamble where it would never fire.
 */
const CUSTOM_TEMPLATE_SKILLS = [
  'joycraft-interview',
  'joycraft-new-feature',
  'joycraft-design',
  'joycraft-bugfix',
] as const;

const OUTPUT_DIR = 'docs/templates/output/';
const SKELETON_RULE = 'inside the slot regions';
const FALLBACK_RULE = 'bundled structure below unchanged';

describe('group 9: document-producing gates check for a custom output template', () => {
  for (const name of CUSTOM_TEMPLATE_SKILLS) {
    it(`${name}.md points at ${OUTPUT_DIR}`, () => {
      expect(occurrences(read(name), OUTPUT_DIR).length).toBeGreaterThan(0);
    });

    it(`${name}.md sites the lookup at an output moment`, () => {
      const content = read(name);
      const sited = occurrences(content, OUTPUT_DIR).map((i) => headingAt(content, i));
      for (const heading of sited) {
        expect(
          OUTPUT_MOMENT.test(heading),
          `custom-template lookup in ${name} sits under ${JSON.stringify(heading)}`,
        ).toBe(true);
      }
    });

    it(`${name}.md states the absent-template fallback`, () => {
      expect(read(name)).toContain(FALLBACK_RULE);
    });

    it(`${name}.md keeps custom sections inside the locked skeleton`, () => {
      expect(read(name)).toContain(SKELETON_RULE);
    });

    it(`${name}.md keeps the machine-required sections regardless`, () => {
      // Edge case from the spec: a custom template that omits frontmatter or the
      // decisions block must not cost Joycraft the sections downstream skills parse.
      expect(read(name).toLowerCase()).toContain('frontmatter is always written');
    });
  }

  it('covers exactly the four document-producing gates', () => {
    expect(CUSTOM_TEMPLATE_SKILLS).toHaveLength(4);
  });

  it('matches templates by exact filename — no fuzzy matching', () => {
    // Ambiguity edge case: unmatched files are ignored rather than guessed at.
    for (const name of CUSTOM_TEMPLATE_SKILLS) {
      expect(read(name)).toContain('exact filename match');
    }
  });

  it('names no absolute paths in the lookup instruction', () => {
    // Skills are copied into user projects; an absolute path would be a dead
    // reference there (AGENTS.md NEVER: reference absolute paths).
    for (const name of CUSTOM_TEMPLATE_SKILLS) {
      const content = read(name);
      for (const index of occurrences(content, OUTPUT_DIR)) {
        const line = content.slice(content.lastIndexOf('\n', index) + 1, content.indexOf('\n', index));
        expect(line).not.toMatch(/\/Users\/|\/home\/|^\s*-?\s*`?\//);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Group 11 — defer-to-person (add-defer-to-person, 2026-07-31)
// ---------------------------------------------------------------------------

/**
 * "Defer to <name>" is a first-class answer at every gate question: the
 * question terminates as assigned instead of looping, the artifact carries an
 * "Open Questions — Assigned" section, and the gate HTML tags the assignee on
 * the existing `.q`/`.qnum` card — no new CSS. Praful's team flow assigns
 * questions to people who aren't in the session; before this spec a question
 * could only be answered or parked, so assignment lived in his head.
 */
const DEFER_SKILLS = [
  'joycraft-interview',
  'joycraft-new-feature',
  'joycraft-tune',
  'joycraft-design',
  'joycraft-bugfix',
  'joycraft-decide',
] as const;

/** The defer skills whose gates render the review-gate HTML (bugfix and decide do not). */
const DEFER_RENDER_SKILLS = [
  'joycraft-interview',
  'joycraft-new-feature',
  'joycraft-tune',
  'joycraft-design',
] as const;

const DEFER_MARKER = 'defer to <name>';
const ASSIGNED_SECTION = 'Open Questions — Assigned';
const DEFER_CONFIRM = 'who, which question, where it was recorded';
const ASSIGNEE_TAG = '· assigned:';

describe('group 11: defer-to-person is a first-class answer at every gate', () => {
  for (const name of DEFER_SKILLS) {
    it(`${name}.md terminates a defer answer as assigned, into the assigned section`, () => {
      const content = read(name);
      expect(content).toContain(DEFER_MARKER);
      expect(content).toContain(ASSIGNED_SECTION);
    });

    it(`${name}.md mandates the one-line visible confirmation`, () => {
      // D11: silent file mutation on a conversational shortcut is the known
      // failure mode — the confirmation line is a MUST, not a nicety.
      // Whitespace-collapsed (group 10 precedent): the sources are hard-wrapped
      // at ~78 cols, so sentence-level markers must not depend on line breaks.
      expect(read(name).replace(/\s+/g, ' ')).toContain(DEFER_CONFIRM);
    });

    it(`${name}.md refuses anonymous assignments and backlog auto-writes`, () => {
      const content = read(name);
      expect(content).toContain('never an anonymous assignment');
      expect(content).toContain('Assignment is not backlogging');
    });

    it(`${name}.md carries the defer block into the claude variant`, () => {
      // Harness-independent prose: it must survive the per-harness render.
      const variant = readVariant('claude', name);
      expect(variant).toContain(DEFER_MARKER);
      expect(variant).toContain(ASSIGNED_SECTION);
    });
  }

  for (const name of DEFER_RENDER_SKILLS) {
    it(`${name}.md renders assigned cards on the existing classes only`, () => {
      const content = read(name);
      const collapsed = content.replace(/\s+/g, ' ');
      expect(content).toContain('.qnum');
      expect(collapsed).toContain(ASSIGNEE_TAG);
      expect(collapsed).toMatch(/no new CSS class/i);
      expect(content).not.toContain('.assignee');
    });
  }

  it('joycraft-decide adds assigned to the termination vocabulary, non-blocking', () => {
    const content = read('joycraft-decide');
    expect(content).toContain('`assigned`');
    expect(content.replace(/\s+/g, ' ')).toContain(
      'treats `assigned` like `backlogged` only when the human explicitly proceeds',
    );
  });

  it('the review-gate template documents the assignee tag on the qnum slot', () => {
    // Slot-comment guidance only — the skeleton and CSS stay untouched, which
    // tests/review-gate-template.test.ts pins structurally.
    const template = readFileSync(
      join(repoRoot, 'src', 'templates', 'REVIEW_GATE_TEMPLATE.html'),
      'utf-8',
    );
    expect(template).toContain('· assigned:');
  });

  it('covers exactly the six gate skills the spec named', () => {
    expect(DEFER_SKILLS).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Group 12 — implementing-agent handoff prompt (add-agent-handoff-slot, 2026-07-31)
// ---------------------------------------------------------------------------

/**
 * Briefs from the interview and new-feature gates end with a "Prompt for the
 * implementing agent" section: a fenced, self-contained briefing a PM hands to
 * an engineer to paste straight into their coding agent. Same briefing grammar
 * as every Joycraft handoff (picking-up, decisions, start, hazard, done-when),
 * but retargeted at the user's engineer — Praful builds this block by hand for
 * every PRD today.
 */
const HANDOFF_SLOT_SKILLS = ['joycraft-interview', 'joycraft-new-feature'] as const;

const HANDOFF_SECTION = 'Prompt for the implementing agent';
const HANDOFF_INSTRUCTION_HEADING = '### The "Prompt for the implementing agent" section';
const BRIEFING_LINES = ['You are picking up', 'Decisions', 'Start:', 'Hazard:', 'Done when:'];

/** The instruction block, sliced heading-to-heading (group 10 precedent). */
const handoffBlock = (name: string) => {
  const content = read(name);
  const start = content.indexOf(HANDOFF_INSTRUCTION_HEADING);
  expect(start, `${name}: handoff instruction heading present`).toBeGreaterThan(-1);
  const rest = content.slice(start + HANDOFF_INSTRUCTION_HEADING.length);
  const next = rest.search(/\n#{2,3} /);
  return rest.slice(0, next === -1 ? undefined : next);
};

describe('group 12: briefs carry the implementing-agent handoff prompt', () => {
  for (const name of HANDOFF_SLOT_SKILLS) {
    it(`${name}.md puts the handoff section in the brief structure`, () => {
      expect(read(name)).toContain(`## ${HANDOFF_SECTION}`);
    });

    it(`${name}.md carries the section into the claude variant`, () => {
      expect(readVariant('claude', name)).toContain(HANDOFF_SECTION);
    });

    it(`${name}.md enumerates the five briefing lines in the instruction`, () => {
      const block = handoffBlock(name);
      for (const line of BRIEFING_LINES) {
        expect(block, `${name}: briefing line ${JSON.stringify(line)}`).toContain(line);
      }
    });

    it(`${name}.md keeps the prompt actionable by a cold agent without Joycraft`, () => {
      const block = handoffBlock(name).replace(/\s+/g, ' ');
      expect(block).toContain('cold agent');
      expect(block).toContain('no Joycraft installed');
      expect(block).toMatch(/project-relative/);
    });

    it(`${name}.md refuses to pretend readiness over open or assigned questions`, () => {
      expect(handoffBlock(name).replace(/\s+/g, ' ')).toContain('Do not start until');
    });

    it(`${name}.md appends the handoff after a custom output template's structure`, () => {
      // D3: machine-required sections survive a custom template — the handoff
      // prompt joins Open Questions and decisions on that list.
      expect(read(name).replace(/\s+/g, ' ')).toContain('implementing-agent prompt');
    });
  }

  it('the interview draft carries the slot too, marked draft-stage', () => {
    expect(handoffBlock('joycraft-interview').replace(/\s+/g, ' ')).toContain('draft');
  });

  it('covers exactly the two brief-producing gates', () => {
    expect(HANDOFF_SLOT_SKILLS).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Group 13 — stamped artifacts + persisted auto-open (stamp-gate-artifacts, 2026-07-31)
// ---------------------------------------------------------------------------

/**
 * With many gate tabs open across six projects there was no way to tell which
 * render is latest, and auto-open was forced on. Every render-and-open gate now
 * stamps a generation timestamp + revision integer into the existing
 * eyebrow/footer slot regions (revision read from the previous render's footer
 * — no new state file, D13), and checks the persisted `autoOpen` flag in
 * `docs/.joycraft/state.json` before opening (D6/D12).
 *
 * Roster note: the spec's Affected Files list named bugfix, but bugfix has no
 * render/open step to stamp — the six below are the gates that actually render.
 */
const STAMP_SKILLS = [
  'joycraft-interview',
  'joycraft-new-feature',
  'joycraft-tune',
  'joycraft-design',
  'joycraft-decide',
  'joycraft-decompose',
] as const;

describe('group 13: gate artifacts are stamped and auto-open is a setting', () => {
  for (const name of STAMP_SKILLS) {
    it(`${name}.md stamps timestamp + revision through the existing slots`, () => {
      const collapsed = read(name).replace(/\s+/g, ' ');
      expect(collapsed).toContain('generation timestamp');
      expect(collapsed).toContain("previous render's footer");
      expect(collapsed).toContain('revision 1');
      expect(collapsed).toContain('never fail the render');
    });

    it(`${name}.md keeps filenames stable across revisions`, () => {
      expect(read(name).replace(/\s+/g, ' ')).toContain('filename never changes');
    });

    it(`${name}.md checks autoOpen before opening, defaulting to true`, () => {
      const collapsed = read(name).replace(/\s+/g, ' ');
      expect(collapsed).toContain('`autoOpen`');
      expect(collapsed).toContain('docs/.joycraft/state.json');
      expect(collapsed).toContain('missing file or key = true');
    });
  }

  it('joycraft-tune offers the autoOpen toggle', () => {
    expect(read('joycraft-tune').replace(/\s+/g, ' ')).toContain('flip `autoOpen`');
  });

  it('the template documents the stamp in its slot comments only', () => {
    const template = readFileSync(
      join(repoRoot, 'src', 'templates', 'REVIEW_GATE_TEMPLATE.html'),
      'utf-8',
    ).replace(/\s+/g, ' ');
    expect(template).toContain('rev N');
    expect(template).toContain('increments');
  });

  it('covers exactly the six render-and-open gate skills', () => {
    expect(STAMP_SKILLS).toHaveLength(6);
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
    ...CUSTOM_TEMPLATE_SKILLS,
    ...DEFER_SKILLS,
    ...HANDOFF_SLOT_SKILLS,
    ...STAMP_SKILLS,
  ]);

  for (const name of rostered) {
    it(`${name}.md exists under src/skills/`, () => {
      expect(() => read(name)).not.toThrow();
    });
  }
});
