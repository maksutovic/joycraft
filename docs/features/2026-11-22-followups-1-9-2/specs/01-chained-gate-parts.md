---
id: 1
status: in-review
---
# A report that ran one part of a chained gate is refused

Parent: [brief](../brief.md), section `completion`. Source: 1.9.1 review follow-ups, spec 2 f1.

## acceptance

- Gate parts: when `tests.gate` or `tests.full` is a chain (parts joined by `&&`, `||` or `;`), `check-report` refuses a report whose observation, after the existing unwrapping and runner-alias normalizing, equals one part, with the same refusal shape as a whole-gate run and the part named (for example "ran `npm run lint`, a part of the recorded tests.gate command"). In a test fixture whose gate is `npm test && npm run lint`: `npm test`, `npm run lint`, `npm lint` and `sh -c "npm test"` are refused; `npm test tests/x.test.ts` and `npx vitest run tests/x.test.ts` pass. A one-part gate behaves as today. Check: `tests/runtime-report-gate.test.ts` `[AC:spec-1-1]`.
- No change for a done spec: the `gateRuns` option still turns the check off for a spec already done. Check: the existing tests of `tests/runtime-report-gate.test.ts` pass unchanged `[AC:spec-1-2]`.

## Test changes

- `tests/runtime-report-gate.test.ts` class 1: acceptance bullet 1 adds the gate-part cases.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- A part that is a subshell or a pipeline (`(a && b)`, `a | b`) is compared as written.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/completion.mjs` (`refuseGateRuns`), `payload/.joycraft/references/completion.md` only if it names the rule (every-spec words do not change), and `tests/runtime-report-gate.test.ts`.
- Tests: `tests/runtime-report-gate.test.ts`. Tag each new test `[AC:spec-1-<n>]`.
