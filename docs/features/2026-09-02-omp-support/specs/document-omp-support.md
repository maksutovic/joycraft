---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-03
feature: 2026-09-02-omp-support
mode: batch
---

# Document omp Support — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-02-omp-support/brief.md`
> **Status:** Ready
> **Date:** 2026-09-03
> **Estimated scope:** 1 session / 3 doc files / ~40 lines

---

## What

Close the feature with documentation and a drift gate. Add omp to the README's harness list, add the `src/omp-skills/` row to the AGENTS.md architecture table (and the `.omp/skills` note to the sync workflow), and write the CHANGELOG entry — which must call out the D5 side effect: **projects with pre-selection state gain `.omp/skills` on their next upgrade.**

This spec also runs a zero-drift verification gate: regenerate and re-sync, and assert nothing changes. That is a *check*, not the sync — specs 1 and 3 each already committed their own regenerated and synced trees per the AGENTS.md ALWAYS rule.

## Why

Without the CHANGELOG entry the PR fails the docs-sync gate (`scripts/check-docs-sync.mjs` runs as both a PreToolUse hook and the Docs Sync CI check, and blocks any PR touching `src/`, `templates/`, or `scripts/` without a CHANGELOG change or a `Docs: none — <reason>` body line). Without the D5 note, users are surprised by a new directory appearing on a routine upgrade.

## Acceptance Criteria

- [ ] README lists omp among the supported harnesses with its `.omp/skills` install path and `/skill:joycraft-*` invocation form [src: brief "Decomposition"]
- [ ] AGENTS.md's architecture table has a `src/omp-skills/` row marked GENERATED — never edit [src: brief "Decomposition"]
- [ ] AGENTS.md's Key Files table notes that `src/omp-skills/` is generated from `src/skills/` alongside the other four [src: brief "Decomposition"]
- [ ] CHANGELOG.md has an entry for omp support [src: brief "Hard Constraints"]
- [ ] That entry states the D5 side effect: projects with pre-selection state gain `.omp/skills` on the next upgrade [src: D5]
- [ ] `node scripts/generate-bundled-files.mjs` followed by `pnpm sync-skills` produces **no** git diff [src: AGENTS.md]
- [ ] `scripts/check-docs-sync.mjs` passes for this branch [src: AGENTS.md]
- [ ] `pnpm test` and `pnpm typecheck` pass [src: brief "Success Criteria"]
- [ ] Baseline preserved: no regressions against 2565 passing / 1 skipped as of 2026-09-02, plus this feature's new tests [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| README names omp | Manual read + `grep -i omp README.md` | manual |
| AGENTS.md architecture row | `grep 'src/omp-skills' AGENTS.md` | manual |
| CHANGELOG entry + D5 note | `grep -i 'omp' CHANGELOG.md` and read the entry for the upgrade side effect | manual |
| Zero generator drift | `node scripts/generate-bundled-files.mjs && pnpm sync-skills && git diff --exit-code` | integration |
| docs-sync gate passes | `node scripts/check-docs-sync.mjs` | integration |
| Full suite green | `pnpm test && pnpm typecheck` | integration |

**Execution order:**
1. Write the docs
2. Run the zero-drift check — it must pass without producing changes; if it produces changes, an earlier spec failed to sync and that is the bug to fix
3. Run the docs-sync gate and the full suite

**Smoke test:** `node scripts/check-docs-sync.mjs` — seconds, and it is the gate that blocks the PR.

**Before implementing, verify your test harness:**
1. The zero-drift check is only meaningful if run on a clean tree — commit or stash unrelated work first
2. Each check runs the real script, not a reimplementation
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: touch `CHANGELOG.md` in this PR [src: brief "Hard Constraints"]
- MUST: note the D5 side effect — pre-selection-state projects gain `.omp/skills` on the next upgrade [src: D5]
- MUST: add the `src/omp-skills/` architecture row to AGENTS.md, marked generated [src: brief "Decomposition"]
- MUST: verify zero generator/sync drift rather than performing the sync [src: AGENTS.md]
- MUST NOT: own the skill sync — specs 1 and 3 each synced in their own commit [src: AGENTS.md]
- MUST NOT: document the headless runtime, omp deny patterns, `.omp/RULES.md`, omp's `ask` tool, or `.omp/mcp.json` as shipped — all are out of scope and two are backlogged [src: D1, D3, brief "Out of Scope"]
- MUST NOT: reference the scenarios repo or any scenario test contents [src: AGENTS.md]
- MUST NOT: edit source, scripts, or skills — this spec is documentation plus a check [src: brief "Decomposition"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `README.md` | omp added to the harness list with install path and invocation form |
| Modify | `AGENTS.md` | `src/omp-skills/` architecture row; Key Files note listing omp among generated trees; `.omp/skills` added to the sync-skills ALWAYS rule's installed-tree mention |
| Modify | `CHANGELOG.md` | omp support entry including the D5 upgrade side effect |

## Approach

Write the CHANGELOG entry first — it is the gate that blocks the PR, and drafting it forces an accounting of what actually shipped versus what was deferred. Mirror the 0.7.5 Copilot entry's shape, since this feature is deliberately its analogue.

The entry needs three things: what omp is (a Bun-based Pi fork with its own config dir), what shipped (skills into `.omp/skills`, init/upgrade management, private-profile gitignore, telemetry), and the D5 side effect stated plainly. The side effect deserves its own sentence rather than a parenthetical — a new top-level directory appearing after `npx joycraft upgrade` is exactly the kind of surprise a changelog exists to prevent. Also worth one line: what did *not* ship, so users on omp don't expect the headless loop that Pi has. Both deferrals already have backlog files on disk (`docs/backlog/2026-09-02-omp-headless-runtime.md`, `docs/backlog/2026-09-02-cross-harness-deny-patterns.md`) — point at them rather than restating their contents.

The zero-drift check is the real substance here. If `git diff --exit-code` reports changes after regenerating, the correct response is **not** to commit them from this spec — it means spec 1 or spec 3 shipped a stale tree, which is the 0.7.3 failure mode reappearing. Fix it at the source spec and note the discovery.

**Rejected alternative:** folding these doc edits into spec 5's siblings — README into spec 2, CHANGELOG into whichever spec lands last. This is superficially DRY-er but produces a PR where the docs-sync gate's pass/fail depends on merge order, and it removes the single place where the whole feature is described coherently. A terminal docs spec is cheap and makes the feature reviewable as one thing.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Zero-drift check produces a diff | Do not commit it here. Identify which spec's tree is stale, fix there, capture a discovery |
| `check-docs-sync.mjs` still fails after the CHANGELOG edit | Verify the entry is in the right section and the script's command-position matching is satisfied; the `Docs: none` escape is not appropriate here since this PR touches `src/` |
| README already mentions omp from an earlier spec | Idempotent — verify accuracy rather than duplicating |
| CHANGELOG has an Unreleased section | Add there; do not invent a version number or publish |
| A doc still describes four harnesses | Update the count — stale arithmetic is the drift this spec exists to catch |
| Someone asks to also document the runtime port | Out of scope; point at the backlog file |
