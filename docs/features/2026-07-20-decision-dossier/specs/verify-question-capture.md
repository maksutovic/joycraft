---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-20
feature: 2026-07-20-decision-dossier
mode: batch
---

# Verify Question Capture — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-20-decision-dossier/brief.md`
> **Status:** Ready
> **Date:** 2026-07-20
> **Estimated scope:** 1 session / spike — 1 scratch project + 1 discovery doc

---

## What

A verification spike for the two UNVERIFIED assumptions the whole feature
rests on: (1) the native forced-choice question UI reliably fires when an
*installed skill* instructs it in a fresh project (not just ad-hoc in a warm
session), and (2) at least one capture pattern reliably produces a
one-sentence typed rationale per answer. Output is a discovery doc recording
the working pattern (or a red exception that halts the feature).

## Why

The demo run proved the UI does not enforce rationale capture; if either
assumption fails, specs 3–4 get built on sand and the architecture changes.

## Acceptance Criteria

- [ ] A scratch project outside this repo contains a minimal probe skill
      (`.claude/skills/probe-decide/`) that instructs a forced-choice
      question with a reject-framing escape
- [ ] Invoking the probe skill in a fresh session fires the native question
      UI (not a plain-text question)
- [ ] Three candidate rationale-capture patterns are trialed: (a) follow-up
      free-text question after the pick, (b) instruction to answer via
      Other with "choice + because …", (c) rationale requested in the
      question text via the notes field
- [ ] One pattern is selected that yielded a typed rationale in 3/3 trials;
      a fallback is named
- [ ] A discovery doc at `docs/discoveries/<date>-question-capture.md`
      records: UI-fires yes/no, per-pattern trial results, chosen pattern +
      fallback, exact prompt wording that worked
- [ ] If the UI does NOT fire from an installed skill: the discovery doc
      records this as a RED EXCEPTION and states that specs 3–4 must be
      re-architected (chat-box capture) before implementation

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| UI fires from installed skill | Invoke probe skill in fresh session; observe native picker renders | manual/e2e |
| Rationale patterns trialed | Run each pattern 3x; record whether a typed sentence arrived | manual/e2e |
| Discovery doc complete | Doc contains all five recorded items above | manual |

**Execution order:** this is a spike — the "tests" are the probe protocol
itself. Run the probe BEFORE writing the discovery doc; record actual
results, never expected ones.

**Smoke test:** one probe-skill invocation in the scratch project (~1 min).

**Before implementing, verify your test harness:** the probe skill must be
*installed* (present in the scratch project's `.claude/skills/` before the
session starts), not pasted into the conversation — the assumption under
test is installed-skill behavior.

## Constraints

- MUST: run the scratch project outside this repo (e.g. `/tmp/joycraft-probe`)
- MUST: record real trial outcomes even when they contradict the brief
- MUST NOT: touch `src/`, `templates/`, or any product file
- MUST NOT: mark the assumption verified from fewer than 3 successful trials

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| create | `/tmp/joycraft-probe/**` (outside repo) | scratch project + probe skill |
| create | `docs/discoveries/<date>-question-capture.md` | trial results + chosen pattern |

## Approach

Scaffold a minimal project, write the probe skill with one forced-choice
question (2 options + reject-framing), then trial the three capture patterns
in separate fresh sessions. Rejected alternative: testing in this repo's
warm session — rejected because a warm session with the pattern already in
context cannot falsify the installed-skill assumption.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| UI fires but only sometimes | Record flake rate; 2/3 = not reliable, choose fallback |
| Rationale arrives but multi-paragraph | Acceptable — capture pattern trims to first sentence downstream |
| User answers without rationale despite pattern | Pattern must include exactly one re-prompt; if still absent, record as pattern failure |
