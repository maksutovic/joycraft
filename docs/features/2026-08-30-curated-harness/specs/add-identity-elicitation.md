---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: batch
---

# Add Identity Elicitation — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / 2 skill sources + copies + tests / ~35 net lines (gather-context), ~1 line (interview)

---

## What

`joycraft-gather-context` gains an elicitation block for product identity: interview questions that draw out Values (what makes this product special, what shapes suggestions), Glossary (the team's words), and Taste (code aesthetics the team holds), feeding the generator support built in `add-product-identity-generators`. The block carries the two D5 conditions as instructions: the zero-sum admission (every directional line added to L1 names the line it displaces, ideally an ALWAYS/NEVER prose rule converted to a deny pattern via harden) and the behavioral check (pick 2–3 concrete behaviors the section should change; ship small and dated with a pre-committed review at the next optimize run). `joycraft-interview` gains at most a one-line pointer.

## Why

Elicit-first (D5) means the Product Identity section only ever exists when a human supplied real content — without elicitation questions, no content is ever collected and the generators stay dead code.

## Acceptance Criteria

- [ ] gather-context contains identity elicitation questions covering Values, Glossary, and Taste [src: design §2 WS4]
- [ ] The flow states the zero-sum admission: each directional line names the line it displaces [src: D5]
- [ ] The flow states the behavioral check: 2–3 concrete behaviors, ship small and dated, pre-committed review at the next optimize run [src: D5]
- [ ] interview gains at most a pointer to gather-context's identity block [src: design §2 WS4]
- [ ] interview's net growth is paid same-commit (328 lines, over budget); gather-context (71 lines) has headroom and needs no trims [src: design §4]
- [ ] Generated + installed copies regenerated and synced same-commit [src: design §2 WS3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Elicitation present | content test: Values/Glossary/Taste questions in gather-context canonical source | unit |
| Conditions present | content test: zero-sum admission wording + behavioral-check wording | unit |
| Interview pointer only | content test: interview references the identity block in ≤1 line, no question duplication | unit |
| Copies in sync | bundle-regen + sync tests green | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the conditions-present content test.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: elicit real content — the flow never writes a stub section when the human has nothing to say [src: D5]
- MUST: carry both D5 conditions (zero-sum admission, behavioral check) in the elicitation instructions [src: D5]
- MUST: keep interview's involvement to at most a pointer [src: design §2 WS4]
- MUST: keep the questions gap-only, matching gather-context's existing offer-an-interview posture [src: design §2 WS4]
- MUST NOT: duplicate the elicitation questions in interview [src: design §4 — ONE_HOME posture]
- MUST NOT: encode any codebase facts in skill content — identity is direction/taste, not code knowledge [src: brief "Non-goals"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-gather-context.md` | Identity elicitation block + the two D5 conditions |
| Modify | `src/skills/joycraft-interview.md` | One-line pointer + paying trim |
| Modify | `src/{claude,codex,pi,copilot}-skills/` (both skills) | Regenerated |
| Modify | `.claude/.agents/.pi/.github skill trees (both skills)` | Synced |
| Create/Modify | gather-context content tests | Assertions per Test Plan |

## Approach

Add the identity block to gather-context's gap-only interview: ask only when no Product Identity section exists yet. Questions in the elicitation voice ("What does this product refuse to be?", "Which words does the team use that outsiders misread?", "What code makes you wince even when it works?" — exact wording is implementation judgment). On collection, route the content into the generator input from spec 9 (or write the section directly in the generator's exact shape when running as a skill without the CLI). Rejected alternative: putting elicitation in interview — interview is the freeform brainstorm bookend and is 128 lines over budget already.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Human has values but no glossary | Emit only the populated subsections (spec 9 supports partial content) |
| Product Identity section already exists | Gap-only: skip the questions entirely |
| Human answers with discipline rules ("never use var") | Route rule-shaped answers toward harden per the zero-sum admission, keep taste-shaped ones |
