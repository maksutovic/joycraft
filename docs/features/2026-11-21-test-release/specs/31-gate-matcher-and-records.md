---
id: 31
status: todo
---
# Gate matching misses no prose gate, and feature-folder records exclude source files

Parent: [brief](../brief.md), sections `spec-tier` and `wave-gate`. Follow-ups f10, f11 and f12 from the round-2 review of spec 27 (review-27-r2.report.json). The brief's cost rule: a missed gate costs more than a false gap.

## acceptance

- `namesCommand` (payload/.joycraft/runtime/queue-check.mjs, also used by cleanup gate-rule) counts these as naming the gate `pnpm verify`: "pnpm verify doesn't fail.", "pnpm verify isn't optional", "pnpm verify e.g. twice", "pnpm verify (the full suite)", "pnpm verify → done", "pnpm verify & lint", "pnpm verify won’t pass", "pnpm verify re-runs it", "pnpm verify 2 times". Check: tests/runtime-queue-check-gate.test.ts `[AC:spec-31-1]` asserts each is true.
- A dash stuck to an argument stays an argument: "pnpm test —run", "pnpm test–run", "pnpm test—tests/a.test.ts" do not name the gate `pnpm test`; every argument form accepted in specs 4 and 27 still gives false. Check: the same test file `[AC:spec-31-2]`.
- A push on an older gate receipt counts a file under paths.features or paths.archive as a record only when its extension is one of .md, .json, .log, .txt, .diff, .patch, .yaml, .yml; any other file there (for example `x_test.go`, `test_x.py`, `a.test.ts`, `probe.mjs`) needs the gate. Check: tests/runtime-wave-gate.test.ts `[AC:spec-31-3]` refuses an old receipt after adding `docs/features/f/x_test.go` and pushes after adding `docs/features/f/notes.log`.

## Test changes

- `tests/runtime-wave-gate.test.ts`: class 1 — the `[review-27-7]` case that pushes an archive `.mjs.txt` stays a push (.txt); a feature-folder source file now refuses, as `[AC:spec-31-3]` states.

## Not covered

Wrapper forms (spec 27 f4), SIGINT during git apply (f6), letters-only arguments (f8), Markdown read by builds or doctests (f13, an owner call).

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; gate `pnpm test && pnpm typecheck`.
- Files: `payload/.joycraft/runtime/queue-check.mjs`, `payload/.joycraft/runtime/delivery.mjs`.
