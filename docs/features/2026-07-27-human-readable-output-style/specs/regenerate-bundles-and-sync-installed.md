---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-27
feature: 2026-07-27-human-readable-output-style
mode: checkpoint
---

# Regenerate Bundles and Sync Installed Copies — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md`
> **Status:** Ready
> **Date:** 2026-07-27
> **Estimated scope:** 1 session / generated trees + installed copies / mostly mechanical

---

## What

Run `scripts/generate-bundled-files.mjs` to propagate this feature's canonical
source changes into every generated surface, then sync the repo's own installed
skill copies so they byte-match.

Two changes need propagating: the new template
`src/templates/reference/output-style.md` (spec 1) must appear as a key in the
`TEMPLATES` record, and the eleven edited files in `src/skills/` (spec 3) must
appear in all three generated harness trees — `src/claude-skills/`,
`src/codex-skills/`, `src/pi-skills/` — plus `.claude/skills/<name>/SKILL.md`.

This spec is the terminal step. It runs only after specs 1–5 have all landed.

## Why

Canonical edits under `src/skills/` and `src/templates/` reach nothing on their
own. Until the generator runs, the eleven pointers exist in source but in no
shipped artifact, and the style doc is not in the bundle, so `joycraft init`
would not install it. Three-way harness parity and installed-copy byte-match
tests fail until this runs.

## Acceptance Criteria

