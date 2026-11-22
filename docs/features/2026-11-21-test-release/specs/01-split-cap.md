---
id: 1
status: todo
---
# The payload guard counts every-spec text and on-demand text separately

Parent: [brief](../brief.md), sections `spec-tier`, `sota-page`. All 13 decisions are answered; they are quoted by ID.

Decision `cap-raise` = `split-cap`: "The guard counts every-spec text (skills, agents, the references they always read) against today's cap, and on-demand references against a separate +2,000 budget." Decision `word-budget` = `raise-cap`: take only the three duplicate cuts. Every later text spec is measured by this guard, so it lands first.

## acceptance

- `tests/payload-guard.test.ts` names the on-demand files in one exported list: `.joycraft/references/setup.md`, `update.md`, `testing-review.md`, `archive.md`, `cleanup.md`, `retro.md`, `settings.md` and `doc-cleanup-LICENSE.md`, each with a one-line reason (who reads it, and when). Every other payload text file (all skills, all agent files, every other reference) is every-spec. Check: the test asserts each listed file exists in the payload and that the two groups together are exactly the files `isPayloadText` selects.
- Two caps replace the single field-24 cap and the drift-tidy `< 29,917` bound: every-spec words <= 29,919 minus the on-demand words measured at the commit before this spec (today 8,721, so 21,198), and on-demand words <= those on-demand words + 2,000 (today 10,721). The test prints both counts. Check: `pnpm test tests/payload-guard.test.ts` passes and prints `every-spec words: <n>` and `on-demand words: <n>`.
- The caps hold the right files. Check: a fixture bundle in the test that adds 200 words to `.agents/skills/joycraft-implement/SKILL.md` over the every-spec cap fails, and one that adds 600 words to `.joycraft/references/testing-review.md` passes.
- The two checked duplicate cuts that do not touch later specs' text land here: the Claude worktree paragraph `setup.md:256-264` (a duplicate of `worktrees.md:122-127`; keep the resource-lease paragraph `setup.md:251-254`) and the duplicate acceptance-test paragraph `joycraft-testing/SKILL.md:34-37`. The third duplicate cut (`joycraft-implement/SKILL.md:59`) is spec 22's. Check: the test above prints an every-spec count about 36 below the count before this spec; `rg -n WorktreeCreate payload/.joycraft/references/setup.md` finds nothing and `payload/.joycraft/references/worktrees.md` still holds the paragraph.

## Test changes

- `tests/payload-guard.test.ts` — class 1 (spec-mandated) — the second acceptance bullet: the two caps replace `[AC:payload-words-not-up]` and `[AC:spec-12-5]`.

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Parallel seam: this spec owns only the files listed here. `payload/PIN` is generated, so on integration regenerate it with `node scripts/pin-payload.mjs` instead of merging it.
- Files: `tests/payload-guard.test.ts`, `payload/.joycraft/references/setup.md`, `payload/.agents/skills/joycraft-testing/SKILL.md`.
- Tests: `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-1-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Counts above were measured on this branch at decompose time (29,864 total); recompute them at implementation time and write the measured numbers into the test comment.
- The guard still counts the way `wc -w` does; do not change the counting method.
