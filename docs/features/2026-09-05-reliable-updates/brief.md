---
status: active
owner: Maximilian Maksutovic
created: 2026-09-05
feature: 2026-09-05-reliable-updates
decisions:
  - id: D1
    question: Scope and starting evidence
    status: clarified
    choice: Carry the complete fresh upgrade teardown into one brief.
    rationale: The user requested everything from the teardown, including reliable installation and automated update discovery.
  - id: D2
    question: Workflow for this cross-system repair
    status: clarified
    choice: Use the bugfix workflow's large-fix route through brief, design, decomposition, implementation, and verification.
    rationale: The user requested Joycraft dogfooding and the whole flow. One bugfix spec cannot cover this scope.
  - id: D3
    question: Approval of the brief and product contract
    status: clarified
    choice: Approve the complete brief and proceed to design.
    rationale: The user replied "approved" at the brief review gate on 2026-09-05.
  - id: D4
    question: Authentication for promotion of a verified npm candidate to latest
    status: clarified
    choice: Automatic promotion using a granular npm write credential scoped to Joycraft; keep OIDC for publication.
    rationale: The user considers maintainer credential renewal a non-issue and accepts it for automatic promotion.
  - id: D5
    question: Approval of the complete reliable-updates design
    status: clarified
    choice: Approve the design and proceed to decomposition.
    rationale: The user replied approve at the completed design review gate on 2026-09-06.
  - id: D6
    question: Approval of decomposition and execution modes
    status: clarified
    choice: Approve the 15-spec breakdown, dependencies, 14 waves, and listed checkpoint/isolated modes; write specs with a GPT-5.6 Terra swarm at medium effort.
    rationale: The user approved the decomposition and explicitly requested this swarm configuration on 2026-09-06.
---

# Reliable Joycraft Updates — Feature Brief

> **Date:** 2026-09-05
> **Project:** Joycraft
> **Entry point:** `joycraft-bugfix`, large-fix route through `joycraft-new-feature`
> **Evidence:** `docs/features/2026-09-05-reliable-updates/research.md`
> **Baseline:** `8333f9b593eac6ef7fef96dcf40fa00c466e672d`, published `joycraft@0.7.13`
> **Review state:** Brief approved by Maximilian Maksutovic on 2026-09-05. Design approved on 2026-09-06 (D5); decomposition approved on 2026-09-06 (D6).
> **Design:** `docs/features/2026-09-05-reliable-updates/design.md`
> **Decision dossier:** `docs/features/2026-09-05-reliable-updates/dossier.md`

## Vision

A user runs one command to install or update Joycraft. The command preserves local edits and reports the resulting installation accurately. Users can ask their agent to update without authorizing the removal of their customizations.

Every Joycraft skill participates in update discovery. A small local checker uses a cached result and performs a bounded network refresh when due. The agent offers a verified update once, honors postponement, and continues the requested work when offline. Automatic safe updates are an opt-in mode.

Installation, project state, skill discovery, and publishing form one lifecycle. A release becomes the recommended version after the published package passes installation checks. Shared projects retain the facts needed to update after cloning. The updater can recover from interruption and explain incomplete work.

This work repairs confirmed defects and simplifies the surrounding product. The design must avoid replacing scattered patches with another collection of independent update scripts.

## User Stories

- As a new user, I want one installation command that works without prior Joycraft state.
- As an existing user, I want updates to preserve every edit I declined to replace.
- As a teammate, I want a cloned installation to retain its version and selected harnesses.
- As a skill user, I want timely update notices and an agent that can perform the update safely.
- As a maintainer, I want verified releases and repeatable recovery when publishing or updating fails.

## Symptom and Diagnosis

### Installation incident

Both `npx joycraft@latest init` and `npx joycraft@latest upgrade` failed with `ETARGET` before Joycraft started. npm offered `0.7.13`, then failed to resolve that version. The publication timestamp preceded the first attempt by about 15 seconds. (anchor: 100)

The Joycraft-specific cache contained an older full response and a newer compact response. Only the newer response contained `0.7.13`. The older response size matched the error log exactly: 135,174 bytes. Metadata inconsistency is the supported explanation, rather than a fault inside the init command. The original process was not replayed at its original timestamp. (anchor: 75)

### Confirmed product defects

