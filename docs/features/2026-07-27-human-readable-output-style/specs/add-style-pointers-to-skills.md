---
status: done
owner: Maximilian Maksutovic
created: 2026-07-27
feature: 2026-07-27-human-readable-output-style
mode: isolated
---

# Add Style Pointers to Skills — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md`
> **Status:** Ready
> **Date:** 2026-07-27
> **Estimated scope:** 1 session / 11 files edited / ~11-22 lines added total

---

## What

Add a one-line citation to `docs/templates/reference/output-style.md` at the
human-facing output moment of eleven canonical skills in `src/skills/`. The
pointer names the doc by path and defers to it — it does not restate any rule.

The eleven skills: `joycraft-tune`, `joycraft-session-end`, `joycraft-decompose`,
`joycraft-design`, `joycraft-new-feature`, `joycraft-implement-feature`,
`joycraft-optimize`, `joycraft-verify`, `joycraft-decide`, `joycraft-interview`,
`joycraft-bugfix`. `joycraft-setup` is deliberately excluded.

Edits land in `src/skills/` only. This spec does NOT regenerate the bundle and
does NOT sync installed copies — spec 6 owns both, and running them here would
split the regeneration across two commits.

## Why

A reference doc that no skill cites is a doc no agent reads at the moment it
matters. `docs/reference/skill-authoring.md` is the live precedent in this repo:
it exists, it is well-written, and zero skills link to it. Without pointers, the
style contract ships as decoration.

## Acceptance Criteria

- [ ] All eleven named skills in `src/skills/` cite `docs/templates/reference/output-style.md` by path. [src: D7]
- [ ] `src/skills/joycraft-setup.md` is NOT edited and does NOT cite the style doc. [src: D7]
- [ ] Each pointer is a single line that names the doc and defers to it. [src: design §2 item 2]
- [ ] No skill body restates, paraphrases, or inlines any rule from the style doc. [src: design §2 item 2]
- [ ] Each pointer sits at or immediately before that skill's human-facing output moment. [src: design §2 item 2]
- [ ] Each pointer cites the user-project path `docs/templates/reference/output-style.md`, never `src/templates/...`. [src: D1]
- [ ] `tests/retrieval-pass-skill.test.ts` passes unchanged. [src: brief "Hard Constraints"]
- [ ] `tests/confidence-scoring-skill.test.ts` passes unchanged. [src: brief "Hard Constraints"]
- [ ] `tests/skill-handoff.test.ts` passes unchanged. [src: brief "Hard Constraints"]
- [ ] No new user-invocable skill is created and no skill's `entry:` frontmatter value changes. [src: brief "Hard Constraints"]
- [ ] No skill gains a rubric or self-scoring instruction. [src: design §4 "Do not add a rubric self-scoring loop"]
- [ ] `pnpm test --run` passes. [src: brief "Success Criteria"]
- [ ] `pnpm typecheck` passes. [src: brief "Success Criteria"]

## Test Plan

Spec 4 (`test-style-pointer-presence`) owns the new presence assertions. This
spec's own test burden is the *regression* surface: the position-fragile windowed
tests must survive the edits.

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Pointers present in all 11 | Presence assertion — owned by spec 4 | unit |
| setup excluded | Negative assertion — owned by spec 4 | unit |
| Windowed retrieval assertions survive | `pnpm test --run retrieval-pass-skill` | unit |
| Windowed confidence assertions survive | `pnpm test --run confidence-scoring-skill` | unit |
| Handoff block shape survives | `pnpm test --run skill-handoff` | unit |
| Frontmatter contracts survive | `pnpm test --run skill-frontmatter` | unit |
| Whole suite green | `pnpm test --run` | integration |
| Types green | `pnpm typecheck` | unit |

**Execution order:**

1. Run `pnpm test --run` FIRST and record a green baseline. This spec's main risk
   is regression, so an attributable starting point is not optional.
2. Edit one skill. Re-run the three fragile suites
   (`retrieval-pass-skill`, `confidence-scoring-skill`, `skill-handoff`).
3. Repeat per skill. Do not batch all eleven edits and then test once — when a
   1500-char window breaks, you want to know which edit broke it.

**Smoke test:** `pnpm test --run retrieval-pass-skill confidence-scoring-skill` —
the two position-fragile suites, seconds to run, and the ones most likely to
break.

**Before implementing, verify your test harness:**

1. Run the fragile suites BEFORE any edit and confirm they pass — a green
   baseline is what makes a later failure attributable to a specific edit.
2. Confirm those suites read `.claude/skills/<name>/SKILL.md` (installed copies),
   NOT `src/skills/`. Edits to `src/skills/` alone will not move them until spec
   6 syncs the installed copies. Do not interpret their unchanged state as proof
   the edits are safe.
3. Identify your smoke test — the two windowed suites, seconds not minutes.

## Constraints

