---
status: done
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Emit Intent From Interview — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 9 files / ~120 lines of skill prose plus regenerated variants

---

## What

`joycraft-interview`'s first written artifact becomes an intent file, not a draft brief.

Today the skill's Step 4 is headed `### 4. Write a Draft Brief` at `src/skills/joycraft-interview.md:112`; line 114 derives a slug `YYYY-MM-DD-<topic>` and line 115 creates `docs/features/<slug>/brief.md`, lazy-creating the feature folder. That write is the skill's first file write of any kind — Step 3's playback is a blocking gate that precedes it, and Step 5's backlog write is confirmation-gated and optional.

After this spec, Step 4 splits into two writes with a fixed order:

1. **Always:** `docs/intent/<slug>.md`, in the shape of `docs/templates/INTENT_TEMPLATE.md` (spec 5), with `source: interview` and the sections Author, Status, `source`, Problem, Proposed outcome, Affected users and systems, Constraints, Open questions filled from the conversation. `Status:` is written as `untriaged` — the value spec 7's triage mode keys on. The slug is the same `YYYY-MM-DD-<topic>` the skill already derives, so the intent and any later feature folder share one name.
2. **Optional:** the draft brief at `docs/features/<slug>/brief.md`, written only when the human wants it. When written, its frontmatter carries an `intent:` key whose value is the project-relative intent path, and its existing 4-field frontmatter (`status: draft`, `owner`, `created`, `feature`) is otherwise unchanged. When not written, the skill creates no feature folder at all.

The brief being optional reshapes the downstream flow. The render-and-open step and the Step 6 handoff template both currently assume a `brief.html` exists. Both gain a branch: when a draft brief was written, the existing behavior stands unchanged, including the eight-gate render contract; when it was not, the intent path is what the handoff names and the render step is skipped. The skill's `## Recommended Next Steps` briefing block likewise names the intent path in the no-brief case.

`intent:` needs no code. `src/frontmatter.ts` accepts arbitrary keys and has no production consumers, so the key is inert metadata a human or a later skill reads.

## Why

An intent is the playbook's canonical first artifact and the one shape an outside trigger can write. If the interview keeps creating a feature folder on the spot, the inbox has exactly one writer that never uses it, triage has nothing to list, and the pipeline still starts at a slug commitment the human has not made yet. Making the intent unconditional and the brief optional is what puts the two ends of the chain on the same footing.

## Acceptance Criteria

