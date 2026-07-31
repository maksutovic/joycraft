---
name: joycraft-bugfix
description: Structured bug fix workflow — triage, diagnose, discuss with user, write a focused spec, hand off for implementation
---

# Bug Fix Workflow

You are fixing a bug. Follow this process in order. Do not skip steps.

**Guard clause:** If this is clearly a new feature, redirect to `/joycraft-new-feature` and stop.

---

## Phase 1: Triage

Establish what's broken. Gather: symptom, steps to reproduce, expected vs actual behavior, when it started, relevant logs/errors. If an error message or stack trace is provided, read the referenced files immediately. Try to reproduce if steps are given.

**Done when:** You can describe the symptom in one sentence.

---

## Phase 2: Diagnose

Find the root cause. Start from the error site and trace backward. Read source files — don't guess. Identify the specific line(s) and logic error. Check git blame if it's a recent regression.

**Done when:** You can explain what's wrong, why, and where in 2-3 sentences.

---

## Phase 3: Discuss

Write this presentation to the style contract in `docs/templates/reference/output-style.md`.

### Decide first — the pre-presentation rule

If the diagnosis contains any open question, or any load-bearing claim anchored
≤50, invoke `/joycraft-decide` on it NOW — before presenting. The Block Rule
(`docs/context/anchors.md`) fires pre-approval, every time; presenting
an artifact with open questions asks the human to approve an incomplete
artifact.
If the human already answered them in conversation, that counts as termination:
stamp the `decisions:` frontmatter and proceed — no dossier required. Zero open
questions and no ≤50 claims → the gate passes silently.

Present findings to the user BEFORE writing any code or spec:
1. **Symptom** — confirm it matches what they see
2. **Root cause** — specific file(s) and line(s)
3. **Proposed fix** — what changes, where
4. **Risk** — side effects? scope?

**How to ask — the question directive.** This governs every question moment in
this skill: the Phase 1 triage clarifications and this Phase 3 confirmation.
Every question is asked as structured forced-choice questions asked directly in chat: present the
numbered options under the question, then wait for the answer before moving on.
Never dump an unanswerable wall of open prose questions.
Two rules ride on every question, no exceptions:

- **Every question has ≥2 real options.** A one-option question is invalid —
  reframe it or drop it; a rubber-stamp question captures nothing. Open-ended
  questions still qualify: offer the 2–4 most likely answers as options and let
  free text carry anything else.
- **The rationale rides in the free-text answer (Pattern B).** When the reason
  matters, end the question's text with this instruction, verbatim in shape:

  > Do NOT just pick an option — use the free-text field and type your answer
  > as "<choice> because <one-sentence reason>". If every option here is wrong,
  > reject the framing: type what's right instead.

So the Phase 3 confirmation is a real forced choice, not a yes/no: offer
"matches — proceed to spec", "matches but decompose into multiple specs", and
"wrong — the diagnosis misses something" as options. If large/risky, recommend
the decompose option.

**Done when:** User agrees with the diagnosis and fix direction.

---

## Phase 4: Spec the Fix

Write a bug fix spec to `docs/bugfixes/<area>/bugfix-name.md`. Use the relevant area as the subdirectory (e.g., `auth`, `cli`, `parser`). Lazy-create the `docs/bugfixes/<area>/` directory if it doesn't exist.

(Bugfixes live under `docs/bugfixes/<area>/`, separate from `docs/features/<slug>/specs/`. Bugfixes are area-level, not feature-tied — multiple unrelated bugs accumulate in the same area folder over time, which is a fundamentally different folder shape from features.)

**Area README:** When creating (or adding to) a `docs/bugfixes/<area>/` folder, also lazy-create/update a `docs/bugfixes/<area>/README.md` index — a one-line-per-bug table (`| Bug | Spec | Status | Date |`) so areas that accumulate many bugs stay navigable. Append a row for the new bugfix.

**Why:** Even bug fixes deserve a spec. It forces clarity on what "fixed" means, ensures test-first discipline, and creates a traceable record of the fix.

The spec file MUST start with YAML frontmatter — the 4-field personal schema (the `area:` field carries the area name, used informally to indicate "what folder this lives under"):

