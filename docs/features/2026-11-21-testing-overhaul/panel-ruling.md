# Panel ruling: testing overhaul

2026-11-20. Claims checked against `worktrees/joycraft-testing-overhaul` (1.7.0, `3d05a7c`) and the branch-protection API. The scenarios repo was not opened.

## Verified facts

| Claim | Result |
|---|---|
| `joycraft-implementer.md:34-35` runs the whole test, typecheck and lint set for each spec and review fix | True |
| `joycraft-reviewer.md:25` and `testing.md:40` cite a "receipt bound to the same revision"; no code records a revision | True |
| `testing.md:38` names a "verify slot" that Joycraft does not ship | True |
| `worktrees.mjs:109-112` checks four paths, not the receipts a report cites; prune uses `git worktree remove` | True |
| `evidence.mjs` accepts a `.json` receipt in a feature folder; `delivery.mjs:56` fails on it | True |
| `delivery.mjs:112` lock is a bare `mkdir` with no PID; `delivery.md:21` says manual diagnosis | True |
| Payload words 29,909 of 29,919 | True |
| `package.json` `files` is `dist`, `payload`; `dist` holds 6 CLI sources and 4 `main` sources; no `bundled-files` | True. This closes Research 3 open question 1 |
| Branch protection: `strict: true`, `contexts: []`, `checks: []` | True. A red PR can merge, and a merge publishes |
| `v1-install.test.ts` asserts user bytes | Partly. It asserts `AGENTS.md` and settings. It has no `CLAUDE.md` assert |
| Scenario or level-5 text in `payload/` | None. The templates live only in the 0.7 trees (`src/templates`, `docs/templates`), which do not ship |
| `autofix.yml` uses `npm ci` and `node-version: latest` in a pnpm repo | True |

## Rulings

