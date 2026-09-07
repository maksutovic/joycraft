---
status: active
owner: Maximilian Maksutovic
created: 2026-09-05
feature: 2026-09-05-reliable-updates
---

# Reliable Updates — Source and Incident Evidence

> **Baseline:** `8333f9b593eac6ef7fef96dcf40fa00c466e672d` and published `joycraft@0.7.13`
> **Parent brief:** `docs/features/2026-09-05-reliable-updates/brief.md`

## Prior Knowledge Reused

The user requested a fresh teardown. Historical assessments and design discussions were not used. The later workflow intake listed existing brief metadata only. Applicable repository boundaries and skill contracts were read. This file preserves evidence gathered in the same conversation before brief creation.

## Installation Incident

The screenshot records failed `init` and `upgrade` invocations. The pasted npm 10.9.8 log uses Node 22.23.1. Both failures occur while npm resolves `joycraft@0.7.13`, before the package executable starts.

| UTC time, 2026-09-06 | Evidence |
|----------------------|----------|
| 00:53:28.171 | Cached full `application/json` package response ends at 0.7.12. |
| 00:54:53.182 | Registry publication timestamp for 0.7.13. |
| 00:55:08.246 | Screenshot's first init log starts. |
| 00:55:37.269 | Pasted upgrade log starts. |
| 00:55:37.577 | Cached compact install-v1 response includes 0.7.13. |

The old full response is 135,174 bytes. The failing log reports the same size for its full package metadata. Both cache variants advertise `public, max-age=300`. Read-only inspection was limited to Joycraft package metadata. No npm credentials were copied.

The evidence supports inconsistent cached metadata during resolution. It does not establish a fault inside Joycraft init. The original failing process was not replayed at its historical timestamp.

Registry source: [Joycraft metadata](https://registry.npmjs.org/joycraft). Published package: [0.7.13 metadata](https://registry.npmjs.org/joycraft/0.7.13).

## Runtime Reproductions

Tests used disposable project directories. BandFolder and this repository's installation were not updated.

| Case | Operation | Observed result |
|------|-----------|-----------------|
| Published download | npm exec with an isolated temporary cache and `--prefer-online`, using the incident's Node/npm binaries | CLI prints 0.7.13. |
| Published init | Downloaded 0.7.13 CLI initializes a temporary project | Exit 0 and expected installed skill files. |
| Declined customization | Append a local line to an installed Codex skill, run upgrade, answer no | Custom line survives. |
| Repeated upgrade | Run upgrade again without `--yes` | Custom line is removed without a prompt. |
| Version-only drift | Set only recorded version to 0.1.0 while bundle content matches | Source CLI prints Already up to date and keeps version 0.1.0. |
| Shared Codex clone | Create installed Codex tune skill without gitignored state | Published CLI reports uninitialized and exits 0. |
| Four-stack smoke | Initialize and repeat-upgrade Node, Python, Rust, and Go manifest fixtures | Source CLI completes. These are scaffolding checks, not application builds. |

The customization defect was reproduced against source and the downloaded published package. The no-op version reproduction used the source CLI with network checks disabled to isolate update logic.

## Source Trace

| Concern | Location | Current behavior |
|---------|----------|------------------|
| CLI surface | `src/cli.ts:24` and `src/cli.ts:40` | Separate init and upgrade actions with different options. |
| Stale launcher | `src/upgrade.ts:49` and `src/upgrade.ts:83` | Fetch latest and optionally re-execute exact-version npx before checking project state. |
| Initialization detection | `src/upgrade.ts:440` | Current/legacy state or known Claude skill path. Other harness skill paths do not qualify. |
| Harness fallback | `src/upgrade.ts:483` | Missing harness state means all available harnesses. |
| Customization comparison | `src/upgrade.ts:597` | Matching stored baseline is treated as safe to overwrite. |
| Baseline rewrite | `src/upgrade.ts:662` | Hashes all current managed files, including declined customizations. |
| No-op state | `src/upgrade.ts:609` | Returns without reconciling the package version. |
| Customized prompt | `src/upgrade.ts:638` | Displays line counts, not a content diff. --yes overwrites. |
| State persistence | `src/version.ts:20` and `src/gitignore.ts:65` | Version, hashes, and harness facts are stored in ignored state. |
| CLI checks | `src/cli.ts:86` and `src/cli.ts:114` | Separate project-version and launcher-version network checks. |
| Claude hook | `src/init.ts:387` | Init writes a session-start checker. Upgrade's inventory excludes this hook. |
| Legacy cleanup | `src/upgrade.ts:194` | Removes listed historical Claude skill names without baseline ownership checks. |
| Docs migration | `src/upgrade.ts:375` | Runs before file updates and can continue after some failed moves. |
| File application | `src/upgrade.ts:625` | Sequential writes without transaction rollback. |

## Release Evidence

The [0.7.13 publish run](https://github.com/maksutovic/joycraft/actions/runs/34002492579) completed successfully. The workflow publishes directly to latest after build/test steps. It does not run a registry installation smoke test before producing the GitHub release.

The [September 3 failed run](https://github.com/maksutovic/joycraft/actions/runs/33720453120) failed at the version-bump push. Its log records `main -> main (fetch first)` and `failed to push some refs`. A second publish run started 14 seconds later. The workflow has no publish concurrency group.

Relevant code: `.github/workflows/publish.yml:52` resolves a version, `:72` commits and pushes a bump, and `:83` publishes. `package.json` also runs a build through `prepublishOnly`.

## Existing Test Coverage

The following invocation passed all 96 tests across four files:

```sh
pnpm exec vitest run tests/upgrade.test.ts tests/version.test.ts tests/harness-selection.test.ts tests/migration.test.ts --reporter=dot
```

`tests/upgrade.test.ts:671` checks preservation after the first declined overwrite. It does not run a second upgrade or inspect the resulting baseline. `tests/upgrade.test.ts:828` changes a managed file in its old-version test, so it does not exercise version reconciliation on a no-op.

Legacy state tests verify relocation. They do not install an old hook that reads the removed location and test its post-upgrade behavior.

## Limits and Reconciliation

Filesystem interruption recovery and cross-platform harness lifecycle behavior were not experimentally verified. The source establishes missing safeguards, not the outcome of every possible interruption. Detailed design must specify and test those cases.

The new brief references these findings directly. No implementation, npm publication, tag promotion, or project migration occurred during the teardown.
