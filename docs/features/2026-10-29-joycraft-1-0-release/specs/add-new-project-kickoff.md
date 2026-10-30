---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 22
phase: 2
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Add the New-Project Kickoff — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready
> **Date:** 2026-10-29
> **Estimated scope:** Medium; setup reference, entry skill, templates, tests
> **Phase:** 2 — Host support
> **Where:** `joycraft-prototype` `field/1.0`

## What

When Joycraft is installed into a bare project (no source code, or only a README), first entry offers a **kickoff** before any brief or scaffold. The user talks freely about what they want to build; voice-to-text dumps are fine. The agent then asks short follow-up rounds, at most 3 questions a round, only about things that change decisions: users and purpose, the first outcome that counts as done, constraints, stack preferences, non-goals, and what is still undecided. It writes the result to the project's knowledge homes:

- `AGENTS.md`: purpose, established constraints, stack and commands marked `decided`, `proposed` or `not established`, and the context map.
- `CLAUDE.md`: the `@AGENTS.md` pointer (and the same pattern for the other hosts' entry files where a host needs one).
- `docs/context/project.md`: vision, users, non-goals, glossary, and the user's own words for the key ideas.
- `docs/context/decisions.md`: each decision with its reason and status, including the rejected options.
- The first brief, for the first outcome, with its "Done when" settled.

Then it shows a one-screen summary of what was captured and asks the user to correct it. After that, scaffolding and the stack choice are normal work: a brief, specs, and review.

## Why

Max, 2026-10-29: he wants to trial 1.0 on a project that does not exist yet, with a lot of context that is only in his head. Today first-use setup is deliberately minimal ("not a separate interview"), and on a bare project it records the stack as not established and continues. That is correct for an existing repository, but it loses the founder's context on a new one. The 0.7 `joycraft-interview` skill covered this and was dropped from the field build.

## Acceptance Criteria

- [ ] **AC1:** A bare project is detected (no source files outside `docs/`, `README*`, `LICENSE*` and dotfiles), and the agent offers the kickoff in one line. The user can decline. On an existing codebase, the kickoff is never offered automatically, but it can be asked for ("kickoff", "let me tell you about this project").
- [ ] **AC2:** The free-form dump is captured first and kept: a verbatim copy goes to `docs/context/kickoff-notes.md`, so nothing the user said is lost to summarizing.
- [ ] **AC3:** Follow-up rounds ask at most 3 questions each, never ask about something the dump already answered, and stop when the user says enough or nothing consequential is open.
- [ ] **AC4:** The written files follow the existing setup rules: user intent is kept apart from assumptions, nothing undecided is written as a boundary, there are no empty files and no dangling links, and existing files are edited, never replaced.
- [ ] **AC5:** The summary screen lists each written file with 2–4 lines of what it holds, and the user's corrections are applied before any brief, spec or scaffold work starts.
- [ ] **AC6:** The kickoff does not choose the stack or scaffold the app. A stated preference is recorded as `proposed` until the user confirms it.
- [ ] **AC7:** Live trial: Max installs the field build into a new empty folder for his new project (field sync or the exporter; the README prompt comes later, in spec 18), does the kickoff, and reports whether the captured context matches what he meant. Gaps become fixes in this spec before release.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Fixtures: empty folder, README-only folder, small existing app; assert offer, no offer, and explicit request. | Unit |
| AC2 | Simulated dump; assert `kickoff-notes.md` holds it verbatim. | Integration |
| AC3 | Scripted dump that already answers the users and the stack; assert the follow-up questions skip both. | Integration |
| AC4 | Run on a fixture with an existing `AGENTS.md`; assert user lines are unchanged and the links resolve. | Integration |
| AC5–AC6 | Assert the summary content and that no package manifest or source file is created. | Integration |
| AC7 | Max's live trial; result recorded in the spec report. | Live, manual |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST NOT scaffold an app, install packages or pick a stack during the kickoff.
- MUST work on all six hosts with plain chat; an HTML or artifact review surface is optional, where the host has one.
- MUST keep the agent-facing files exhaustive and the summary to the user short.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `.joycraft-prototype/references/setup.md` | Kickoff branch for bare projects |
| Modify | `.agents/skills/joycraft-entry/SKILL.md` | Offer and run the kickoff |
| Add | `.joycraft-prototype/templates/project-context.md` | `docs/context/project.md` template |
| Add | `.joycraft-prototype/templates/decisions.md` | Decision log template |
| Add | `tests/kickoff.test.mjs` | AC1–AC6 |

## Approach

Reuse the brief template for the first outcome. Port only the useful parts of the 0.7 `joycraft-interview` flow (rounds of focused questions and verbatim capture); leave out its separate phase and file sprawl.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| User dumps a lot across several messages | Append each one to `kickoff-notes.md`; summarize only at the end. |
| User wants to start coding right away | Write what is known, mark the rest open, and continue to the first brief. |
