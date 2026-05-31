---
status: in-review
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: checkpoint
---

# Wire and Bundle — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / regenerate bundle + install verification + docs + 1 test

---

## What
The final wiring pass that makes everything built in specs 1–8 actually ship to users via `npx joycraft init`/`upgrade`:
1. Regenerate `src/bundled-files.ts` (`pnpm build` runs `generate-bundled-files.mjs`) so the new `joycraft-spec-done` skill (3 variants), the new `joycraft-implement-loop` script, and the edited decompose/session-end/implement skills + status scripts are all bundled.
2. Verify `init` and `upgrade` install the new skill + loop script (the install loops already iterate the bundled records — confirm the new entries flow through, no missing wiring).
3. Document the project-default execution-mode CLAUDE.md field convention (defined in spec 4) in the relevant docs/templates so users know how to set it.
4. Refresh the pi-scripts README with the new/changed scripts and the `--to` flag.
5. Confirm version hashing (`.joycraft-version`) covers the new files so `upgrade` detects them.

## Why
Editing source skills/scripts does nothing for users until `src/bundled-files.ts` is regenerated and the installers ship the new entries (the recon + [[project-pi-extension-fake-sdk]] both stress this). This spec closes the loop from "source edited" to "user gets it."

## Acceptance Criteria
- [ ] `src/bundled-files.ts` is regenerated and contains: the `joycraft-spec-done.md` skill in `SKILLS`, `CODEX_SKILLS`, `PI_SKILLS`; the `joycraft-implement-loop` script in `PI_SCRIPTS`; the updated decompose/session-end/implement skills; the updated status scripts; the edited pi extension in `PI_EXTENSIONS`
- [ ] A fresh `init` into a temp dir installs the `joycraft-spec-done` skill (all relevant harness dirs) and the `joycraft-implement-loop` script (executable)
- [ ] `upgrade` detects and offers the new/changed files (version-hash diff includes them)
- [ ] The project-default execution-mode CLAUDE.md field is documented where users will find it (e.g. the CLAUDE.md template / a scaffolding doc), matching the exact field name spec 4 uses
- [ ] The pi-scripts README documents `joycraft-mark-done --to <state>`, the new `joycraft-implement-loop`, and the 3-glyph `joycraft-spec-status`
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Bundle contains new skill | `tests/wire-and-bundle.test.ts`: import the generated records; assert `SKILLS`/`CODEX_SKILLS`/`PI_SKILLS` have a `joycraft-spec-done.md` key | unit |
| Bundle contains loop script | Assert `PI_SCRIPTS` has a `joycraft-implement-loop` key | unit |
| init installs new files | Run `init` into a temp dir (reuse the existing init test harness pattern); assert the spec-done skill file(s) and the loop script exist on disk and the script is executable | integration |
| upgrade detects new files | Assert the version-hash map (or the upgrade diff) includes the new filenames | unit |
| README documents new scripts | Read the pi-scripts README; assert it mentions `--to`, `joycraft-implement-loop`, and the 3 glyphs | unit |
| default-mode documented | Assert the CLAUDE.md template/doc contains the default-execution-mode field name from spec 4 | unit |

**Execution order:**
1. Write tests — MUST fail before regeneration/doc edits (bundle lacks the new keys; README/template lack the new content)
2. Confirm red
3. `pnpm build` to regenerate; add docs/README content; verify install path; until green

**Smoke test:** the "bundle contains new skill" unit test — fast, no temp-dir install.

**Before implementing, verify your test harness:**
1. The bundle tests import the actual generated `src/bundled-files.ts` (or its built output) — not a fixture
2. The init/upgrade tests reuse the project's existing init/upgrade test harness (see `tests/init.test.ts`, `tests/upgrade.test.ts`) and operate on a temp dir
3. Smoke test = the bundle-key assertion

## Constraints
- MUST: run the generator (`node scripts/generate-bundled-files.mjs`, invoked by `pnpm build`) — do NOT hand-edit `src/bundled-files.ts` (it's `@generated — do not edit`)
- MUST: ensure the new skill source is a FLAT `.md` in `src/{claude-skills,codex-skills,pi-skills}/` (the generator's `readFlatDir`) and the loop script is under `src/templates/pi-scripts/` (the generator's `readTreeDir`) — if specs 5/8 placed them correctly this is automatic; verify
- MUST: keep `init`/`upgrade` install behavior driven by iterating the bundled records (specs 5/8 add entries; this spec confirms flow-through, adds new install code ONLY if a gap is found)
- MUST: use the exact default-mode field name spec 4 defined — do not invent a second name (single source of truth)
- MUST NOT: change skill/script *content* here — that was specs 3–8; this spec bundles + documents + verifies install
- MUST NOT: leave `src/bundled-files.ts` stale — the build must reflect every source edit from this feature
- ASK FIRST (CLAUDE.md): template/doc content — authorized by the brief

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Regenerate | `src/bundled-files.ts` | Via generator — picks up new skill, loop script, edited skills/scripts/extension |
| Modify (if gap) | `src/init.ts` / `src/upgrade.ts` | Only if the new files don't flow through the existing record-iteration loops |
| Modify | `src/templates/pi-scripts/README.md` (or wherever the scripts README lives) | Document `--to`, `joycraft-implement-loop`, 3-glyph status |
| Modify | CLAUDE.md template / scaffolding doc | Document the default-execution-mode field |
| Modify | `.joycraft-version` (this repo) | Refresh hashes to include new files (if the repo tracks its own) |
| Create | `tests/wire-and-bundle.test.ts` | Bundle + install + docs assertions |

*(Locate the exact pi-scripts README and CLAUDE.md-template paths at implement time — `find src -name 'README*'` under pi-scripts and the init CLAUDE.md template source.)*

## Approach
Run the generator first and diff `src/bundled-files.ts` to confirm the new keys appear. Then run the existing init test harness into a temp dir and assert the new files land. The install loops (`src/init.ts` lines ~71–113 / ~167–182) already iterate `SKILLS`/`PI_SKILLS`/`PI_SCRIPTS`, so a correctly-placed source should require NO new install code — the test proves it; only patch init/upgrade if the test reveals a gap (e.g. a new harness dir that isn't created). Add the README + CLAUDE.md-template documentation last.

**Rejected alternative:** Hand-adding the new skill/script strings directly to `src/bundled-files.ts`. Rejected — the file is generated; a hand-edit would be clobbered on the next `pnpm build` and diverge from source (exactly the fake-SDK-class trap the project already learned).

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| New harness dir not created by init | Patch init to create it; the integration test catches this |
| Generator misses the loop script (wrong dir) | Test fails on the `PI_SCRIPTS` key; fix the source location (spec 8 placement) |
| upgrade shows no diff for a user already on old version | The version-hash map must include the new filenames so the diff is non-empty |
| README for pi-scripts doesn't exist yet | Create it as part of this spec |
| `.joycraft-version` not tracked in-repo | Skip the hash-refresh AC for this repo; the user-facing hashing still works via writeVersion at init time |
