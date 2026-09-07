---
status: active
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
---

# Reliable Updates — Decomposition Review

> **Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Design:** `docs/features/2026-09-05-reliable-updates/design.md`, approved 2026-09-06 (D5)
> **Review state:** Breakdown and execution modes approved on 2026-09-06 (D6); atomic spec generation authorized.

## Prior knowledge reused

The user requested a fresh teardown. Historical knowledge retrieval remains intentionally excluded; no past architecture was used to choose these boundaries. Reused the approved brief, design, fresh research, and the current feature’s D4 decision-log row dated 2026-09-06 (bounded lookup: release promotion, credential).

## Breakdown

Keep the 15 approved work items rather than reopen the feature scope to satisfy the skill’s general 3–7-spec heuristic. The manifest, planner, transaction, command integration, and release work are honestly marked large and receive fresh implementation contexts. Each row has an independently testable output; release activation waits for the combined checks.

| # | Spec | Outcome | Direct dependencies | Size | Mode |
|---|------|---------|---------------------|------|------|
| 1 | preserve-customization-baselines | Preserve declined customizations across repeated upgrades. | — | S | checkpoint |
| 2 | reconcile-update-status | Report accurate outcomes and reconcile version-only updates. | 1 | S | checkpoint |
| 3 | preserve-installation-manifest | Persist portable installation facts and conservatively adopt legacy state. | 2 | L | isolated |
| 4 | unify-managed-inventory | Describe all install and update artifacts through one ownership-aware inventory. | 3 | M | checkpoint |
| 5 | plan-safe-updates | Produce a complete read-only update plan with reviewable conflicts. | 4 | L | isolated |
| 6 | recover-interrupted-updates | Apply reviewed plans with locking, recovery, and guarded rollback. | 5 | L | isolated |
| 7 | unify-update-command | Route install and upgrade aliases through the same safe update engine. | 6 | L | isolated |
| 8 | separate-project-migrations | Separate deliberate document migrations from routine bundle refresh. | 7 | M | checkpoint |
| 9 | implement-shared-update-checker | Provide one cached local update checker with bounded network work. | 8 | M | checkpoint |
| 10 | wire-skill-update-discovery | Add the shared checker entry to every generated skill and the existing Claude hook. | 9 | M | checkpoint |
| 11 | enable-opt-in-safe-updates | Let authorized agents apply compatible conflict-free updates at skill boundaries. | 10 | M | checkpoint |
| 12 | serialize-immutable-releases | Prepare reviewed release versions and retain a retry-safe candidate artifact. | — | L | isolated |
| 13 | verify-registry-promotion | Promote the verified candidate automatically after real installation checks. | 7, 12 | L | isolated |
| 14 | validate-upgrade-compatibility | Verify the integrated package across historical installs, stacks, harnesses, and platforms. | 11, 13 | M | checkpoint |
| 15 | document-and-dogfood-updates | Document the unified update path and migrate this repository with reviewed preservation. | 14 | M | checkpoint |

## Dependency and execution plan

Redundant prerequisites are represented through transitive dependencies. Spec 9 additionally waits for spec 8 so migration and checker integration do not race on the update command. Spec 14 therefore reaches every prerequisite through specs 11 and 13. No spec has more than two direct dependencies.

The project has no default execution-mode override, so Joycraft’s fallback is batch. For this repair, the user approved checkpoint for smaller items (verify and commit each) and isolated for large items (verify and commit each with a fresh agent context). These modes were approved together with the breakdown (D6).

Execution profile: codex swarms decompose yes · implement yes · model 5.6 terra · effort medium. Execution remains in this task; no user-owned tasks need to be created.

- Wave 1: specs 1, 12 — parallel-safe implementation: updater baseline and release files are disjoint. Serialize shared documentation/status updates, integration checks, commits, and pushes in the driving agent.
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

## Constraint and acceptance audit

