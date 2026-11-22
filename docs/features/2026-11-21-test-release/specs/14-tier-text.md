---
id: 14
status: in-review
---
# Specs name their own tests, and setup records the three commands

Parent: [brief](../brief.md), sections `spec-tier`, `wave-gate`. All 13 decisions are answered; they are quoted by ID.

Brief `spec-tier`: decompose and the spec template ask for the spec's own test files, never the gate; fix `joycraft-verify` line 51 against line 53; drop "run the project gate one time" from the implementer agent; reverse `testing-review.md`'s "do not recommend test selection"; setup records the commands in `joycraft.yaml`. Decision `wave-gate-default` = `per-wave-if-slow`: "Setup times the gate. Over about 60 s: per wave. Under: once per spec."

## acceptance

- `templates/spec.md:12-15` asks each `Check:` to name the spec's own test file or filter, never the project gate or full suite, and `joycraft-decompose/SKILL.md` says the same where it lists verification inputs. Check: `tests/text-spec-tier.test.ts` finds the sentence in both and finds no "the command or test" wording in the template.
- `joycraft-verify/SKILL.md:51` takes evidence for runtime claims from the spec's own tests (the packet's `commands.focused`), so it no longer contradicts line 53; `joycraft-implementer.md:33` no longer says "run the project gate one time". Check: the test finds `commands.focused` in the verify skill and no "project gate one time" in the agent file.
- `testing-review.md:29-32` recommends test selection from the spec's declared test files; the sentence "Do not recommend test selection" is gone. Check: the test finds no "Do not recommend test selection" in testing-review.md and finds "declared test files".
- `setup.md`'s commands item writes `tests.focused` (with `{files}`), `tests.gate` and `tests.full` to `joycraft.yaml` next to the `AGENTS.md` Commands table, times the gate once and records `gateRuns: wave` when it takes over about 60 s, else `spec`; `settings.md` documents the section. Check: the test finds `tests.focused`, `gateRuns` and `60 s` in setup.md and `tests:` in settings.md.
- Every-spec words (the guard's every-spec count, printed by `pnpm test tests/payload-guard.test.ts`) grow by at most 5 in this spec; on-demand files stay inside their budget. Pay for new every-spec text by rewriting the sentence it replaces; prefer printed runtime output to prose. If the text cannot fit, report `spec gap: every-spec words` instead of cutting other guidance. Check: `pnpm test tests/payload-guard.test.ts` passes and its printed every-spec count is at most 5 above the count before this spec.

## Test changes

none

## Not covered

Anything in the brief's Scope and limits. Joycraft names no test runner: text says "the runner's own flag". Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.agents/skills/joycraft-decompose/SKILL.md`, `payload/.joycraft/templates/spec.md`, `payload/.agents/skills/joycraft-verify/SKILL.md`, `payload/.claude/agents/joycraft-implementer.md`, `payload/.joycraft/references/testing-review.md`, `payload/.joycraft/references/setup.md`, `payload/.joycraft/references/settings.md`, `tests/text-spec-tier.test.ts`.
- Tests: `tests/text-spec-tier.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-14-<n>]`; use git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does.
- Max's note on `sota-knowledge-home` names the cost: "most specs were saying to run pnpm:verify on *every* step". This spec and spec 4 remove that path.
