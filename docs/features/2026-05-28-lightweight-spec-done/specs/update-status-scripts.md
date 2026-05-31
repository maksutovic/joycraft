---
status: in-review
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: checkpoint
---

# Update Status Scripts — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / 3 scripts × 2 locations + 1 test

---

## What
Rewrite the three bash status scripts to speak the unified `todo → in-review → done` vocabulary and to support the two-tier transitions:

- **`joycraft-next-spec`** — serve specs with `status == "todo"`; treat both `in-review` and `done` as "not eligible" (skip). Completion-set for dependency checks = `in-review` OR `done` (a dependency is "done enough to unblock" once it reaches `in-review`).
- **`joycraft-mark-done`** — generalize from a hard-coded `active→complete` sed into a `--to <state>` flag. `spec-done` calls it `--to in-review`; `session-end` calls it `--to done`. Default (no flag) = `in-review` for backward-friendliness, but callers should pass it explicitly.
- **`joycraft-spec-status`** — render three glyphs: `[ ]` todo, `[~]` in-review, `[✓]` done.

Each script is edited in BOTH its source-of-truth (`src/templates/pi-scripts/`) and this repo's installed copy (`.pi/scripts/joycraft/`).

## Why
These scripts are the runtime that the Pi loop and the skills shell out to. Until they serve `todo` and skip `in-review`, a spec that spec-done bumps to `in-review` would be re-served as if unstarted (infinite loop) or skipped as if done (lost). The `--to` flag is what lets one script drive both lifecycle transitions.

