# Discoveries — GitHub Actions PAT Authentication for Protected Branches

**Date:** 2026-03-26

## Fine-grained PATs cannot be embedded in git remote URLs
**Expected:** `git remote set-url origin "https://x-access-token:${TOKEN}@github.com/..."` would work with fine-grained PATs, same as classic PATs.
**Actual:** Fine-grained PATs (`github_pat_...`) contain characters that break URL parsing, causing "URL rejected: Malformed input to a URL function". Classic PATs (`ghp_...`) were purely alphanumeric and didn't have this issue.
**Impact:** Always pass tokens via `actions/checkout@v4`'s `token` parameter. The checkout action uses HTTP `extraheader` (base64-encoded Authorization header) instead of URL embedding. All subsequent `git push` commands inherit these credentials automatically. Never manipulate the remote URL manually.

## FORCE_JAVASCRIPT_ACTIONS_TO_NODE24 doesn't take effect on re-runs
**Expected:** Adding the env var to the workflow file and re-running would use Node 24.
**Actual:** Re-running a workflow uses the workflow file from the original commit, not the current one. The env var only takes effect on new pushes.
**Impact:** To test workflow file changes, you must trigger a new run (new push/merge), not re-run an existing one.