**All constraints traced — zero INVENTED.** The following is the complete approved constraint/acceptance checklist to carry into the specs. Test procedures below are implementation suggestions; they introduce no additional product requirements.

### Common constraints

- Preserve user files, selections, unrelated config, and unknown state fields; missing state and --yes never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- Keep shipped paths project-relative and honor the external validation boundary. [src: brief "Hard Constraints"]
- No live publication, tag promotion, merge, or destructive Git operation is authorized by approving these specs. [src: brief "Hard Constraints"]
- Regenerate and sync source-derived artifacts in every affected commit, including all installed harness copies. [src: brief "Hard Constraints"]
- Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- Do not change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

### 1. preserve-customization-baselines

**Affected files:** src/upgrade.ts; tests/upgrade.test.ts; tests/version.test.ts. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Preserve declined customizations across repeated upgrades.

- [ ] After declining replacement, the second and third upgrade preserve the same custom bytes without treating them as pristine vendor content. [src: design §2]
- [ ] Accepting a replacement records the target vendor hash; declining preserves a known vendor base or unknown ownership rather than hashing the customization. [src: design §2]
- [ ] Regression tests exercise the actual upgrade and persisted state on a real temporary filesystem. [src: design §3]

**Verification:** Real filesystem multi-run regression against the exported upgrade function.

### 2. reconcile-update-status

**Affected files:** src/upgrade.ts; src/version.ts; src/cli.ts; tests/upgrade.test.ts; tests/version.test.ts. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Report accurate outcomes and reconcile version-only updates.

- [ ] Identical content with an older version stamp reconciles metadata without rewriting the files. [src: design §2]
- [ ] Applied/no-op, invalid/failure, unresolved conflict, and lock/recovery attention map to exits 0, 1, 2, and 3; later transaction integration supplies the lock/recovery producer. [src: design §2]
- [ ] Preserved local-only edits are distinct from pending vendor changes; no terminal prompt waits for input in unattended mode. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 3. preserve-installation-manifest

**Affected files:** src/install-manifest.ts (new); src/version.ts; src/gitignore.ts; historical vendor catalogue (new); tests/install-manifest.test.ts (new); tests/gitignore-profiles.test.ts. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Persist portable installation facts and conservatively adopt legacy state.

- [ ] Schema 1 records target version, bundle integrity, selected harnesses/profile, and per-file vendor identity/ownership using portable validated paths. [src: design §2]
- [ ] Shared manifests survive clones; private manifests and all local settings remain local; effective ignore rules hiding a shared manifest are reported. [src: design §2]
- [ ] Missing state infers only roots with Joycraft artifacts across all five harnesses; trusted historical/target vendor matches establish ownership, but legacy stored hashes alone do not. [src: design §2]
- [ ] Unknown file content remains unverified; corrupt state is preserved, unknown future schemas stop mutation, and unknown legacy settings survive in a namespaced payload. [src: design §2]
- [ ] Normalized LF vendor hashes classify text across platforms; raw byte hashes remain distinct transaction preconditions. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 4. unify-managed-inventory

**Affected files:** src/bundle-inventory.ts (new); src/init.ts; src/upgrade.ts; src/harness.ts; bundle generation/build configuration; tests/bundle-inventory.test.ts (new). New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Describe all install and update artifacts through one ownership-aware inventory.

- [ ] One inventory describes selected vendor files, executable modes, create-once documents, and owned configuration patches for all five harnesses. [src: design §2]
- [ ] Checker/hook entries have explicit managed ownership; the checker payload and adapter are activated when their later producer specs land, without shipping a broken placeholder. [src: design §2]
- [ ] Existing policy prose and unrelated JSON keys remain outside routine replacement; new policy-file creation retains existing generators. [src: design §2]
- [ ] Every change to generated sources regenerates and synchronizes its affected outputs in that same implementation commit. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 5. plan-safe-updates

