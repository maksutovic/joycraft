---
id: 16
status: todo
---
# Cleanup offers a rewrite of the owner's every-step gate lines, and update shows the finding once

Parent: [brief](../brief.md), section `owner-gate-lines`. All 13 decisions are answered; they are quoted by ID.

Brief `owner-gate-lines`: "`joycraft-cleanup` offers a before-and-after rewrite as one decision. `update` shows the finding once (Max: yes)."

## acceptance

- In an attended cleanup, `joycraft-cleanup/SKILL.md` turns all `gate-rule` findings into one decision with a before-and-after rewrite of each line (the gate once on the integrated revision, focused tests per spec); it never rewrites the line unattended. Check: `tests/text-owner-gate-lines.test.ts` finds `gate-rule` and "before" and "after" in the skill.
- `update.md` adds one step: when `cleanup.mjs` reports `gate-rule`, show it once with the offer and record the answer so it is not asked again; `cleanup.md` names the check. Check: the test finds `gate-rule` in update.md and cleanup.md.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 10 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 10 above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.agents/skills/joycraft-cleanup/SKILL.md`, `payload/.joycraft/references/update.md`, `payload/.joycraft/references/cleanup.md`, `tests/text-owner-gate-lines.test.ts`.
- Tests: `tests/text-owner-gate-lines.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-16-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Record "asked once" where update already records answers (`.joycraft/preferences.json`, as the archive-ignore answer does).
