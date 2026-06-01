# Discoveries — pi -p triggers /skill: from the prompt string

**Date:** 2026-05-30
**Spec:** `docs/features/2026-05-28-lightweight-spec-done/specs/pi-implement-loop.md`

## `pi -p "/skill:<name> ..."` invokes the skill (was an open question)

**Expected:** Unknown — research (`docs/features/2026-05-26-pi-support/research.md`, Open items #2) flagged it as unconfirmed whether a slash-skill in a `pi -p` prompt string triggers the skill, or whether it needs description-based auto-invocation.

**Actual:** It triggers. Verified live against the installed `pi` (`@earendil-works/pi-coding-agent`, node v22):
`pi -p '/skill:joycraft-spec-done — do NOT take action; describe this skill'` returned an accurate four-step summary of the skill body — proving the skill was resolved and its content loaded into context.

**Impact:** The `joycraft-implement-loop` driver's prompt form (`/skill:joycraft-implement <spec>`, `/skill:joycraft-spec-done <spec>`) is correct as written; no description-match fallback is needed. This is the last unknown in the isolated-mode loop — the headless Pi path is now fully grounded.

## How to smoke-test the feature locally (no npm deploy needed)

`pi` is installed on this machine, and `init`/`upgrade` are tested by calling the functions into a temp dir (no publish). The cheap local checks:
- `pnpm build && node dist/cli.js init /tmp/test-project` — real install-as-if-npx into a throwaway dir.
- `pnpm vitest run tests/pi-implement-loop.test.ts` — runs the REAL loop script against a fake `pi` stub (via `PI_BIN`), so the loop logic is covered with zero token cost.
- A real end-to-end loop run is possible here (pi is installed) but spends API tokens — reserve for a deliberate manual check, not CI.
