# $SCENARIOS_REPO

Holdout scenario tests for the main project. These tests run in CI against the
built artifact of each PR — but they live here, in a separate repository, so
the coding agent working on the main project cannot see them.

---

## What is the holdout pattern?

Think of it like a validation set in machine learning. When you train a model,
you keep a slice of your data hidden from the training process. If the model
scores well on data it has never seen, you can trust that it has actually
learned something — not just memorized the training examples.

Scenario tests work the same way. The coding agent writes code and passes
internal tests in the main repo. These scenario tests then check whether the
result behaves correctly from a real user's perspective, using only the public
interface of the built artifact.

Because the agent cannot read this repository, it cannot game the tests. A
passing scenario run means the feature genuinely works.

---

## Why a separate repository?

A single repository would expose the tests to the agent. Claude Code reads
files in the working directory; if scenario tests lived in the main repo, the
agent could (and would) read them when fixing failures, which defeats the
purpose.

A separate repo also means:

- The test suite can be updated by humans without triggering the autofix loop
- Scenarios can reference multiple projects over time
- Access controls are independent — the scenarios repo can be more restricted

---

## How the CI pipeline works

```
Main repo PR opened
        |
        v
Main repo CI runs (unit + integration tests)
        |
        | passes
        v
scenarios-dispatch.yml fires a repository_dispatch event
        |
        v
This repo: run.yml receives the event
        |
        +-- clones main-repo PR branch to ../main-repo
        |
        +-- builds the artifact (npm ci && npm run build)
        |
        +-- runs: NO_COLOR=1 npx vitest run
        |
        +-- captures exit code + output
        |
        v
Posts PASS / FAIL comment on the originating PR
```

The PR author sees the scenario result as a comment. No separate status check
is required, though you can add one via the GitHub Checks API if you prefer.

---

## Adding scenarios

### Rules

1. **Behavioral, not structural.** Test what the tool does, not how it is
   built internally. Invoke the binary; assert on stdout, exit codes, and
   filesystem state. Never import from `../main-repo/src`.

2. **End-to-end.** Each test should represent something a real user would
   actually do. If you would not put it in a demo or docs example, reconsider
   whether it belongs here.

3. **No source imports.** The entire point of the holdout is that tests cannot
   see source code. Any `import` that reaches into `../main-repo/src` breaks
   the pattern.

4. **Independent.** Each test must be able to run in isolation. Use `beforeEach`
   / `afterEach` to set up and tear down temp directories. Do not share mutable
   state between tests.

5. **Deterministic.** Avoid network calls, timestamps, or random values in
   assertions unless the feature under test genuinely involves them.

### File layout

```
$SCENARIOS_REPO/
├── example-scenario.test.ts   # Starter file — replace with real scenarios
├── workflows/
│   └── run.yml                # CI workflow (do not rename)
├── package.json
└── README.md
```

Add new `.test.ts` files at the top level or in subdirectories. Vitest will
discover them automatically.

### Example structure

```ts
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const CLI = join(__dirname, "..", "main-repo", "dist", "cli.js");

it("init creates a CLAUDE.md file", () => {
  const tmp = mkdtempSync(join(tmpdir(), "scenario-"));
  const { status } = spawnSync("node", [CLI, "init", tmp], { encoding: "utf8" });
  expect(status).toBe(0);
  expect(existsSync(join(tmp, "CLAUDE.md"))).toBe(true);
});
```

---

## Internal tests vs scenario tests

| | Internal tests (main repo) | Scenario tests (this repo) |
|---|---|---|
| Location | `tests/` in main repo | This repo |
| Visible to agent | Yes | No |
| What they test | Units, modules, logic | End-to-end behavior |
| Import source code | Yes | Never |
| Run on every push | Yes | Yes (via dispatch) |
| Purpose | Catch regressions fast | Validate real behavior |

---

## Relationship to Joycraft

This repository was bootstrapped by `npx joycraft init --autofix`. Joycraft
manages the `run.yml` workflow and keeps it in sync when you run
`npx joycraft upgrade`. The test files are yours — Joycraft will never
overwrite them.

If the `run.yml` workflow needs updating (e.g., a new version of
`actions/create-github-app-token`), run `npx joycraft upgrade` in this repo
and review the diff before applying.
