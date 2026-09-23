# Decompose Review — fable-native-sdlc-harness

> **Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Date:** 2026-09-22 · **Specs:** 12 · **Waves:** 4
> **Decisions D1–D15** are stamped in the brief and were not reopened.
> Canonical specs: `docs/features/2026-09-22-fable-native-sdlc-harness/specs/`

## Prior knowledge reused

1. `docs/context/decision-log.md` 2026-09-01 (Curated-harness D4): optimize's evidence vocabulary is exactly-N with no synonyms. Spec 11 adds one label, `MODEL_SUPERSEDED`, and moves the count from seven to eight. The no-synonyms invariant holds.
2. `docs/context/decision-log.md` 2026-07-27 (Output-style D1/B2): reference docs ship from `src/templates/reference/` and land at `docs/templates/reference/`. Spec 1 uses that path.
3. `docs/discoveries/2026-07-29-test-suite-regenerates-bundles.md`: regen and sync must land in the same commit as any skill edit. Every skill spec here carries that constraint. Spec 12 is a zero-drift gate, not the owner of the sync.
4. `docs/discoveries/2026-07-31-stamp-gate-artifacts.md`: verify a skill has the step before rostering it, and check the bundled TEMPLATES record before writing template-shipping criteria. Spec 4 also names the two character-window tests that discovery widened.
5. `docs/context/shipped.md` 2026-09-01 (curated-harness): the `INACCESSIBLE` evidence precedent. Spec 11 reuses it when the profile doc is absent.

No retrieved decision contradicts the brief.

## Brief mismatches found during codebase verification

| Claim in brief | What the code shows | Effect |
|---|---|---|
| update inserts the pointer "through the merge logic" | `improveCLAUDEMd` and `improveAgentsMd` have no production caller. `materializeDocuments` treats memory files as create-once. | Spec 3 wires the merge logic into the update path for the first time, via an `InventoryPatchOperation` producer in `src/update-inventory.ts`. This is the riskiest spec. |
| `src/bundle-inventory.ts:121` | The unconditional shared line is near 118–124. | None. Line drift only. |
| `src/templates/reference/` has no enumeration test | True. `tests/output-style-template.test.ts` does assert byte parity for one file against `docs/templates/reference/`. | Spec 1 models its dogfood criterion on that precedent. |
| `templates/claude-kit/hooks-example.json` is "the existing recipe pattern" | The repo-root `templates/` folder ships to nobody; the generator reads `src/templates/` only. | Spec 9 puts the recipes under `src/templates/hooks/`, landing at `docs/templates/hooks/`. |
| Nothing writes to `.github/workflows/` | `src/init-autofix.ts` writes every `workflows/`-prefixed template key there under the opt-in autofix command. | Spec 10 keeps the scaffold under `evals/` and adds a test that the prefix stays clear. |
| AGENTS.md carries a "never use markdown"-style rule | It does not. The candidates are narrower: an inline probation marker, a wrong-flag parenthetical, and the Execution Profile model line. | Spec 12 names them as candidates for optimize, not as pre-decided edits. |
| The pointer row inserts into an existing Context Map | This repo's CLAUDE.md is five lines with no Context Map; AGENTS.md has none either. | Spec 3's missing-section premise (Q1) is exercised by the dogfood itself. |
| `tests/bundle-inventory.test.ts` not mentioned | It asserts every entry's harness is `shared` or the selected harness. | Spec 2 gates by a path-keyed table and keeps the harness field scalar. |

## Decomposition

