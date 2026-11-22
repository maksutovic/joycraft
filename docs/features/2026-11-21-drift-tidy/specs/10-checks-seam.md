---
id: 10
status: in-review
---
# Projects can plug their own doc and code checkers into tidy

Parent: [brief](../brief.md), sections `checks-seam`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- `joycraft.yaml` accepts an optional `checks:` list of `{name, run}`; config validation rejects an entry without `run`. Check: config.mjs on a fixture with `- name: x` and no run exits non-zero naming `run`.
- `cleanup.mjs tidy` runs each check from the project root; each output line `path:line: message` becomes a finding with `check: <name>`; other lines are ignored. Check: a check that prints two such lines and one other line gives two findings.
- A command not found (exit 127 or ENOENT) gives one `skipped` entry and never fails tidy. Check: `run: definitely-not-a-tool-xyz` gives `skipped` and tidy exits 0 with no findings from it.
- `settings.md` maps a request like "run drift/vale/docaudit at session end" to `checks:`, and the template documents it in comments. Check: both files name `checks:`; payload words stay within the cap.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/config.mjs`, `payload/.joycraft/runtime/cleanup.mjs`, `payload/.joycraft/references/settings.md`, `payload/.joycraft/templates/joycraft.yaml`.
- Test: `tests/runtime-cleanup-checks-seam.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-10-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.
