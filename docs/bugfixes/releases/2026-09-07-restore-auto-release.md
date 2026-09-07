---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-07
---
# Restore automatic npm releases

Max explicitly rejected the added manual release gate and requested automatic
releases after main merges. This supersedes the release-PR requirement introduced
by serialize-immutable-releases in PR #74.

Acceptance: every main push starts release preparation automatically; no release
PR or newly provisioned promotion credential is needed. Version selection must
avoid published versions, source SHA must remain immutable, and fresh install,
update, and required packaged compatibility checks must pass before OIDC publishes
the retained tarball to latest. Retries must validate and reuse the same artifact.

Verification: automatic-release metadata tests, workflow-contract tests, full
regression suite, typecheck, build, independent workflow review, and the resulting
GitHub release run after merge. No holdout content is read or changed.
