# Troubleshooting

> What to do when things go wrong for non-code reasons.
> Environment issues, flaky dependencies, hardware quirks, and diagnostic steps.
> Update when you discover new failure modes and their fixes.

## Common Failures

| When This Happens | Do This | Don't Do This |
|-------------------|---------|---------------|
| _Example: Tests fail with ECONNREFUSED_ | _Check if the dev database is running_ | _Don't rewrite the test or mock the connection_ |
| _Example: Build fails with out-of-memory_ | _Increase Node heap size or close other processes_ | _Don't simplify the code to reduce bundle size_ |
| _Example: Lint passes locally but fails in CI_ | _Check Node/tool version mismatch between local and CI_ | _Don't disable the lint rule_ |

## Environment Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| _Example: "Module not found" after branch switch_ | _Dependencies changed on the new branch_ | _Run the package manager install command_ |
| _Example: Port already in use_ | _Previous dev server didn't shut down cleanly_ | _Kill the process on that port or use a different one_ |
| _Example: Permission denied on file/directory_ | _File ownership or permission mismatch_ | _Check and fix file permissions, don't run as root_ |

## Diagnostic Steps

_When something fails unexpectedly, follow this sequence before trying to fix the code:_

1. **Check the error message literally** -- don't assume what it means, read it
2. **Check environment prerequisites** -- are all services running? Correct versions?
3. **Check recent changes** -- did a config file, dependency, or environment variable change?
4. **Check network/connectivity** -- is the internet up? Are external services reachable?
5. **Search project docs first** -- check this file and `docs/discoveries/` before web searching

## "Stop and Ask" Scenarios

_Situations where the AI agent should stop and ask the human instead of trying to fix things._

- _Example: Hardware device not responding -- the human may need to physically reconnect it_
- _Example: Authentication token expired -- the human needs to re-authenticate manually_
- _Example: CI pipeline blocked by a required approval -- a human needs to approve it_
- _Example: Error messages referencing infrastructure the agent doesn't have access to_