- [ ] `src/skills/joycraft-interview.md` Step 4 writes `docs/intent/<slug>.md` before any other file write in the skill [src: brief "Success Criteria"]
- [ ] The intent file is written in the shape of `docs/templates/INTENT_TEMPLATE.md` and the skill cites that path rather than restating the template's sections as an independent list [src: brief "Hard Constraints"]
- [ ] The intent file carries `source: interview` [src: brief "Decomposition"]
- [ ] The intent file carries `Status: untriaged` so spec 7's triage listing can key on it [src: D10]
- [ ] The draft brief at `docs/features/<slug>/brief.md` is optional: the skill asks the human whether to write one, and creates `docs/features/<slug>/` only when the answer is yes [src: brief "Decomposition"]
- [ ] When a draft brief is written, its frontmatter carries `intent: docs/intent/<slug>.md` alongside the existing `status`, `owner`, `created`, and `feature` keys [src: brief "Decomposition"]
- [ ] When no draft brief is written, the skill creates no folder under `docs/features/` and skips the render-and-open step without treating the skip as a failure [src: brief "Decomposition"]
- [ ] Bundled variants are regenerated (`scripts/generate-bundled-files.mjs`) and installed copies synced (`pnpm sync-skills`) in the same commit as the `src/skills/` edit [src: brief "Hard Constraints"]
- [ ] `tests/gate-contract.test.ts` still passes: `joycraft-interview` keeps exactly one slot-template reference and one render step [src: brief "Success Criteria"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Intent written first | `tests/interview-intent.test.ts` asserts `src/skills/joycraft-interview.md` contains `docs/intent/<slug>.md` and that its first occurrence precedes the first occurrence of `docs/features/<slug>/brief.md` by character offset | unit |
| Template cited, not copied | Same file asserts the skill contains `docs/templates/INTENT_TEMPLATE.md` | unit |
| `source: interview` | Same file asserts the skill text contains `source: interview` | unit |
| `Status: untriaged` | Same file asserts the skill text contains `untriaged` | unit |
| Brief is optional | Same file asserts the skill contains an explicit optionality marker (e.g. `optional`) within the Step 4 region | unit |
| `intent:` stamped | Same file asserts the skill's brief frontmatter block contains an `intent:` line | unit |
| Generated parity | Same file runs the same four assertions against `src/claude-skills/joycraft-interview.md` and `src/codex-skills/joycraft-interview.md` | unit |
| Gate contract intact | `tests/gate-contract.test.ts` unchanged and green — one slot-template reference, one render step for interview | regression |
| Render-step contract intact | `tests/artifact-render-steps.test.ts` unchanged and green | regression |
| Handoff block intact | `tests/handoff-briefing-prompts.test.ts` and `tests/skill-handoff.test.ts` unchanged and green | regression |
| Installed copies fresh | `tests/installed-skills-sync*.test.ts` and `tests/bundled-files-sync.test.ts` green after `pnpm sync-skills` | regression |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the intent-written-first test (`pnpm test tests/interview-intent.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: pause for human approval before the first write to `src/skills/joycraft-interview.md`, because skill content is an ask-first boundary [src: brief "Execution Strategy"]
- MUST: regenerate bundled variants with `scripts/generate-bundled-files.mjs` and run `pnpm sync-skills` in the same commit as the skill edit; `tests/regenerate-bundled-files.test.ts` runs the generator in a `beforeAll`, so deferring the sync commits a red suite [src: brief "Hard Constraints"]
- MUST: edit only `src/skills/joycraft-interview.md` as the authored source — `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, and `src/omp-skills/` are generated and must never be hand-edited [src: brief "Hard Constraints"]
- MUST: keep one home per fact — the intent section list lives in `docs/templates/INTENT_TEMPLATE.md` and the skill cites it by path [src: brief "Hard Constraints"]
- MUST: keep every path inside the skill project-relative [src: brief "Hard Constraints"]
- MUST NOT: add a frontmatter validator or any code that parses `intent:` or `source:` [src: brief "Out of Scope"]
- MUST NOT: add a triage listing, a triage question, or any reading of other intent files — that behavior is spec 7's and depends on this one [src: brief "Decomposition"]
- MUST NOT: change what `joycraft-new-feature` or `joycraft-bugfix` do with an intent path — that is spec 8 [src: brief "Decomposition"]
- MUST NOT: remove or weaken the Step 3 playback blocking gate that precedes the file write [src: brief "Success Criteria"]
- MUST NOT: add runtime dependencies [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-interview.md` | Step 4 rewritten: intent write first, brief write optional with `intent:` frontmatter; render step and Step 6 handoff gain the no-brief branch; `## Recommended Next Steps` briefing block names the intent path in that case |
| Modify | `src/claude-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/codex-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/pi-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/copilot-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/omp-skills/joycraft-interview.md` | Regenerated |
| Modify | `src/bundled-files.ts` | Regenerated `SKILLS` and per-harness records |
| Modify | `.claude/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.agents/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.pi/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.github/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Modify | `.omp/skills/joycraft-interview/SKILL.md` | Synced installed copy |
| Create | `tests/interview-intent.test.ts` | Ordering, citation, `source`, `Status`, optionality, and generated-parity assertions |

## Approach

Keep the edit inside the existing Step 4 heading rather than inserting a new numbered step. Step 4 becomes "Write the Intent (and optionally a Draft Brief)": the slug derivation at line 114 stays where it is and now names the intent file, so the intent and any later feature folder share one `YYYY-MM-DD-<topic>` name; the intent write is unconditional; the brief block that follows is wrapped in a single forced-choice question using the skill's own question directive, which means the harness-appropriate question surface and at least two real options. The Step 6 handoff template and the `## Recommended Next Steps` briefing block each name the intent path in the no-brief case and the brief path in the brief case. The render-and-open subsection and the Step 6 handoff template each gain one conditional sentence rather than a parallel copy, which keeps the eight-gate contract counts in `tests/gate-contract.test.ts` at one slot-template reference and one render step.

Watch two character-offset guards while editing. `tests/artifact-render-steps.test.ts` and `tests/gate-slot-contract-placement.test.ts` measure distances from a heading or render marker to the `Ten lines maximum` cap sentence (thresholds 3200 and 3600, widened once already by the 2026-07-31 stamp-gate work). Prose added between the render block and the cap sentence eats that budget, so prefer adding the optionality language above the render subsection rather than inside it.

Rejected alternative: writing both the intent and the draft brief unconditionally, with the intent as a pointer stub. That keeps every downstream assumption intact and needs no branch, but it recreates a feature folder on every interview — exactly the premature slug commitment the inbox exists to remove — and would leave the inbox full of files that were already promoted before anyone triaged them.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/intent/` absent (project predates spec 5's installer change) | Lazy-create the directory, the same way the skill already lazy-creates `docs/features/<slug>/` |
| `docs/intent/<slug>.md` already exists from an earlier interview on the same topic | Same-slug re-run overwrites, matching the skill's existing same-slug re-run behavior for `brief.html`; the human is told which file was replaced |
| Human declines the draft brief | No `docs/features/<slug>/` folder is created, no `brief.html` is rendered, and the handoff names the intent path |
| Human accepts the draft brief | Full existing flow, unchanged: brief written, `intent:` frontmatter stamped, `docs/templates/REVIEW_GATE_TEMPLATE.html` read, only `<!-- SLOT:` regions filled byte-identically, revision stamped, `autoOpen` honored |
| Human declines the brief and later wants one | The intent path is handed to `joycraft-new-feature` (spec 8), which pre-fills from it |
| Open questions remain after the playback gate | They fill the intent's Open questions section; the briefing block still says `Do not start until Q<n> is answered.` |
| Backlog items surfaced in Step 5 | Unchanged — still confirmation-gated, still written to `docs/backlog/`, never auto-written |
| `autoOpen` false or headless | Unchanged: skip opening silently, print the absolute path, never fail |