| # | Point | Ruling | Seat that won, and why |
|---|---|---|---|
| 1 | Tier text (R3) | Accept. Focused tests while working; the project gate once on a spec's final commit; the full suite once on the final integrated revision, in CI if the project has it, else locally before the push. | All four agree on the shape. Red team wins the wording: without "else locally" a project with no CI runs the full suite nowhere. |
| 2 | Review fix | Focused tests only. | Practitioner. The full run on the integrated revision is the backstop. |
| 3 | Reviewer reads the test diff | Accept. A removed assertion, a new skip or a changed expected value with no reason in the spec is a blocking finding. | Advocate, practitioner, red team. Research 1: test edits are 79% of Claude cheating, and prompt text does not stop it. |
| 4 | Receipt primitive (R1) | Remove the false sentence now. No receipt store, `kind`, reuse or `--receipt-only`. The depth above that is an owner decision (`receipt-depth`). | Minimalist and red team. Research 2 shows a sound portable receipt must bind toolchain, environment and policy. Red team risk 8: the agent picks the argv, so an agent-declared `kind` can lie. |
| 5 | Record commits (R2) | No inheritance code by default. A sentence at most, and only for Joycraft records, not "docs". Owner decision (`record-commits`). | Red team and Research 2 §1.3. Docs are code inputs in many stacks. The advocate conceded this fallback. |
| 6 | Gate timing and PR timing (R4) | Owner decision (`queue-rhythm`). Recommended: gate each spec, push each spec, one PR at queue end, read CI once, stop after a second red run. | Practitioner on the per-spec gate (it finds the broken spec at once). Three seats accept the queue-end PR as a default that `AGENTS.md` overrides. Red team risk 4 adds the bounded CI read. |
| 7 | Flaky rule | "A pass on a rerun is FLAKY, not PASS. Record a follow-up and continue, unless the test covers this spec's criterion." | Red team. The owner rule is that a queue stops only for mandatory or broken. Rejected for now: "run each new test three times" and a `Known flaky` table (practitioner). They add text and a new project record with no Joycraft field evidence. |
| 8 | Worker budget and slots (R5) | Reject. Delete "verify slot". Keep "rerun once, alone". | Minimalist, practitioner, red team. Joycraft cannot set a runner's worker flag. |
| 9 | Dead-holder sentence for project leases | Reject. | Minimalist. The lease is project-owned; Joycraft's own locks already follow the rule. |
| 10 | Selection contract (R6) | Reject from shipped text. | Three seats. Joycraft ships no fast tier. |
| 11 | Prune keeps evidence (R7) | Accept, code only. `evidenceOnlyHere` also checks each receipt path that the accepted report cites. No new text. | All four. It is data loss on the default path. |
| 12 | Raw receipt names (R8) | `receiptFile()` refuses `.json` and `.jsonl` in a feature folder, with the fix in the message. Usage and the `testing.md` example say `<path>.log`. | Red team and advocate over minimalist. The delivery failure comes late, after reports cite the receipt. Two lines, zero words. |
| 13 | Delivery lock | Accept. Write PID in the lock; free only a dead holder. | Red team, unopposed. One killed push blocks every later push on the branch. |
| 14 | R9 recipe, R10 report | Reject for the payload. | All seats. |
| 15 | Cleanup and tests | Owner decision (`cleanup-tests`). Fixed in every option: unattended cleanup never edits or deletes a test. | Split vote. Red team sets the limit. |
| 16 | Delete the dead 0.7 tests and source | Accept, one PR, after the preconditions below. | All four concede. 129 of 162 files test code that does not ship. |
| 17 | Vitest projects and three commands | Reject. One suite, one command, `maxWorkers: 2` removed. | Minimalist. The keep set runs in 8.8 s. This also removes red team risk E. |
| 18 | Backfill tests for all untested runtime modules | Reject as one batch. Add tests for each module this work changes. | Minimalist. |
| 19 | CI consolidation | Only after required checks exist. Keep the full suite in the publish pack job. Fold `release-gates.yml` into `Test` and drop `push: main` after a new measurement. | Red team on order and on rejecting audit step 4. Minimalist on "measure first". |
| 20 | Holdout replacement | Accept two checks the change cannot edit: base-branch gates on the PR tarball; a published N−1 to N upgrade test. | Red team and Research 1 finding 4. |
| 21 | Trigger and outcome evals; one data-driven payload contract test | Defer. Not in this feature. | Advocate and minimalist agree on evals. The contract test has no failure behind it yet. |
| 22 | Dedup cuts | Each cut names the file that each role reads, and one copy stays on that path. | Red team risk 11. Hosts other than Claude Code do not load `.claude/agents/*.md`. |

## Safety preconditions (red team, proven)

1. **No shipped byte changes.** Build and `npm pack` before and after the deletion commit. The hashes of `dist/cli.js`, `dist/index.js` and `payload/` are equal.
2. **Migration net first.** In commits before the deletion, with `src/` untouched: the `legacy-guard` fixture comes from tarball bytes; `v1-install` asserts `CLAUDE.md` bytes; the fixtures gain 0.7.0 and one mixed-version install.
3. **Required checks before any CI run is removed.** A PR that fails on purpose proves that the check blocks a merge. Until then `test.yml` and `publish.yml` keep every run.
4. **The full suite still runs once on every tree.** No shipped text cites a receipt that code does not write.
5. **No new rule stops or loops an unattended queue.** Flaky, red CI and a stale lock each have a "record and continue" path or a bounded path.
6. **Proof run.** One dogfood queue of three or more specs. Count the full-suite runs for each spec from the transcript.

## Build plan

Payload text rule: each text spec states its word ledger and passes `payload-guard.test.ts`. Every payload change runs `node scripts/pin-payload.mjs`.

### (A) Build without asking

