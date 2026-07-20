---
name: joycraft-implement-feature
description: Run a feature's entire spec queue from one invocation — specs run inline in this conversation; parallel subagents only for waves marked parallel-safe; fail-fast, session-end once at the end
instructions: 24
---

# Implement Feature (Whole-Queue Driver)

One invocation runs a feature's whole spec queue: `/joycraft-implement-feature docs/features/<slug>/`. **You implement specs in this conversation by default** — sequential specs run inline, one at a time. Subagents exist for exactly two cases: a wave the plan marks **parallel-safe** (concurrent agents are the mechanism for parallelism), and a spec whose execution mode is `isolated` (a fresh context is the mode's entire meaning; the subagent boundary provides it in-session, the equivalent of Pi's process-per-spec loop). Everything else stays in the main conversation. This is ordinary interactive use of your harness — one human invocation, no headless loop, no ToS/cost caveat.

## Step 1: Load the Queue

1. Resolve the specs directory: if the given path contains a `specs/` subdirectory, use it; otherwise use the path itself. Look for `.joycraft-spec-queue.json` there.
2. **No queue** → stop:

   > No spec queue found in [path]. Run `/joycraft-decompose` first — it writes the queue, the specs, and the wave plan.

3. Read the sibling `README.md` (the wave plan written by `/joycraft-decompose`) — it tells you the intended order and which waves, if any, are marked **parallel-safe**.
4. Report the plan before starting: feature slug, M specs, current statuses, the order you'll run them in.
5. If **no `todo` specs remain**, skip to Step 4 and say why (everything is already `in-review`/`done`).

## Step 2: The Loop — Inline by Default, Subagents Only Where They Earn It

Repeat until no `todo` specs remain:

1. **Find the next ready spec(s)**: the first `todo` whose `depends_on` are all `in-review`/`done`. Use `.pi/scripts/joycraft/joycraft-next-spec <specs-dir>` if installed, else read the queue JSON directly.
2. **None ready but `todo` specs remain** → fail-fast (Step 3): report which specs are blocked and on what. Never run a spec whose dependencies are unmet.
3. **Choose the execution path** for what's ready:

   - **Parallel-safe wave with ≥2 ready specs** (the README marks the wave **parallel-safe** — disjoint Affected Files): spawn the wave's specs as **concurrent subagents**, one per spec, each with the subagent prompt below. Announce it in one line first (`Wave N is parallel-safe — running its K specs as concurrent subagents`). **Never parallelize an unmarked wave** — concurrent edits to shared files produce exactly the conflicts the wave plan exists to prevent.
   - **Spec with execution mode `isolated`**: run that one spec in a **single fresh-context subagent** (fresh context is the mode's meaning) using the subagent prompt below.
   - **Everything else — the default**: implement the spec **inline, in this conversation**. Read `.claude/skills/joycraft-implement/SKILL.md` and follow it end to end — strict TDD (write the Test Plan's tests first, confirm they fail, implement until green), every Acceptance Criterion met — but skip that skill's "continue the queue" step: this loop owns the queue. Then the per-spec wrap-up from `.claude/skills/joycraft-spec-done/SKILL.md`: bump to `in-review` in BOTH `.joycraft-spec-queue.json` and the spec's `status:` frontmatter, 2-line discovery stub ONLY if something contradicted the spec, commit `spec: <spec-name>`. No push, no PR, no session-end mid-queue.

   Do **not** route sequential specs through subagents — inline execution keeps the work visible in the conversation and spends no orchestration overhead where there is nothing to orchestrate.

4. **Subagent prompt** (parallel waves and `isolated` specs only; fill in concrete paths — the subagent starts with zero context):

   > Implement exactly one atomic spec: `<spec-path>`.
   > 1. Read `.claude/skills/joycraft-implement/SKILL.md` and follow it for this spec — strict TDD (write the Test Plan's tests first, confirm they fail, implement until green), every Acceptance Criterion met. IMPORTANT: skip that skill's "continue the queue" step — you own exactly this one spec.
   > 2. Then perform the per-spec wrap-up defined in `.claude/skills/joycraft-spec-done/SKILL.md`: bump the spec to `in-review` in BOTH `.joycraft-spec-queue.json` and the spec file's `status:` frontmatter; write a 2-line discovery stub at `docs/discoveries/` ONLY if something contradicted the spec; commit as `spec: <spec-name>`. Do NOT push, do NOT open a PR, do NOT run session-end, do NOT touch other specs.
   > 3. Reply with: tests written and passing (counts), each Acceptance Criterion's status, the commit hash, and the discovery stub path if any. If you could not get tests green, say so explicitly and DO NOT bump the status or commit a broken state.

5. **Verify, don't trust** — after every spec, inline or subagent: confirm in the queue JSON that the spec is `in-review` and in `git log` that the `spec: <name>` commit exists. For a parallel wave, verify every spec in the wave before starting anything new. Anything missing, or a failure reported → fail-fast (Step 3).

## Step 3: Fail-Fast

When a spec fails (tests not green, wrap-up missing, a subagent reports failure, or all remaining specs are blocked):

- **Stop the loop.** Start no further specs. In a parallel wave, let already-running subagents finish and verify them, but launch nothing new.
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