- MUST edit exactly these eleven files under `src/skills/`: `joycraft-tune.md`, `joycraft-session-end.md`, `joycraft-decompose.md`, `joycraft-design.md`, `joycraft-new-feature.md`, `joycraft-implement-feature.md`, `joycraft-optimize.md`, `joycraft-verify.md`, `joycraft-decide.md`, `joycraft-interview.md`, `joycraft-bugfix.md`. [src: D7]
- MUST NOT edit `src/skills/joycraft-setup.md`. [src: D7]
- MUST cite the path `docs/templates/reference/output-style.md`. [src: D1]
- MUST keep each pointer to a single line that defers to the doc. [src: design §2 item 2]
- MUST place pointers clear of the 1500-char windows sliced from the `Retrieve Before You Reason` heading in `joycraft-research`, `joycraft-design`, and `joycraft-decompose`. [src: brief "Hard Constraints"]
- MUST place pointers clear of the fenced spec-template block sliced from `Use this structure for each spec body:` in `joycraft-design` and `joycraft-new-feature`. [src: brief "Hard Constraints"]
- MUST NOT introduce the word `percentage` into `joycraft-design`, `joycraft-new-feature`, or `joycraft-decide` — a file-wide negative assertion bans it. [src: brief "Hard Constraints"]
- MUST NOT duplicate any style rule into a skill body. [src: design §2 item 2]
- MUST NOT create a new skill or change any `entry:` frontmatter value. [src: brief "Hard Constraints"]
- MUST NOT add a rubric or self-scoring instruction to any skill. [src: design §4 "Do not add a rubric self-scoring loop"]
- MUST NOT edit `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/bundled-files.ts`, or `.claude/skills/` — spec 6 owns all of those. [src: brief "Hard Constraints"]
- MUST NOT change the canonical Handoff block shape asserted by `tests/skill-handoff.test.ts`. [src: design §2 "What does not change"]
- MUST NOT add any runtime dependency. [src: brief "Hard Constraints"]
- MUST NOT fold the existing scattered terseness directives into the pointer or remove them — D5 backlogged that consolidation. [src: D5]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-tune.md` | One-line style-doc pointer at the assessment-report output moment (Steps 4-6). |
| Modify | `src/skills/joycraft-session-end.md` | One-line pointer at the wrap-up report moment (Step 6). |
| Modify | `src/skills/joycraft-decompose.md` | One-line pointer at the decomposition-table presentation (Step 4), clear of the retrieval window. |
| Modify | `src/skills/joycraft-design.md` | One-line pointer at the design-presentation moment (Step 4), clear of both the retrieval window and the spec-template fence. |
| Modify | `src/skills/joycraft-new-feature.md` | One-line pointer at the brief-presentation moment, clear of the spec-template fence. |
| Modify | `src/skills/joycraft-implement-feature.md` | One-line pointer at the per-spec and final report moments. |
| Modify | `src/skills/joycraft-optimize.md` | One-line pointer at the disposition-report moment (Steps 9-11). |
| Modify | `src/skills/joycraft-verify.md` | One-line pointer at the verification-report moment (Step 5). |
| Modify | `src/skills/joycraft-decide.md` | One-line pointer at the dossier/summary moment, without introducing the banned word. |
| Modify | `src/skills/joycraft-interview.md` | One-line pointer at the structured-summary moment. |
| Modify | `src/skills/joycraft-bugfix.md` | One-line pointer at the triage-findings presentation moment. |

## Approach

Follow the established pointer idiom rather than inventing one. `joycraft-optimize.md:73`
is the reference example — a path named inline, prose deferring to it, no content
copied. Seven skills already cite `docs/reference/` this way; this is the eighth
through eighteenth instance of a pattern that already works.

Work one skill at a time, running the fragile suites between each. The
position-fragile hazard is concrete and enumerated:

- `tests/retrieval-pass-skill.test.ts` slices a **1500-char window** forward from
  the literal string `Retrieve Before You Reason` in `joycraft-research`,
  `joycraft-design`, and `joycraft-decompose`, then asserts inside it. Content
  inserted after that heading pushes the tail of the window out of range. Two of
  those three skills are in this spec's edit set.
- `tests/confidence-scoring-skill.test.ts` slices between fence markers starting
  at `Use this structure for each spec body:` in `joycraft-design` and
  `joycraft-new-feature`. Inserting a fenced block between those markers
  redefines the slice.
- The same file asserts `not.toMatch(/percentage/)` **file-wide** on
  `joycraft-design`, `joycraft-new-feature`, and `joycraft-decide` — a
  whole-file ban, so a pointer anywhere in those three files must avoid the word.

Placement rule that satisfies all three: put the pointer at the skill's *output
moment* — the step where it presents to the human — which in every case sits well
after the retrieval section and outside the spec-template fence. That is also
where it belongs on the merits, since a pointer read at the moment of writing is
worth more than one read at the top of the file.

The two `entry: agent` skills in the set (`joycraft-optimize`, `joycraft-verify`)
plus `joycraft-decide` get pointers despite not being human doors, because the
artifact decides, not the door — all three emit heavily human-read reports and
dossiers. This is D7's core rationale; do not "correct" it by keying to the
taxonomy.

**Rejected alternative:** inlining the rule text into each skill instead of a
pointer. `scripts/lib/skill-template.mjs` has no include primitive — only
`substituteVars`, `processHarnessBlocks`, and `stripFrontmatterFields` — so
inlining means duplication across eleven files with no dedupe mechanism and
eleven places to edit on every rule change.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A skill has several human-facing output moments | One pointer at the heaviest moment. Repeating it per moment is the duplication the pointer idiom exists to avoid. |
| A windowed test breaks after an edit | Move the pointer further from the anchor heading. Do NOT widen the window or edit the test — the test is not this spec's to change. |
| The fragile suites stay green because they read installed copies | Expected. They read `.claude/skills/`, which spec 6 syncs. Their green state here proves nothing; re-verify after spec 6. |
| A skill's natural pointer wording contains "percentage" | Reword. The ban is file-wide on design, new-feature, and decide, and is not negotiable from this spec. |
| A skill already has a nearby terseness directive | Leave it in place. D5 backlogged consolidation; removing it here silently widens scope past what was decided. |
| `joycraft-setup` looks like it should get one | It should not. D7 excluded it — an 18-line router whose only output is a single instruction. |
| The pointer would land inside a fenced code block | Place it outside the fence. Content inside fences is template output, not instruction to the agent. |
