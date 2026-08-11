# STE Human Output — Feature Specs

> **Parent Brief:** `docs/features/2026-08-11-ste-human-output/brief.md`
> **Design:** `docs/features/2026-08-11-ste-human-output/design.md` (§2.1/§2.6 superseded — see its amendment note)
> **Status:** Decomposed 2026-08-11 (rev 3), ready for implementation

## What this feature does

STE (ASD-STE100 Simplified Technical English, pragmatic mode) becomes Joycraft's house style for every word a person reads: `src/templates/reference/output-style.md` is rewritten with STE as its foundation, governing gate artifacts, PR bodies, session-end summaries, interview playback, and gate chat/dialogue. A maintainer-side linter (`scripts/ste-lint.py`, vendored from SimpleEnglish v1.2.0, MIT) plus a CI test hold this repo's own shipped template prose to zero mechanical violations. Users get manual self-check rules only — no script obligation. Decisions D1–D6 are stamped in the brief frontmatter and `docs/context/decision-log.md`; D1 and D4 were amended at the decompose gate (full rewrite, all human-facing output), and D6 pulls the interview playback pointer repair into this feature.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [rewrite-output-style-as-ste.md](rewrite-output-style-as-ste.md) | — | checkpoint | Full STE rewrite of the style doc + its test; bundle regen + installed-copy sync same commit |
| 2 | [vendor-ste-linter-script.md](vendor-ste-linter-script.md) | — | checkpoint | Vendor upstream `ste_lint.py` at `scripts/ste-lint.py` with SPDX header + CHANGELOG line |
| 3 | [add-ste-lint-ci-test.md](add-ste-lint-ci-test.md) | 1, 2 | checkpoint | CI test: `--self-test` + lint shipped template prose to zero fix-to-zero violations; skip legibly without python3 |
| 4 | [restore-interview-playback-pointer.md](restore-interview-playback-pointer.md) | 1 | checkpoint | One-line style citation at interview's playback gate (D6); skill edit + full regen/sync same commit |

## Execution waves

- Wave 1: specs 1, 2 — parallel-safe (Affected Files disjoint)
- Wave 2 (after wave 1): specs 4, 3 in that order — NOT parallel-safe (overlap: `src/bundled-files.ts`; spec 3 may also re-touch template prose and must lint the final state)

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

Cross-queue hazard: spec 4 edits `src/skills/joycraft-interview.md`, whose playback template is owned by two `in-review` specs in `docs/features/2026-07-29-succinct-gates/specs/`. If those specs get revised before spec 4 lands, coordinate the edit (see spec 4's Edge Cases).

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-08-11-ste-human-output/` — it executes the specs in wave order (parallel-safe waves may run as concurrent subagents; everything else runs sequentially in the driving conversation) and finishes with session-end. Or run one spec at a time with `/joycraft-implement <spec-path>`; the implement skill reads this README first so it understands the spec's position in the wave plan, and continues through the queue itself. Each spec is self-contained for the actual implementation; this README provides ordering context only.