- [ ] `scripts/generate-bundled-files.mjs` has been run and its output committed. [src: brief "Hard Constraints"]
- [ ] `src/bundled-files.ts` contains a `TEMPLATES` key `reference/output-style.md`. [src: D1]
- [ ] All eleven edited skills appear with their pointers in `src/claude-skills/`. [src: brief "Hard Constraints"]
- [ ] All eleven edited skills appear with their pointers in `src/codex-skills/`. [src: brief "Hard Constraints"]
- [ ] All eleven edited skills appear with their pointers in `src/pi-skills/`. [src: brief "Hard Constraints"]
- [ ] `.claude/skills/<name>/SKILL.md` byte-matches its generated source variant for all eleven skills. [src: brief "Hard Constraints"]
- [ ] Three-way harness parity tests pass. [src: brief "Success Criteria"]
- [ ] Installed-copy byte-match tests pass. [src: brief "Success Criteria"]
- [ ] `tests/retrieval-pass-skill.test.ts` and `tests/confidence-scoring-skill.test.ts` pass against the newly synced installed copies. [src: brief "Hard Constraints"]
- [ ] A scaffolded project receives the style doc at `docs/templates/reference/output-style.md`. [src: D1]
- [ ] No generated file was hand-edited — every change traces to generator output. [src: design §2 item 7]
- [ ] `pnpm test --run` passes. [src: brief "Success Criteria"]
- [ ] `pnpm typecheck` passes. [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Bundle regenerated correctly | `pnpm test --run regenerate-bundled-files` | unit |
| Bundle in sync with sources | `pnpm test --run bundled-files-sync` | unit |
| Three-way harness parity | `pnpm test --run codex-skill-parity pi-skill-content` | unit |
| Installed copies byte-match | `pnpm test --run implement-mode-handoff` | unit |
| Windowed assertions survive sync | `pnpm test --run retrieval-pass-skill confidence-scoring-skill` | unit |
| Style doc reaches a scaffolded project | `pnpm test --run init` — a scaffold writes `docs/templates/reference/output-style.md` | integration |
| Whole suite green | `pnpm test --run` | integration |
| Types green | `pnpm typecheck` | unit |

**Execution order:**

1. Confirm specs 1–5 have landed. Running the generator against a partial source
   set produces a half-propagated bundle that looks correct.
2. Run `pnpm test --run` and record which tests fail — the parity and byte-match
   failures are expected here and are the red state this spec resolves.
3. Run the generator.
4. Run `pnpm test --run && pnpm typecheck` — all green.

**Smoke test:** `pnpm test --run bundled-files-sync` — directly asserts generated
output matches canonical sources, which is this spec's whole job.

**Before implementing, verify your test harness:**

1. Run the suite BEFORE regenerating and confirm the parity/byte-match tests
   FAIL. If they already pass, either the generator was run early or the source
   edits did not land — diagnose before proceeding.
2. Confirm the parity tests compare generated trees against `src/skills/` rather
   than against each other; a test that only cross-checks generated trees passes
   happily when all three are equally stale.
3. Identify your smoke test — `bundled-files-sync`, seconds not minutes.

## Constraints

- MUST regenerate by running `scripts/generate-bundled-files.mjs`. [src: brief "Hard Constraints"]
- MUST sync `.claude/skills/**` installed copies to byte-match their generated variants. [src: brief "Hard Constraints"]
- MUST run after specs 1–5 have landed. [src: design §2 item 7]
- MUST NOT hand-edit `src/bundled-files.ts`, `src/claude-skills/`, `src/codex-skills/`, or `src/pi-skills/`. [src: design §2 item 7]
- MUST NOT edit `src/skills/` or `src/templates/` in this spec — a source edit here would need another regeneration and re-open the loop. [src: design §2 item 7]
- MUST NOT modify a test to accommodate generator output. A parity failure means the source or the generator is wrong. [src: brief "Hard Constraints"]
- MUST NOT change the generator's transform primitives. [src: design §2 "What does not change"]
- MUST NOT add any runtime dependency. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Regenerate | `src/bundled-files.ts` | Gains the `reference/output-style.md` TEMPLATES key; eleven SKILLS entries pick up their pointers. |
| Regenerate | `src/claude-skills/*.md` | Eleven files gain the pointer line. |
| Regenerate | `src/codex-skills/*.md` | Eleven files gain the pointer line, `instructions:` stripped as usual. |
| Regenerate | `src/pi-skills/*.md` | Eleven files gain the pointer line, `instructions:` stripped as usual. |
| Sync | `.claude/skills/<name>/SKILL.md` | Eleven installed copies re-synced to byte-match their generated variants. |

## Approach

Mechanical, but it is the step this repo most reliably gets wrong — the memory
layer records skill edits needing bundle regeneration and installed-copy sync in
the *same commit* as a repeated gotcha. Run the generator, then sync the
installed copies, then verify; do not stop at the generator.

Order matters and the reason is specific: `tests/retrieval-pass-skill.test.ts` and
`tests/confidence-scoring-skill.test.ts` read `.claude/skills/<name>/SKILL.md`,
the *installed* copies. Those tests were green during spec 3 precisely because
the installed copies were stale. This spec is the first moment the pointer edits
actually reach them, so this is where the 1500-char window hazard finally
resolves — a spec-3 edit that pushed content out of a window fails HERE, not
there.

If a windowed test fails after sync, the fix belongs in the pointer's placement
in `src/skills/` — move it further from the anchor heading, regenerate, re-sync.
The fix is never to widen the window or edit the assertion. That would trade a
real signal for a green check.

Verify the three-way parity separately from the byte-match. They fail for
different reasons: parity breaks when the generator's harness-specific transforms
mis-handle new content; byte-match breaks when the sync step is skipped. Reading
one failure as the other sends the fix to the wrong place.

**Rejected alternative:** folding regeneration into each preceding spec. It would
spread generated-file churn across five commits, make every diff noisy, and
produce intermediate commits where generated trees disagree about which sources
they reflect. One terminal regeneration keeps generated churn in exactly one
reviewable commit.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A windowed test fails after sync | Expected failure mode. Fix by relocating the pointer in `src/skills/`, then regenerate and re-sync. Never widen the window or edit the test. |
| The generator errors on an unknown `{{var}}` | `substituteVars` is fail-closed by design. A pointer containing `{{…}}` is the cause — remove the braces from the pointer text. |
| Parity passes but byte-match fails | The sync step was skipped. Generated trees are correct; installed copies are stale. |
| Byte-match passes but parity fails | The generator's per-harness transform mishandled the new content. Diagnose the transform, not the sync. |
| The style doc does not appear in TEMPLATES | Confirm it sits under `src/templates/reference/` and not in an excluded tree — the bundler skips `pi-extensions`, `pi-scripts`, and `pi-agents`. |
| Specs 1–5 have not all landed | Stop. Regenerating a partial source set yields a bundle that looks correct and is not. |
| A generated diff appears unrelated to this feature | Do not commit it blindly. It means the generated trees were already stale before this feature; surface it rather than absorbing it into this commit. |
