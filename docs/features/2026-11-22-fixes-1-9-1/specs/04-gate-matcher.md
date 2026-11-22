---
id: 4
status: done
---
# gate-in-spec finds chained gates and reads the scope section, and the matcher's comment matches its code

Parent: [brief](../brief.md), section `queue-check`. Source: [1.9.0 review follow-ups](../../../backlog/2026-11-21-1-9-0-review-followups.md), section Text and skills (test-release/31/f1, 31/f2, 14/f3).

## acceptance

- Chained gates [test-release/31/f1]: in `namesCommand`, `&&`, `||`, `|` and `2>&1` followed by whitespace end the command. With the command `pnpm verify`, "pnpm verify && pnpm lint pass.", "pnpm verify | tee gate.log", "pnpm verify 2>&1 | tee log" and "pnpm verify || true" name it (all false today); "pnpm verify-all", "pnpm verify tests/a.test.ts" and "pnpm verify --run" still do not. Check: `tests/runtime-queue-check-gate.test.ts` `[AC:spec-4-1]` holds the seven cases.
- Scope section [test-release/14/f3]: gate-in-spec also reads the bullets and fenced lines of the spec's `## Implementation and verification scope` section, with the same match, and reports `gate-in-spec` (exit 2) with that line; the message says to write "the recorded gate" instead. A scope line "run the recorded gate once, before review" gives no gap. A done spec is still skipped. Check: `tests/runtime-queue-check-gate.test.ts` `[AC:spec-4-2]`: a todo spec whose scope bullet names the recorded gate gets one `gate-in-spec` gap at that line; the same spec with "the recorded gate" gets none.
- Comment [test-release/31/f2]: the `namesCommand` doc comment no longer says a next word holding `-` makes a different command; it says a word that starts with `-` is an argument (`--run`) and a word with an inner hyphen between letters (`re-runs`) is prose, and it lists the chain endings of bullet 1. Check: `tests/runtime-queue-check-gate.test.ts` `[AC:spec-4-3]` reads `payload/.joycraft/runtime/queue-check.mjs` and finds "starts with `-`" and "re-runs" in the comment above `namesCommand`, and no "`:`, `-` or `=`".

## Test changes

- `tests/runtime-queue-check-gate.test.ts` class 1: acceptance bullets 1 to 3 add the chain, scope-section and comment cases.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- A redirect with no pipe (`pnpm verify > log`) and `;` without a space stay unmatched.
- The decompose skill and spec template text are not changed: the check and its message carry the rule, and the skill is every-spec text.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/queue-check.mjs` (`namesCommand`, the section reader beside `acceptanceBullets`, the gate-in-spec loop), `tests/runtime-queue-check-gate.test.ts`.
- Tests: `tests/runtime-queue-check-gate.test.ts`. Tag each new test `[AC:spec-4-<n>]`.
- This queue's own specs name no gate command in any section, so they stay clean under the new check.
