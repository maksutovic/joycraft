# 1.9.1 review follow-ups

## Spec 2 (PASS r1)
- f1: completion.mjs:161-167 compares whole commands, so a report that ran one part of a chained gate (`pnpm test` vs gate `pnpm test && pnpm typecheck`) passes check-report. Candidate for spec 4 or a later release.
- Unmatched aliases by design: bunx, yarn dlx, pnpm dlx, npx with flags.