| ID | Defect | Root cause and evidence |
|----|--------|-------------------------|
| F1 | Declining an overwrite loses the edit on the next upgrade. | `src/upgrade.ts:662` records current customized bytes as the original baseline. `src/upgrade.ts:600` trusts that baseline on the next run. Reproduced against source and published 0.7.13. (anchor: 100) |
| F2 | Shared clones lose installation identity and harness selection. | `src/gitignore.ts:65` excludes state containing those facts. `src/upgrade.ts:440` falls back only to Claude skill paths. A Codex clone fixture returned uninitialized with exit 0. (anchor: 100) |
| F3 | A no-op upgrade can leave the recorded version old. | `src/upgrade.ts:609` returns before version reconciliation when managed bytes match. Reproduced with only the recorded version changed. (anchor: 100) |
| F4 | Unattended updates can overwrite local edits or ask for unavailable input. | `src/upgrade.ts:646` makes `--yes` overwrite customized files. The alternative prompt has no TTY guard. (anchor: 100) |
| F5 | Automatic version checks have inconsistent reach and maintenance. | `src/cli.ts:86`, `src/cli.ts:114`, `src/upgrade.ts:49`, and `src/init.ts:387` implement separate checks. Upgrade's inventory excludes the Claude hook. (anchor: 100) |

### Additional lifecycle risks

| ID | Risk | Evidence |
|----|------|----------|
| F6 | A routine update also changes project layout and deletes old skill names. | `src/upgrade.ts:194`, `src/upgrade.ts:375`, and `src/upgrade.ts:456`. Managed writes have no transaction recovery. (anchor: 100) |
| F7 | Release jobs compete with writes to main. | `.github/workflows/publish.yml:72` pushes a version bump to main. Run `33720453120` failed with a rejected push. No publish concurrency group exists. (anchor: 100) |
| F8 | Publish completion does not establish consumer installation readiness. | `.github/workflows/publish.yml:83` publishes directly to latest without a subsequent registry installation check. (anchor: 100) |

## Proposed Product Contract

The user approved this product contract on 2026-09-05 (D3). D1 and D2 record scope and workflow. Detailed design remains subject to its own review gate.

### One update operation

The public command is `npx --prefer-online joycraft@latest update`. `init` and `upgrade` remain supported entry points into the same planning and application engine. Existing automation gets documented compatibility behavior rather than an unexplained flag change.

The launcher resolves a specific version once. The engine applies that version without recursively resolving latest. Fresh installation, existing installation, legacy adoption, and repair share an inventory and explicit file-ownership rules. An absent state file never grants permission to replace unrelated files.

The engine reports installed version, requested version, conflicts, and incomplete work separately. A successful no-op reconciles metadata. An unavailable registry check is unknown, not proof that the installation is current.

### Preserve edits and recover updates

Keep the original vendor baseline separate from current disk content. A declined customization remains protected on all later runs. Compare vendor baseline, current file, and target bundle. When the vendor file has not changed, avoid repeatedly requesting replacement of a local-only edit.

Plan all changes before writing. Show real diffs for conflicts. Separate unattended operation from explicit replacement of customized files. Add locking, staged writes, a recovery journal, and backups appropriate to the plan. Recovery must cover interruption between file writes and state publication.

Delete only files whose Joycraft ownership is established. Keep major docs migrations and policy changes separate from ordinary bundle refresh. Existing generic legacy names do not establish ownership by themselves.

### Installation facts survive cloning

A versioned manifest records the selected harnesses, release, and vendor baselines. Shared installations track that manifest alongside their installed files. Local check caches and notification preferences remain local. Private installations support explicit local bootstrap.

The design must handle missing, corrupt, and legacy state. Prior buggy upgrades can already have recorded custom bytes as pristine hashes. Do not trust those hashes as sufficient ownership evidence. Where a historical baseline cannot be established, preserve the file and report a conflict.

### One checker across skills

A locally installed checker serves CLI checks, skill entry, and supported session hooks. The canonical skill-generation path adds the common entry instruction. The checker and its adapters belong to the managed inventory, so later upgrades refresh them.

Check cached state on skill entry. Refresh the registry at most once daily by default, with a short timeout, request deduplication, and bounded error backoff. Compare the installed project release against the verified channel. Do not install the npm package just to check its version.

Default to a concise notice and an agent-run update when authorized. Honor postponement and avoid repeated notices for the same release. An opt-in automatic mode applies only a compatible, verified, conflict-free plan. Patch numbering alone does not establish compatibility.

Do not replace instructions midway through an active skill. After updating, reload or reinvoke the skill where supported. Otherwise explain the required session restart. A missing checker or an offline network must not stop the requested work.

Existing users need one bridge update before old skills can run a new entry instruction. Do not claim that the new mechanism can reach every old installation without that bridge. (anchor: 100)

### Verify releases before promotion

