# 1.9.1 review follow-ups

## Spec 2 (PASS r1)
- f1: completion.mjs:161-167 compares whole commands, so a report that ran one part of a chained gate (`pnpm test` vs gate `pnpm test && pnpm typecheck`) passes check-report. Candidate for spec 4 or a later release.
- Unmatched aliases by design: bunx, yarn dlx, pnpm dlx, npx with flags.

## Spec 3 (PASS r1)
- f1: cleanup.mjs:594 notFound matches any `<word>: <text>: not found` stderr line, so an existing checker that exits 0 with e.g. "rule no-foo: not found" is reported as a missing command. Fix: require the not-found name to be a word of `run`, or accept only shell forms.
- f2: cleanup.mjs:185 backlogFile folder half is case-exact (`Backlog/` not skipped); same as age-out before.

## Spec 4 (PASS r1)
- Test edits beyond Test changes (retag [AC:spec-4-*] to [gate-base-*]; Notes-section case) are required by the spec; should have been declared.
- Prose that literally names the gate before a chain (negated sentence, table row) matches; same class as before.
- Fenced scope block outside a bullet matches only an exact gate line.

## Spec 5 (PASS r1)
- jsconfig.json, deno.json, pnpm-workspace.yaml still count as records (decision names only package.json, tsconfig*, lockfiles).
- delivery.md:54 clause placement could read as feature/archive-only; code applies it under the whole docs root.
- On-demand headroom 601 vs the 600-word probe (payload-guard.test.ts:348).

## Spec 6 (PASS r1)
- setup.md:245-250 lost "and its conventions" (keep an existing worktrees doc style); restore if words allow.
- setup.md:298 dropped "materially" from the ask-a-question rule; slightly wider.