**Affected files:** src/update-plan.ts (new); tests/update-plan.test.ts (new). New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Produce a complete read-only update plan with reviewable conflicts.

- [ ] createUpdatePlan takes snapshot, manifest, inventory, and options with no filesystem writes, network requests, or prompts. [src: design §2]
- [ ] All nine comparison cases in design section 2D distinguish reconciliation, safe replacement, local-only edit, conflict, local deletion, creation, trusted adoption, owned deletion, and orphaned customization. [src: design §2]
- [ ] Conflicts include real current-to-target diffs and preserved bytes; missing state and generic legacy names never authorize replacement or deletion. [src: design §2]
- [ ] Safe unattended selection excludes customized replacement; explicit replacement/repair selections are represented in the returned plan. [src: design §2]
- [ ] Owned JSON/marked-region patches preserve unrelated content and are calculated before any application. [src: design §2]

**Verification:** Pure production planner cases with snapshot inputs; assert no I/O.

### 6. recover-interrupted-updates

**Affected files:** src/update-transaction.ts (new); src/install-manifest.ts; tests/update-transaction.test.ts (new). New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Apply reviewed plans with locking, recovery, and guarded rollback.

- [ ] applyUpdatePlan atomically acquires a project lock; validates paths and outside-root symlink traversal; rechecks raw preconditions; stages and validates writes before publishing the manifest last. [src: design §2]
- [ ] The journal stores the complete plan and preimages before mutation; recovery uses manifest digests even after a crash between manifest rename and journal bookkeeping. [src: design §2]
- [ ] An old unchanged manifest causes rollback of incomplete writes; a matching new manifest causes verification and cleanup of the committed update. [src: design §2]
- [ ] Intervening user edits stop recovery/rollback with backups intact; another process lock is not silently removed. [src: design §2]
- [ ] The retained last successful backup supports explicit guarded rollback; tests inject filesystem failures and interruptions at transaction phases. [src: design §2]

**Verification:** Production transaction integration with injected failures and two competing updater processes.

### 7. unify-update-command

**Affected files:** src/update.ts (new); src/cli.ts; src/init.ts; src/upgrade.ts; src/release-resolver.ts (new); tests/update-cli.test.ts (new). New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Route install and upgrade aliases through the same safe update engine.

- [ ] update, init, and upgrade share planning/application while applying the executing package bundle without nested latest resolution. [src: design §2]
- [ ] Fresh unattended update requires harness selection; legacy init retains its all-harness default with a notice. [src: design §2]
- [ ] --yes and --non-interactive apply safe actions only; --replace-customized selects explicit paths; init --force remains scoped to its existing inventory. [src: design §2]
- [ ] JSON reports applied/preserved/conflict outcomes with the design exit codes; unavailable registry access does not block an explicitly selected local bundle. [src: design §2]
- [ ] The exact-release runner validates version/integrity metadata once and invokes npm with argument arrays, including paths with spaces and Windows behavior. [src: design §2]
- [ ] Legacy state backup and known checker-registration replacement participate in the transaction; a profile change moves manifest authority without automatically untracking files. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 8. separate-project-migrations

**Affected files:** src/migration.ts; src/update.ts; src/cli.ts; tests/migration.test.ts; tests/update-cli.test.ts. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Separate deliberate document migrations from routine bundle refresh.

- [ ] Routine refresh performs no implicit document reorganization and does not delete unowned generic legacy skills. [src: design §2]
- [ ] Explicit migrations present their planned changes and preserve user files unless replacement was explicitly selected. [src: design §2]
- [ ] Failures are reported as incomplete work rather than success based on a tolerated fraction of errors; routine updates continue to use the transaction boundary. [src: design §2]
- [ ] CLAUDE.md merge/improve logic remains outside this work. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 9. implement-shared-update-checker

**Affected files:** src/update-check.ts (new); src/release-resolver.ts; src/bundle-inventory.ts; build configuration; tests/update-check.test.ts (new). New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Provide one cached local update checker with bounded network work.

