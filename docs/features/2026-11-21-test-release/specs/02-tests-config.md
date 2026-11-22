---
id: 2
status: todo
---
# joycraft.yaml records the focused, gate and full test commands

Parent: [brief](../brief.md), sections `spec-tier`, `wave-gate`. All 13 decisions are answered; they are quoted by ID.

Brief `spec-tier`: "Setup records `focused`, `gate` and `full` commands in `joycraft.yaml`." Decision `wave-gate-default` = `per-wave-if-slow` needs one recorded choice: whether the gate runs per wave or per spec. This spec adds the setting; setup text that writes it is spec 14.

## acceptance

- `config.mjs` accepts a `tests:` section with `focused`, `gate` and `full` (each a command string) and `gateRuns` (`wave` or `spec`, default `spec`). `focused` may hold `{files}`, which callers replace with the spec's test files. Check: a fixture `joycraft.yaml` with `tests: { focused: "pnpm test {files}", gate: "pnpm verify", gateRuns: wave }` gives those values from `node payload/.joycraft/runtime/config.mjs --root <fixture>`.
- A project with no `tests:` section reads as before, with `tests: {}` and `gateRuns: spec`. Check: the same command on a fixture with no `joycraft.yaml` prints the defaults and exits 0.
- A bad value names its line or setting and stops: an unknown key under `tests`, an empty command, or a `gateRuns` that is not `wave` or `spec`. Check: three fixtures each exit 1 with a message that names `tests.<key>`.
- The template documents the section, commented out, with no machine number. Check: `payload/.joycraft/templates/joycraft.yaml` parses with `parseYaml` to the defaults and contains `# tests:` with the four keys.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/config.mjs`, `payload/.joycraft/templates/joycraft.yaml`, `tests/runtime-config-tests.test.ts`.
- Tests: `tests/runtime-config-tests.test.ts`. Tag each new test `[AC:spec-2-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- `gateRuns` is a recorded choice, not a duration: no seconds or core counts go into the tracked file (brief rule "no machine number in a tracked file").
