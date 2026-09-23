---
status: done
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Dogfood Update and Cleanup on Joycraft — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 4-6 files / ~120 lines

---

## What

The terminal gate for this feature. It is a **verification and cleanup** spec,
not the owner of any sync. Specs 1-11 each land their own installed copies:
every spec that adds a file under `src/templates/` already runs the built
updater on this repo in its own commit, and every spec that edits
`src/skills/` already regenerates bundled variants and runs `pnpm sync-skills`
in its own commit. This spec therefore does four things:

1. **Run the built updater on this repo and assert zero residual drift.**
   `pnpm build && node dist/cli.js update . --preview` should plan no changes.
   If it plans anything, apply it (`node dist/cli.js update . --yes`) and commit
   the result, naming in the commit message exactly what appeared and why it was
   expected. The expected residual set, if any, is: the model-profile reference
   doc (spec 1), the intent inbox README under `docs/intent/` (spec 5), the hook
   recipes (spec 9), the evals scaffold (spec 10), the `AGENTS.md` profile
   pointer row (spec 3), and an updated `docs/.joycraft/manifest.json`. Anything
   outside that set is a finding to report, not something to quietly commit.

2. **Run `joycraft-optimize` on this repo's `AGENTS.md`** and apply the
   model-profile RETIRE (and PROBATION) rows **by hand** in the same PR. Optimize
   is advisory by contract; a human decides each row.

3. **Update `CHANGELOG.md`** with an Unreleased entry for the feature, which is
   also what satisfies the docs-sync gate (`scripts/check-docs-sync.mjs` fails a
   PR touching `src/`, `templates/`, or `scripts/` unless `CHANGELOG.md` changed
   or the PR body carries a `Docs: none — <reason>` line).

4. **Verify every Success Criterion in the brief as an explicit checklist** and
   record the result.

### Verified mechanics (2026-09-22)

- The updater is driven locally by `node dist/cli.js update [dir]`. Relevant
  flags on the `update` command in `src/cli.ts:21-36`: `--preview` (plan without
  applying), `--yes` (apply safe updates without prompting), `--non-interactive`,
  `--json`. `pnpm build` runs `generate-bundled-files.mjs`, `sync-skills.mjs`,
  `tsup`, and the release-descriptor emitter, so it must precede the update run.
- **The npx-cache caveat does not apply here.** It bites `npx joycraft`, which
  can resolve a stale cached version (see `docs/guides/setup-walkthrough.md` and
  `docs/bugfixes/cli/bugfix-stale-nudge-after-reexec.md`). This spec runs
  `node dist/cli.js`, which is the just-built local binary. Never substitute
  `npx joycraft` for the dogfood run.
- The dogfood state is checked in. `docs/.joycraft/manifest.json` records the
  last real dogfood transaction, and `tests/dogfood-update.test.ts:73-82`
  already asserts that this repo's shared manifest is valid, carries a semver
  `targetVersion`, and lists all five harnesses. That test is the existing home
  for a zero-drift assertion.
- No global test enforces `docs/templates/` parity with `src/templates/`.
  Parity is asserted per-file where it matters, for example
  `tests/output-style-template.test.ts:218` and
  `tests/review-gate-template.test.ts:194`. The `TEMPLATES`-record parity test
  (`tests/bundled-files-sync.test.ts:67`) compares `src/templates/` against
  `src/bundled-files.ts`, not against `docs/templates/`. So a missing
  `docs/templates/` copy is invisible to the suite today — which is why every
  template-adding spec owns its own dogfood step and this spec verifies the
  aggregate.

### AGENTS.md cleanup candidates (advisory; the human applies)

The brief expects optimize's model-profile step to flag legacy anti-formatting
and hand-holding rules. Read for this spec on 2026-09-22, `AGENTS.md` contains
**no anti-formatting rule** — no "never use markdown", no "no bullet points",
no prose-style prohibition. The candidates a model-profile pass would surface
are therefore narrower than the brief's phrasing suggests:

