# Reliable Updates — Feature Specs

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Design:** `docs/features/2026-09-05-reliable-updates/design.md`
> **Research:** `docs/features/2026-09-05-reliable-updates/research.md`
> **Decomposition:** `docs/features/2026-09-05-reliable-updates/decompose.md`
> **Status:** Decomposed 2026-09-06, ready for implementation
> **Approval:** D1–D6 clarified; scope, design, dependencies, waves, and execution modes approved.

## What this feature does

Joycraft uses one safe install/update engine, preserves customizations across repeated upgrades and clones, and can recover interrupted writes. A shared local checker offers verified updates at skill entry, with optional explicitly authorized safe automation. Release preparation and candidate verification prevent unverified packages from becoming latest. This queue repairs the observed npm bootstrap failure path and updater data-loss risks together without treating an installation version stamp as proof of convergence.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|------------|------|-------|
| 1 | [preserve-customization-baselines.md](preserve-customization-baselines.md) | — | checkpoint | Preserve declined customizations across repeated upgrades. |
| 2 | [reconcile-update-status.md](reconcile-update-status.md) | 1 | checkpoint | Report accurate outcomes and reconcile version-only updates. |
| 3 | [preserve-installation-manifest.md](preserve-installation-manifest.md) | 2 | isolated | Persist portable installation facts and conservatively adopt legacy state. |
| 4 | [unify-managed-inventory.md](unify-managed-inventory.md) | 3 | checkpoint | Describe all install and update artifacts through one ownership-aware inventory. |
| 5 | [plan-safe-updates.md](plan-safe-updates.md) | 4 | isolated | Produce a complete read-only update plan with reviewable conflicts. |
| 6 | [recover-interrupted-updates.md](recover-interrupted-updates.md) | 5 | isolated | Apply reviewed plans with locking, recovery, and guarded rollback. |
| 7 | [unify-update-command.md](unify-update-command.md) | 6 | isolated | Route install and upgrade aliases through the same safe update engine. |
| 8 | [separate-project-migrations.md](separate-project-migrations.md) | 7 | checkpoint | Separate deliberate document migrations from routine bundle refresh. |
| 9 | [implement-shared-update-checker.md](implement-shared-update-checker.md) | 8 | checkpoint | Provide one cached local update checker with bounded network work. |
| 10 | [wire-skill-update-discovery.md](wire-skill-update-discovery.md) | 9 | checkpoint | Add the shared checker entry to every generated skill and the existing Claude hook. |
| 11 | [enable-opt-in-safe-updates.md](enable-opt-in-safe-updates.md) | 10 | checkpoint | Let authorized agents apply compatible conflict-free updates at skill boundaries. |
| 12 | [serialize-immutable-releases.md](serialize-immutable-releases.md) | — | isolated | Prepare reviewed release versions and retain a retry-safe candidate artifact. |
| 13 | [verify-registry-promotion.md](verify-registry-promotion.md) | 7, 12 | isolated | Promote the verified candidate automatically after real installation checks. |
| 14 | [validate-upgrade-compatibility.md](validate-upgrade-compatibility.md) | 11, 13 | checkpoint | Verify the integrated package across historical installs, stacks, harnesses, and platforms. |
| 15 | [document-and-dogfood-updates.md](document-and-dogfood-updates.md) | 14 | checkpoint | Document the unified update path and migrate this repository with reviewed preservation. |

## Execution waves

- Wave 1: specs 1, 12 — parallel-safe: the Affected Files tables for baseline repair and release preparation are disjoint. The driving agent serializes shared documentation/status updates, full verification, commits, and pushes.
- Wave 2: specs 2 — sequential.
- Wave 3: specs 3 — sequential.
- Wave 4: specs 4 — sequential.
- Wave 5: specs 5 — sequential.
- Wave 6: specs 6 — sequential.
- Wave 7: specs 7 — sequential.
- Wave 8: specs 8 — sequential.
- Wave 9: specs 9 — sequential.
- Wave 10: specs 10 — sequential.
- Wave 11: specs 11 — sequential.
- Wave 12: specs 13 — sequential.
- Wave 13: specs 14 — sequential.
- Wave 14: specs 15 — sequential.