| # | Title | Files | Done when | Words |
|---|---|---|---|---|
| A1 | Tier and review text | `payload/.joycraft/references/testing.md` "Running tests"; `payload/.claude/agents/joycraft-implementer.md:27-35`; `joycraft-reviewer.md:24-27`; `joycraft-implement/SKILL.md:59`; `references/setup.md:99` (setup writes focused-test, gate and full-suite rows with their source); cuts in `worktrees.md:141-143`, `delivery.md:32`, `joycraft-testing/SKILL.md:39-41`, `testing.md:111-115` | Rulings 1, 2, 3, 7, 8 are in the text. "Verify slot" and "receipt bound to the same revision" are gone. The project name is gone from `delivery.md`. Word guard green. | About +80 added, −145 removed |
| A2 | Prune keeps cited receipts | `payload/.joycraft/runtime/worktrees.mjs`; new behaviour test | A tree whose accepted report cites a receipt that exists only there is kept, with the reason. Test proves it. | 0 |
| A3 | Raw receipts are not JSON | `payload/.joycraft/runtime/evidence.mjs`; test | A `.json` or `.jsonl` receipt in a feature folder exits 2 with "use .log". Usage shows `<path>.log`. | 0 |
| A4 | Delivery lock frees a dead holder | `payload/.joycraft/runtime/delivery.mjs`; `references/delivery.md:21-23` (same length); test | A lock whose PID is dead is taken. A live holder is refused. | 0 net |
| A5 | Migration net | `tests/legacy-guard.test.ts`; `tests/v1-install.test.ts`; `tests/fixtures/v07/` | Precondition 2 holds. `src/` is untouched in these commits. | n/a |
| A6 | Delete dead 0.7 code and tests | The 129 DELETE-LEGACY files, the 2 change detectors, the 2 scenario test files; dead `src/*.ts`, `src/arcade`, generated skill trees, `src/templates`, `templates/`; `vitest.config.ts`; `package.json` build script; `scripts/check-docs-sync.mjs` path list; CHANGELOG | Precondition 1 holds. `pnpm test && pnpm typecheck` green. Suite wall time under 15 s. The installed 0.7 trees and the six `main`-export tests stay until their decisions. | n/a |
| A7 | Holdout replacement | `.github/workflows/test.yml`; one new test and a committed 1.x tarball fixture | CI runs main's `release-gates.mjs` and `validate-package.mjs` on the PR tarball. An N−1 to N update keeps user bytes and rolls back. | n/a |

Order: A1 to A4 in any order; then A5, A6, A7. Precondition 6 runs before the release PR.

### (B) Owner decisions

| Decision id | Spec that follows | Words |
|---|---|---|
| `scenario-scope` | Remove `scenarios-dispatch.yml`, `scenarios-rerun.yml`, `spec-dispatch.yml`; the `AGENTS.md` NEVER lines and "External Validation"; `CONTRIBUTING.md:91`. Wider options below. | n/a |
| `autofix` | Retire or repair `.github/workflows/autofix.yml`. | n/a |
| `receipt-depth` | None; or a `revision` field in `evidence.mjs` output; or a commit-bound helper. | 0 to +30 |
| `record-commits` | One sentence in `testing.md`; or opt-in inheritance code; or nothing. | 0 to +15 |
| `queue-rhythm` | Gate-timing row and PR text in `joycraft-implement/SKILL.md:121-126` and `joycraft-session-end/SKILL.md`. | +11 to +26, −15 |
| `cleanup-tests` | Tests lens in `references/cleanup.md`; or one line in `joycraft-testing/SKILL.md`; or nothing. | 0 to +38 |
| `main-exports` | Keep the frozen exports and trim their test imports; or drop both. | n/a |
| `self-install` | Migrate this repo with its own CLI and remove the `sync-skills` rule from `AGENTS.md`. | n/a |
| `required-checks` | Max sets the checks; the agent proves them with a failing PR; then CI consolidation (ruling 19). | n/a |

The A text is about 65 words under today. The largest B text set adds about 95. `payload-guard.test.ts` decides; if it fails, cut from the audit's §5 list in the same change.

### Scenario removal: scope options

1. **GitHub only.** The three workflows and the instruction lines in this repo.
2. **GitHub and repo.** Option 1, and A6 also removes `docs/templates/workflows`, `docs/templates/scenarios` and the installed `joycraft-implement-level5` copies. Nothing in `payload/` changes in any option. `src/data/install-inventory.json` stays: migration needs its hashes.
3. **Everything.** Option 2, and Max archives the external repo, removes the GitHub App and deletes the secrets that nothing uses. Max does this part himself.

The workflow name "Test" must stay only while a `workflow_run` consumer exists. After options 1 to 3 plus an `autofix` retire, that limit is gone.
