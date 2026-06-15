---
name: joycraft-implement-feature
description: Run a feature's entire spec queue from one invocation — fresh-context subagent per spec, fail-fast, session-end once at the end
instructions: 24
---

# Implement Feature (Whole-Queue Driver)

One invocation runs a feature's whole spec queue: `/joycraft-implement-feature docs/features/<slug>/`. You are the **driver** — you orchestrate; you do **not** implement specs in this conversation. Each spec runs in a **fresh-context subagent**: the subagent boundary is the context isolation, the in-session equivalent of Pi's process-per-spec loop. This is ordinary interactive use of your harness — one human invocation, no headless loop, no ToS/cost caveat.

## Step 1: Load the Queue

1. Resolve the specs directory: if the given path contains a `specs/` subdirectory, use it; otherwise use the path itself. Look for `.joycraft-spec-queue.json` there.
2. **No queue** → stop:

   > No spec queue found in [path]. Run `/joycraft-decompose` first — it writes the queue, the specs, and the wave plan.

3. Read the sibling `README.md` (the wave plan written by `/joycraft-decompose`) — it tells you the intended order and which waves, if any, are marked **parallel-safe**.
4. Report the plan before starting: feature slug, M specs, current statuses, the order you'll run them in.
5. If **no `todo` specs remain**, skip to Step 4 and say why (everything is already `in-review`/`done`).

## Step 2: The Loop — One Subagent per Spec

Repeat until no `todo` specs remain:

1. **Find the next ready spec**: the first `todo` whose `depends_on` are all `in-review`/`done`. Use `.pi/scripts/joycraft/joycraft-next-spec <specs-dir>` if installed, else read the queue JSON directly.
2. **None ready but `todo` specs remain** → fail-fast (Step 3): report which specs are blocked and on what. Never run a spec whose dependencies are unmet.
3. **Spawn one subagent** for the spec, with a prompt of this shape (fill in the concrete paths — the subagent starts with zero context):

   > Implement exactly one atomic spec: `<spec-path>`.
   > 1. Read `.claude/skills/joycraft-implement/SKILL.md` and follow it for this spec — strict TDD (write the Test Plan's tests first, confirm they fail, implement until green), every Acceptance Criterion met. IMPORTANT: skip that skill's "continue the queue" step — you own exactly this one spec.
   > 2. Then perform the per-spec wrap-up defined in `.claude/skills/joycraft-spec-done/SKILL.md`: bump the spec to `in-review` in BOTH `.joycraft-spec-queue.json` and the spec file's `status:` frontmatter; write a 2-line discovery stub at `docs/discoveries/` ONLY if something contradicted the spec; commit as `spec: <spec-name>`. Do NOT push, do NOT open a PR, do NOT run session-end, do NOT touch other specs.
   > 3. Reply with: tests written and passing (counts), each Acceptance Criterion's status, the commit hash, and the discovery stub path if any. If you could not get tests green, say so explicitly and DO NOT bump the status or commit a broken state.

4. **Verify, don't trust**: when the subagent returns, confirm in the queue JSON that the spec is `in-review` and in `git log` that the `spec: <name>` commit exists. Both present → continue the loop. Either missing, or the subagent reported failure → fail-fast (Step 3).

**Sequential by default.** Run a wave's specs in parallel ONLY when both hold: the README marks that wave **parallel-safe** (disjoint Affected Files), AND the user asked for parallelism. Never parallelize an unmarked wave — concurrent edits to shared files produce exactly the conflicts the wave plan exists to prevent.

## Step 3: Fail-Fast

When a spec fails (tests not green, wrap-up missing, subagent reports failure, or all remaining specs are blocked):

- **Stop the loop.** Start no further specs.
- Report: which spec failed and why, what reached `in-review`, what remains `todo`. Leave the queue exactly as it is — never mark anything to cover a failure.
- Suggest the recovery path: investigate in a fresh conversation with `/joycraft-implement <failed-spec>`, then re-run `/joycraft-implement-feature` to finish the remainder.

## Step 4: Finish — Session-End Once

When no `todo` specs remain, run the once-per-feature finisher yourself, in this conversation: invoke `/joycraft-session-end` (or read and follow `.claude/skills/joycraft-session-end/SKILL.md`). It owns the gates the loop deliberately skipped: full validation (must pass before anything graduates `in-review → done`), discovery consolidation, and push/PR per the project's CLAUDE.md git autonomy rules.

## Final Report

```
Feature run: <slug>
- Specs completed: N of M (now in-review/done) · failures: [none | <spec> — <reason>]
- Session-end: [ran — see its report | skipped: <reason>]
- Discoveries: [n stubs consolidated | none]
```
