# Releasing Joycraft

> [Back to README](../../README.md)

This is the maintainer runbook for the release machinery in
`.github/workflows/release-prepare.yml`, `.github/workflows/publish.yml`,
`scripts/release-preparation.mjs`, `scripts/release-verification.mjs`,
`scripts/release-validation.mjs`, and `scripts/release-promotion.mjs`.

## Release boundary

Product changes go through the reviewed release PR prepared by
`release-prepare.yml`. A docs-only change does not cut a package version. The
publish workflow checks out the exact immutable release merge commit and
retains one packed `.tgz` artifact. It publishes that exact tarball to npm's
`candidate` tag. `latest` is changed only after the candidate is verified for
real consumers; the GitHub release is created after that verified promotion.

The release workflow does not push a version bump to `main`. Its checkout,
package version, retained artifact manifest, and required reports must agree
on the full 40-character release SHA. The packaged descriptor declares the
release version and compatibility protocol; the artifact manifest binds its
bytes to that commit through the tarball integrity. Candidate publication and latest
promotion are separate steps.

## Verification gates

The checked-in `.github/release-required-checks.json` is the authority for the
required compatibility report: 196 checks (7 runtime lanes × 4 stacks × 7
harness selections). The lanes cover Node 22.23.1, Node 24.20.0, and the
Node 22.0.0 minimum-runtime smoke lane across the supported operating systems;
the stacks are Node.js, Python, Rust, and Go; the harness selections cover
Claude, Codex, Pi, Copilot, omp, Claude+Codex, and all.

The consumer readiness job uses Node 22.23.1 with npm 10.9.8 and Node 24.20.0
with npm 11.19.0. Each lane checks a cold cache, a warmed full metadata cache,
and a warmed compact metadata cache. The readiness poll waits at least five
minutes (`300000` ms) after candidate publication and has a bounded deadline.
Time alone is not readiness: exact version, SHA-512 SRI, descriptor identity,
and a fresh client installation must all pass.

The release artifact is packed once and tested from that retained tarball.
`release-verification.mjs` checks fresh initialization and an existing-project
update. `release-validation.mjs aggregate` requires every configured check
exactly once; a partial report cannot authorize promotion.

## Promotion credential

Candidate publication keeps npm trusted publishing through GitHub Actions OIDC.
Promotion of the already verified candidate to `latest` uses the separate,
granular package-scoped write credential approved in the release decision:

```text
JOYCRAFT_NPM_PROMOTION_TOKEN
JOYCRAFT_NPM_PROMOTION_TOKEN_EXPIRES_AT
```

A Joycraft maintainer owns this credential, creates and renews it before its
expiry, and updates the two GitHub Actions secrets. It is scoped to package
write for Joycraft's promotion operation. End users do not create, receive,
or configure it. Never print, commit, or copy the token value into reports
or persistent files. The promotion helper uses a temporary, permission-restricted
npm configuration and removes it when the tag operation finishes.

Check only the credential metadata when needed:

```bash
node scripts/release-promotion.mjs credential-check
```

This prints validity, the credential name, and expiry metadata without the
secret value. If the helper reports `JOYCRAFT_NPM_PROMOTION_TOKEN is expired;
candidate promotion is blocked`, renew the maintainer-owned credential and its
expiry secret, then rerun the complete promotion workflow. Do not bypass the
credential with OIDC or a personal token.

## Retry and failure recovery

Every retry uses the same `release_sha`, package version, and retained `.tgz`.
The workflow preserves the release artifact, its manifest, candidate SRI, and
the cache evidence. Start a retry with `workflow_dispatch`, supplying the
original release SHA and version plus the retained artifact run/name. A retry
must rerun the complete workflow: its reports are keyed by `github.run_attempt`,
so all compatibility lanes and the independently configured required report
must be present for that attempt.

If candidate publication failed after npm accepted the package, compare the
existing exact-version registry SRI with the retained manifest. Reuse a
matching candidate and continue verification. If the SRI, descriptor, version,
or release SHA differs, stop and investigate. Never rebuild or republish a
different tarball for the same immutable version.

A failure before the tag mutation leaves `latest` unchanged. A failure after
the mutation can leave the candidate on `latest` without a GitHub release.
Inspect the exact tag and integrity, then rerun readiness against the retained candidate, including the cold, warmed-full, and
warmed-compact clients and the five-minute freshness floor. A failed latest
mutation is retried only after the same evidence is valid again. The promotion
helper skips an already completed promotion but still reruns readiness. A
GitHub release is created or recovered only after fresh latest verification.

The helper fails closed for missing or expired credentials, incomplete reports,
wrong SRI, stale readiness, a newer existing `latest`, and mismatched artifact
provenance. Those failures are recovery instructions, not permission to
publish another artifact.

## Release PR workflow behavior

The release preparation job can create or update its PR with `GITHUB_TOKEN`.
GitHub can create approval-required workflow runs for those PR events; a
maintainer can need to approve the resulting checks before the reviewed release
PR can merge. See GitHub's [workflow run approval guidance](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
