---
id: 3
status: todo
---
# Test commands start through cmd.exe on Windows

Parent: [brief](../brief.md), section `windows-spawn`.

## acceptance

- Windows: with `process.platform` stubbed to `win32`, the shared spawn helper turns argv `["pnpm","test","tests/a b.test.ts"]` into a `cmd.exe /d /s /c` call with each argument quoted, so `.cmd` shims start. Check: `tests/runtime-command-spawn.test.ts` `[AC:spec-3-1]`.
- Other platforms: on `darwin`/`linux` the helper spawns `argv[0]` directly with no shell, as today. Check: `tests/runtime-command-spawn.test.ts` `[AC:spec-3-2]`.
- Both callers: `evidence.mjs` (`:417`) and `close.mjs` (`:152`) use the helper; a missing command still reports a clear "could not start" error. Check: `tests/runtime-command-spawn.test.ts` `[AC:spec-3-3]`.

## Test changes

- `tests/runtime-command-spawn.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one. A real Windows run; the Windows CI leg covers what it can.

## Implementation and verification scope

- Put the helper in an existing runtime module both files already import, or export it from `evidence.mjs`; a new runtime file must be added to the install manifest by `pin-payload`. Quote per Node's guidance after CVE-2024-27980 (no unquoted user strings to cmd.exe).
- Files: `payload/.joycraft/runtime/evidence.mjs`, `payload/.joycraft/runtime/close.mjs`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/runtime-command-spawn.test.ts`. Run the recorded gate once, before review.
