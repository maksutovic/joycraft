---
status: backlog
owner: Maximilian Maksutovic
created: 2026-07-27
source: docs/features/2026-07-27-human-readable-output-style/brief.md
---

# Deferred decisions — human-readable output style (D3, D4, D5)

These three reached the deposition on 2026-07-27 but fell outside the ≤5
question cap. They were pre-backlogged as visible residue, not silently cut.
Each has a standing recommendation; none is decided.

> **Update 2026-07-27 (decompose):** D4 is **resolved** — stamped as **D7** in
> the brief (11 skills; every human-facing output moment except
> `joycraft-setup`). D3 is **partially resolved** — its golden-example option
> was stamped as **D6** (the style doc must carry a worked before/after
> example); the presence-vs-ordering half of D3 remains open and is settled as
> presence-only for this feature's specs without a stamped decision. **D5 is
> unchanged and still deferred.**

## D3 — How much should a test enforce?

**Standing recommendation: presence only.** *(Golden-example option resolved as
D6 on 2026-07-27; presence-vs-ordering still open.)*

- **Presence only** — each human-facing skill cites the style doc. Cheap,
  mirrors `skill-handoff.test.ts` substring assertions, no false positives.
  Proves wiring, not compliance.
- **Presence + ordering** — the citation must precede the report/handoff block,
  mirroring `retrieval-pass-skill.test.ts:31-45`. Catches a buried pointer, but
  that ordering assertion is already the most fragile idiom in the suite and
  compounds the 1500-char window problem this feature must avoid.
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
