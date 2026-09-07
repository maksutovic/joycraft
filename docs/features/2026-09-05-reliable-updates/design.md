---
status: active
owner: Maximilian Maksutovic
created: 2026-09-05
feature: 2026-09-05-reliable-updates
---

# Reliable Updates — Design

> **Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`, approved 2026-09-05
> **Evidence:** `docs/features/2026-09-05-reliable-updates/research.md`
> **Gate:** Approved by Maximilian Maksutovic on 2026-09-06 (D5). Proceed to decomposition.

## 1. Current State

**Prior knowledge reused:** The approved brief and this conversation's fresh source review. Historical decisions were not used to select the architecture, honoring the original fresh-start request. The decision-log format was inspected for later stamping only.

Two read-only agents examined installation state and delivery boundaries. The root agent checked source and current npm documentation. Existing evidence remains in `research.md`.

| Surface | Current interface | Design consequence |
|---------|-------------------|--------------------|
| Initial install | `init(dir, { force, gitignore })`, `src/init.ts:78` | Extract planning from writes. Preserve existing generators for new boundary files. |
| Upgrade | `upgrade(dir, { yes, gitignore, spawnForReexec })`, `src/upgrade.ts:414` | Remove embedded registry delegation and pre-plan mutations. |
| State | `readVersion(dir)` / `writeVersion(...)`, `src/version.ts:94` | Replace ambiguous hashes with a schema and verified per-file vendor identity. |
| Inventory | `getManagedFiles(harnesses)`, `src/upgrade.ts:111` | Share one inventory with init, including hook/checker assets. |
| Generation | `applyTemplate(source, harness, filename)`, `scripts/lib/skill-template.mjs:64` | Add one common entry instruction without changing harness substitution semantics. |
| Publish | Main-push workflow, `.github/workflows/publish.yml:11` | Separate release preparation, immutable publication, and latest promotion. |

State combines local preferences with facts needed by teammates. Upgrade trusts stored hashes even when an earlier run recorded customized bytes. Scripts and skill bundles update through different inventories. These behaviors were read directly and reproduced where described in the research. (anchor: 100)

The release workflow already uses npm OIDC. Current npm documentation restricts that authentication to publish operations. Candidate promotion uses a different command. This introduces D4 rather than an assumption that existing authentication covers promotion. (anchor: 100)

## 2. Desired End State

The contracts below are approved design choices, not claims that new code already exists. Anchors identify checked facts that constrain those choices.

### A. One engine with explicit inputs

| Module | Responsibility |
|--------|----------------|
| `src/bundle-inventory.ts` | Describe selected vendor files, executable modes, create-once files, and owned config patches. |
| `src/install-manifest.ts` | Read and validate shared/private manifests, adopt legacy state, and preserve unknown fields. |
| `src/update-plan.ts` | Pure comparison of inventory, snapshot, manifest, and explicit options. Return actions and conflicts. |
| `src/update-transaction.ts` | Apply a plan under a lock, verify preconditions, journal writes, recover, and roll back. |
| `src/update.ts` | Orchestrate input collection, planning, presentation, and application of the selected bundle. |
| `src/update-check.ts` | One importable version/check policy implementation, also bundled as the local entry script. |
| `src/release-resolver.ts` | Resolve one exact release and integrity record for agent-led updates. Never recurse inside the engine. |

`createUpdatePlan({ snapshot, manifest, inventory, options })` performs no I/O, prompts, or network access. `applyUpdatePlan(root, plan)` accepts the same plan that the user or automation reviewed. Both return structured results instead of printing internally.

The package already has Commander and Node filesystem/crypto APIs. Existing `hashContent` uses SHA-256. These support the proposed boundaries without a new runtime dependency. (anchor: 100)

`update` applies the executing package's bundle. The documented npx command selects latest before launch. An agent update runner resolves an exact version once and invokes that version. A global old CLI reports its bundle version honestly rather than nesting another latest lookup. An unavailable registry does not prevent an explicitly selected, locally available bundle from running.

### B. Shared facts and local preferences

| Path | Shared profile | Private profile |
|------|----------------|-----------------|
| `docs/.joycraft/manifest.json` | Tracked installation manifest | Not created |
| `docs/.joycraft/local/manifest.json` | Not authoritative | Ignored installation manifest |
| `docs/.joycraft/check.mjs` | Tracked managed checker | Ignored managed checker |
| `docs/.joycraft/local/` | Ignored cache, preferences, lock, journal, backups | Same local scope |
| `docs/.joycraft/state.json` | Legacy input only | Legacy input only |

The existing ignore rule names `state.json` rather than the entire directory. New named paths can separate shared data without removing arbitrary ignore rules. Check the effective ignore result and report a broad user rule that hides the shared manifest. (anchor: 100)

Schema 1 records `targetVersion`, `bundleIntegrity`, `harnesses`, `profile`, and `files`. Each file records `vendorVersion`, `vendorHash`, `kind`, and `ownership: verified | unknown`. Config patches additionally identify their owned key or marked region. Paths use forward slashes and reject traversal or absolute paths.

`vendorHash` describes normalized vendor text, never arbitrary current disk contents. A per-file vendor version can lag the target after a conflict. Status derives `complete`, `customized`, or `pending` from the manifest and current comparison. A target stamp alone never means every file converged.

Full vendor blobs are not duplicated into each project. The planner needs hashes to classify changes, and current/target bytes to show a diff. Automatic three-way text merging is not required for safe updates. Unresolved changes remain conflicts. This keeps the tracked footprint small.

Use normalized LF hashes for managed UTF-8 text and raw byte hashes for transaction preconditions. Preserve the existing newline convention for prose replacements. Executable scripts use their declared format. The generator currently emits native line endings, so byte-only shared baselines would drift across platforms. (anchor: 100)

Keep local `autoOpen`, update policy, dismissed release, and check timestamps in local settings. Preserve unknown legacy fields in a namespaced legacy payload during migration. Unknown future manifest schema versions stop mutation with a diagnostic.

### C. Conservative legacy adoption

Detect named Joycraft skills across all five harness roots. Prefer an explicit manifest selection. Without it, infer only roots containing Joycraft artifacts. A fresh noninteractive `update` requires `--harnesses`; legacy `init` keeps its documented all-harness default with a notice.

For bridge releases, ship a compact catalogue of path/hash pairs generated from verified historical release artifacts. It contains vendor hashes, not user files. Match current bytes against trusted target or historical catalogue entries. Never promote a legacy stored hash to verified ownership by itself.

An unmatched existing file becomes an unknown-ownership conflict. Missing historical coverage degrades to preservation, not data replacement. No runtime download or execution of old package versions is required to classify an unknown file.

Stage new state before removing old state. Back up the old state and replace the known legacy checker registration in the same transaction. Corrupt state remains available for diagnosis. Shared/private profile changes move manifest authority explicitly and never untrack files in Git automatically.

### D. Comparison and application rules

For a verified entry, B is its recorded vendor base, C is current content, and T is target content. Test equality using normalized hashes.

| Condition | Result |
|-----------|--------|
| C equals T | No content write. Reconcile vendor version and state. |
| C equals B and T differs | Safe replacement. Advance the base to T. |
| C differs from B and T equals B | Preserve a local-only edit without repeated prompts. |
| C and T both differ from B | Preserve C and show a current-to-target diff as a conflict. |
| C absent, verified base present | Preserve a local deletion. Restore only through explicit repair selection. |
| C absent, no previous entry | Create a new selected inventory file. |
| C present, no verified base | Adopt only an exact trusted vendor match. Otherwise preserve and report a conflict. |
| T absent, verified C equals B | Delete the owned file only. Keep unknown sibling files and nonempty directories. |
| T absent, C customized or unknown | Preserve as an orphaned customization. |

The inventory distinguishes vendor files from create-once user documents and owned config patches. Keep existing CLAUDE.md/AGENTS.md generation for first creation. Routine update does not rewrite existing policy prose or force docs migration.

Owned JSON patches preserve unrelated keys. A conflicting registration stays a conflict. Existing append-only helper behavior supplies defaults, but planning must calculate the patch before writing. No in-place mutation escapes the transaction.

`--yes` and `--non-interactive` accept the safe plan only. Explicit `--replace-customized <path>` selects replacements. Legacy `init --force` remains an explicit replacement request scoped to its existing install inventory. It never broadens into recursive cleanup.

Flags are accepted consistently by aliases and documented in the next minor release. Do not retain destructive `upgrade --yes` semantics for compatibility. Exit 0 means applied/no-op with no pending conflict, 1 means failed or invalid input, 2 means unresolved conflicts, 3 means recovery or a lock needs attention. JSON includes preserved customizations separately from pending vendor updates.

### E. Recoverable writes

Acquire a project lock atomically and record an operation ID, process identity, and manifest digest. A lock conflict does not remove the other process's lock automatically. Validate every planned path and reject symlink traversal outside the target.

Journal the complete plan and preimages before writes. Stage replacement bytes on the destination filesystem. Recheck raw file hashes before replacement to detect intervening user edits. Rename staged files into place, then validate resulting bytes and modes. Publish the new manifest last.

A journal records before/after digests and the manifest commit marker. On restart, an unchanged old manifest means rollback incomplete writes. A matching new manifest means verify the committed state and finish cleanup. A crash between manifest rename and journal bookkeeping is resolved by the manifest digest, not the bookkeeping flag alone.

Recovery never overwrites an intervening user edit. If a path matches neither the recorded preimage nor postimage, stop and expose the backup and conflict. Automatic cleanup is limited to known transaction residue. A retained last-successful backup supports explicit rollback with the same precondition checks.

The contract covers interrupted processes and filesystem-operation failures. It does not promise recovery from disk corruption. Multi-file visibility is not atomic, so skill updates occur at a workflow boundary and verify before continuation.

### F. Cheap discovery and safe automation

Build `check.mjs` from the shared checker module. It has no external runtime dependencies. It derives the project root from its installed location. A skill runs `node docs/.joycraft/check.mjs check --json` from the project root. Missing or failed execution continues the requested skill without a repeated bootstrap loop.

The generated common entry instruction is at most a short paragraph plus its command. It lives in the canonical generation path, appears once per rendered skill, and does not change frontmatter. Existing position-sensitive tests must verify semantic sections rather than silently losing coverage after insertion.

The checker consults local state first. Refresh successful metadata after 24 hours, with a three-second deadline. Use a short local refresh lock and back off after failure. Results distinguish available, current, postponed, pending-conflicts, and unknown. Stable numeric versions are compared numerically; prerelease targets are never automatically selected.

Suppress duplicate offers by release and session. A successful display is acknowledged separately from a user's explicit postponement. A later session can offer an unacknowledged release again. Postponement suppresses that release until a newer release or an explicit check. Local update mode is `notify`, `auto-safe`, or `off`, with `notify` the default.

The checker only reports. The agent handles authorization and invokes the updater through an exact-version argument list. `auto-safe` is local standing authorization, never inherited merely by cloning a shared manifest. It requires verified release metadata, a supported manifest protocol, and a plan with no conflicts, repairs, user-config changes, or explicit migrations.

The package carries an automation compatibility descriptor tested before promotion. Do not infer compatibility from a patch increment. Downgrades and the legacy-to-new-manifest bridge require an explicit user-run update. Offline skill usage remains available.

All five harnesses use the common entry instruction. Claude's existing SessionStart registration calls the same checker. Other native hooks are optional only after their capabilities are verified. No unverified hook API is required by this design. Updating a loaded skill requires reinvocation or a session restart where reload is unavailable.

### G. Release state machine

Automatically maintain one release PR after product changes on main. Update it from the latest main SHA under a separate preparation lock. The PR contains an explicit version and compatibility descriptor. Docs-only changes alone do not create a package release. Human review/merge remains the existing release authorization boundary.

After that PR merges, the publishing job checks out the exact release commit and validates its version. Retain the existing `publish.yml` identity for OIDC. The workflow never pushes a version bump to main. Use a non-canceling publish concurrency group and reject promotion of an older version over a newer latest.

Build and pack once. Retain the tarball and SHA-512 digest as durable run artifacts. Validate fresh installs and prior-version updates from that tarball. Publish that file under `candidate`, without invoking directory packaging or build hooks again. Registry publication accepts a tarball and versions cannot be reused. (anchor: 100)

Query exact-version metadata and compare tarball integrity. Validate registry installation with npm 10.9.8 on Node 22.23.1 and the maintained Node 24 line. Prime both full and compact metadata caches before the candidate exists, then exercise fresh and warmed clients after publication. Include --prefer-online and a bounded isolated-cache recovery path.

Wait at least the observed five-minute metadata freshness interval before recommending the release, and require successful readiness checks. Deadline expiry leaves the candidate unpublished as latest. Time alone is not a readiness assertion. After successful promotion, verify latest from a fresh client, then create the GitHub release and tag if absent.

On retry: recover the saved tarball, match an existing package's integrity, rerun readiness checks, and skip already-completed promotion. If provenance or integrity differs, stop. Do not rebuild a different artifact and publish the same version. Keep candidate metadata immutable enough to select by exact version, not by a mutable candidate tag.

Use Node 24.20.0, npm 11.19.0, and pnpm 10.19.0 for release preparation/publication. Keep npm 10 in consumer tests, not the OIDC publisher. npm requires at least npm 11.5.1 and Node 22.14.0 for OIDC. Node 22 and 24 are currently LTS. (anchor: 100)

Declare Node >=22 for consumers, test the minimum supported APIs, and run supported-platform checks on Linux, macOS, and Windows. A runtime matrix failure blocks promotion. D4 selects a package-scoped npm credential for automatic latest promotion.

## 3. Patterns to Follow

Reuse `HARNESSES` and `sanitizeHarnesses` from `src/harness.ts:15` for names and validation. Do not add a second harness list. Persist portable paths independently of OS-native filesystem paths.

Preserve the unknown-field behavior of `writeVersion`, `src/version.ts:136`, while making schema errors explicit. Keep settings resolution in one function, following `resolveGitignoreProfile`, `src/gitignore.ts:148`.

Keep pure transforms like `applyTemplate` in `scripts/lib/skill-template.mjs:64`. Generation remains canonical source → harness variants → bundle → installed trees. The checker is a compiled asset in the same inventory, not five copied implementations.

Use the existing package bundler and Node APIs. Keep npm invocation in one process adapter with validated argument arrays and a Windows test. Avoid constructing shell strings from paths or release metadata.

Test exported production functions against real filesystem snapshots. Extend the existing decline test with a second and third run. Add failure injection at journal phases. Do not mock away the state write responsible for the original regression.

## 4. Resolved Design Decisions

These engineering choices were approved on 2026-09-06 (D5). D4 is resolved below by the user.

> **Decision R1:** Track a small manifest, not duplicate vendor file bodies.
> **Rationale:** Hashes classify ownership and divergence. Current/target bytes support review without automatic merging.
> **Alternative rejected:** A second tracked copy of every skill and template, which expands the project footprint.

> **Decision R2:** Preserve conflicts instead of automatically merging customized skills.
> **Rationale:** The approved contract prioritizes explicit preservation and understandable updates.
> **Alternative rejected:** A new merge engine and additional conflict semantics in the initial repair.

> **Decision R3:** Safe --yes behavior is a documented next-minor change.
> **Rationale:** Retaining a destructive automation flag defeats the requested safe agent update flow.
> **Alternative rejected:** Different overwrite semantics for update and upgrade aliases.

> **Decision R4:** Use one portable skill entry instruction, plus the existing Claude hook adapter.
> **Rationale:** Current source verifies that hook path. No other hook API is required for coverage.
> **Alternative rejected:** Blocking this feature on five native session-hook integrations.

> **Decision R5:** Keep release PR creation automatic and promotion gated on artifact checks.
> **Rationale:** This removes bump-push races while keeping the maintainer's reviewed release boundary.
> **Alternative rejected:** Auto-patching the version during every main-push publishing job.

> **Decision D4:** Automatic promotion using a granular npm write credential scoped to Joycraft; keep OIDC for publication.
> **Rationale:** The user considers maintainer credential renewal a non-issue and accepts it for automatic promotion.
> **Alternative rejected:** Manual promotion on each release.
> **Operations:** A Joycraft maintainer creates and renews the token and updates the GitHub Actions secret. Validate scope, expiry, and 2FA before activation. No credential was read or provisioned.

### Build sequence and brief reconciliation

Keep the approved 15-row order and dependency graph. The design supplies contracts to those rows rather than changing scope or counts. Decomposition can split a large row only through its stated review process.

Rows 1–2 establish regressions and status. Rows 3–8 build the state, planner, transaction, and command. Rows 9–11 connect discovery and policy. Row 12 can run independently after design approval. Rows 13–15 verify registry delivery and dogfood the integrated result.

Brief updates: recorded approval as D3, added this design link and D4's dossier link, and updated the handoff. D4 now records automatic promotion and its maintainer-owned credential requirement. Vision, success criteria, and the 15 proposed rows are unchanged.

## 5. Open Questions

None. D4 is clarified and the design is approved (D5).
