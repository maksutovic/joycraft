---
id: 12
status: todo
---
# Skills call tidy and Joycraft writes less

Parent: [brief](../brief.md), sections `generator-cuts`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- The session-end skill runs `cleanup.mjs tidy`, fixes only fixable findings, runs `tidy --verify`, and makes the one printed commit; it no longer says session end changes no page. Check: the skill names `tidy --verify` and the hold sentence "Never archive a feature whose question the user asked to wait" is still present.
- `cleanup.md` no longer lists a handoff as a cleanup output; `knowledge.md`'s routing table labels homes with the Diataxis kinds explanation, reference, how-to and domain. Check: rg finds no `or a handoff` in cleanup.md and finds the four labels in knowledge.md.
- The cleanup skill points "tidy now" requests to `cleanup.mjs tidy`. Check: the skill names it.
- Shipped payload words are below 29,917. Check: `pnpm test tests/payload-guard.test.ts` passes and the measured count is printed below 29,917.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.agents/skills/joycraft-session-end/SKILL.md`, `payload/.agents/skills/joycraft-cleanup/SKILL.md`, `payload/.joycraft/references/cleanup.md`, `payload/.joycraft/references/knowledge.md`.
- Test: `tests/payload-guard.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-12-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.