- The NEVER row "Push directly to main/master (always use feature branches +
  PR)" carries an inline `<!-- origin: source AGENTS.md 2026-07-21, probation:
  claude-sonnet-5 -->` marker. It is explicitly provisioned under a model that
  has since changed, which is the textbook PROBATION case
  (`src/skills/joycraft-optimize.md:43`).
- The ALWAYS row on `pnpm test && pnpm typecheck` carries a parenthetical
  correcting a wrong flag (`--run` is not valid here). That is
  error-anticipation hand-holding whose disposition depends on whether the
  error still occurs.
- The "Execution Profile" block names `model opus 5` for claude. A model-profile
  step should check that against what this repo actually runs.

These are named as candidates for the optimize run to evaluate, not as
pre-decided edits. The implementer presents optimize's table and the human
chooses; a row this spec listed that optimize does not flag is not edited.

## Why

Dogfooding is how this feature proves its install works end to end (D12), and
it is the only way the aggregate result is checked: the per-spec dogfood steps
each verify one file, and nothing in the suite compares the whole of
`docs/templates/` against `src/templates/`. Running optimize on this repo's own
memory file and applying its rows by hand is the same advisory path a user
walks (D14), so a failure here is a failure users would hit.

## Acceptance Criteria

- [ ] `pnpm build && node dist/cli.js update . --preview` is run on this repo and its planned-action list is recorded in the session notes [src: D12]
- [ ] If the preview plans any action, `node dist/cli.js update . --yes` is run and the resulting file changes are committed, with the commit message naming each changed path and why it was expected [src: D12]
- [ ] Every path the update applied falls inside the expected residual set — the model-profile reference doc, the `docs/intent/` README, `docs/templates/hooks/`, `docs/templates/evals/`, the `AGENTS.md` pointer row, and `docs/.joycraft/manifest.json` — and any path outside that set is reported to the human rather than committed silently [src: brief "Decomposition"]
- [ ] A second consecutive `node dist/cli.js update . --preview` plans zero actions, proving the run converged [src: brief "Success Criteria"]
- [ ] `docs/templates/reference/model-profile-claude-fable-5-1.md` exists in this repo and is recorded in `docs/.joycraft/manifest.json` [src: brief "Success Criteria"]
- [ ] `docs/intent/` exists in this repo with its README and no other files [src: brief "Success Criteria"]
- [ ] The four hook recipe files exist under `docs/templates/hooks/` in this repo, and this repo's `.claude/settings.json` registers none of them [src: brief "Success Criteria"]
- [ ] The evals scaffold exists under `docs/templates/evals/` in this repo, and no eval workflow file was added to this repo's `.github/workflows/` [src: brief "Success Criteria"]
- [ ] This repo's `AGENTS.md` (or `CLAUDE.md`, per `src/update-inventory.ts`) carries one Context Map row pointing at the model-profile doc, and the rest of the file is unchanged by the update beyond that row [src: brief "Success Criteria"]
- [ ] `joycraft-optimize` is run against this repo and its disposition table is presented to the human before any edit [src: D5]
- [ ] Every RETIRE or PROBATION row that optimize's model-profile step produces for `AGENTS.md` is applied by hand in this PR, or explicitly declined with the human's reason recorded [src: D14]
- [ ] This repo's `AGENTS.md` carries no rule that optimize's model-profile step flags after the cleanup [src: brief "Success Criteria"]
- [ ] `CHANGELOG.md` gains an Unreleased entry describing the Fable-native harness feature [src: brief "Decomposition"]
- [ ] `node scripts/check-docs-sync.mjs` exits 0 on the feature branch [src: brief "Decomposition"]
- [ ] Every checkbox in the brief's Success Criteria is verified and its result recorded — pass, fail, or not-applicable with a reason [src: brief "Success Criteria"]
- [ ] `tests/dogfood-update.test.ts` gains an assertion that this repo's checked-in shared manifest records the model-profile doc, the hook recipes, and the evals scaffold [src: brief "Test Strategy"]
- [ ] `tests/status-migration.test.ts` still passes, because intent files live outside its guarded paths [src: brief "Success Criteria"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Manifest records the new artifacts | extend `tests/dogfood-update.test.ts` (the existing case at lines 73-82): `readInstallationManifestInfo(process.cwd(), 'shared').manifest.files` contains `docs/templates/reference/model-profile-claude-fable-5-1.md`, the four `docs/templates/hooks/*` paths, and the four `docs/templates/evals/*` paths | unit |
| Recipes unregistered in this repo | same file: this repo's `.claude/settings.json` contains no `docs/templates/hooks` substring | unit |
| No eval workflow installed here | same file: this repo's `.github/workflows/` contains no `agent-evals.yml` | unit |
| Intent inbox present with README only | same file: `docs/intent/` exists and `readdirSync` returns only `README.md` | unit |
| Pointer row present | existing `tests/context-map-section.test.ts` / `tests/agents-md.test.ts` coverage from spec 3 stays green; this spec adds no new pointer assertion | regression |
| Zero residual drift | manual: two consecutive `node dist/cli.js update . --preview` runs, the second planning zero actions; recorded in the session notes | manual |
| Docs-sync gate satisfied | `node scripts/check-docs-sync.mjs` exits 0 | manual |
| Status migration unaffected | `pnpm test tests/status-migration.test.ts` | regression |
| Build passes | `pnpm build` | manual |
| Tests pass | `pnpm test && pnpm typecheck` | manual |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the extended dogfood manifest assertions (`pnpm test tests/dogfood-update.test.ts`) — it reads the checked-in manifest and a handful of small files, well under 5 seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: run the built updater on this repo [src: brief "Hard Constraints"]
- MUST: preview before applying, and record the planned-action list [src: D12]
- MUST: treat this spec as a verification gate, not the owner of any sync — specs 1-11 each landed their own regen, sync, and dogfood copies in their own commits [src: brief "Hard Constraints"]
- MUST: present optimize's disposition table to the human before editing `AGENTS.md`, and apply rows by hand [src: D5]
- MUST: update `CHANGELOG.md` in this PR — the branch touches `src/`, `templates/`, and `scripts/` paths that the docs-sync gate guards [src: brief "Decomposition"]
- MUST NOT: auto-apply any optimize disposition; every `AGENTS.md` edit is a human decision recorded in the PR [src: D5]
- MUST NOT: edit a user's `CLAUDE.md` from optimize — this repo's own file is edited by hand by its owner, which is a different act [src: brief "Hard Constraints"]
- MUST NOT: commit an update-applied path outside the expected residual set without naming it to the human first [src: brief "Decomposition"]
- MUST NOT: write anything to `.github/workflows/` [src: brief "Hard Constraints"]
- MUST NOT: touch the holdout scenarios repo or its dispatch workflow while cleaning up [src: brief "Hard Constraints"]
- MUST NOT: add runtime dependencies [src: brief "Hard Constraints"]
- MUST NOT: run this spec before specs 1-11 are done — the drift assertion is meaningless against a partial feature [src: brief "Execution Strategy"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `AGENTS.md` | Hand-applied optimize RETIRE/PROBATION rows; the update's Context Map pointer row if spec 3 targets `AGENTS.md` here |
| Modify | `CHANGELOG.md` | Unreleased entry for the Fable-native SDLC harness feature |
| Modify | `docs/.joycraft/manifest.json` | Rewritten by the dogfood update run if any residual action applies |
| Modify | `tests/dogfood-update.test.ts` | New assertions: manifest records the profile doc, hook recipes, evals scaffold; recipes unregistered; intent inbox README-only; no eval workflow installed |
| Modify | `docs/templates/**` | Only if the preview plans a residual copy that specs 1-11 did not already land; each such path named in the commit message |
| Create | `docs/discoveries/2026-09-22-<surprise>.md` | Only if the dogfood run surprises — per the checkpoint-mode wrap-up, a terse discovery |

## Approach

Drive the updater as `pnpm build && node dist/cli.js update .`. The build step
comes first because `dist/cli.js` carries the bundled files compiled from
`src/templates/` and `src/skills/`, so an unbuilt binary would install the
previous commit's content. Use the local binary, never `npx joycraft`: npx can
resolve a stale cached CLI, and the dogfood run has to exercise this branch's
own code.

Run the preview first and read it, because the interesting outcome is the empty
one. Specs 1-11 each ran the updater on this repo, so a converged feature
produces a preview with zero planned actions and this spec's file changes
reduce to `CHANGELOG.md`, the optimize-driven `AGENTS.md` edits, and the new
test assertions. A non-empty preview is the signal that some earlier spec
skipped its dogfood step, and the fix is to apply it here and say which spec it
belonged to.

The zero-drift check lives in `tests/dogfood-update.test.ts` rather than a new
file because that file already owns the "checks in the repository manifest
produced by its dogfood update" assertion against `process.cwd()`. Adding path
assertions beside it keeps one home for repo-level dogfood facts.

Optimize runs second, after the tree is converged, so its audit sees the final
`AGENTS.md` including any pointer row the update inserted. Running it first
would audit a file that is about to change.

**Rejected alternative:** a new test that walks `src/templates/` and asserts a
matching file under `docs/templates/` for every entry. It would catch drift
mechanically, but it hard-codes this repo's install selection into the suite
and would break the moment a template becomes harness-gated — which spec 2 is
adding for exactly the model-profile doc. Asserting the specific expected paths
in the checked-in manifest is narrower and survives gating.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Preview plans zero actions | Expected outcome; record it and move to optimize. The feature converged through the per-spec dogfood steps |
| Preview plans a residual copy for a spec 1-11 file | Apply it, commit it, and name the owning spec in the commit message; capture a discovery if the omission was systematic |
| Preview plans a change to an unrelated file, for example a checker or skill refresh from a version bump | Report it to the human before committing; a version-driven refresh is not this feature's residual |
| Update reports a conflict on a customized path | Do not pass `--replace-customized`; a conflict on this repo's own files is a finding the human resolves |
| Optimize flags a rule the human wants to keep | Record the decline and the reason in the PR body; the disposition is advisory and a kept row is a valid outcome |
| Optimize flags no model-profile row at all | The AC is satisfied vacuously; record that `AGENTS.md` carries no flagged rule, which is what the brief's Success Criterion asks for |
| `docs/.joycraft/manifest.json` changes but nothing else does | Normal — the manifest records `targetVersion` and file hashes; commit it |
| `scripts/check-docs-sync.mjs` still fails after the CHANGELOG edit | The gate compares against `origin/main`; confirm the branch is rebased and that `CHANGELOG.md` appears in `git diff --name-only origin/main...HEAD` |
| The update run leaves a transaction journal behind after an interrupt | Recover with `node dist/cli.js update . --recover` before retrying; never delete the journal by hand |