## Acceptance Criteria
- [ ] `joycraft-next-spec` serves the first `todo` spec whose dependencies are all `in-review` or `done`; never serves `in-review`/`done`
- [ ] `joycraft-next-spec` prints `Pipeline complete` only when zero `todo` specs remain
- [ ] `joycraft-mark-done <id> --to in-review` flips that spec's queue `status` to `in-review`; `--to done` flips it to `done`
- [ ] `joycraft-mark-done` rejects an unknown `--to` value (not in {todo, in-review, done}) with a non-zero exit and clear error
- [ ] `joycraft-mark-done` errors (non-zero) if the spec id is not found in the manifest (no silent no-op — the recon'd Bug 2)
- [ ] `joycraft-spec-status` prints `[ ]`/`[~]`/`[✓]` for `todo`/`in-review`/`done` respectively
- [ ] All three scripts are byte-identical between `src/templates/pi-scripts/` and `.pi/scripts/joycraft/`
- [ ] Scripts retain their executable bit
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| next-spec serves todo, deps met | `tests/status-scripts.test.ts`: write a temp queue JSON fixture, run the script via `execFileSync`, assert the served path | integration |
| next-spec skips in-review/done | Fixture with all specs `in-review`/`done` → assert `Pipeline complete` | integration |
| next-spec dependency gating | Fixture: spec 2 `todo` depends on spec 1 which is `todo` → assert 2 is NOT served; flip 1 to `in-review` → assert 2 IS served | integration |
| mark-done --to in-review | Run `mark-done 1 --to in-review` against a temp fixture, re-read JSON, assert status `in-review` | integration |
| mark-done --to done | Same, `--to done` → assert `done` | integration |
| mark-done bad --to value | `mark-done 1 --to frobnicate` → assert non-zero exit | integration |
| mark-done missing id | `mark-done 999 --to done` on a fixture lacking id 999 → assert non-zero exit + error message | integration |
| spec-status glyphs | Fixture with one of each state → assert output contains `[ ]`, `[~]`, `[✓]` | integration |
| source/installed parity | Read both copies of each script, assert string equality | unit |

**Execution order:**
1. Write all tests against temp-dir queue fixtures — they MUST fail (scripts still speak `active`/`complete`)
2. Confirm red
3. Rewrite scripts in `src/templates/pi-scripts/`, copy to `.pi/scripts/joycraft/`, until green

**Smoke test:** the `mark-done --to in-review` round-trip test — fastest single assertion.

**Before implementing, verify your test harness:**
1. Tests invoke the REAL scripts via `execFileSync('bash', [scriptPath, ...])` against throwaway temp fixtures — not a reimplementation of the parsing
2. Each test creates its own temp queue JSON (use `os.tmpdir()` + the project's temp pattern) so tests are isolated and don't mutate repo data
3. The round-trip mark-done test is the smoke test (sub-second)

## Constraints
- MUST: edit BOTH `src/templates/pi-scripts/<script>` (source-of-truth, feeds bundled-files) AND `.pi/scripts/joycraft/<script>` (this repo's installed copy) — keep them identical. (`docs/templates/pi-scripts/` is a legacy mirror; updating it is OPTIONAL and out of this spec's required set — note it for spec 9's bundle step.)
- MUST: preserve `set -euo pipefail` and the existing `[specs-dir]` argument contract of each script
- MUST: dependency-met test in `next-spec` = dep status is `in-review` OR `done` (NOT `done` only — else a checkpoint-mode chain stalls because nothing reaches `done` until session-end)
- MUST: `mark-done` validates `--to` against the exact set {todo, in-review, done}
- MUST NOT: change the scripts' filenames or their public CLI shape beyond adding the `--to` flag
- MUST NOT: introduce a jq dependency — stay with the existing grep/sed JSON parsing (these run in minimal environments)

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/pi-scripts/joycraft-next-spec` | serve `todo`; skip `in-review`/`done`; dep-met = `in-review`∨`done` |
| Modify | `src/templates/pi-scripts/joycraft-mark-done` | add `--to <state>`; validate; keep missing-id hard error |
| Modify | `src/templates/pi-scripts/joycraft-spec-status` | 3-glyph rendering |
| Modify | `.pi/scripts/joycraft/joycraft-next-spec` | identical copy |
| Modify | `.pi/scripts/joycraft/joycraft-mark-done` | identical copy |
| Modify | `.pi/scripts/joycraft/joycraft-spec-status` | identical copy |
| Create | `tests/status-scripts.test.ts` | Integration tests over temp fixtures |

## Approach
**Known current state (from recon):**
- `next-spec`: line 53 `if [ "$status" = "complete" ]` (completion set), line 62 `if [ "$status" != "active" ]` (eligibility), line 84 `grep -c '"active"'` (remaining count). Change `complete`→(`in-review`|`done`), `active`→`todo`, and the remaining-count grep to count `todo`.
- `mark-done`: line 28 checks `"status": "complete"`, line 35 `sed ... "active"→"complete"`. Replace with: parse `--to` arg, validate, sed the target id's status from any value to the requested state.
- `spec-status`: line 28 `if [ "$status" = "complete" ]; then marker="[✓]"`. Add `in-review`→`[~]`, default `todo`→`[ ]`.

Implement `mark-done`'s `--to` by scanning args for `--to` and taking the next token; the positional spec-id stays first. For the sed, match the entry by `"id": <ID>` and replace its `"status": "<anything>"` — not just `"active"` — so re-running transitions (`in-review`→`done`) works.

**Rejected alternative:** Two separate scripts (`mark-in-review`, `mark-done`). Rejected — the brief decided "one `mark-done --to` script"; two scripts duplicate the manifest-finding + sed logic and double the parity surface.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| `mark-done` called with no `--to` | Default to `in-review` (the common spec-done case); document this |
| Dependency is `in-review` (not yet `done`) | Treated as satisfied — checkpoint chains progress without waiting for session-end |
| All specs `in-review`, none `done` | `next-spec` prints `Pipeline complete` (nothing `todo` left); session-end later graduates them |
| `--to` value is a valid word but wrong case (`In-Review`) | Reject — exact-match the lowercase set |
| Manifest entry uses spaces vs no spaces around JSON colons | sed/grep patterns tolerate optional whitespace (`*`), as the current scripts already do |
