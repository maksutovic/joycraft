# Decomposition: STE Human Output — STE as the house style + maintainer-side linter

> **Parent Brief:** `docs/features/2026-08-11-ste-human-output/brief.md`
> **Design:** `docs/features/2026-08-11-ste-human-output/design.md` (§2.1/§2.6 superseded — see its amendment note)
> **Date:** 2026-08-11 · rev 3 — D1/D4 amended (rev 2), D6 stamped: interview pointer repair joins this feature as spec 4

## Reframe (rev 1 → rev 2)

Rev 1 decomposed the append-a-section shape. The human rejected that framing at the gate: STE is the primary house style, not an addon. Amendments stamped in the brief frontmatter and `docs/context/decision-log.md`:

- **D1 amended** — `src/templates/reference/output-style.md` is rewritten as one integrated STE rule set (~10 rules merging the prior 8 with STE mechanics), the doc itself written in STE. The template test updates in the same spec, keeping the score-scale and absolute-path bans.
- **D4 amended** — governed surfaces are all human-facing output: gate artifacts, PR bodies, session-end summaries, interview playback, and gate chat/dialogue.
- D2 (linter repo-side), D3 (two-tier check), D5 (attribution) are unchanged.
- Rev 1's proposed D6 (heading-collision guard) dissolves into amended D1: the rewrite updates the test on purpose instead of tiptoeing around it. Zero INVENTED items remain.

## Prior knowledge reused

- `docs/context/decision-log.md` 2026-08-11 STE D1–D5 + same-day D1/D4 amendments — the decisions this decomposition executes.
- `docs/context/decision-log.md` 2026-07-27 Output-style D1/B2 — one canonical home at `src/templates/reference/output-style.md`, shipped to user projects at `docs/templates/reference/`.
- `docs/context/decision-log.md` 2026-07-27 Output-style D2 — the short-rule-set decision whose escalation clause this feature exercises; its 6–10 rule band shaped the ~10-rule merge target.
- `docs/context/decision-log.md` 2026-07-27 Output-style D3/D5 — 11 skills carry placement-tested pointers to the doc; a rewrite rides those pointers with zero skill-body edits, and the pointers cover chat output moments, which is what lets D4's dialogue scope ship without new plumbing.
- `docs/context/shipped.md` 2026-07-27 + 2026-07-29 — `output-style.md`, both `tests/output-style-*.test.ts` families, and the succinct-gates rails already exist on disk.

Retrieval was truncated at the 5-row cap; `docs/discoveries/2026-07-27-human-readable-output-style.md` and the prose-style-techniques research folder were not read past their openings.

## Repo facts verified this pass

- `tests/bundled-files-sync.test.ts:67-82` asserts `src/bundled-files.ts` TEMPLATES content matches `src/templates/` byte-for-byte. Any template edit must run `pnpm sync-skills` in the same commit and update this repo's own installed copy `docs/templates/reference/output-style.md` (byte-identical today, linguist-generated).
- `tests/output-style-template.test.ts` reads only the canonical template. The rewrite spec owns updating it: rule-count band, section slicers, and the retained score-scale (`:79-81`) and absolute-path (`:61-65`) bans.
- `tests/output-style-pointer.test.ts` and `tests/gate-contract.test.ts` never read the template body — the rewrite cannot break them.
- `scripts/` is absent from `package.json` `"files": ["dist"]` — a vendored script never reaches npm consumers (confirms D2).
- CI: `ubuntu-latest`, `pnpm test --run`; python3 is on the image but undeclared — the lint test skips legibly when python3 is absent (design §2.4).
- Child-process test precedent: `tests/status-scripts.test.ts:26-37` (`execFileSync` + result-wrapping `run()` helper).
- CHANGELOG format: `## <version> — <Name> (<date>)`, before-paragraph, `**Now:**`, `**Side effects:**`, newest first.
- No `ste_lint.py` copy exists in the repo; the implement session fetches it from upstream (github.com/AminBlg/SimpleEnglish, v1.2.0, MIT — license verified 2026-08-11 per design §2.2).