Prepare the version in a release PR and publish from its immutable commit. Serialize publication and make retry behavior explicit. Treat registry lookup failure as an error, not as release `0.0.0`.

Pack once and test that artifact. Publish it under a candidate tag. Verify exact-version registry installation, fresh initialization, and upgrades before promoting latest. Account for propagation and both full and compact npm metadata caches. A fixed delay alone cannot guarantee every external cache is fresh.

Pin the release toolchain and declare a supported Node range. Cover Node 22/npm 10 from the incident while it remains supported. Product releases need not accompany docs-only merges. The design will specify the release PR trigger and retry/promotion checks.

## Hard Constraints

- MUST: Use automatic promotion after verification, with a Joycraft-scoped npm write credential maintained by a Joycraft maintainer in GitHub Actions secrets; retain OIDC for publication (D4).

- MUST: Preserve custom files, user documents, selected harnesses, and unknown state fields across update and recovery.
- MUST: Support Node.js, Python, Rust, and Go target projects without adding Joycraft to their runtime dependencies.
- MUST: Use one canonical skill source and regenerate all bundled and installed harness variants after source edits.
- MUST: Keep skill checks quiet when current, postponed, offline, or unavailable. Honor the user's notification and update policy.
- MUST: Verify the actual package artifact and published installation path, not only source-level functions.
- MUST: Keep the public command usable from agents, CI, and an interactive terminal. Distinguish npm's own flags from Joycraft's flags.
- MUST: Use project-relative paths in shipped files and briefing blocks. Use supported Node facilities before proposing a dependency.
- MUST: Preserve the holdout-validation boundary. Do not inspect its external repository or change dispatch behavior to expose it.
- MUST NOT: Treat `--yes`, missing state, or a matching legacy name as blanket authorization to overwrite local content.
- MUST NOT: Publish to npm, promote npm tags, merge a PR, or perform destructive Git operations without the required explicit authorization.
- MUST NOT: Modify CLAUDE.md merge/improve logic as an incidental part of this work. Surface a concrete need separately.

## Out of Scope

- Replacing npm with a new installer service or requiring a global Joycraft installation.
- Redesigning Joycraft's feature/spec methodology or applying new document layouts during a routine update.
- A new analytics service, automatic user messaging, or organization-wide update enforcement.
- Automatic replacement of customized files. Explicit overwrite remains a separate, reviewed action.
- Refactoring unrelated templates or skills. The skill change is the shared update entry behavior and its user-facing instructions.

## Test Strategy

- **Existing setup:** Vitest, TypeScript checks, package bundling, and stack fixtures. The teardown ran 96 relevant existing tests successfully. (anchor: 100)
- **Baseline repros:** Published 0.7.13 reproduced F1 and F2. Source fixtures reproduced F3 and basic install/repeat-update behavior on four stacks. (anchor: 100)
- **Test types:** Pure planner tests, real-filesystem integration tests, process-level CLI tests, and tarball/registry smoke tests.
- **Smoke budget:** A focused local regression in seconds. Registry checks run in release validation with bounded retries and deadlines.
- **User expertise:** Maintainer and product owner. Present behavior, conflicts, and decisions with concrete evidence.
- **Lockdown mode:** Normal repository boundaries. Scope implementation by atomic spec rather than editing unrelated workflow content.

The first tests reproduce declined-edit loss across repeated updates, not only one run. Cover version-only updates, local-only customizations, vendor changes, missing files, shared clones, legacy hooks, and poisoned historical baselines.

Exercise two concurrent updaters, interrupted writes, rollback conflicts, corrupt state, no-TTY execution, paths with spaces, and denied filesystem access. Network tests use deterministic fixtures locally. Release smoke tests cover the real npm registry and warm/cold caches.

Test each supported harness separately and relevant mixed selections. Test the declared Node range and macOS, Linux, and Windows command behavior where supported. Do not infer platform support from a passing macOS fixture.

## Decomposition

