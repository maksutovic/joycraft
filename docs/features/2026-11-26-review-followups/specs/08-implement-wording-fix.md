---
id: 8
status: todo
---
# The implement skill keeps the rules its word-cap trim weakened

Parent: [brief](../brief.md), section `triage`. Fix spec for spec 5's review follow-ups f1 and f2 (`review-5.report.json`), written under the brief's settled rule: a real follow-up inside the brief's intent gets a fix spec in the same queue.

## acceptance

- Isolated mode: `payload/.agents/skills/joycraft-implement/SKILL.md` says again that `isolated` mode does everything `checkpoint` does (commit, integrate and review each spec, then the follow-up step) and also gives each implementation spec a fresh agent context. Check: `tests/text-follow-up-triage.test.ts` `[AC:spec-8-1]`.
- Owner acceptance: the owner-acceptance paragraph again says the owner must accept *explicitly*, and that the agent persists the owner's actual instruction and nonempty limits *in the decision record*, with the same meaning as at commit 2802017. Check: `tests/text-follow-up-triage.test.ts` `[AC:spec-8-2]`.
- Caps: the skill stays at or under its cap in `tests/text-wave-gate.test.ts`, and `tests/payload-guard.test.ts` passes, with no rule dropped elsewhere to make room. Check: `tests/text-follow-up-triage.test.ts` `[AC:spec-8-2]` and both cap tests pass unchanged.

## Test changes

- `tests/text-follow-up-triage.test.ts` class 1: acceptance bullets 1 and 2 add new cases.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.agents/skills/joycraft-implement/SKILL.md`, `payload/PIN`, `tests/text-follow-up-triage.test.ts`, `tests/text-wave-gate.test.ts`, `tests/payload-guard.test.ts`. Edit `payload/`, then run `node scripts/pin-payload.mjs`.
- Tests: those three test files. Run the recorded gate once, before review.
