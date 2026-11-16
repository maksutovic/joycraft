---
id: 1
status: done
---
# Outcome

One command answers "does every finished spec have an acceptance?" and speaks
the hook contract: exit 2 with the reason on stderr. Brief:
[gate-check](../brief.md#gate-check). Ruling `hook-set`: "stop-only", so the
check covers accepted completion and queue/spec drift, nothing else.

## acceptance

- An unaccepted `done` spec fails the gate. Check: a fixture queue with spec 3
  `done` and no `acceptedReport`, `ownerAcceptance` or `waiver`; run
  `node .joycraft/runtime/gate.mjs check --root <fixture>`; exit code 2 and
  stderr names the feature, spec 3 and the command that completes it
  (`tests/runtime/gate.test.mjs`, `[AC:gate-unaccepted-done]`).
- A held spec passes. Check: the same fixture with spec 3 `in-review` (and one
  with `## Decision needed`); exit code 0 (`[AC:gate-held-passes]`).
- A clean project is silent. Check: every `done` spec accepted and no drift;
  exit code 0 and stderr empty. A project with no queue also exits 0. Drift
  between queue and spec frontmatter exits 2 and names the spec
  (`[AC:gate-clean-silent]`).

- An old queue does not block. Check: a queue with a missing or pre-1.0
  `schemaVersion` (this repository has many under `docs/features/`) is skipped:
  exit code 0, one stderr line per skipped queue only with `--verbose`. A queue
  with the current schema that does not parse exits 2
  (`[AC:gate-legacy-queue-skipped]`).

## Not covered

`in-review` age, review quality, the `[AC:id]` trace, CI.

## Implementation and verification scope

Implemented in joycraft-prototype (the payload is vendored; never edit
`payload/` here). New `.joycraft/runtime/gate.mjs` with a pure export
`checkGates(root)` that reuses `projectStatus` and the `accepted` rule from
`.joycraft/runtime/status.mjs`; `tests/runtime/gate.test.mjs`; fixtures under
`fixtures/gate/`. `status.mjs` output and exit codes do not change. An
unexpected error exits 1, not 2.
