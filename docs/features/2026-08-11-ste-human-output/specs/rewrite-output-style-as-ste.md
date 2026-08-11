---
status: in-review
owner: Maximilian Maksutovic
created: 2026-08-11
feature: 2026-08-11-ste-human-output
mode: checkpoint
---

# Rewrite Output Style as STE — Atomic Spec

> **Parent Brief:** `docs/features/2026-08-11-ste-human-output/brief.md`
> **Status:** Ready
> **Date:** 2026-08-11
> **Estimated scope:** 1 session / 4 files / ~250 lines

---

## What

Rewrite `src/templates/reference/output-style.md` so STE (ASD-STE100 Simplified Technical English, pragmatic mode) is the foundation of the house style, not an addon. The result is one integrated rule set of roughly 10 rules that merges the intent of the current 8 rules (open with outcome, end when done, one next action, every claim a fact, failure in plain register, state as structure, length matches decision, write plainly) with the STE mechanics: sentence limits by passage type (20 words instruction / 25 words description), the modal ladder (should→must; may/might/could→can), one word per concept, condition before command, no contractions, no semicolons, no Latin abbreviations, and the slop-to-simple table. The doc itself is written in STE. The Scope section names the governed surfaces: all human-facing output — gate artifacts, PR bodies, session-end summaries, interview playback, and gate chat/dialogue — and keeps the agent-facing exemption list. The doc carries a manual two-tier self-check. `tests/output-style-template.test.ts` is updated to the new structure in this same spec, and the bundle plus this repo's installed copy are regenerated in the same commit.

## Why

Agents still fill gate slots with jargon, hedges, and slop; the current doc treats sentence mechanics as absent, and an appended section would leave two competing voices in one contract.

## Acceptance Criteria

- [ ] `src/templates/reference/output-style.md` is one integrated STE rule set of ~10 rules; the prior 8 rules' intent survives merged, not appended [src: D1]
- [ ] The doc includes the modal ladder, sentence limits by passage type, one-word-one-concept, condition-before-command, and the slop-to-simple table [src: brief "What ships"]
- [ ] The doc's Scope section governs all human-facing output — gate artifacts, PR bodies, session-end summaries, interview playback, gate chat/dialogue — and keeps the agent-facing exemption list [src: D4]
- [ ] The doc carries the manual two-tier self-check: fix-to-zero for contractions, semicolons, banned modals, Latin abbreviations, slop words; advisory for sentence length and synonym rotation [src: D3]
- [ ] The doc's own prose passes the fix-to-zero classes when checked by hand (spec 3 later verifies by machine) [src: brief "Success criteria"]
- [ ] `tests/output-style-template.test.ts` asserts the new structure and retains the score-scale and absolute-path bans [src: D1]
- [ ] `src/bundled-files.ts` and `docs/templates/reference/output-style.md` are regenerated/synced in the same commit; `tests/bundled-files-sync.test.ts` passes [src: design §3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Integrated rule set, new structure | `tests/output-style-template.test.ts` — updated section/rule assertions (rule-count band, required rule headings, self-check presence) | unit |
| Scope covers all human-facing surfaces | assert Scope section names artifacts, PR bodies, session-end, interview playback, dialogue | unit |
| Two-tier self-check present | assert fix-to-zero list and advisory list both appear | unit |
| Score-scale + absolute-path bans retained | existing assertions kept: no `/\b(?:1-10|1 to 10|score .* out of)\b/i`, no `/\/Users\//`, no `/joycraft\/src/` | unit |
| Bundle parity | `tests/bundled-files-sync.test.ts` (existing, unmodified) | unit |
| Build passes | `pnpm build` + `pnpm typecheck` | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/output-style-template.test.ts`

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST rewrite the doc as ONE integrated rule set with STE as the foundation, and write the doc itself in STE [src: D1]
- MUST merge the intent of the prior 8 rules into the new set — they do not vanish [src: D1]
- MUST scope the contract to all human-facing output, including interview playback and gate chat/dialogue, and keep the agent-facing exemption [src: D4]
- MUST carry the two-tier manual self-check with D3's exact class split [src: D3]
- MUST update `tests/output-style-template.test.ts` in this spec, retaining the score-scale and absolute-path bans [src: D1]
- MUST run `pnpm sync-skills` and update `docs/templates/reference/output-style.md` in the same commit [src: design §3]
- MUST stay in pragmatic mode: no ASD dictionary, domain words stay legal [src: brief "Non-goals"]
- MUST NOT create a second style doc or edit any skill body [src: D1]
- MUST NOT add any user-facing script obligation — the self-check is manual [src: D2]
- MUST NOT change agent-facing doc verbosity or exemptions [src: brief "Non-goals"]
- MUST NOT reference absolute paths in the template [src: D1]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Rewrite | `src/templates/reference/output-style.md` | Full STE rewrite: ~10 integrated rules, STE voice, expanded Scope, two-tier self-check, slop table |
| Modify | `tests/output-style-template.test.ts` | Assertions for the new structure; retained bans |
| Regenerate | `src/bundled-files.ts` | `pnpm sync-skills` refreshes the embedded TEMPLATES copy |
| Sync | `docs/templates/reference/output-style.md` | Repo's own installed copy updated to match (byte-identical) |

## Approach

Read the current doc and keep its skeleton conventions: H1, blockquote purpose, `## Scope`, rule sections with a norm plus a *Why:* line, `## Worked Example` with before/after. Draft the merged rule set on paper first: map each of the 8 existing rules to its STE home, then add the mechanics rules (sentence limits, modal ladder, one-word-one-concept, condition-first, forbidden marks/abbreviations). Keep the slop-to-simple table compact — it derives from SimpleEnglish v1.2.0, not invented tells. Update the test in the same sitting so the structure and its guard move together. Then regenerate and sync. Rejected alternative: keeping the 8 rules verbatim and appending an STE section — the human rejected that framing at the decompose gate because it leaves STE reading as optional.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A merged rule heading contains "rules" or "example" | Avoid or update the test's section slicers deliberately — the old test selected the FIRST matching heading; the new test must be collision-proof for the structure you ship |
| Worked Example prose violates a fix-to-zero class in its "before" sample | Legal — the before-sample demonstrates the failure on purpose; the self-check applies to normative prose, and spec 3's lint scope must honor the same carve-out |
| Doc grows past the old rule-count band (6–10) | Update the band in the test to match the shipped count; the band exists to catch accidental structural drift, not to freeze history |
| `pnpm test` run before regenerating the bundle | `tests/bundled-files-sync.test.ts` goes red with content drift — regenerate before committing, never hand-edit `src/bundled-files.ts` |
