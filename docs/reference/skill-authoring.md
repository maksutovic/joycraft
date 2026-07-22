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
