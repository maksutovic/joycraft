# Autonomous Spec Execution — Feature Specs

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **North star:** `docs/vision/headless-joycraft.md` (the "why" — read first)
> **Absorbs:** the Pi implement-loop (was `docs/features/2026-05-28-pi-process-loop/`, now tombstoned) — "isolated mode" IS that loop (spec 8)
> **Status:** Decomposed 2026-05-28, ready for implementation

## What this feature does

Phase 1 of Headless Joycraft. Makes spec execution **mode-driven** (`batch` / `checkpoint` / `isolated`) and splits the heavy `joycraft-session-end` into two tiers: a NEW lightweight `joycraft-spec-done` (per spec: status bump + terse discovery-if-surprised + commit) and a re-scoped `joycraft-session-end` (once per feature: full validation + consolidate discoveries + push + PR). Spec status is unified to `todo → in-review → done` across both the queue JSON and frontmatter. Isolated mode on Pi is the single-shot `pi -p` loop — the process boundary gives free context isolation.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [define-status-vocabulary.md](define-status-vocabulary.md) | — | batch | Canonical `todo→in-review→done` reference doc; every other spec cites it |
| 2 | [migrate-existing-statuses.md](migrate-existing-statuses.md) | 1 | batch | One-time migrate ~13 specs + 4 queue JSONs + 1 bugfix to the 3 words |
| 3 | [update-status-scripts.md](update-status-scripts.md) | 1 | checkpoint | `next-spec` serve `todo`; `mark-done --to <state>`; `spec-status` 3 glyphs |
| 4 | [execution-modes-in-decompose.md](execution-modes-in-decompose.md) | 1 | checkpoint | decompose tags each spec with a mode + surfaces a human-approved recommendation; reads CLAUDE.md default |
| 5 | [joycraft-spec-done-skill.md](joycraft-spec-done-skill.md) | 1, 3 | checkpoint | NEW lightweight skill (3 variants): bump `todo→in-review` both systems, terse discovery, commit |
| 6 | [rescope-session-end.md](rescope-session-end.md) | 1, 3 | checkpoint | session-end → feature finisher: validate, consolidate, graduate `in-review→done`, push, PR |
| 7 | [implement-mode-aware-handoff.md](implement-mode-aware-handoff.md) | 4, 5 | checkpoint | implement reads spec mode; Step-6 hand-off differs per mode × harness |
| 8 | [pi-implement-loop.md](pi-implement-loop.md) | 3, 5, 6 | isolated | `pi -p` isolated-mode driver; retire the vestigial `joycraft_next_spec` tool |
| 9 | [wire-and-bundle.md](wire-and-bundle.md) | 5, 6, 8 | checkpoint | regenerate bundled-files; verify init/upgrade install; docs + scripts README |

## Execution waves

- **Wave 1** (sequential — foundational): **1 → 2.** Write the vocabulary contract, then migrate on-disk data to match it.
- **Wave 2** (after 1; mostly parallel): **3, 4, 5, 6.** All depend on the vocabulary (spec 1). 5 and 6 also depend on 3 (they call the new `mark-done --to`), so **land 3 first** within this wave, then 4/5/6.
- **Wave 3** (after wave 2): **7** (needs 4 + 5), **8** (needs 3 + 5 + 6). Can run in parallel with each other.
- **Wave 4** (last): **9** (needs 5 + 6 + 8) — bundles and verifies install.

A safe fully-sequential order that always respects dependencies: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.**

## Bootstrap note (important for the implementer)

This feature's own `.joycraft-spec-queue.json` is intentionally written in the **new** format (`"status": "todo"` + a `"mode"` field) to dogfood spec 4. But the **currently-installed** `joycraft-next-spec` script still serves `"active"` and won't recognize `"todo"` until **spec 3** ships. Consequences:

- If you're implementing these specs **by hand / in this conversation** (not via the old Pi loop), just follow the sequential order above — the queue is documentation, not a blocker.
- The live `next-spec`/`mark-done` scripts will only correctly serve/advance this queue **after spec 3 is done**. Until then, advance manually.
- Specs 1 and 2 are `mode: batch` — implement them together in one context, wrap with session-end-style commit. From spec 3 onward, `checkpoint` (commit per spec via the new spec-done once it exists; before that, commit manually) is the working cadence.

## How to use this file

If you're running `/joycraft-implement <spec-path>`, the implement skill reads this README first so it understands the spec's position in the wave plan. Each spec is self-contained for the actual implementation; this README provides ordering context only.
