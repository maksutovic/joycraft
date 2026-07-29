---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: isolated
---

# Interview Playback & Question Contract — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready (follow-on; depends on interview-joins-the-gate-set —
> same file, sequential)
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 2 files edited

---

## What

Fix the three chat behaviors inside the interview itself (Steps 2–3) that
the 2026-07-29 adversarial panel confirmed as the yap sources the artifact
step alone doesn't cure. All edits in `src/skills/joycraft-interview.md`:

1. **Inline fixed-slot playback template replaces the Step 3
   `output-style.md` pointer** (the pointer mechanism the succinct-gates
   brief already proved "governs tone at best, never volume or placement",
   anchor 75). Per-slot caps, D2 pattern:
   - Mission — 1 line
   - Settled — ≤5 bullets, 1 line each
   - Open — question numbers + ≤3-word labels only
   - Closing line: "Confirm or correct — then I write the draft."
   `output-style.md` remains the non-gate tone contract elsewhere.
2. **Step 3 becomes a blocking gate.** The playback ends in a single
   confirmation ask that accepts inline corrections ("Confirm, or tell me
   what's wrong" — one round, not a yes/no loop). Step 4's file write and
   any commit are conditioned on an affirmative or corrected reply. (Field
   failure: brief written, committed, and pushed with zero user turns
   between playback and write.)
3. **Step 2's "weave in questions naturally" is replaced with hard rules:**
   - Number questions continuously across the session (Q1…Qn, never reset).
   - Never re-list an open question verbatim — refer by number + ≤3-word
     label ("Q1 hero content type, Q5 PoC 0 boundary — still open").
   - Each new question takes the three-line shape:
     `Q<n>: <question>` / `Default: <recommendation> — <one-line why>` /
     `Accept, override, or park?`
   - Full argumentation lives in the brief (and its question cards), not
     the chat.
   - **No per-turn question cap** — the panel's defense pass confirmed the
     field failure was repetition, not count; batch-answering users need
     batched agendas.

In `tests/gate-contract.test.ts`: heading-anchored assertions for the
playback template slots and the never-relist rule in the interview file.

## Why

Panel-surviving findings: a ~200-word playback wall re-narrating every
settled point; all five open questions re-pasted verbatim after an
interruption; recommended defaults fused into 55-word run-ons so 4 of 6
highest-stakes calls survived three rounds undecided; ratification gate
auto-approved. Deliberately excluded as panel-refuted over-corrections:
one-question-per-turn serialization, banning invited pushback/synthesis,
and a mid-interview decide loop.

## Acceptance Criteria

- [ ] Step 3 contains the inline playback template with all four slots and
  caps; the `output-style.md` pointer is gone from Step 3 (line 158's
  Guidelines pointer may stay for the draft-brief file itself).
- [ ] Step 3 states the write/commit is conditioned on the user's reply.
- [ ] Step 2 contains the numbering, never-relist, and three-line question
  rules; "weave in questions naturally" wording removed; no per-turn cap
  introduced.
- [ ] New gate-contract assertions pass; `pnpm test && pnpm typecheck` green.
- [ ] `pnpm sync-skills` + regenerated bundles in the same commit.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Playback slots present | gate-contract heading-anchored assertions | unit |
| Never-relist rule present | grep "never re-list" (or final wording) | smoke → unit |
| Pointer removed from Step 3 | grep count of `output-style.md` in Step 3 region = 0 | unit |
| No regression | full suite green | integration |

**Windowed-test hazard:** `tests/confidence-scoring-skill.test.ts` slices
between fences from "Use this structure for each spec body:" in design and
new-feature — interview is not in its file set, but verify before placing
fenced templates; never widen a window.

## Constraints

- MUST: keep the skill self-contained — templates inline, no new file
  references (Gotcha 3).
- MUST: preserve the exploratory register — Step 1 ("let them yap"), invited
  pushback, and batched agendas are panel-protected behaviors; this spec
  constrains form, not substance.
- MUST: `pnpm sync-skills` same commit.
- MUST NOT: add a per-turn question cap or one-question-at-a-time rule.
- MUST NOT: reintroduce a summary of the brief after writing it (companion
  spec's ban stands).

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `src/skills/joycraft-interview.md` | Steps 2–3 rewritten to the contracts above |
| Edit | `tests/gate-contract.test.ts` | playback + never-relist assertions |
| Regen | `src/{claude,codex,pi,copilot}-skills/`, installed trees | `pnpm sync-skills` |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User's reply is a correction, not a yes | apply correction, re-play only the changed slot lines, then write — no second full playback |
| Interruption mid-interview (topic swerve) | handle the swerve, then resume by question number — no re-list |
| User answers questions out of order / in batch | accept; mark answered by number; continue |
