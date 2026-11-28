---
id: 2
status: todo
---
# Dispatch checks only the role's installed files, ignoring line endings

Parent: [brief](../brief.md), section `dispatch-manifest`.

## acceptance

- Unrelated edit: an installed project with one blank line added to `.claude/skills/joycraft-session-end/SKILL.md` (and the same for the Codex copy) prepares an implementer dispatch without the "Installed file differs from manifest" refusal. Check: `tests/runtime-dispatch-manifest.test.ts` `[AC:spec-2-1]`.
- CRLF: a role file (one the role's `validateRoles` list names) whose only change is LF→CRLF does not refuse. Check: `tests/runtime-dispatch-manifest.test.ts` `[AC:spec-2-2]`.
- Edited role file: a real content edit to a role file still refuses with the same message naming the file. Check: `tests/runtime-dispatch-manifest.test.ts` `[AC:spec-2-3]`.
- Once: the manifest is read and hashed once per dispatch, not twice (`:351`, `:385`). Check: `tests/runtime-dispatch-manifest.test.ts` `[AC:spec-2-4]`.

## Test changes

- `tests/runtime-dispatch-manifest.test.ts` class 1: new file.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- `dispatch-preflight.mjs:243` hashes every manifest entry. Limit the check to the files the role needs (the list the pinned-manifest comparison at `:352-357` already uses) and hash with CRLF normalised to LF. Keep the refusal text.
- Files: `payload/.joycraft/runtime/dispatch-preflight.mjs`. Edit `payload/`, then run `node scripts/pin-payload.mjs`; check `tests/payload-guard.test.ts` word caps.
- Tests: `tests/runtime-dispatch-manifest.test.ts`. Run the recorded gate once, before review.
