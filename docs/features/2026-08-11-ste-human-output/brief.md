---
decisions:
  - id: D1
    question: amend shipped output-style.md template with STE section (ASK FIRST boundary)
    status: clarified
    choice: approve — extend src/templates/reference/output-style.md
    rationale: because the 2026-07-27 D2 escalation clause fired on observed gate jargon and ONE_HOME + the pointer network deliver it with zero skill edits
  - id: D2
    question: where does the STE linter run
    status: clarified
    choice: maintainer-side only — vendored into scripts/, CI test lints our shipped template prose; users get manual self-check rules, no script obligation
    rationale: because requiring users' agents to run a python script per artifact is obtrusive and out of the spirit of a skill (human, verbatim intent)
  - id: D3
    question: violation threshold semantics
    status: clarified
    choice: two-tier — fix-to-zero on reliable regex classes, advisory on approximate ones
    rationale: because fix-to-zero is unambiguous where regex is reliable and tolerant where it miscounts (dossier rationale, adopted)
  - id: D4
    question: governed surfaces in v1
    status: clarified
    choice: full human-facing set — gate artifacts, PR bodies, session-end summaries
    rationale: because review-time prose was the original complaint and a gate-only split re-creates the two-scope problem D5 2026-07-27 removed (dossier rationale, adopted)
  - id: D5
    question: attribution placement for vendored linter
    status: clarified
    choice: file header (SPDX + upstream URL/version) + CHANGELOG line
    rationale: because the file is repo-internal after D2, so README acknowledgment is unnecessary but provenance must survive in the script and release notes
---

# Feature Brief: STE Human Output — writing contract + linter for gate artifacts

> **Design:** docs/features/2026-08-11-ste-human-output/design.md

**Date:** 2026-08-11
**Status:** Designed — decisions D1–D5 clarified 2026-08-11, ready for decompose

## Hard Constraints

- The STE section extends `src/templates/reference/output-style.md` — no second
  style doc, no new skill-body pointers (D1).
- No user-facing script obligation: `ste-lint.py` lives in `scripts/` in this
  repo, exercised by a CI test over our shipped human-facing template prose;
  `output-style.md` ships manual self-check rules only (D2).
- Self-check semantics are two-tier: fix-to-zero for contractions, semicolons,
  banned modals, Latin abbreviations, slop words; advisory for sentence length
  and synonym rotation (D3).
- Governed surfaces: gate artifacts, PR bodies, and session-end summaries —
  the doc's full human-facing Scope (D4).
- Vendored linter carries SPDX + upstream URL/version header; CHANGELOG notes
  the vendoring (D5).
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
   concept, condition-first — added to the canonical house-style doc at
   `src/templates/reference/output-style.md`. The existing pointer network
   (Output-style D1/D5: 11 skills cite the doc at their output moments, with
   placement tests) already delivers it to design, decide, interview,
   session-end, and the decompose/implement-feature briefings — no include
   mechanism and no skill-body edits needed.

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