This is the approved decomposition (D6). The executable queue and detailed wave plan are in `specs/README.md` and `specs/.joycraft-spec-queue.json`. Large specs use the approved isolated execution mode.

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | preserve-customization-baselines | Preserve declined customizations across repeated upgrades. | None | S |
| 2 | reconcile-update-status | Report accurate outcomes and reconcile version-only updates. | 1 | S |
| 3 | preserve-installation-manifest | Persist portable installation facts and conservatively adopt legacy state. | 2 | L |
| 4 | unify-managed-inventory | Describe all install and update artifacts through one ownership-aware inventory. | 3 | M |
| 5 | plan-safe-updates | Produce a complete read-only update plan with reviewable conflicts. | 4 | L |
| 6 | recover-interrupted-updates | Apply reviewed plans with locking, recovery, and guarded rollback. | 5 | L |
| 7 | unify-update-command | Route install and upgrade aliases through the same safe update engine. | 6 | L |
| 8 | separate-project-migrations | Separate deliberate document migrations from routine bundle refresh. | 7 | M |
| 9 | implement-shared-update-checker | Provide one cached local update checker with bounded network work. | 8 | M |
| 10 | wire-skill-update-discovery | Add the shared checker entry to every generated skill and the existing Claude hook. | 9 | M |
| 11 | enable-opt-in-safe-updates | Let authorized agents apply compatible conflict-free updates at skill boundaries. | 10 | M |
| 12 | serialize-immutable-releases | Prepare reviewed release versions and retain a retry-safe candidate artifact. | None | L |
| 13 | verify-registry-promotion | Promote the verified candidate automatically after real installation checks. | 7, 12 | L |
| 14 | validate-upgrade-compatibility | Verify the integrated package across historical installs, stacks, harnesses, and platforms. | 11, 13 | M |
| 15 | document-and-dogfood-updates | Document the unified update path and migrate this repository with reviewed preservation. | 14 | M |

## Execution Strategy

Approved mixed execution, with checkpoint/isolated modes as recorded in `specs/README.md`. The user selected GPT-5.6 Luna at high effort for implementation on 2026-09-06; spec authoring used Terra at medium.

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

Commit and push each verified spec in order; synchronize generated outputs in the same source-changing commit. The full feature finishes with independent verification and PR preparation. Publishing and merging remain separately authorized.

## Risks and Design Work

| Risk | Required design treatment |
|------|---------------------------|
| Old baselines can already contain custom content. | Use conservative adoption and historical vendor evidence. Never repair uncertainty by overwriting files. |
| Shared manifests and private installs need different persistence rules. | Specify exactly what is tracked, local, reproducible, and migrated. |
| State migration and recovery can disagree after a crash. | Define a schema, transaction phases, concurrency checks, and recovery precedence. |
| Changing --yes behavior affects existing automation. | Document and test alias/flag compatibility with an explicit deprecation or migration contract. |
| Harness lifecycle capabilities differ. | Verify adapters individually. Keep the local checker portable and the preamble best-effort. |
| Release publication and latest promotion have separate failures. | Define retry-safe states and never treat an already-published version as an invitation to republish it. |
| A preserved file can stay on an older vendor revision. | Report target release and per-file exceptions separately. Do not claim complete convergence. |

These are required design tasks, not claims that a particular solution already works. Design surfaced D4: authentication for verified npm promotion. It is recorded in the decision dossier and is not backlogged.

## Success Criteria

- [ ] A fresh project and an existing installation can use the documented update command successfully.
- [ ] A customization declined once survives all later updates unless replacement is explicitly authorized.
- [ ] Shared clones preserve selected harnesses and reliable installation identity.
- [ ] Version-only updates reconcile state without unnecessary file churn or repeated reminders.
- [ ] Unattended updates preserve conflicts and report an actionable status without waiting for input.
- [ ] Interrupted or concurrent updates recover without silent data loss or false completion.
- [ ] Routine refresh does not implicitly reorganize user documents or delete unowned skills.
- [ ] Skill entry reports a verified available update once, supports postponement, and continues offline.
- [ ] An authorized agent can update and explain whether skill reload or session restart is required.
- [ ] Automatic safe updates are opt-in and reject conflicts, incompatible changes, and explicit migrations.
- [ ] A release passes packed-artifact and registry installation checks before latest promotion.
- [ ] Repeated release execution is safe and does not race a version-bump push to main.
- [ ] The four target stacks, selected harnesses, and supported runtime matrix pass acceptance checks.
- [ ] This repository uses the same generated checker and update behavior that users receive.

## Prompt for the implementing agent

```text
You are picking up docs/features/2026-09-05-reliable-updates/brief.md, written 2026-09-05.
Decisions D1–D3 record scope, workflow, and brief approval. D4 is clarified: automatic promotion. D5 approves the design; D6 approves the decomposition, execution modes, and Terra medium spec-writing swarm.
Start: read research.md, design.md, and dossier.md, then execute the approved queue in specs/README.md order.
Hazard: previous upgrades can record customized bytes as pristine vendor baselines. Matching an old stored hash is not sufficient proof of ownership.
Done when: the reviewed specs are implemented and verified, the published-artifact validation path is covered, and a reviewable PR is prepared. Publishing and merging need separate authorization.
```
