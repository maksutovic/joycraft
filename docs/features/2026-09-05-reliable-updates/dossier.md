---
status: active
owner: Maximilian Maksutovic
created: 2026-09-05
feature: 2026-09-05-reliable-updates
---

# Release Promotion — Decision Dossier

> **Decision:** D4, clarified — Option A
> **Brief:** `docs/features/2026-09-05-reliable-updates/brief.md`
> **Design:** `docs/features/2026-09-05-reliable-updates/design.md`

## Context

The brief is approved. Releases will publish under a candidate tag, pass actual installation checks, then become latest. Existing npm OIDC publishing does not establish authentication for that separate promotion command.

## D4: Automatic or Manual Promotion

| Option | Benefit | Cost |
|--------|---------|------|
| A — Automatic, recommended | Verified releases reach users without a separate manual step. | Requires a package-scoped npm write credential in the release environment, expiry handling, and the required 2FA policy. |
| B — Manual | Keeps the CI publisher OIDC-only. | A maintainer authenticates and promotes every validated candidate. |

Both options preserve the same package integrity and readiness checks. Both keep OIDC for candidate publication. Neither bypasses release review or authorizes a release during this task.

Recommendation: A matches the requested automation. Use the narrowest supported scope for Joycraft. Do not describe it as tag-only permission unless npm supports that permission when provisioned.

## Assumptions Manifest

| Status | Claim | Evidence or verification needed |
|--------|-------|---------------------------------|
| Verified | Current publishing uses OIDC and publishes directly to latest. | `.github/workflows/publish.yml:1` and `:83`, read during design. |
| Verified | npm documents OIDC authentication for publish and stage publish, not general authenticated npm commands. | Current npm trusted-publishers documentation, fetched during design. |
| Verified | Candidate publication and tag promotion are separate operations. | npm publish and dist-tag documentation. |
| Verified | The user approved the candidate-first product contract and wants automation. | Brief approval in this conversation, D3. |
| Unverified | A suitable promotion credential is currently available in this repository. | Not assumed or inspected. Provision through the normal secret-management flow before activation. |
| Unverified | The chosen credential's package scope, expiry, and 2FA configuration permit unattended promotion. | Validate those settings during provisioning. Production promotion remains disabled until that check passes. |

The unverified rows describe deployment prerequisites, not promises or assumed implementation capabilities. D4 authorizes this credential approach; activation still requires provisioning. No secret values belong in this document or chat.

## Decision Capture

D4 resolved on 2026-09-06: Option A. Automatic promotion using a granular npm write credential scoped to Joycraft; keep OIDC for publication. The user considers maintainer credential renewal a non-issue and accepts it for automatic promotion. A Joycraft maintainer creates and renews the token and updates the GitHub Actions secret. Credential provisioning remains a deployment prerequisite; no credential was created or read.

All decisions are terminated. Design approved on 2026-09-06 (D5); proceed to decomposition review.

## Sources

- [Trusted publishing](https://docs.npmjs.com/trusted-publishers/): OIDC-supported operations and runtime requirements.
- [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/): tarball publication and immutable versions.
- [npm dist-tag](https://docs.npmjs.com/cli/v10/commands/npm-dist-tag/): adding tags to existing package versions.
