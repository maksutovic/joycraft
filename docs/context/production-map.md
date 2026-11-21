# Production Map

> What's real, what's staging, what's safe to touch.

## Services

| Service | Environment | URL/Endpoint | Impact if Corrupted |
|---------|-------------|-------------|-------------------|
| npm registry (joycraft) | Production | https://www.npmjs.com/package/joycraft | Published package used by all users — bad publish requires emergency unpublish/patch. A new version can take minutes to appear after `npm publish` returns (7 min 11 s for 1.5.2) |
| GitHub repo | Production | https://github.com/maksutovic/joycraft | Public repo, PRs and issues visible to users |

## Secrets & Credentials

| Secret | Location | Notes |
|--------|----------|-------|
| npm OIDC | GitHub Actions | Trusted publishing via OIDC — no token to leak, but workflow file controls publish |
| GITHUB_TOKEN | GitHub Actions | Auto-provisioned, scoped to repo |

## Safe to Touch

- Feature branches (anything not main)
- `/tmp/test-project` and similar temp dirs for local testing
- Test fixtures in `tests/fixtures/`
- `docs/` directory (all documentation)

## NEVER Touch Without Explicit Approval

- `main` branch directly (always use PRs)
- `package.json` version field (controls npm publish)
- `.github/workflows/publish.yml` (controls automated publishing)
- The suite runs in `publish.yml` and on pushes to main: branch protection requires no status checks, so these runs are the only guard before npm
