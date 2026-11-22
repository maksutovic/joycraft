# Spec 26 bullet 3: an installed project gets the new parts

Revision: `6163e655888d72d9cf10c5c764092506f3881770`, 2026-11-21.

- `pnpm build`, then `node dist/cli.js init <scratchpad>/proof-init --yes` in an empty `git init` folder: exit 0.
- The three files exist, byte-identical to `payload/`:

| Installed file | sha256 |
|---|---|
| `.joycraft/references/testing-page.md` | `16704b494c999def6cf19f2b12e11cbd157e04671d5d8f7cbc9e9043c1373ffb` |
| `.joycraft/runtime/test-changes.mjs` | `dba78445fa51e272b328a65b29f002902c088f65cbe6572396fc93ed117aa155` |
| `.joycraft/templates/joycraft.yaml` | `98cc706f0c0b905fd77c6260f4150ab52e3c25a8a864930d7fb06c52ee98685d` |

- The template's `tests:` section (lines 32 to 40), commented out: `focused: pnpm test {files}`, `gate: pnpm test && pnpm typecheck`,
  `full: pnpm test:all`, `gateRuns: spec`.

Limit: a fresh init only; the update path from 1.8.1 is covered by CI's previous-version update check.
