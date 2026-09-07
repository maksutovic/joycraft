---
status: done
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: checkpoint
---

# Enable Opt-In Safe Updates — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 11 of 15
> **Dependencies:** 10 — wire-skill-update-discovery.md
> **Status:** Done
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 6–10 files plus generated copies / ~300 lines

---

## What

Connect the local `auto-safe` policy to the completed update planner and release resolver. At a skill boundary, the checker may report that an update is eligible; the agent then invokes a single exact-version update command only when compatibility metadata, manifest protocol, and the planned update prove it is conflict-free and free of repairs, user-config changes, and migrations.

## Why

An unattended update that assumes a patch is safe can overwrite local work, apply incompatible instructions, or leave a running skill inconsistent with its files.

## External API Contract

**Service:** npm package execution selected by exact version

**Canonical sources:**

- [npm CLI `npx` documentation](https://docs.npmjs.com/cli/v10/commands/npx)
- [npm package metadata endpoint](https://registry.npmjs.org/joycraft/latest)
- `docs/features/2026-09-05-reliable-updates/research.md`

**Key API facts:**

- The checker reports eligibility only; it does not execute npm or mutate the project.
- The agent-led runner resolves a verified exact version once and passes that exact version to the updater. It must not recurse into a second `latest` resolution inside the update engine.

## Acceptance Criteria

- [x] Only an explicitly configured local auto-safe policy grants standing authorization; cloning a shared manifest does not enable it. [src: design §2]
- [x] The checker reports eligibility while the agent invokes the exact-version updater; it does not silently execute updates itself. [src: design §2]
- [x] Automatic application requires verified release compatibility metadata, supported manifest protocol, and no conflicts, repairs, user-config changes, or migrations. [src: design §2]
- [x] Prereleases, downgrades, and legacy bridge adoption require explicit user-run updates; patch numbering alone does not establish compatibility. [src: design §2]
- [x] An active skill is reinvoked or the user is told to restart where reload is unavailable; no mid-skill instruction replacement. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Local-only authorization | Create a shared manifest with no local policy, clone/copy it into a second temporary project, and prove no auto-safe authorization exists until that project explicitly writes local `auto-safe`; prove `notify` and `off` do not authorize application. | integration |
| Checker reports; agent runs exact version | Use the production eligibility result with a command-spawn seam and assert the checker has no spawn side effect, while the agent runner receives one exact-version argument list and does not pass `@latest` or cause recursive resolution. | unit + integration |
| Complete safety gate | Table-test the production gate with accepted metadata/protocol/plan and independently reject missing or unverified compatibility metadata, unsupported protocol, conflicts, repairs, user-config changes, and explicit migrations. | unit |
| Explicit-only release classes | Test the production policy for prerelease, downgrade, and legacy-bridge candidates; each always requires an explicit user-run update. Separately prove a stable patch candidate remains ineligible until every compatibility, protocol, and conflict-free-plan gate passes. | unit |
| Boundary reload behavior | Render/run the shared skill boundary behavior with an eligible update fixture and assert it schedules or invokes only after completion, then requires reinvocation or tells the user to restart where reload is unavailable. | integration + content regression |
| Descriptor verification supporting complete safety gate | Call the production descriptor parser with a verified exact-artifact descriptor and missing/malformed/future-schema/version-mismatched/false-eligibility variants; assert only matching supported data can reach the remaining safety checks. | unit + package integration |

**Execution order:**

1. Add failing production-policy and integration tests for each gate before wiring `auto-safe` to the runner.
2. Implement eligibility reporting, exact-version invocation, and boundary reload behavior without allowing the checker to mutate files.
3. Run focused auto-safe, planner, resolver, and skill tests; run `pnpm sync-skills` for source skill changes; finish with `pnpm test && pnpm typecheck`.

**Smoke test:** an eligible temporary project with explicit local `auto-safe` produces one exact-version runner call; changing any one safety condition produces no call.

**Before implementing, verify your test harness:**

1. Run the new gate tests against the current implementation first; they must fail.
2. Make each test call the actual checker eligibility, update-plan result, release resolver, or runner boundary, never a duplicated boolean predicate.
3. Use deterministic metadata and spawn seams for the smoke test so it remains local and runs in seconds.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Keep skill checks quiet when current, postponed, offline, or unavailable, and honor the user’s notification and update policy. [src: brief "Hard Constraints"]
- MUST: Keep the public command usable from agents, CI, and an interactive terminal, and distinguish npm’s flags from Joycraft’s flags. [src: brief "Hard Constraints"]
- MUST: Verify the actual package artifact and published installation path, not only source-level functions. [src: brief "Hard Constraints"]
- MUST: Treat `auto-safe` as local standing authorization only; it is never inherited by cloning a shared manifest. [src: design §2]
- MUST: Require verified release compatibility metadata, a supported manifest protocol, and a plan with no conflicts, repairs, user-config changes, or explicit migrations before automatic application. [src: design §2]
- MUST: Resolve and invoke one exact version through the agent runner; the checker reports only and never silently executes an update. [src: design §2]
- MUST: Regenerate and sync source-derived artifacts in every affected commit, including generated and installed copies for Claude, Codex, Pi, Copilot, and omp. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Treat a prerelease, downgrade, legacy bridge, `--yes`, or patch-number change as automatic-update authorization. [src: design §2]
- MUST NOT: Replace instructions during an active skill; reinvoke the skill or explain the required restart after the workflow boundary. [src: design §2]
- MUST NOT: Publish to npm, promote tags, merge a PR, perform destructive Git operations, inspect the external holdout repository, or change its dispatch behavior. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|--------------|
| Modify | `src/update-check.ts` | Expose non-mutating eligibility from local policy, cached release metadata, and planner result. |
| Modify | `src/update.ts` | Accept exact-version agent-run update inputs and expose the safe-plan outcome needed by eligibility. |
| Modify | `src/release-resolver.ts` | Resolve and validate exact release compatibility metadata without recursive latest lookup. |
| Add or Modify | compatibility descriptor source and bundled metadata | Declare compatibility independently of patch number for update automation. |
| Modify | `scripts/lib/skill-template.mjs` and canonical shared entry source | Communicate the boundary behavior, reinvocation, and restart instruction. |
| Modify | generated and installed skill trees for all five harnesses | Regenerated and synchronized copies produced by `pnpm sync-skills`; never hand-edit. |
| Add | `tests/auto-safe-update.test.ts` | Local-policy, complete-gate, exact-command, and reload-boundary regressions. |
| Modify | planner, resolver, and skill-template tests | Exercise real integrations with the completed specs 6–10 interfaces. |

## Approach

### Compatibility descriptor handoff

Use `dist/joycraft-release.json` as the bundled automation descriptor. This is the shared implementation interface for the approved compatibility requirement, not a claim that a version increment proves safety:

```json
{
  "schemaVersion": 1,
  "releaseVersion": "<exact package version>",
  "manifestSchemas": [1],
  "autoSafeEligible": false
}
```

`schemaVersion` versions the descriptor parser. `releaseVersion` must equal the exact resolved package version and the packed package metadata. `manifestSchemas` lists supported installation manifest schemas. `autoSafeEligible` records the reviewed release's automation declaration; true still requires every runtime safety gate, and never permits prereleases, downgrades, bridge adoption, repairs, user-config changes, migrations, or conflicts automatically. Unknown descriptor schemas, missing/malformed fields, false eligibility, or version mismatch fail closed for auto-safe.

Bind the descriptor to the release through the verified outer tarball's SHA-512 integrity and exact-version registry metadata. Do not embed the tarball's own digest inside a file in that tarball, which would create a circular hash. Do not accept an unrelated JSON response or mutable tag as proof of the descriptor's identity. The checker can remain a cheap version/status check; eligibility uses the verified exact-package descriptor at the runner boundary.

Spec 11 owns the runtime descriptor parser and automatic-update eligibility. Spec 12 prepares the descriptor with the version in the reviewed release PR, before packing, and can exercise that contract through fixture packages independently. It must not modify the descriptor after packing. Spec 13 checks the packed and registry artifact descriptors under matched tarball integrity; spec 14 tests the combined runtime/release contract. One release never acquires automation eligibility by default merely because it is newer.

Model `auto-safe` as a local preference read by the checker, then combine it with a typed release compatibility descriptor and the read-only update plan. Return an eligibility explanation with every failed gate so the skill can stay quiet or explain why it requires an explicit update. Keep command execution outside the checker: an agent-boundary runner resolves one exact package version and invokes the completed `update` command after the active skill ends. Reuse the common entry instruction to require reinvocation or a restart only after a successful workflow-boundary update.

Reject automatic application based only on a newer stable patch version. Version arithmetic cannot establish bundle compatibility, manifest support, or absence of local conflicts and would violate the approved safety contract.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Shared manifest copied into a new clone | `auto-safe` remains disabled until the clone explicitly configures it locally. |
| Any missing compatibility, protocol, or plan proof | Checker marks automatic application ineligible and does not launch an updater. |
| Candidate is a prerelease or downgrade | Preserve the candidate as information if appropriate, but require an explicit user-run update. |
| A plan contains a repair, config patch, migration, or conflict | Do not apply automatically; preserve the plan for reviewed manual execution. |
| Exact-version runner fails before or during invocation | Report the outcome through the existing update result path; do not retry with `latest` or mutate checker policy. |
| Active skill cannot reload files | Finish the current work, then tell the user to start a new session or reinvoke the skill after the update. |

## Implementation Evidence

The local checker schedules only an exact candidate command at a workflow boundary. Candidate execution verifies complete tarball bytes and its packaged compatibility descriptor before the transaction gate; verification is an opaque proof, not a caller flag. Automatic mode rejects unsupported versions/protocols, conflicts, repairs, configuration changes, migrations, and missing local authorization. The actual packed and installed CLI successfully updates a historical fixture and rejects descriptor drift without changing the owned skill. All five generated and installed trees were synchronized. Build, type checking, and the full staged suite passed: 3,409 tests, one skipped.
