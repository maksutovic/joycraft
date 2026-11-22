# 1.9.1 review follow-ups

## Spec 2 (PASS r1)
- f1: completion.mjs:161-167 compares whole commands, so a report that ran one part of a chained gate (`pnpm test` vs gate `pnpm test && pnpm typecheck`) passes check-report. Candidate for spec 4 or a later release.
- Unmatched aliases by design: bunx, yarn dlx, pnpm dlx, npx with flags.

## Spec 3 (PASS r1)
- f1: cleanup.mjs:594 notFound matches any `<word>: <text>: not found` stderr line, so an existing checker that exits 0 with e.g. "rule no-foo: not found" is reported as a missing command. Fix: require the not-found name to be a word of `run`, or accept only shell forms.
- f2: cleanup.mjs:185 backlogFile folder half is case-exact (`Backlog/` not skipped); same as age-out before.
