---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: isolated
---

# Preserve Installation Manifest — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 3 of 15
> **Dependencies:** 2 — reconcile-update-status.md
> **Status:** Ready
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 6 files / ~300 lines

---

## What

Introduce a validated schema-1 installation manifest that separates portable shared installation facts from local preferences, preserves unknown legacy data, and adopts pre-manifest installations only from verified vendor evidence.

Schema 1 persists `targetVersion`, `bundleIntegrity`, `harnesses`, `profile`, and `files`. Each `files` entry persists `vendorVersion`, `vendorHash`, `kind`, and `ownership: verified | unknown`; an owned configuration patch also identifies its owned key or marked region. Persisted paths use forward slashes and reject absolute paths and traversal.

| Path | Shared profile | Private profile |
|---|---|---|
| `docs/.joycraft/manifest.json` | Tracked installation manifest | Not created |
| `docs/.joycraft/local/manifest.json` | Not authoritative | Ignored installation manifest |
| `docs/.joycraft/check.mjs` | Tracked managed checker | Ignored managed checker |
| `docs/.joycraft/local/` | Ignored cache, preferences, lock, journal, backups | Same local scope |
| `docs/.joycraft/state.json` | Legacy input only | Legacy input only |

## Why

`version.ts` currently combines machine-local settings, selected harnesses, and ambiguous file hashes in ignored `state.json`, so clones lose identity and old customized hashes can be mistaken for trusted ownership.

## Acceptance Criteria

- [ ] Schema 1 records target version, bundle integrity, selected harnesses/profile, and per-file vendor identity/ownership using portable validated paths. [src: design §2]
- [ ] Shared manifests survive clones; private manifests and all local settings remain local; effective ignore rules hiding a shared manifest are reported. [src: design §2]
- [ ] Missing state infers only roots with Joycraft artifacts across all five harnesses; trusted historical/target vendor matches establish ownership, but legacy stored hashes alone do not. [src: design §2]
- [ ] Unknown file content remains unverified; corrupt state is preserved, unknown future schemas stop mutation, and unknown legacy settings survive in a namespaced payload. [src: design §2]
- [ ] Normalized LF vendor hashes classify text across platforms; raw byte hashes remain distinct transaction preconditions. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Schema and portable paths | Create `tests/install-manifest.test.ts` cases that call exported manifest parse/write/validate functions with valid schema-1 data and reject absolute, traversal, and non-forward-slash persisted paths. | unit |
| Shared/private persistence and ignored shared manifest | Use real temporary git projects in `tests/gitignore-profiles.test.ts` to run profile setup and manifest resolution; assert a clone sees the shared manifest, private/local data is ignored, and a broad effective ignore yields a diagnostic. | integration |
| Conservative five-harness adoption | Test the exported adoption function with fixtures for Claude, Codex, Pi, Copilot, and omp roots, a verified historical/target catalogue match, and a legacy hash-only match; assert only artifact-bearing roots and trusted bytes become verified. | unit |
| Corrupt/future/unknown data preservation | Add filesystem tests for malformed state, future schema, and extra legacy keys; assert corrupt bytes remain available, future schema prevents mutation, and unknown legacy settings move into the namespaced legacy payload. | integration |
| LF/vendor versus raw precondition hashes | Test exported normalized vendor hashing with CRLF/LF-equivalent text and raw hashing with distinct byte sequences; assert their intended equality/inequality. | unit |

**Execution order:**
1. Write all tests above and confirm each fails before the manifest implementation exists.
2. Run `tests/install-manifest.test.ts` and the focused profile tests red.
3. Implement parser, validator, migration/adoption, and profile integration until focused tests pass.

**Smoke test:** schema-1 round-trip plus LF/CRLF vendor-hash classification.

**Before implementing, verify your test harness:**
1. Run all new focused tests — they must fail before production code is added.
2. Call exported manifest/adoption functions and real filesystem profile paths, never test a duplicate parser.
3. Keep the smoke test runnable in seconds.

## Constraints

- MUST: Preserve user files, selections, unrelated config, and unknown state fields; missing state and `--yes` never grant blanket overwrite permission. [src: brief "Hard Constraints"]
- MUST: Use these exact profile locations: shared authority is `docs/.joycraft/manifest.json`; private authority is `docs/.joycraft/local/manifest.json`; `docs/.joycraft/check.mjs` is tracked for shared and ignored for private; `docs/.joycraft/local/` holds ignored cache, preferences, lock, journal, and backups; `docs/.joycraft/state.json` is legacy input only. [src: design §2]
- MUST: Schema 1 records `targetVersion`, `bundleIntegrity`, `harnesses`, `profile`, and `files`; every file records `vendorVersion`, `vendorHash`, `kind`, and `ownership: verified | unknown`, and config patches identify their owned key or marked region. [src: design §2]
- MUST: Validate portable forward-slash paths and reject absolute paths and traversal. [src: design §2]
- MUST: Treat legacy hashes alone as insufficient ownership evidence; preserve unmatched and unknown content. [src: design §2]
- MUST: Preserve corrupt state for diagnosis and stop mutation on an unknown future schema. [src: design §2]
- MUST: Use normalized LF vendor hashes for managed UTF-8 text and raw hashes for transaction preconditions. [src: design §2]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Use meaningful production-function tests and run the required build/test/type checks; never defer a red suite to a final sync step. [src: brief "Test Strategy"]
- MUST NOT: Change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]
- MUST NOT: Inspect the external holdout repository or change its dispatch behavior. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `src/install-manifest.ts` | Schema-1 types, validation, persistence, conservative adoption, and hashing helpers. |
| Modify | `src/version.ts` | Read legacy state as migration input while preserving compatible local settings behavior. |
| Modify | `src/gitignore.ts` | Add manifest/local-path profile rules and report effective ignore conflicts without rewriting user rules. |
| Create | `src/historical-vendor-catalogue.ts` | Compact verified historical path/hash evidence used for legacy adoption. |
| Create | `tests/install-manifest.test.ts` | Unit and filesystem coverage for schema, adoption, and hash rules. |
| Modify | `tests/gitignore-profiles.test.ts` | Shared/private clone and ignore-conflict coverage. |

## Approach

Build a strict, exported manifest module around schema 1 and the exact profile locations above. Store vendor identity separately from disk bytes; retain unknown legacy settings as a namespaced migration payload and treat unknown future manifests as read-only. Resolve profile locations centrally with the existing gitignore profile rules. Generate a compact vendor hash catalogue from verified release artifacts without storing user content. Rejected alternative: extending `state.json` with more ambiguous current-content hashes, because it cannot preserve portable ownership facts safely.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Clone of shared installation | Tracked manifest restores target, harnesses, and verified vendor identities. |
| Private installation | Manifest and local settings remain ignored and are not treated as clone authority. |
| Generic legacy directory with no Joycraft artifact | Do not infer a harness or ownership. |
| File matches neither target nor historical vendor content | Preserve it as unknown-ownership conflict evidence. |
| Manifest uses a newer schema | Leave bytes intact, emit a diagnostic, and refuse mutation. |
