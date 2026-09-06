---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
mode: isolated
---

# Serialize Immutable Releases — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Spec:** 12 of 15
> **Dependencies:** None
> **Status:** Ready
> **Date:** 2026-09-06
> **Estimated scope:** 1 session / 4–6 files / ~350 lines

---

## What

Replace the main-push publication path with a release-preparation path that creates one reviewed release PR under a preparation lock, packages the reviewed merge commit exactly once, and retains its tarball and SHA-512 digest for retry-safe candidate publication.

## Why

The current workflow can race while pushing an automatic version bump to `main`, then publish a rebuilt directory directly to `latest` without a durable artifact to verify or retry.

## External API Contract

**Services:** GitHub Actions and npm registry

**Canonical sources:**

- [GitHub Actions workflow concurrency](https://docs.github.com/actions/how-tos/write-workflows/choose-what-workflows-do/control-workflow-concurrency)
- [GitHub Actions artifact upload](https://github.com/actions/upload-artifact)
- [npm package publishing with trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm pack CLI](https://docs.npmjs.com/cli/v11/commands/npm-pack)
- [npm dist-tag CLI](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag)

**Verified API facts:**

- `concurrency` can serialize workflow runs; cancellation must remain disabled for publication so a started candidate retains its verification evidence.
- `npm pack` produces the package tarball that `npm publish <tarball>` can publish; the package must be built and packed once before candidate publication.
- npm trusted publishing uses OIDC for publication; the separately approved Joycraft-scoped credential is reserved for later dist-tag promotion in spec 13. [src: design §2]

## Acceptance Criteria

- [ ] Product changes maintain one release PR under a preparation lock; docs-only changes do not create releases and publication never pushes a version bump to main. [src: design §2]
- [ ] Publishing selects the immutable release merge SHA, retains the `publish.yml` OIDC identity, and uses non-canceling publication concurrency. [src: design §2]
- [ ] Build/pack once and retain the tarball plus SHA-512 digest as durable artifacts; retry reuses the artifact and rejects integrity/provenance mismatch rather than rebuilding a different package at the same version. [src: design §2]
- [ ] Pin the approved release toolchain (Node 24.20.0, npm 11.19.0, pnpm 10.19.0); registry lookup errors fail instead of implying version 0.0.0. [src: design §2]
- [ ] Candidate publication accepts the tested tarball; latest promotion remains disabled until spec 13 readiness and authentication gates are integrated. [src: design §2]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Product release PR and lock | Call the release-preparation decision function with product and docs-only changed-file sets; assert one PR plan only for product changes, no publication push to `main`, and a serialized lock key for the release branch. | unit |
| Immutable SHA, `publish.yml` OIDC, and concurrency | Parse the production `.github/workflows/publish.yml`; assert checkout uses the release SHA input, its OIDC identity remains, and publication concurrency has `cancel-in-progress: false`. | workflow contract |
| Pack once and retry identity | Run the production pack helper in a temporary fixture package, then call the retry resolver with matching and mismatching retained-artifact manifests; assert one tarball/digest is retained and only the matching integrity/provenance tuple can continue. | integration + unit |
| Pinned toolchain and registry error | Call the release-version resolver with a registry-process failure fixture; assert it returns a failure, while the workflow contract asserts the three approved tool versions. | unit + workflow contract |
| Candidate-only publication | Call the npm process adapter with the tested tarball fixture; assert an argument-array invocation publishes that file to `candidate` and no `dist-tag add ... latest` command appears. | unit |
| Descriptor/version consistency supporting immutable artifact identity | Prepare a release fixture with package version and descriptor together, pack it, and assert the descriptor matches the reviewed version and cannot be changed during candidate publication or retry. | integration |

**Execution order:**

1. Add the tests above against the current workflow/helpers; the new regression tests must fail before implementation while the pre-existing suite remains green.
2. Run the focused release-preparation tests to confirm their red state.
3. Implement the workflow and helpers until the focused tests and existing suite are green.

**Smoke test:** Run the production pack helper against a minimal temporary package and verify its returned tarball digest.

**Before implementing, verify your test harness:**

1. Run the new focused tests and confirm they fail for the missing behavior; run the existing suite separately and confirm it remains green.
2. Ensure each test calls the production helper or parses the production workflow, not a reimplementation of its expected behavior.
3. Keep the temporary-package smoke test under seconds.

## Constraints

- MUST: Keep release preparation, immutable publication, and latest promotion as separate stages; this spec stops before any latest promotion. [src: design §2]
- MUST: Use existing dependencies and Node facilities; do not add a runtime dependency without separate approval. [src: design §2]
- MUST: Retain OIDC for npm publication and use the approved toolchain versions for release preparation/publication. [src: design §2]
- MUST: Use project-relative paths in shipped workflow and helper content. [src: brief "Hard Constraints"]
- MUST: Use meaningful production-function tests and keep new regression tests red before implementation while the existing suite stays green. [src: brief "Test Strategy"]
- MUST NOT: Publish to npm, promote npm tags, merge a PR, or perform destructive Git operations while implementing or validating this spec. [src: brief "Hard Constraints"]
- MUST NOT: Treat an unavailable registry as version `0.0.0` or rebuild an artifact after a retry identity mismatch. [src: design §2]
- MUST NOT: change unrelated templates, skills, or CLAUDE.md merge/improve logic. [src: brief "Out of Scope"]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `.github/workflows/publish.yml` | Replace main-bump publishing with immutable candidate publication inputs and retained artifacts. |
| Add | `.github/workflows/release-prepare.yml` | Create or refresh the serialized reviewed release PR. |
| Add | `scripts/release-preparation.mjs` | Resolve version, pack once, calculate digest, and validate retained artifact identity. |
| Add | `tests/release-preparation.test.ts` | Exercise release preparation and retry behavior using deterministic fixtures. |
| Modify | `package.json` | Declare only any release script required to invoke the helper. |

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

Make release preparation a separate workflow that derives its release commit and explicit version before publication. The publish workflow receives that immutable identity, builds and packs once, uploads the tarball plus digest/provenance, and publishes precisely that file to `candidate`. On a retry, resolve the retained artifact first and compare its identity before any npm command.

Reject the current alternative of bumping `package.json` and pushing it back to `main` inside the publish job: it races concurrent main pushes and makes the published bytes harder to tie to the reviewed release commit.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Docs-only merge | No release PR or package publication plan is created. |
| Two release-preparation triggers | The preparation lock serializes them and the later run refreshes from the latest `main` SHA. |
| Existing candidate retry | Reuse the retained exact-version tarball after identity validation. |
| Missing or altered artifact | Stop before publish with a provenance/integrity diagnostic. |
| Existing package version | Reuse the verified matching candidate without republishing; stop if integrity/provenance differs. |
