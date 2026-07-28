# Skill Authoring

> How to write a skill step so a reader can tell what kind of deviation it tolerates.

## The PROTOCOL-vs-JUDGMENT Rule

Every step in a skill is one of two kinds:

- **PROTOCOL** — deterministic, machine-checkable. There is one correct way to do it, and a script or a grep could verify compliance. Deviation is a **bug**: the skill was written wrong, or the agent didn't follow it.
- **JUDGMENT** — requires model discretion. Reasonable agents could do it differently given the same inputs. Deviation is **calibration**, not error: it's a signal for whether the skill's guidance was clear enough, not proof the agent misbehaved.

New or changed skill steps must make this distinction explicit — either by labeling the step inline (a `PROTOCOL:` / `JUDGMENT:` prefix or a trailing tag) or by grouping steps under a heading that states which kind they are. A step with neither label defaults to JUDGMENT, since PROTOCOL is the stronger claim and should be opted into deliberately.

## Why This Matters

Confusing the two kinds breaks two different feedback loops:

- Treating a JUDGMENT step as PROTOCOL produces false-positive "bugs" — an audit flags an agent for a reasonable discretionary call, and the fix churns the skill without improving it.
- Treating a PROTOCOL step as JUDGMENT hides a real bug — deviation gets shrugged off as "the agent's call" when it should have failed a mechanical check.

`joycraft-optimize` and any future self-audit pass read this label when deciding whether a deviation from a skill is evidence of drift (PROTOCOL) or just variance (JUDGMENT).

## Examples

- PROTOCOL: "Update the `status:` field to `in-review` in both the queue JSON and the spec frontmatter." — either it happened or it didn't; a grep confirms it.
- JUDGMENT: "Pick the best-fit category if the fact could route to multiple docs." — two competent agents may reasonably disagree; that's not a bug.

## The Reference-Path Rule

A skill that points at a reference doc must cite the **user-project** path,
`docs/templates/reference/<name>.md` — never `docs/reference/<name>.md`.

This repo carries reference docs at two paths. `docs/reference/` is where
Joycraft reads its own; `src/templates/reference/` is the shipped copy, which
`npx joycraft init` scaffolds into a user project at `docs/templates/reference/`.
Skills in `src/skills/` run in the user's project, so only the second path
resolves there. (PROTOCOL — the pointer is either right or wrong, and a grep
confirms it.)

### Why This Matters

A skill citing the repo-local path works every time you test it here and is a
dead pointer in every project Joycraft scaffolds — the failure never shows up
where the author can see it.

### Example

`src/skills/joycraft-implement.md` is the live case — it cites
`docs/reference/spec-status-lifecycle.md`, a path that does not exist in a
scaffolded project:

- Wrong: `see docs/reference/spec-status-lifecycle.md`
- Right: `see docs/templates/reference/spec-status-lifecycle.md`

This file is its own cautionary case: `docs/reference/skill-authoring.md` is
repo-local on purpose and ships nowhere, so no skill can cite it.
