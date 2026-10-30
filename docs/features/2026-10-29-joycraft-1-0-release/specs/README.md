# Joycraft 1.0 release — feature specs

> **Parent Brief:** [brief.md](../brief.md)
> **Status:** Decomposed 2026-10-29; ready for review

## What this feature does

Ship the field build as `joycraft@1.0.0` on npm `latest`. First fix the failing field gates, certify all six hosts with live runs, and rename the install directory to `.joycraft/`. Then build the release vehicle with a safe 0.7 migration and rollback, and write the public docs.

## Specs

| # | Spec | Phase | Where | Depends on | Mode |
|---|---|---|---|---|---|
| 1 | [resolve-hook-paths-from-project-root](resolve-hook-paths-from-project-root.md) | 1 Gate fixes | `joycraft-prototype` `field/1.0` | — | checkpoint |
| 2 | [record-runtime-failure-detail](record-runtime-failure-detail.md) | 1 Gate fixes | `joycraft-prototype` `field/1.0` and `joycraft-field` | — | checkpoint |
| 3 | [fix-recorded-runtime-failures](fix-recorded-runtime-failures.md) | 1 Gate fixes | `joycraft-prototype` `field/1.0` | 2 | checkpoint |
| 4 | [guard-foreground-wait-loops](guard-foreground-wait-loops.md) | 1 Gate fixes | `joycraft-prototype` `field/1.0` | 1 | checkpoint |
| 5 | [add-data-loss-labels-and-escape-script](add-data-loss-labels-and-escape-script.md) | 1 Gate fixes | `joycraft-field` | — | checkpoint |
| 6 | [build-live-host-smoke-harness](build-live-host-smoke-harness.md) | 2 Host support | `joycraft-prototype` `field/1.0` | 1 | isolated |
| 7 | [certify-codex-and-claude-hosts](certify-codex-and-claude-hosts.md) | 2 Host support | `joycraft-prototype` `field/1.0` | 6 | checkpoint |
| 8 | [certify-pi-and-omp-hosts](certify-pi-and-omp-hosts.md) | 2 Host support | `joycraft-prototype` `field/1.0` | 6 | checkpoint |
| 9 | [certify-copilot-and-opencode-hosts](certify-copilot-and-opencode-hosts.md) | 2 Host support | `joycraft-prototype` `field/1.0` | 6 | checkpoint |
| 10 | [rename-install-dir-to-joycraft](rename-install-dir-to-joycraft.md) | 3 Rename | `joycraft-prototype` `field/1.0` | 3, 4, 7, 8, 9, 21, 22 | isolated |
| 11 | [cut-release-branch-and-vendor-payload](cut-release-branch-and-vendor-payload.md) | 4 Release vehicle | this repo, branch `release/1.0` | 10 | checkpoint |
| 12 | [wire-cli-to-payload](wire-cli-to-payload.md) | 4 Release vehicle | this repo, branch `release/1.0` | 11 | isolated |
| 13 | [detect-0-7-installs-and-dry-run](detect-0-7-installs-and-dry-run.md) | 4 Release vehicle | this repo, branch `release/1.0` | 12 | checkpoint |
| 14 | [migrate-from-0-7](migrate-from-0-7.md) | 4 Release vehicle | this repo, branch `release/1.0` | 13 | isolated |
| 15 | [add-rollback](add-rollback.md) | 4 Release vehicle | this repo, branch `release/1.0` | 14 | checkpoint |
| 16 | [release-gate-tests-in-ci](release-gate-tests-in-ci.md) | 4 Release vehicle | this repo, branch `release/1.0` | 14, 15 | checkpoint |
| 17 | [ship-final-0-7-nudge](ship-final-0-7-nudge.md) | 4 Release vehicle | this repo, from `main` (0.7.18) | 13 | checkpoint |
| 18 | [rewrite-readme-for-1-0](rewrite-readme-for-1-0.md) | 5 Docs | this repo, branch `release/1.0` | 12, 21, 22 | checkpoint |
| 19 | [write-install-and-migration-guides](write-install-and-migration-guides.md) | 5 Docs | this repo, branch `release/1.0` | 14, 15, 21, 22 | checkpoint |
| 20 | [prepare-release-notes-and-feedback-channel](prepare-release-notes-and-feedback-channel.md) | 5 Docs | this repo, branch `release/1.0` | 16, 18, 19 | checkpoint |
| 21 | [set-up-review-loop-verification-tools](set-up-review-loop-verification-tools.md) | 2 Host support | `joycraft-prototype` `field/1.0` | — | checkpoint |
| 22 | [add-new-project-kickoff](add-new-project-kickoff.md) | 2 Host support | `joycraft-prototype` `field/1.0` | — | checkpoint |

## Execution waves

| Wave | Specs |
|---|---|
| 1 | 1 resolve-hook-paths-from-project-root, 2 record-runtime-failure-detail, 5 add-data-loss-labels-and-escape-script, 21 set-up-review-loop-verification-tools, 22 add-new-project-kickoff |
| 2 | 3 fix-recorded-runtime-failures, 4 guard-foreground-wait-loops, 6 build-live-host-smoke-harness |
| 3 | 7 certify-codex-and-claude-hosts, 8 certify-pi-and-omp-hosts, 9 certify-copilot-and-opencode-hosts |
| 4 | 10 rename-install-dir-to-joycraft |
| 5 | 11 cut-release-branch-and-vendor-payload |
| 6 | 12 wire-cli-to-payload |
| 7 | 13 detect-0-7-installs-and-dry-run, 18 rewrite-readme-for-1-0 |
| 8 | 14 migrate-from-0-7, 17 ship-final-0-7-nudge |
| 9 | 15 add-rollback |
| 10 | 16 release-gate-tests-in-ci, 19 write-install-and-migration-guides |
| 11 | 20 prepare-release-notes-and-feedback-channel |

Specs in one wave are independent by dependency. Parallel runs still need disjoint files; specs 1 and 4 both touch `scripts/install-hooks.mjs`, so spec 4 waits for spec 1.

## Notes for the implementer

- Phases 1–3 happen in `joycraft-prototype` (`field/1.0`) and `joycraft-field`; field sync carries them to agent-markets and private-schools. Spec 3 needs 2 field days of data from spec 2.
- Phase 4 starts after a new `field-N` tag that includes phases 1–3. Spec 17 ships from `main` as 0.7.18 and needs Max's approval to merge.
- Live host specs (6–9) use the subscription logins on this Mac, not API keys.
- Only Max merges `release/1.0` to `main`; that merge publishes 1.0.0.
