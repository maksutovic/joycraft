# Test-First Development

> [Back to README](../../README.md)

Tests are how an agent works without you watching. Without tests, the agent builds
nine specs and you check each one by hand. With tests, the agent knows when a spec
is done, and a second agent can check the claim.

## How it works

Each spec from `joycraft-decompose` has acceptance criteria with stable IDs. A test
names the criterion it checks with `[AC:<criterion-id>]`, so the reviewer can see
which criteria have a test.

`joycraft-implement` builds each spec with tests. `joycraft-testing` chooses the
evidence: the smallest boundary that can tell a correct change from a plausible
fault. It calls the real function with representative values for arithmetic,
composes real transitions for a lifecycle, and looks at the rendered result for a
screen.

## The three test tiers

While it works, the agent runs tests in three tiers:

1. **While you work:** only the tests for the code it changed: one file, package or
   name filter.
2. **Project gate:** one time on the final commit of each spec. The command comes
   from the command table in your `AGENTS.md`.
3. **Full suite:** one time on the final integrated revision: in CI when the project
   has CI, else locally before the push.

A pass on a rerun is FLAKY, not PASS. The agent never adds a retry, a sleep or a
skip to get a pass. If an existing test looks wrong, it reports a spec gap and does
not edit, skip or delete the test.

## The three laws of test harnesses

These come from real autonomous development:

1. **A test must be able to fail.** A test that cannot fail for a wrong change
   checks nothing, for example a test of the library instead of your function.
2. **A test must run your actual function.** Not a reimplementation, not a mock,
   not the wrapped library. The test calls your code.
3. **Tests must detect individual changes.** Fast focused tests (seconds, not
   minutes) tell you whether one change helped or hurt.

## Independent verification

`joycraft-verify` runs in a separate context, without the implementer's
conversation. It reads the spec, runs the checks, and writes a report with
receipts: the command, the revision it ran on and the raw output. Only an accepted
PASS completes the spec. The reviewer also reads every edit to an existing test: a
removed assertion, a new skip or a changed expected value with no reason in the
spec blocks the spec.

This follows [Anthropic's finding](https://www.anthropic.com/engineering/harness-design-long-running-apps)
that agents reliably skew positive when they grade their own work, and that
separating the worker from the evaluator does better than self-evaluation.

To review the tests themselves:

```text
Review our tests with Joycraft. Tell me which tests cannot fail, which test a mock
instead of our code, and which criteria have no test. Change nothing yet.
Do not commit, publish, or ask me for API keys.
```

For the permission mode to use on a long run, see
[Permission modes](permission-modes.md).
