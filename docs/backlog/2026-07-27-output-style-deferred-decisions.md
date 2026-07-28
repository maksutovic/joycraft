---
status: backlog
owner: Maximilian Maksutovic
created: 2026-07-27
source: docs/features/2026-07-27-human-readable-output-style/brief.md
---

# Deferred decisions — human-readable output style (D5 only; D3, D4 resolved)

These three reached the deposition on 2026-07-27 but fell outside the ≤5
question cap. They were pre-backlogged as visible residue, not silently cut.

D4 and D3 have since been resolved and are kept below for the record. **Only D5
is still deferred**, and it carries a standing recommendation rather than a
decision.

> **Update 2026-07-27 (decompose):** D4 is **resolved** — stamped as **D7** in
> the brief (11 skills; every human-facing output moment except
> `joycraft-setup`). D3 is **partially resolved** — its golden-example option
> was stamped as **D6** (the style doc must carry a worked before/after
> example); the presence-vs-ordering half of D3 remains open and is settled as
> presence-only for this feature's specs without a stamped decision. **D5 is
> unchanged and still deferred.**
>
> **Update 2026-07-27 (decide, post-ship):** D3 is now **fully resolved** and
> stamped `clarified` in the brief — presence **and** heading-anchored ordering
> for all 11 skills, no prose assertion. Reopened after the feature shipped
> because the question became answerable with measurement instead of
> speculation. **Only D5 remains deferred.**

## D3 — How much should a test enforce? *(RESOLVED 2026-07-27)*

**Resolved: presence + heading-anchored ordering, no prose assertion.** Each
pointer must sit under a report/present/playback heading, matched against the
nearest *preceding* heading. Implemented in `tests/output-style-pointer.test.ts`
(11 ordering assertions; 1556 tests green).

What settled it was measuring the shipped skills rather than reasoning about
them. Two corrections to the framing below:

- **The fence is not the anchor.** `joycraft-tune` and `joycraft-decide` have no
  fenced block after their pointer — their output moments are a written
  assessment and a bulleted summary. A fence-anchored rule would have failed two
  correctly-placed skills. The *heading* is the anchor, and it holds for all 15
  pointers.
- **Ordering is less fragile than this entry claimed.** The assertion in
  `retrieval-pass-skill.test.ts` that made ordering look risky is the separate
  1500-char windowed slice; the ordering check there is a plain index
  comparison. The two got conflated.

One trap worth recording: the first regex matched the bare word `brief`, which
also matches navigational headings like "Step 1: Locate the brief" — a pointer
buried at the top of `joycraft-decide` passed. Caught by deliberately burying
one and watching the test stay green. The phrase is now `feature brief`.

The original options, kept for the record:

- **Presence only** — each human-facing skill cites the style doc. Cheap,
  mirrors `skill-handoff.test.ts` substring assertions, no false positives.
  Proves wiring, not compliance.
- **Presence + ordering** — the citation must precede the report/handoff block,
  mirroring `retrieval-pass-skill.test.ts:31-45`. Catches a buried pointer, but
  that ordering assertion is already the most fragile idiom in the suite and
  compounds the 1500-char window problem this feature must avoid.
  *(This claim was wrong — see the resolution above. The fragile assertion is
  the windowed slice, not the ordering check, which is a plain index
  comparison.)*
- **Presence + golden example** — the style doc must contain a worked
  before/after. Backed by the prose research's finding that concrete examples
  beat abstract instructions, but tests the doc rather than the skills.

Context needed to decide: whether the pointer alone measurably changes output.
Precedent for a stricter check exists — `confidence-scoring-skill.test.ts:63`
bans a word file-wide (`not.toMatch(/percentage/)`).

## D4 — Which skills get the pointer? *(RESOLVED as D7, 2026-07-27)*

**Resolved:** 11 skills — tune, session-end, decompose, design, new-feature,
implement-feature, optimize, verify, decide, interview, bugfix. Only
`joycraft-setup` is excluded. The rationale that settled it: the *artifact*
decides, not the door — `optimize`, `verify`, and `decide` are `entry: agent`
but emit heavily human-read reports and dossiers, so keying to the taxonomy
would have missed them. Recorded in the brief's `decisions:` block as D7.

The original options, kept for the record:

- **All 9 `entry: human` skills** — clean rule keyed to the existing taxonomy,
  no judgment call. But `joycraft-setup.md` is an 18-line pure router whose only
  output is one instruction; a style pointer there is pure overhead.
- **Only skills with substantial fenced report templates** — tune, session-end,
  decompose, design, new-feature, implement-feature, optimize, verify. Targets
  the real reading-fatigue surface. Note this crosses the taxonomy: optimize and
  verify are `entry: agent` but produce human-read reports.
- **Key to the artifact, not the skill** — every skill emitting a fenced
  human-read block. Precise, but requires first defining what marks a block as
  human-read, and document-level audience markers were killed as RF-KILL-8.

## D5 — Consolidate the existing scattered terseness directives?

**Standing recommendation: defer to a follow-up optimize pass.**

Today at least four near-duplicate rules live in skill bodies: "report tersely"
(`joycraft-implement` ~160), "End with a terse summary" (`joycraft-decide`
~213), "Keep the row **factual and thin**" (`joycraft-session-end`:114), and
"1-2 pages max" (`joycraft-interview` ~132).

- **Fold them into the style doc now** — genuine one-home consolidation, but
  touches six skills and widens the regression surface well past adding a doc.
- **Leave them** — minimal diff; they are load-bearing where they sit. Leaves
  two homes for output-style guidance, exactly the `ONE_HOME` condition
  `joycraft-optimize` flags.
- **Defer to a follow-up optimize pass** — sequences the risky edit behind the
  cheap one; optimize is the skill built to find `ONE_HOME` violations.
  Knowingly ships a duplicate-home condition in the interim.

## Why deferred

The deposition's five slots went to the two mandatory ASK FIRST boundary
questions (skill content, template content) plus the three highest-blast-radius
design questions. D3–D5 rank lower: each is reversible and none blocks the
others. If that risk ranking is wrong, pull one back into a round.