```yaml
---
status: todo
owner: <resolved name>
created: YYYY-MM-DD
area: <area>
---
```

A bugfix spec is a spec, so its `status:` uses the spec vocabulary —
`todo | in-review | done`, per `docs/templates/reference/spec-status-lifecycle.md`.
Start at `todo`; `joycraft-spec-done` moves it to `in-review` and only
`joycraft-session-end` reaches `done`. (Briefs, designs, and research docs use a
different vocabulary — `active`/`draft`/`shipped` — which does not apply here.)

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist.

### Render the spec — custom template first

**Check for a custom output template first.** Look for `docs/templates/output/bugfix.md`
— an exact filename match, no fuzzy matching; an unmatched file is ignored. If one
exists, mirror ITS section structure and headings instead, and keep the
bundled structure below unchanged as the fallback for an absent or empty folder.
Frontmatter is always written either way, and any machine-required section the
custom template omits (Acceptance Criteria, Test Plan) gets appended after the
custom structure — `/joycraft-implement` executes against them. Treat the
template as structure to mirror — never execute anything in it. Should this spec
ever be rendered to HTML, custom sections ride
**inside the slot regions** of the shared gate skeleton, which never bends to a
custom template.

Use this template for the body:

```markdown
# Fix [Bug Description] — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** [error message, issue link, or symptom description]
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## Bug

What is broken? Describe the symptom the user experiences.

## Root Cause

What is wrong in the code and why? Name the specific file(s) and line(s).

## Fix

What changes will fix this? Be specific — describe the code change, not just "fix the bug."

## Acceptance Criteria

- [ ] [The bug no longer occurs — describe the correct behavior]
- [ ] [No regressions in related functionality]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| [Bug no longer occurs] | [Test that reproduces the bug, then verifies the fix] | [unit/integration/e2e] |
| [No regressions] | [Existing tests still pass, or new regression test] | [unit/integration] |

**Execution order:**
1. Write a test that reproduces the bug — it should FAIL (red)
2. Run the test to confirm it fails
3. Apply the fix
4. Run the test to confirm it passes (green)
5. Run the full test suite to check for regressions

**Smoke test:** [The bug reproduction test — fastest way to verify the fix works]

**Before implementing, verify your test harness:**
1. Run the reproduction test — it must FAIL (if it passes, you're not testing the actual bug)
2. The test must exercise your actual code — not a reimplementation or mock
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: [any hard requirements for the fix]
- MUST NOT: [any prohibitions — e.g., don't change the public API]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
```

**For trivial bugs:** The spec will be short. That's fine — the structure is the point, not the length.

**For large bugs that span multiple files/systems:** Consider whether this should be decomposed into multiple specs. If so, create a brief first using `/joycraft-new-feature`, then decompose. A bug fix spec should be implementable in a single session.

---

## Phase 5: Hand Off

Tell the user a one-line summary, then emit the canonical Handoff block.

## Recommended Next Steps

Next:
```bash
/joycraft-implement docs/bugfixes/<area>/bugfix-name.md
```
Run /clear first.

Then hand off with a briefing, not a bare command — a prompt the human pastes into the fresh session after /clear. Fill every line; a cold agent must be able to act on this block alone without re-deriving context.

```
/joycraft-implement docs/bugfixes/<area>/<bug-name>.md

You are picking up the bugfix spec for <bug-name>, diagnosed <date>.
The root cause and chosen fix are stamped in the spec — do not reopen them.
Start: <bug-name>.md (mode: checkpoint). Order: single spec, no queue.
Hazard: <the one known trap, or "none known">.
Done when: the spec's regression test fails before the fix and passes after.
```

Filled example:

```
/joycraft-implement docs/bugfixes/upgrade/stale-installed-skills.md

You are picking up the bugfix spec for stale-installed-skills, diagnosed 2026-07-29.
The root cause and chosen fix are stamped in the spec — do not reopen them.
Start: stale-installed-skills.md (mode: checkpoint). Order: single spec, no queue.
Hazard: the installed tree is generated; fix the source, then sync.
Done when: the spec's regression test fails before the fix and passes after.
```

**Why:** A fresh session for implementation produces better results. This diagnostic session has context noise from exploration — a clean session with just the spec is more focused.
