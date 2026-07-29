# Handoff briefings: `/clear` grep undercounts, and the no-sync constraint cannot hold

The spec's `rg -l "/clear" src/skills/` check finds only 3 skills — the other handoffs
render `/clear` through the `{{clear}}` placeholder, so the real list comes from
`## Recommended Next Steps`; `joycraft-decide` had no handoff section at all and needed one added.

The spec's "MUST NOT regenerate bundles or sync installed copies — spec 6 owns both" cannot be
honored: editing `src/skills/` fails 30 sync-suite assertions until `pnpm sync-skills` runs, per
`docs/discoveries/2026-07-29-test-suite-regenerates-bundles.md`. Spec:
`docs/features/2026-07-29-succinct-gates/specs/handoff-briefing-prompts.md`.