Parallel-safe means the production/test Affected Files tables are disjoint. No marker means sequential. Recheck file ownership before dispatching; newly overlapping work integrates sequentially rather than racing writes. Number order identifies specs; the wave order schedules spec 12 alongside spec 1. Dependencies are authoritative in `.joycraft-spec-queue.json`.

## Execution modes and ownership

The user approved checkpoint for specs 1, 2, 4, 8–11, 14, 15 and isolated for specs 3, 5–7, 12, 13. Checkpoint keeps implementation context and commits after each spec. Isolated uses a fresh implementation agent context for that spec and commits after its verification. Do not silently downgrade isolated mode to a shared context. All status/queue edits and commits are serialized by the driving agent.

Execution profile (verbatim): codex: Swarms: decompose yes · implement yes · model 5.6 terra · effort medium

The requested spec-writing swarm used GPT-5.6 Terra at medium effort. For this implementation run, the user explicitly overrides the repository default: GPT-5.6 Luna at high effort (2026-09-06). Product/test overlap prevents concurrent updater specs, even with swarms enabled.

## How to use this file

Run the whole queue with `$joycraft-implement-feature docs/features/2026-09-05-reliable-updates/`, following the actual available fresh-agent boundaries and approved modes. Or run one spec with `$joycraft-implement <spec-path>`. Each spec contains its acceptance criteria, constraints, and test plan; this README supplies ordering context.

Start with `preserve-customization-baselines.md` and the independently owned `serialize-immutable-releases.md`. Write failing new regression tests against production code, confirm the expected failure, implement, and keep the existing suite green. Run `pnpm test` and `pnpm typecheck` before each commit; source skill changes also require `pnpm sync-skills` and all regenerated/installed copies in that commit. Stage only the spec's work, reference the spec in its commit, and push the feature branch after each commit. Never amend a pushed commit.

Advance both the spec frontmatter and queue to in-review only after its acceptance criteria pass. Verify the required commit before starting a dependent spec. Fail fast on a failing test or unmet criterion; preserve accurate todo/in-review statuses. Finish with independent verification and one session-end pass, which owns final validation and graduation to done. Run release-docs-sync before PR creation.

## Integration hazards

- Old state may hash a user's customization as pristine. Matching a legacy stored hash never establishes verified vendor ownership.
- Specs 3–6 introduce contracts independently; spec 7 wires the end-to-end command. Do not add broken checker placeholders before the checker producer exists.
- Sync generated artifacts in each source-changing commit. Spec 15 checks zero drift and dogfoods the final state; it does not own deferred synchronization.
- Candidate publication is separated from latest promotion. No live publish, promotion, merge, credential provisioning, or destructive Git operation is authorized by the spec queue itself.
- Honor the external validation boundary. Do not access its separate repository or expose its contents.

## Cross-spec review

The Terra medium review identified two missing handoffs, both resolved within the approved design:

- Specs 11–13 now share the descriptor path/schema and verify it through the exact package artifact. Unsupported or mismatched data cannot enable auto-safe.
- Spec 13 rejects absent/failed/stale required-validation reports; spec 14 wires the real matrix report for the same release SHA and tarball integrity. Registry success alone cannot promote a candidate.

## Continuation briefing

```text
$joycraft-implement-feature docs/features/2026-09-05-reliable-updates/

You are picking up the approved spec queue, decomposed 2026-09-06.
Decisions D1–D6 are stamped in brief.md — do not reopen them.
Start: preserve-customization-baselines.md (mode: checkpoint); release preparation can run in parallel.
Order: specs/README.md; preserve approved isolated-mode fresh contexts.
Execution: user override — GPT-5.6 Luna swarm at high effort
Hazard: a matching legacy stored hash can describe custom bytes rather than vendor content.
Done when: all specs are implemented and independently verified, the suite is green, and a reviewable PR is prepared. Publishing and merging require separate authorization.
```
