---
id: 12
status: todo
---
# evidence.mjs applies a machine-local environment map

Parent: [brief](../brief.md), sections `worker-commands`, `lane-cap`. All 13 decisions are answered; they are quoted by ID.

Brief `worker-commands`: "a project-owned environment map that `evidence.mjs` applies". Brief rule: "no machine number in a tracked file", so the map lives in the machine-local `.joycraft/local/` folder. Decision `worker-cap-home` = `dispatch-and-offer` keeps the cap in the project's own runner config; this map is the per-machine place for a runner's worker variable.

## acceptance

- When `.joycraft/local/evidence-env.json` holds a JSON object of string names to string values, every `evidence.mjs run` passes them to the child; `CI` and `JOYCRAFT_EVIDENCE` always win over the map. The result and the receipt footer list the applied names under `env`. Check: a fixture map `{"WORKERS": "3", "CI": "0"}` gives a child that prints `3 1`, and `env: ["WORKERS"]`.
- A malformed map (not an object, a non-string value) refuses the run with exit 2 and names the file; a map Git tracks refuses with exit 2 ("must stay machine-local"). No map runs as before. Check: three fixtures.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `payload/.joycraft/runtime/evidence.mjs`, `tests/runtime-evidence-env.test.ts`.
- Tests: `tests/runtime-evidence-env.test.ts`. Tag each new test `[AC:spec-12-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Text that tells setup and agents about the map is spec 23.
