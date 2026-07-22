---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: checkpoint
---

# Create Harness Config — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 3 files / ~60 lines

---

## What

Create the committed harness config file `docs/.joycraft/config.json` beside the gitignored `state.json` (D4), encoding the model-tiering carry-forward: per-stage tiers as `{stage: {intent, model}}`, per-harness maps, and a degradation ladder. Also migrate this repo off the legacy `.claude/.joycraft/state.json` location to `docs/.joycraft/state.json` (the path `src/version.ts` already expects).

## Why

The brief's hard model-tiering constraint requires a config surface for S6–S9 to build on, and this repo's own state still sits at the legacy pre-v0.6.15 path, so the machinery this sprint adds would read the wrong location.

## Acceptance Criteria

- [ ] `docs/.joycraft/config.json` exists, is valid JSON, and is **committed** (not gitignored)
- [ ] It encodes: `tiers` keyed by stage (`plan`, `orchestrate`, `implement`, `verify`), each `{intent, model}` with tier-intent names (e.g. `frontier-reasoning`, `cheap-mechanical`); `harness_maps` translating intents to concrete models per harness (`claude`, `codex`, `pi`); `degradation` — an ordered ladder of fallback models (D4; `docs/backlog/2026-07-20-model-tiering.md`)
- [ ] Legacy `.claude/.joycraft/state.json` content is moved to `docs/.joycraft/state.json`; the legacy dir is removed
- [ ] `.gitignore` ignores `docs/.joycraft/state.json` but NOT `docs/.joycraft/config.json`
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Valid JSON + required keys | `node -e "const c=require('./docs/.joycraft/config.json'); ['plan','orchestrate','implement','verify'].forEach(s=>{if(!c.tiers[s].intent||!c.tiers[s].model)throw s}); if(!c.harness_maps||!Array.isArray(c.degradation))throw 'shape'"` | unit |
| Committed vs ignored | `git check-ignore docs/.joycraft/config.json` exits non-zero; `git check-ignore docs/.joycraft/state.json` exits zero | structural |
| Migration complete | `test ! -e .claude/.joycraft && test -f docs/.joycraft/state.json` | structural |
| State content preserved | version field in migrated state.json matches the legacy file's pre-move value | structural |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** write the checks first, confirm they fail (config.json absent; legacy dir present), then create/migrate until green.

**Smoke test:** the `node -e` JSON shape check — instant.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL against the current tree
2. Checks inspect the real repo files and real git ignore state
3. Smoke test runs in seconds

## Constraints

- MUST: keep `state.json` gitignored and machine-owned; `config.json` committed and human-owned (D4 — different owners, different git lifecycles)
- MUST: satisfy all four model-tiering requirements: per-stage tiers, per-harness maps, tier-intent names, degradation ladder (brief hard constraint)
- MUST: preserve the legacy state.json content byte-meaningfully (hashes/version intact) during the move
- MUST NOT: touch `src/` — `src/version.ts:20` already points at `docs/.joycraft/state.json`; this is a repo-local file migration, not a code change
- MUST NOT: invent config keys beyond tiers/harness_maps/degradation without noting them as provisional

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `docs/.joycraft/config.json` | Tiers, harness maps, degradation ladder |
| Move | `.claude/.joycraft/state.json` → `docs/.joycraft/state.json` | Relocation only, content preserved |
| Edit | `.gitignore` | Ensure `docs/.joycraft/state.json` ignored; config.json not |

## Approach

Seed tier values from `docs/backlog/2026-07-20-model-tiering.md` ("recommend main-loop, enforce on subagent spawns"): `plan`/`verify` → frontier intent, `implement` → balanced, `orchestrate` → cheap-mechanical, with the degradation ladder listing concrete fallbacks in order. Keys are provisional until a skill consumes them (spec `upgrade-optimize-v2` reads this file). Rejected alternative: extending state.json with tier fields — it's gitignored, so tiers would be neither shared nor reviewable, and `upgrade` rewrites it (design §5 Q-D4 Option B).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `.gitignore` already covers `docs/.joycraft/` wholesale | Narrow it to `docs/.joycraft/state.json` so config.json commits |
| Legacy state dir absent (already migrated) | Skip the move; create config.json only |
| Both legacy and new state.json exist | Keep the newer `version`; delete the other; note it in the commit message |
