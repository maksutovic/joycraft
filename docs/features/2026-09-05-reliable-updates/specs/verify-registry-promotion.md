---
status: done
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: isolated
---

# Verify Registry Promotion — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 13 of 15
> **Dependencies:** 7 — unify-update-command.md, 12 — serialize-immutable-releases.md
> **Status:** Done
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 3–5 files / ~350 lines

---

## What

Extend candidate publication with registry readiness checks that install and update from the retained artifact, verify exact registry integrity through cold and warmed clients, and promote only the verified version to `latest` using the approved scoped credential.

## Why

A successful source build does not prove that npm clients can install the published package, and promoting before that proof makes a broken release the recommended version.

## External API Contract

**Services:** npm registry, npm CLI, GitHub Actions, and GitHub Releases

**Canonical sources:**

- [npm dist-tag CLI](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag)
- [npm cache CLI](https://docs.npmjs.com/cli/v11/commands/npm-cache)
- [npm exec CLI](https://docs.npmjs.com/cli/v11/commands/npm-exec)
- [npm package metadata API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md)
- [GitHub CLI `release create`](https://cli.github.com/manual/gh_release_create)

**Verified API facts:**

- `npm dist-tag add <package>@<version> latest` changes a mutable tag, so the helper must compare versions and refuse a downgrade before it invokes the command.
- npm client cache behavior can differ between full and compact metadata responses; readiness must include cold and warmed isolated-cache clients rather than treating elapsed time as proof. [src: design §2]
- The candidate’s exact-version metadata exposes tarball integrity for comparison with the retained SHA-512 identity. [src: design §2]

## Acceptance Criteria

- [x] Test fresh installs and previous-version updates from the retained tarball before publication; verify exact registry-version integrity after candidate publication. [src: design §2]
- [x] Warm full and compact metadata caches before candidate publication and test both warmed and cold clients with npm 10.9.8/Node 22.23.1 and the maintained Node 24 line. [src: design §2]
- [x] Wait at least the observed five-minute freshness interval and require actual readiness success; bounded deadline failure leaves latest unchanged. [src: design §2]
- [x] Promote automatically using the Joycraft-scoped credential only after readiness; missing/expired credentials fail clearly and do not bypass verification. [src: D4]
- [x] Retries rerun readiness, skip completed steps, and never downgrade latest; verify latest from a fresh client before creating the GitHub tag/release. [src: design §2]
- [x] Exercise `--prefer-online` and bounded isolated-cache recovery; deterministic local fixtures test failures without publishing during development. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Retained artifact install and integrity | Run the production consumer-verification helper against a temporary project and retained tarball; assert fresh init and prior-version update succeed, then feed exact-version metadata fixtures and assert integrity equality is required. | integration + unit |
| Warm/cold client matrix | Call the production readiness planner with full/compact cache fixtures and Node 22/npm 10 plus Node 24 entries; assert both cache states and both runtime lanes are scheduled. | unit |
| Freshness deadline | Drive the readiness poller with a controllable clock and unsuccessful responses; assert no promotion command is emitted before five minutes and none is emitted after deadline failure. | unit |
| Credential gate | Call the promotion function with missing, expired, and valid scoped-credential process environments; assert only verified readiness plus a valid credential constructs the `npm dist-tag` argument array. | unit |
| Idempotent retry and final verification | Feed completed-step state, newer-latest metadata, and fresh-client success/failure fixtures to the production recovery function; assert it reruns readiness, skips finished work, blocks downgrade, and gates GitHub release creation. | unit |
| Prefer-online recovery | Run the npm process adapter with fixture responses for a stale cache and recovery deadline; assert `--prefer-online`, isolated cache paths, bounded retries, and zero live registry calls in local tests. | integration |
| Required matrix and descriptor supporting readiness/promotion | Exercise the production promotion decision with complete, failed, missing, stale-SHA, wrong-integrity, and incomplete validation reports; only the exact-artifact complete report plus registry readiness can produce promotion. Verify the descriptor from the same packed/registry bytes. | unit + integration |

**Execution order:**

1. Add the new deterministic readiness and promotion tests; they must be red against the candidate-only behavior from spec 12 while the existing suite remains green.
2. Run the focused tests to confirm their red state.
3. Implement readiness and promotion until focused tests, release workflow contracts, and the existing suite are green.

**Smoke test:** Execute the consumer-verification helper against a retained local tarball in a temporary project with an isolated npm cache.

**Before implementing, verify your test harness:**

1. Confirm the new focused tests fail because readiness/promotion is absent, then confirm existing tests stay green.
2. Ensure each test invokes the release helpers and npm process adapter that production uses.
3. Keep the retained-tarball smoke test local and bounded to seconds.

## Constraints

- MUST: Promote only the exact candidate version whose retained tarball, digest, and registry integrity have all been verified. [src: design §2]
- MUST: Retain OIDC for publication and use the Joycraft-scoped granular npm write credential only for automatic `latest` promotion. [src: D4]
- MUST: Keep local tests deterministic and non-publishing; use actual npm registry installation checks only in the authorized release workflow. [src: brief "Test Strategy"]
- MUST: Use argument arrays for npm/GitHub commands and preserve paths with spaces and Windows behavior where the adapter is shared with update work. [src: design §2]
- MUST: Use meaningful production-function tests and keep new regression tests red before implementation while the existing suite stays green. [src: brief "Test Strategy"]
- MUST NOT: promote `latest`, create a GitHub tag/release, or bypass verification when a credential is missing, expired, or unreadable during implementation or local validation. [src: D4]
- MUST NOT: use elapsed time alone as readiness or downgrade `latest` during retry. [src: design §2]
- MUST NOT: add runtime dependencies or alter unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `.github/workflows/publish.yml` | Add candidate readiness, protected promotion, and post-promotion release gates. |
| Add | `scripts/release-verification.mjs` | Verify tarball installs, metadata integrity, cache readiness, and retry state. |
| Add | `scripts/release-promotion.mjs` | Compare versions and issue guarded npm/GitHub command arrays. |
| Add | `tests/release-verification.test.ts` | Test production readiness and cache-recovery behavior with fixtures. |
| Add | `tests/release-promotion.test.ts` | Test credential, idempotency, downgrade, and GitHub-release gates. |

## Approach

### Required-validation handoff

The promotion adapter consumes a required-validation report for the exact candidate. The report identifies the immutable release commit SHA, package version, tarball SHA-512 integrity, and outcomes for every required runtime/platform/stack/harness check configured by the release workflow. Readiness includes this report as well as the registry-cache checks; a missing, failed, incomplete, or mismatched report leaves latest unchanged. Do not accept a green branch-level check from another commit or rebuilt artifact.

Spec 13 implements this fail-closed consumer and tests it with deterministic complete/incomplete reports. Spec 14 supplies and wires the real required compatibility matrix to it. This keeps the approved dependency order without authorizing promotion during the intermediate state. Reused successful checks on retry must bind to the same immutable commit/artifact and complete required check set; registry readiness is still rerun. No missing matrix producer is treated as a successful check.

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

Use exact-version metadata as the bridge between the retained artifact and the registry. Verify local tarball consumers before publication, then poll deterministic readiness checks after candidate publication across cold and pre-warmed metadata paths. Persist completed steps so a retry can rerun readiness without repeating verified irreversible work. Only a successful readiness result unlocks a version-ordered `dist-tag` call, followed by a fresh-client latest check and GitHub release creation.

Reject a timer-only promotion job: the incident showed client metadata freshness is variable, so delay alone cannot demonstrate installability or integrity.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Registry shows candidate but integrity differs | Stop; retain candidate evidence and leave `latest` unchanged. |
| Full cache updates but compact cache is stale | Continue bounded readiness polling; do not promote until both required clients pass. |
| Readiness deadline expires | Fail clearly with `latest` unchanged. |
| Scoped credential is absent or expired | Fail after reporting the credential gate; never fall back to OIDC for promotion. |
| Retry finds newer `latest` | Refuse downgrade and skip tag/release creation. |
| GitHub tag already exists after verified promotion | Treat the tag/release step as idempotent after fresh latest verification. |

## Implementation Evidence

- Retained artifact consumers execute fresh init and prior-version init followed by candidate update; actual CLI failure blocks verification.
- Local HTTP registry tests exercise real npm full and compact metadata requests across prepublication warm caches, exact candidate installs, and fresh latest installation identity checks. Node 22.23.1/npm 10.9.8 and Node 24.20.0/npm 11.19.0 are separate workflow lanes with retained prepublication caches.
- Readiness enforces the five-minute floor and bounded deadlines. Promotion validates exact artifact/report/descriptor identity, rereads latest, preserves scoped credential isolation, and gates GitHub tags/releases on verified consumer results. Retry uses retained artifacts and original caches.
- Required compatibility evidence is fail-closed; spec 14 supplies its producer and workflow wiring. No publication, tag, promotion, or credential provisioning ran during implementation.
- Exact staged checkout: build passed, 3,213 tests passed (one skipped), and type checking passed. Workflow YAML/dependency/credential boundary checks passed.
