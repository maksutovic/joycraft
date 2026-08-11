---
reap: eligible
decisions:
  - id: D1
    question: amend shipped output-style.md template with STE section (ASK FIRST boundary)
    status: clarified
    choice: approve, amended 2026-08-11 — full STE rewrite of src/templates/reference/output-style.md as one integrated rule set (~10 rules merging the prior 8 with STE mechanics), the doc itself written in STE; tests/output-style-template.test.ts updated to the new structure with the existing anti-pattern assertions (score-scale ban, absolute-path ban) retained; supersedes the earlier append-a-section shape
    rationale: human direction 2026-08-11 — STE is the primary house style, not an addon; ONE_HOME and the pointer network unchanged, so zero skill-body edits still hold
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
    choice: all human-facing output, amended 2026-08-11 — gate artifacts, PR bodies, session-end summaries, interview playback, and gate chat/dialogue; supersedes the three-surface set
    rationale: human direction 2026-08-11 — STE-styled artifacts and dialogue are the only form of conversation with the user; linter scope stays repo-side per D2
  - id: D6
    question: interview playback pointer repair — this feature or the succinct-gates queue
    status: clarified
    choice: repair in this feature — a dedicated spec restores a one-line style-contract citation at joycraft-interview's playback gate, beside the per-slot caps; skill edit ships with bundle regen + installed-copy sync in the same commit
    rationale: human choice at the decompose gate 2026-08-11, overriding the defer recommendation; accepts coordination with the succinct-gates in-review specs that own the playback template
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

- STE is the primary house style: `src/templates/reference/output-style.md` is
  rewritten as one integrated STE rule set, written in STE itself — no second
  style doc, no new skill-body pointers, template test updated in the same spec
  (D1, amended 2026-08-11).
- No user-facing script obligation: `ste-lint.py` lives in `scripts/` in this
  repo, exercised by a CI test over our shipped human-facing template prose;
  `output-style.md` ships manual self-check rules only (D2).
- Self-check semantics are two-tier: fix-to-zero for contractions, semicolons,
  banned modals, Latin abbreviations, slop words; advisory for sentence length
  and synonym rotation (D3).
- Governed surfaces: all human-facing output — gate artifacts, PR bodies,
  session-end summaries, interview playback, and gate chat/dialogue
  (D4, amended 2026-08-11).
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

## Execution Strategy

Decomposed 2026-08-11 (rev 3) into 4 specs at `docs/features/2026-08-11-ste-human-output/specs/`, all `checkpoint` mode:

- **Wave 1 (parallel-safe):** spec 1 `rewrite-output-style-as-ste` (L) and spec 2 `vendor-ste-linter-script` (S) — disjoint files.
- **Wave 2 (sequential, NOT parallel-safe — both regenerate `src/bundled-files.ts`):** spec 4 `restore-interview-playback-pointer` (S, per D6), then spec 3 `add-ste-lint-ci-test` (M), which lints the final prose state.

Cross-queue hazard: spec 4 edits `src/skills/joycraft-interview.md`, co-owned by two in-review succinct-gates specs — coordinate if those revise first.
