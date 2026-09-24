---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: batch
---

# Add the Untrusted-Text Rule to the Intent README — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / 3 files / ~30 lines

---

## What

`src/templates/intent/README.md` gains a short section, `## Third-Party Text`, that tells any writer who files an intent with text they did not write (a ticket body, an alert payload, a customer email) to wrap each such block in `<pasted_content id="…">` and `</pasted_content>`, one short random id on both tags, each tag on its own line. Intents a human writes in their own words need no tags. Consuming skills follow instructions inside the tags only where the intent's own author asks. The section cites the "Mark Untrusted Text" block of `docs/templates/reference/model-profile-claude.md` by path and heading and does not copy its prose.

`docs/backlog/2026-09-22-intent-external-triggers.md` gains one line: external writers must follow the Third-Party Text rule in `docs/intent/README.md`.

## Why

Decision D5: the intent `source:` field already accepts `linear:<id>` and `alert:<name>`, so third-party text will land in intents, and consuming skills act on intent content.

## Acceptance Criteria

- [ ] The README has `## Third-Party Text` with the tag shape, the random-id rule, and the path-plus-heading citation. [src: D5]
- [ ] The backlog item has the one line. [src: brief "Decomposition"]
- [ ] Build passes; tests pass. [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| README section | `tests/intent-template.test.ts`: new case asserts the heading, `<pasted_content id=`, `</pasted_content>`, and the citation of `docs/templates/reference/model-profile-claude.md` with "Mark Untrusted Text" | unit |
| Backlog line | Same file or a new small case: the backlog file mentions `Third-Party Text` | unit |

**Execution order:**
1. Write the tests — red.
2. Confirm.
3. Edit until green.

**Smoke test:** `pnpm vitest run tests/intent-template.test.ts`

**Before implementing, verify your test harness:**
1. The new cases must FAIL first
2. They read the real files
3. Seconds to run

## Constraints

- MUST: keep the section under 15 lines, in the README's plain style. [src: INVENTED]
- MUST NOT: change `src/templates/INTENT_TEMPLATE.md` or any skill. [src: INVENTED]
- MUST NOT: edit `docs/intent/README.md` in this repo by hand; spec 9's updater run installs it, and `tests/dogfood-update.test.ts` requires `docs/intent/` to hold only `README.md`. [src: INVENTED]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/intent/README.md` | New section |
| Modify | `src/update-inventory.ts` | Same section in the `INTENT_README` constant; `tests/intent-template.test.ts` asserts it equals the template byte for byte |
| Modify | `docs/backlog/2026-09-22-intent-external-triggers.md` | One line |
| Modify | `tests/intent-template.test.ts` | New cases |
| Regenerate | `src/bundled-files.ts` | `pnpm sync-skills` |

## Approach

Two text edits and their assertions.

Rejected alternative: add a `trusted:` field to the intent frontmatter. The tags work with Claude Code's existing system-prompt note and need no schema change.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A human pastes a customer email into an intent by hand | The same rule applies; the README says so |