## Contradiction — resolved as D6 (human choice, rev 3)

`docs/features/2026-07-29-succinct-gates/specs/interview-playback-and-question-contract.md` (live, `in-review`) removed the `output-style.md` pointer from `joycraft-interview`'s playback step. The working tree confirms the landed state: the Hand Off step still cites the doc (`src/skills/joycraft-interview.md:268`), the playback gate (~`:95-105`) carries only the inline slot template, and interview remains in the pointer test roster (test green via the Hand Off citation).

The human chose repair-in-feature over defer (D6): spec 4 restores a one-line style-contract citation at the playback gate, beside the per-slot caps. Known hazard: the succinct-gates queue owns that file's in-review specs — if they get revised before spec 4 lands, coordinate the edit.

## Decomposition table

| # | Spec Name | Description | Dependencies | Size | Mode (recommended) |
|---|-----------|-------------|--------------|------|--------------------|
| 1 | `rewrite-output-style-as-ste` | Rewrite `src/templates/reference/output-style.md` as one integrated STE rule set (~10 rules, doc written in STE, scope = all human-facing output including dialogue), update `tests/output-style-template.test.ts` to the new structure, and regen bundle + sync installed copy in the same commit. | — | L | checkpoint |
| 2 | `vendor-ste-linter-script` | Vendor upstream `ste_lint.py` (SimpleEnglish v1.2.0, MIT) at `scripts/ste-lint.py` with SPDX/URL/version header and a CHANGELOG line. | — | S | checkpoint |
| 3 | `add-ste-lint-ci-test` | Add `tests/ste-lint.test.ts` that shells to `python3 scripts/ste-lint.py` for `--self-test` and lints the shipped human-facing template prose to zero fix-to-zero-class violations, skipping legibly when python3 is absent. | 1, 2 | M | checkpoint |
| 4 | `restore-interview-playback-pointer` | Add a one-line style-contract citation at `joycraft-interview`'s playback gate beside the per-slot caps, with bundle regen + generated/installed skill copies synced in the same commit. | 1 | S | checkpoint |

Project default mode is `batch` (no `**Default execution mode:**` line in CLAUDE.md — safe default used). Recommendation deviates to `checkpoint` for all four: each spec deserves an atomic commit given the bundle-regen coupling. The size heuristic says `isolated` for spec 1 (L), but the rewrite is one doc plus one test — care-heavy, not context-heavy — so shared context with a per-spec commit fits better; override to `isolated` if you disagree.

Spec 4's dependency on 1 is ordering, not files: both regenerate `src/bundled-files.ts`, so they must not run concurrently, and the citation should land after the doc it points at is rewritten.

## Execution waves

- **Wave 1: specs 1, 2 — parallel-safe.** Affected Files are disjoint: spec 1 touches `src/templates/reference/output-style.md`, `src/bundled-files.ts`, `docs/templates/reference/output-style.md`, `tests/output-style-template.test.ts`; spec 2 touches `scripts/ste-lint.py`, `CHANGELOG.md`.
- **Wave 2 (after wave 1): specs 4, 3 — sequential, NOT parallel-safe** (overlap: `src/bundled-files.ts`, and spec 3 may re-touch template prose). Spec 4 restores the playback citation; spec 3 then lints the final prose with spec 2's script, fixing any fix-to-zero violations and regenerating in its own commit.

## INVENTED review

**All constraints traced — zero INVENTED.** Rev 1's single invented item (the heading-collision guard) is covered by amended D1; spec 4's constraints trace to D6 and the 2026-07-27 B1 skill-edit sync pattern.

## Review questions

1. Does this breakdown match how you think about this feature?
2. Are there any specs that feel too big or too small? (Spec 1 carries the full rewrite plus its test — split doc and test if you want them separate. Spec 3 owns "fix our own prose to pass.")
3. Should any of these run in parallel (separate worktrees)? Wave 1 is marked parallel-safe; wave 2 is not.