- [ ] Bundle a dependency-free docs/.joycraft/check.mjs from the shared implementation; derive its root from installation location and support check --json. [src: design §2]
- [ ] Successful metadata refresh has a 24-hour lifetime and a three-second deadline, with a local refresh lock and bounded failure backoff. [src: design §2]
- [ ] Report available, current, postponed, pending-conflicts, and unknown distinctly; compare numeric stable versions and never automatically select prereleases. [src: design §2]
- [ ] Display acknowledgement differs from postponement; suppress repeated offers per release/session and honor explicit checks and newer releases. [src: design §2]
- [ ] Notify is the default local policy; off and auto-safe settings stay local; offline or failed checks do not block skill work. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 10. wire-skill-update-discovery

**Affected files:** scripts/lib/skill-template.mjs; src/skills/ (only shared-entry needs); source hook registration; generated bundled and installed skill trees; tests/skill-template.test.ts; affected skill tests. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Add the shared checker entry to every generated skill and the existing Claude hook.

- [ ] All five generated harness variants invoke the checker once through a short common entry instruction without changing skill frontmatter. [src: design §2]
- [ ] Missing/failed checker execution continues the skill without repeated bootstrap attempts; current/postponed/offline checks stay quiet. [src: design §2]
- [ ] The verified Claude SessionStart adapter invokes the same checker and belongs to the managed inventory; no unverified native hook is added. [src: design §2]
- [ ] Updates occur at a workflow boundary and explain skill reinvocation or session restart; every source edit synchronizes all generated and installed copies in its own commit. [src: design §2]
- [ ] Position-sensitive tests still check the intended semantic sections after the common entry is inserted. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 11. enable-opt-in-safe-updates

**Affected files:** src/update-check.ts; src/update.ts; src/release-resolver.ts; compatibility descriptor; shared skill entry; tests/auto-safe-update.test.ts (new); generated skill copies. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Let authorized agents apply compatible conflict-free updates at skill boundaries.

- [ ] Only an explicitly configured local auto-safe policy grants standing authorization; cloning a shared manifest does not enable it. [src: design §2]
- [ ] The checker reports eligibility while the agent invokes the exact-version updater; it does not silently execute updates itself. [src: design §2]
- [ ] Automatic application requires verified release compatibility metadata, supported manifest protocol, and no conflicts, repairs, user-config changes, or migrations. [src: design §2]
- [ ] Prereleases, downgrades, and legacy bridge adoption require explicit user-run updates; patch numbering alone does not establish compatibility. [src: design §2]
- [ ] An active skill is reinvoked or the user is told to restart where reload is unavailable; no mid-skill instruction replacement. [src: design §2]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 12. serialize-immutable-releases

**Affected files:** .github/workflows/publish.yml; release-preparation workflow/helpers (new); release preparation tests (new); package toolchain metadata. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Prepare reviewed release versions and retain a retry-safe candidate artifact.

- [ ] Product changes maintain one release PR under a preparation lock; docs-only changes do not create releases and publication never pushes a version bump to main. [src: design §2]
- [ ] Publishing selects the immutable release merge SHA, retains the publish.yml OIDC identity, and uses non-canceling publication concurrency. [src: design §2]
- [ ] Build/pack once and retain the tarball plus SHA-512 digest as durable artifacts; retry reuses the artifact and rejects integrity/provenance mismatch rather than rebuilding a different package at the same version. [src: design §2]
- [ ] Pin the approved release toolchain (Node 24.20.0, npm 11.19.0, pnpm 10.19.0); registry lookup errors fail instead of implying version 0.0.0. [src: design §2]
- [ ] Candidate publication accepts the tested tarball; latest promotion remains disabled until spec 13 readiness and authentication gates are integrated. [src: design §2]

