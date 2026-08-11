# STE self-check needs a code-span carve-out, and the installed copy is a manual sync

A doc that bans `should` must be able to write `should` — the fix-to-zero check has to strip inline code spans and quoted samples, not just the Worked Example (spec 3's linter needs the same carve-out).
`pnpm sync-skills` does NOT copy `src/templates/` into `docs/templates/`; the installed copy is a manual `cp`, and `src/bundled-files.ts` is gitignored, so bundle parity rides on the checked-in installed copy.
