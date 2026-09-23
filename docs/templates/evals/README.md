# Harness Evals

A harness eval checks that your AI harness still works. The harness is your
memory files (`CLAUDE.md`, `AGENTS.md`), your skills, and your hooks. A skill
edit can break a workflow without breaking a single unit test. An eval catches
that change before a person notices worse output.

This folder is a scaffold. Joycraft ships it and never runs it. Nothing here
spends model budget until you turn it on.

## The files

| File | What it is |
|------|------------|
| `example-task.json` | One recorded task. Sample content: replace it with your own. |
| `check.sh` | The runner. Reads every `*.json` task in this folder and prints a pass rate. |
| `agent-evals.yml` | A GitHub Actions workflow that runs `check.sh`. |
| `README.md` | This file. |

## The recorded-task loop

1. **Record.** Something goes wrong, or a workflow matters. Write the prompt
   that shows it, as a task file in this folder.
2. **Assert.** List what a good result looks like. The runner checks each
   assertion after the agent finishes.
3. **Gate.** Set how often the task must pass. Agents are not deterministic,
   so a task can run several times.
4. **Run.** `check.sh` runs on a schedule and on every harness change. A task
   under its gate fails the run.

To run the evals on your machine, from the project root:

```sh
sh docs/templates/evals/check.sh
```

`check.sh` needs POSIX `sh`, `jq`, and the `claude` CLI. If `jq` is missing, it
stops with "jq required" and exits non-zero. A folder with no task files
reports zero tasks and passes.

## The task shape

Each task is one JSON file in this folder. The runner finds new files by
itself, so adding `login-bug.json` needs no other change.

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | A short name. Failures print it. |
| `prompt` | yes | The prompt sent to `claude -p`. |
| `fixture` | yes | A directory, relative to the project root, copied fresh for each run. The agent works inside the copy. `.` means the whole project. |
| `assertions` | yes | A list of checks. Every one must hold for a run to pass. |
| `pass_gate` | yes | The pass criterion: the fraction of runs that must pass, from `0` to `1`. |
| `runs` | no | How many times to run the task. Default `1`. |

Each assertion has a `type` and a `value`:

| Type | Passes when |
|------|-------------|
| `output_contains` | The agent's reply contains `value` as plain text. |
| `output_not_contains` | The agent's reply does not contain `value`. |
| `output_matches` | The agent's reply matches `value` as an extended regular expression. |
| `file_exists` | The path `value` exists in the fixture copy after the run. |
| `command` | The shell command `value` exits 0 inside the fixture copy. |

A task with a missing field or an unknown assertion type counts as a failure.
The runner names it and continues with the other tasks.

The pass gate is per task. You can keep a strict task (`pass_gate: 1`) and a
flaky one (`pass_gate: 0.6`, `runs: 5`) side by side. `check.sh` exits 1 when
any task falls under its own gate. The printed pass rate covers all runs.

## Every bugfix seeds an eval

**Every bugfix seeds an eval.** When you fix a bug, turn its reproduction case
into a task file here. The prompt is what caused the bug. The assertions are
what the fixed behavior looks like. An incident you fixed once stays fixed,
because the next harness change that brings it back fails the evals.

## Turn on the workflow

Copy `agent-evals.yml` into `.github/workflows/` by hand:

```sh
mkdir -p .github/workflows
cp docs/templates/evals/agent-evals.yml .github/workflows/agent-evals.yml
```

No Joycraft command installs this workflow. The copy is your consent to spend
model budget in CI, and the copied file is yours to edit.

The workflow needs one repository secret: `ANTHROPIC_API_KEY`. Without it,
`claude -p` fails, and `check.sh` prints the CLI's error and exits non-zero.

The workflow runs once a week and on pushes or pull requests that change
`CLAUDE.md`, `AGENTS.md`, `.claude/`, a skill directory, a hook directory, or
this folder. Edit the `paths` list if your harness lives somewhere else.

Joycraft update may refresh this folder. Keep your own task files here, or copy
the folder to another path and point the workflow at that copy.