**Verification:** Deterministic npm/registry/process fixtures locally; real package installation checks in the authorized release workflow.

### 13. verify-registry-promotion

**Affected files:** .github/workflows/publish.yml; release verification/promotion helpers (new); release verification tests (new). New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Promote the verified candidate automatically after real installation checks.

- [ ] Test fresh installs and previous-version updates from the retained tarball before publication; verify exact registry-version integrity after candidate publication. [src: design §2]
- [ ] Warm full and compact metadata caches before candidate publication and test both warmed and cold clients with npm 10.9.8/Node 22.23.1 and the maintained Node 24 line. [src: design §2]
- [ ] Wait at least the observed five-minute freshness interval and require actual readiness success; bounded deadline failure leaves latest unchanged. [src: design §2]
- [ ] Promote automatically using the Joycraft-scoped credential only after readiness; missing/expired credentials fail clearly and do not bypass verification. [src: D4]
- [ ] Retries rerun readiness, skip completed steps, and never downgrade latest; verify latest from a fresh client before creating the GitHub tag/release. [src: design §2]
- [ ] Exercise --prefer-online and bounded isolated-cache recovery; deterministic local fixtures test failures without publishing during development. [src: design §2]

**Verification:** Deterministic npm/registry/process fixtures locally; real package installation checks in the authorized release workflow.

### 14. validate-upgrade-compatibility

**Affected files:** tests/fixtures/; package acceptance tests (new); consumer validation workflow/matrix; package.json (engine declaration). New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Verify the integrated package across historical installs, stacks, harnesses, and platforms.

- [ ] Packaged fresh installs and repeat updates pass against Node.js, Python, Rust, and Go projects without adding a project runtime dependency. [src: brief "Test Strategy"]
- [ ] Historical-release upgrades, shared clones, private installs, missing/corrupt state, poisoned baselines, declined edits, and version-only updates retain the approved safety behavior. [src: brief "Test Strategy"]
- [ ] Each supported harness and relevant mixed selections are exercised; generated artifacts have zero drift. [src: brief "Test Strategy"]
- [ ] Declare Node >=22 and validate supported minimum APIs and the approved runtime matrix across Linux, macOS, and Windows; a matrix failure blocks promotion. [src: brief "Test Strategy"]
- [ ] Integrated interruption/concurrency, no-TTY, path-with-spaces, denied-access, and rollback-conflict tests call production code and preserve the original regression coverage. [src: brief "Test Strategy"]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

### 15. document-and-dogfood-updates

**Affected files:** README.md; CHANGELOG.md; AGENTS.md where needed; docs/guides/; docs/.joycraft/ shared manifest/checker; installed generated artifacts. New filenames are suggested locations, not claims that these files already exist.

**Completion boundary:** Document the unified update path and migrate this repository with reviewed preservation.

- [ ] Document one install/update command, --prefer-online recovery, the legacy bridge, safe flag behavior, exit codes, update policies, and reinvocation/restart guidance. [src: brief "Success Criteria"]
- [ ] Document credential ownership/renewal, candidate verification, retry and promotion failure recovery without storing secret values. [src: D4]
- [ ] Apply the same reviewed update mechanism to this repository while preserving local content; do not claim old installations discover updates before their bridge update. [src: brief "Success Criteria"]
- [ ] Run generators as a zero-drift verification, not deferred synchronization; complete build, tests, type checks, independent verification, and release-docs review before PR preparation. [src: brief "Test Strategy"]

**Verification:** Focused production-function tests, plus real filesystem or child-process integration at the affected boundary; test every acceptance criterion above.

## Approval and continuation

The user approved this breakdown and its execution modes on 2026-09-06 (D6), explicitly requesting a GPT-5.6 Terra swarm at medium effort to write the specs. No open product decisions or invented constraints remain. The source documents and machine-readable queue retain the approved scope and modes.

Publishing, promoting a live npm tag, and merging still require separate authorization.
