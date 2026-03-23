# [Feature Name] — Implementation Plan

> **Design Spec:** `docs/superpowers/specs/YYYY-MM-DD-feature-name-design.md`
> **Date:** YYYY-MM-DD
> **Estimated Tasks:** [number]

---

## Prerequisites

- [ ] Design spec is approved
- [ ] Branch created (if warranted): `feature/feature-name`
- [ ] Required context loaded: [list any docs Claude should read first]

## Execution Directive

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Complete each task fully before moving to the next. Commit after each task.

---

## Task 1: [Descriptive Name]

**Goal:** One sentence — what is true after this task that wasn't true before.

**Files:**
- `path/to/file.ts` — [what changes, with line numbers if modifying existing code]

**Steps:**
1. [Concrete action — not "implement the feature" but "add the `ImportResult` interface to `types.ts`"]
2. [Next concrete action]

**Verification:**
- [ ] [How to confirm this task worked — command to run, behavior to observe]

**Commit:** `feat: add ImportResult interface for multi-format handler`

---

## Task 2: [Descriptive Name]

_[Same structure as Task 1. Repeat for each task.]_

---

## Task N: Final Verification

**Goal:** Confirm everything works end-to-end.

**Steps:**
1. Run full type-check: `[project-specific command]`
2. Run linter: `[project-specific command]`
3. Run tests: `[project-specific command, or "manual verification" if no test suite]`
4. Walk through verification checklist from design spec

**Verification:**
- [ ] All design spec verification items pass
- [ ] No regressions in existing functionality
- [ ] Session note created in `docs/claude-sessions/`

**Commit:** `feat: complete [feature name] implementation`

---

## Rollback Plan

If something goes wrong mid-implementation:
- [How to revert safely — e.g., "git stash and return to main"]
- [What state the system should be in if we abort]

---

## Template Usage Notes

**Task sizing:**
- Each task should be completable in one focused stretch (15-60 min of Claude work)
- If a task description exceeds 10 lines, break it into subtasks
- Tasks should be independently committable — each commit leaves the project in a working state

**Dependency ordering:**
- If Task 3 depends on Task 2, state it: "**Depends on:** Task 2"
- Independent tasks can note: "**Parallelizable with:** Task 4" (for agent teams)

**The golden rule from StrongDM:**
The plan should be detailed enough that Claude can execute it without asking a single question. If Claude needs to ask, the spec or plan has a gap — fix the document, don't just answer the question.

**After implementation → create session note documenting what happened.**