| # | Spec | Description | Depends on | Size | Mode | Wave |
|---|------|-------------|-----------|------|------|------|
| 1 | write-model-profile-doc | Add the Fable 5.1 profile reference doc with named, greppable blocks and land its installed copy. | — | M | checkpoint | 1 |
| 2 | gate-reference-docs-by-harness | Let a template entry declare its harnesses; the profile doc installs for claude, pi, omp, never codex; add the reference-dir enumeration test. | — | M | checkpoint | 1 |
| 3 | point-memory-file-at-profile | Fresh install and update both emit one Context Map row pointing at the profile doc, idempotent, nothing else touched. | 1, 2 | M | checkpoint | 2 |
| 4 | cite-profile-in-skills | Five skills cite the profile doc by path and block name, no block text copied. | 1 | M | checkpoint | 3 |
| 5 | add-intent-template-and-inbox | Add the intent template and inbox README; installer creates `docs/intent/`; folder map gains a row. | — | S | batch | 1 |
| 6 | emit-intent-from-interview | Interview writes `docs/intent/<slug>.md` first; the draft brief becomes optional. | 5 | M | checkpoint | 2 |
| 7 | add-triage-mode-to-interview | Interview lists untriaged intents, proposes tags and priority, routes on the human's word. | 5, 6 | M | checkpoint | 3 |
| 8 | consume-intent-in-new-feature-and-bugfix | Both skills accept an intent path, pre-fill, stamp `intent:`, leave the file in place. | 5 | S | batch | 2 |
| 9 | ship-governance-hook-recipes | Four documented, unregistered hook recipes plus a wiring README. | — | M | checkpoint | 1 |
| 10 | ship-evals-in-ci-recipe | Inert evals scaffold under `docs/templates/evals/`; bugfix gains a one-line reminder. | — | M | checkpoint | 1 |
| 11 | add-fable-era-retire-source-to-optimize | Optimize gains a model-profile evidence step and the `MODEL_SUPERSEDED` label; tune's roadmap points at it. | 1 | M | checkpoint | 2 |
| 12 | dogfood-update-and-cleanup-on-joycraft | Run the built updater on this repo, assert zero drift, apply optimize's RETIRE rows to AGENTS.md by hand, update CHANGELOG. | 1–11 | M | checkpoint | 4 |

## Execution waves

- **Wave 1:** 1 → 2 → 5 → 9 → 10 — NOT parallel-safe (overlap: `docs/.joycraft/manifest.json`, `tests/bundle-inventory.test.ts`, `tests/model-profile-template.test.ts`, `tests/init-selections.test.ts`). Run in that order.
- **Wave 2:** 3, 6, 8, 11 — parallel-safe (Affected Files disjoint). Use worktrees: `pnpm sync-skills` rewrites every installed tree, so two syncs in one checkout can pick up each other's half-edits.
- **Wave 3:** 7 → 4 — NOT parallel-safe (overlap: `src/skills/joycraft-interview.md`). Spec 4 runs last so its citations land in the interview and new-feature skills after specs 6, 7, and 8 restructure them.
- **Wave 4:** 12 — sequential.

The brief placed spec 4 in wave 2. It moved to wave 3 because it edits the same two skill files as specs 6, 7, and 8.

`src/bundled-files.ts` is gitignored and regenerated by the test suite, so it is not counted as an overlap.

## Execution modes

The project has no `**Default execution mode:**` line, so the default is `batch`. Recommendation: S specs (5, 8) run `batch`; every M spec runs `checkpoint` so each lands an atomic commit with its regen and sync. No spec is L, so none needs `isolated`.

## INVENTED review

Every other constraint and acceptance criterion traces to a stamped decision or a named brief section. Three premises the brief did not settle were approved at this gate on 2026-09-22 and stamped as D16–D18. Zero INVENTED remain.

| Spec | Premise | Recommendation |
|------|---------|----------------|
| 3 point-memory-file-at-profile | A memory file with no `## Context Map` section receives the section plus the one row, appended. | Approve. The alternative leaves the user without a pointer. |
| 7 add-triage-mode-to-interview | Triage runs in chat and renders no HTML gate artifact. | Approve. Triage is a per-file yes/no, not a document the human reads. |
| 7 add-triage-mode-to-interview | Routing to bugfix or backlog names the next command; triage writes nothing to `docs/backlog/`. | Approve. Every backlog entry stays user-confirmed. |

Modes approved as recommended.

## Review questions

1. Does this breakdown match how you think about this feature?
2. Are there any specs that feel too big or too small? Spec 3 grew: it wires the merge logic into the update path for the first time.
3. Should any of these run in parallel? Only wave 2 is safe, and only in worktrees.
