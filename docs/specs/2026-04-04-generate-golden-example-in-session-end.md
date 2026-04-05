# Generate Golden Example in Session-End — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-04-pipit-golden-examples.md`
> **Status:** Complete
> **Date:** 2026-04-04
> **Estimated scope:** 1 session / 1 file / ~50 lines

---

## What

Add a golden example generation step to the `session-end` skill. After a successful session that produced a brief and specs, session-end silently writes a golden example file to `docs/pipit-examples/` using the defined template format. The step is completely silent — no user prompting, no conversational output.

## Why

This closes the feedback loop. Without auto-generation at session-end, golden examples would require manual effort, and nobody would create them. The session-end hook is the natural trigger because it runs after work is validated and committed.

## Acceptance Criteria

- [ ] Session-end skill includes a new step that generates a golden example
- [ ] Golden example is only generated when a brief and specs exist for the current session's work
- [ ] Golden example file is written to `docs/pipit-examples/YYYY-MM-DD-feature-name.md`
- [ ] Golden example contains: capture text (from brief's Vision section), classification, decomposition summary (from brief's Decomposition table), and rationale
- [ ] Generation is silent — no user prompting, no "I generated a golden example" output
- [ ] If `docs/pipit-examples/` doesn't exist, generation is skipped silently (no error)
- [ ] Existing session-end behavior is unchanged
- [ ] Build passes

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill file contains golden example step | Read skill, assert contains golden example instructions | unit |
| Step is conditional on brief/specs existing | Skill text includes condition check | unit |
| Step is silent | Skill text includes "silent" / "no output" instruction | unit |
| Skip when no pipit-examples dir | Skill text includes skip-if-missing instruction | unit |

**Execution order:**
1. Read current session-end skill
2. Add golden example generation step
3. Verify build passes (skill is bundled correctly)

**Smoke test:** Build and check the bundled skill contains the new step.

## Constraints

- MUST: Be silent — the skill must instruct Claude to not mention golden example generation to the user
- MUST: Only generate when a brief + specs were produced in the session
- MUST: Skip gracefully when `docs/pipit-examples/` doesn't exist
- MUST: Use the golden example template format from Spec 2
- MUST NOT: Prompt the user for confirmation
- MUST NOT: Add any new runtime dependencies
- MUST NOT: Change existing session-end steps (1-5) — this is an additive step

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `templates/claude-kit/skills/session-end.md` | Add step 6: golden example generation |

## Approach

Add a new "Step 6: Golden Example (silent)" section to the session-end skill. The step instructs Claude to:
1. Check if `docs/pipit-examples/` exists — if not, skip entirely
2. Check if the current session produced a brief (look for a brief file referenced in the spec being worked on) — if not, skip
3. Extract: the Vision section as capture text, determine classification based on what Joycraft skills were used, copy the Decomposition table, write a 2-3 sentence rationale
4. Write the file to `docs/pipit-examples/YYYY-MM-DD-feature-name.md`
5. Do not mention this step to the user — it's background bookkeeping

The classification is inferred from the session: if `/joycraft-new-feature` was used, it's likely a "design" or "decompose" level capture. If just `/joycraft-session-end`, it's "execute" level.

Rejected alternative: Making this a separate skill (`/joycraft-golden-example`). This would require the user to remember to run it, defeating the purpose of silent auto-generation.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No `docs/pipit-examples/` directory | Skip silently, no error |
| No brief/specs in this session | Skip silently, no error |
| Brief exists but no specs yet | Skip — incomplete pipeline, not a good example |
| Multiple briefs in session | Use the most recently referenced brief |
| Golden example file already exists for this date+feature | Overwrite — latest session is more accurate |
