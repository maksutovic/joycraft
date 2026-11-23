---
id: 4
status: todo
---
# A reviewer starts on the first try

Parent: [brief](../brief.md), section `reviewer-start`.

## acceptance

- Help: `node .joycraft/runtime/dispatch-start.mjs --help` (or `-h`), alone, prints a usage text with every required flag and placeholder (including `--native-agent <your-host-agent-id>`, `--coordinator-session` and `agent:separate-context` for a reviewer) and exits 0 with nothing on stderr; another unknown flag still stops startup with exit 1. Check: `tests/runtime-dispatch-commands.test.ts` `[AC:spec-4-1]`.
- Receipt refusal: an observation without `receipts` is refused with `needs supporting receipt references: add "receipts": [{ "path": "<project-relative receipt path>", "sha256": "<its SHA-256>" }] for the receipt that evidence.mjs run --receipt wrote for this check`. Check: `tests/runtime-evidence-receipt.test.ts` `[AC:spec-4-2]`.
- Reviewer text: the reviewer agent points to the start command in `dispatch.md#start-a-native-dispatch` and to `--help`, and runs each command as `cd <worker-root> && <one command>` when its shell starts outside the named worker root; `dispatch.md` says a Claude Code child cannot see its own agent ID and the coordinator sends it the launch result's ID before its startup. Every-spec words stay under the caps. Check: `tests/text-worker-commands.test.ts` `[AC:spec-4-3]` and `tests/payload-guard.test.ts` unchanged.

## Test changes

- `tests/runtime-dispatch-commands.test.ts` class 1: acceptance bullet 1 adds the `--help` test.
- `tests/runtime-evidence-receipt.test.ts` class 1: acceptance bullet 2 adds the refusal text test.
- `tests/text-worker-commands.test.ts` class 1: acceptance bullet 3 adds the reviewer text test.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Files: `payload/.joycraft/runtime/dispatch-start.mjs` (`usage`, `main`), `payload/.joycraft/runtime/evidence.mjs` (one message), `payload/.claude/agents/joycraft-reviewer.md`, `payload/.joycraft/references/dispatch.md`, and the three test files.
- Tests: the three test files and `tests/payload-guard.test.ts`. Run the recorded gate once, before review.
- Start after specs 1 and 2 are done: it edits files they reviewed.
