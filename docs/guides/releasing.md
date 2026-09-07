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
   integrity. Publish that exact tarball to npm `latest` using OIDC, then create
   the GitHub release targeting the reviewed source commit.

The release metadata is generated during CI; the workflow does not push version
commits back to `main`. npm and the retained release manifest record the shipped
version. The source `package.json` version can therefore lag npm until a deliberate
version change. Builds embed the prepared version in both the package and descriptor.

Publication is serialized and active runs are not cancelled. Registry lookup
failures stop version selection. Existing versions are never overwritten: a retry
must match the retained integrity. Failed package checks prevent publication.

## Recovery

After packing, the tarball and integrity manifest are retained for 90 days.
Re-run failed jobs to reuse the retained artifact. For an explicit retry, dispatch
`publish.yml` with the original `release_sha`, exact `version`, `artifact_run_id`,
and optional artifact name. A missing or inconsistent artifact fails closed;
manual retry does not rebuild a different package under the original identity.

If failure occurred before an artifact was retained, diagnose that build first;
an artifact-based retry cannot recover nonexistent bytes. A subsequent reviewed
fix merged to main starts a fresh automatic release.

If npm accepted the tarball but the job failed afterward, a retry verifies the
registry integrity and skips republishing. It also checks that `latest` matches
before creating the GitHub release. If another release has advanced `latest`,
inspect the registry rather than moving the tag backward.

The older preparation and candidate-promotion helpers remain tested utilities;
they are not on the automatic production path. Post-publication cold/warmed
registry-cache readiness is no longer a promotion gate. Fresh install/update and
packaged compatibility checks run before the single OIDC publish to `latest`.
