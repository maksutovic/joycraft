# Automatic npm releases

Updated: 2026-09-07.

Every push to `main` starts `.github/workflows/publish.yml`. Merging the product
PR is the release authorization; there is no second release PR to approve.
The workflow uses npm Trusted Publishing through GitHub OIDC. No separate npm
promotion token or GitHub environment approval is required by the workflow.

## What runs automatically

1. Check out the exact event commit and verify it belongs to `main`.
2. Read published npm versions and select an unused version. A deliberate higher
   source version is preserved; otherwise advance the highest published patch.
3. Prepare package and release-descriptor versions in the runner, build, test,
   typecheck, and pack one retained tarball with source SHA and integrity.
4. Verify fresh installation and previous-version update against that tarball,
   then run the required packaged compatibility matrix across all configured
   operating systems, Node runtimes, project stacks, and harnesses.
5. Validate the complete matrix report against the same SHA, version, and
   integrity. Publish that exact tarball to npm `latest` using OIDC. Verify registry
   visibility before creating the GitHub release targeting the reviewed source commit.

The release metadata is generated during CI; the workflow does not push version
commits back to `main`. npm and the retained release manifest record the shipped
version. The source `package.json` version can therefore lag npm until a deliberate
version change. Builds embed the prepared version in both the package and descriptor.

Publication is serialized and active runs are not cancelled. Registry lookup
failures stop version selection. Existing versions are never overwritten: a retry
must match the retained integrity. Failed package checks prevent publication.

## Recovery

After packing, the tarball and integrity manifest are retained for 90 days.
When only publication or GitHub release creation fails, re-run failed jobs to reuse
the retained artifact and the successful compatibility report. The publish job
downloads reports from the same run and selects the newest producer attempt.
It validates the complete report against the retained SHA, version, integrity,
and current required checks. An invalid newer report cannot fall back to an older success.

For a failure inside the compatibility matrix, re-run all jobs so every matrix
cell produces a report for the new attempt. For an explicit retry, dispatch
`publish.yml` with the original `release_sha`, exact `version`, `artifact_run_id`,
and optional artifact name. A missing or inconsistent artifact fails closed;
manual retry does not rebuild a different package under the original identity.

If failure occurred before an artifact was retained, diagnose that build first;
an artifact-based retry cannot recover nonexistent bytes. A subsequent reviewed
fix merged to main starts a fresh automatic release.

If npm accepted the tarball but the job failed afterward, a retry verifies the
registry integrity and skips republishing. Publication verification polls exact-version
metadata for up to five minutes, with online revalidation and five-second intervals.
Each read is limited to 30 seconds or the remaining deadline, whichever is shorter.
The logs record expected and observed `latest` values and integrity status.
Only matching package identity, integrity, and `latest` permit GitHub release creation.
Identity mismatches and unsupported tags stop verification immediately.
If another release has advanced `latest`,
inspect the registry rather than moving the tag backward.

Deadline expiry means verification is incomplete. It does not mean npm rejected
the publication. Inspect the registry and reuse the retained artifact for recovery.
Reruns use the original commit's workflow and helpers. These retry fixes apply to
runs started from the commit that contains them; older failed runs need all jobs rerun.

The older preparation and candidate-promotion helpers remain tested utilities;
they are not on the automatic production path. Post-publication cold/warmed
registry-cache readiness is no longer a promotion gate. Fresh install/update and
packaged compatibility checks run before the single OIDC publish to `latest`.
The post-publication metadata check confirms identity and visibility. It does not
replace those consumer tests with another package installation.

### Legacy upgrade fixture

The previous package is initialized with plain `init`, which supports 0.7.13. The temporary consumer contains only generated files, so the candidate update explicitly replaces its legacy `.claude/hooks/joycraft-version-check.mjs`. Real projects retain the default ownership-conflict guard and require explicit review for that replacement.
