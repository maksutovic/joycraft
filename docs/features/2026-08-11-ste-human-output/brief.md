# Feature Brief: STE Human Output — writing contract + linter for gate artifacts

**Date:** 2026-08-11
**Status:** Brief — awaiting design
**Origin:** Continuation of succinct-gates (PR #65). Human-facing output at gates is
now structurally tight (slot templates, HTML artifacts) but the prose inside the
slots still drifts into jargon and AI slop. Source material: ASD-STE100 Simplified
Technical English, via the MIT-licensed SimpleEnglish skill
(github.com/AminBlg/SimpleEnglish, skill v1.2.0).

## Problem

Succinct-gates fixed the *shape* of human-facing output: slot contracts cap what
goes where, HTML artifacts render at every gate. It did not fix the *sentences*.
Agents still fill slots with noun chains ("baseline pick", "R3 quorum reform
during PR churn"), banned-modal hedges ("should", "may"), synonym rotation
(config/settings/configuration in one document), and trailing conditions. The
human at the bookend re-reads or asks for a rewrite. That is the exact failure
the interview → design → decide gates exist to prevent.

ASD-STE100 is a 50-year-old controlled language built so a tired non-native
reader cannot misread an instruction. Its mechanical rules (20/25-word sentence
limits, approved modals only, one word per concept, condition before command,
slop deletion) are checkable — partly by regex. That makes this a
neuro-symbolic fit: probabilistic writer, deterministic validator at the gate
("Pydantic at the door, ontology at the ledger" — Coyle, Berkeley 2026).

## What ships

Two coupled deliverables:

1. **Writing contract.** A compact (~30-line) distillation of the STE rules that
   matter for gate prose — sentence limits by passage type, the modal ladder
   (should→must, may/might/could→can), the slop-to-simple table, one-word-one-
   concept, condition-first — injected into the human-facing output sections of
   the gate skills: design, decide, interview, session-end, and the briefing
   handoffs in decompose/implement-feature. One canonical copy; skills reference
   it inline (skills must stay self-contained, so it is a generated include, not
   a file import).

2. **Machine check.** Vendor `ste_lint.py` (132 lines, stdlib-only, MIT, has
   `--self-test`) as a bundled check. It counts mechanical violations: sentence
   over limit, contractions, banned modals, perfect tense, "-ing" clauses,
   semicolons, Latin abbreviations, slop words, trailing conditions, synonym
   rotation. Gate skills run it on the prose they are about to present; harden
   can wire it as a deny-pattern-style check. Scores are comparative, not a
   compliance verdict (the linter says so itself).

## Non-goals

- Strict ASD-STE100 compliance or bundling the ASD dictionary (copyrighted).
  Pragmatic mode only: domain words stay legal.
- Rewriting agent-facing docs (specs, context docs, discoveries). Those are
  deliberately exhaustive — see human-vs-agent-readable finding. STE applies
  ONLY at human-facing surfaces.
- Marketing copy / README voice. STE deletes persuasion by design.
- A new user-facing skill. This rides inside existing gate skills.

## Open questions for design

1. Where does the canonical contract live so 22 self-contained skills can share
   it? (Likely: a source fragment + generate-bundled-files.mjs injection, same
   pattern as per-harness variants.)
2. Does the linter run agent-side (skill instructs: run and fix before
   presenting) or harness-side (hook/check wired by harden), or both?
3. Which surfaces get the contract in v1 — gate artifacts only, or also
   commit-facing prose like session-end summaries and PR bodies?
4. Threshold semantics: violations_per_100w budget? Hard fail vs advisory?
5. Attribution/licensing placement for the vendored linter (MIT notice).

## Success criteria

- Gate artifact prose passes ste_lint with 0 mechanical violations on the
  default path.
- A human reads a design gate summary once and can answer "what changed and
  what do you need from me" without re-reading (the video test: no "baseline
  pick" moments).
- No change to agent-facing doc verbosity.
