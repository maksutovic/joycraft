---
name: joycraft-implement-feature
<!-- harness:claude -->
description: Run a feature's entire spec queue from one invocation — fresh-context subagent per spec, fail-fast, session-end once at the end
instructions: 24
<!-- /harness -->
<!-- harness:codex -->
description: Run a feature's entire spec queue from one invocation — sequential chain with per-spec wrap-up, fail-fast, session-end once at the end
<!-- /harness -->
<!-- harness:pi -->
description: Run a feature's entire spec queue from one invocation — delegates to the joycraft-implement-loop driver (fresh pi -p process per spec)
<!-- /harness -->
---

# Implement Feature (Whole-Queue Driver)

<!-- harness:claude -->
One invocation runs a feature's whole spec queue: `{{skill_prefix}}implement-feature docs/features/<slug>/`. You are the **driver** — you orchestrate; you do **not** implement specs in this conversation. Each spec runs in a **fresh-context subagent**: the subagent boundary is the context isolation, the in-session equivalent of Pi's process-per-spec loop. This is ordinary interactive use of your harness — one human invocation, no headless loop, no ToS/cost caveat.

## Step 1: Load the Queue

1. Resolve the specs directory: if the given path contains a `specs/` subdirectory, use it; otherwise use the path itself. Look for `.joycraft-spec-queue.json` there.
2. **No queue** → stop:

   > No spec queue found in [path]. Run `{{skill_prefix}}decompose` first — it writes the queue, the specs, and the wave plan.

3. Read the sibling `README.md` (the wave plan written by `{{skill_prefix}}decompose`) — it tells you the intended order and which waves, if any, are marked **parallel-safe**.
4. Report the plan before starting: feature slug, M specs, current statuses, the order you'll run them in.
5. If **no `todo` specs remain**, skip to Step 4 and say why (everything is already `in-review`/`done`).

## Step 2: The Loop — One Subagent per Spec

Repeat until no `todo` specs remain:

1. **Find the next ready spec**: the first `todo` whose `depends_on` are all `in-review`/`done`. Use `.pi/scripts/joycraft/joycraft-next-spec <specs-dir>` if installed, else read the queue JSON directly.
2. **None ready but `todo` specs remain** → fail-fast (Step 3): report which specs are blocked and on what. Never run a spec whose dependencies are unmet.
3. **Spawn one subagent** for the spec, with a prompt of this shape (fill in the concrete paths — the subagent starts with zero context):

   > Implement exactly one atomic spec: `<spec-path>`.
   > 1. Read `{{skills_dir}}/joycraft-implement/SKILL.md` and follow it for this spec — strict TDD (write the Test Plan's tests first, confirm they fail, implement until green), every Acceptance Criterion met. IMPORTANT: skip that skill's "continue the queue" step — you own exactly this one spec.
   > 2. Then perform the per-spec wrap-up defined in `{{skills_dir}}/joycraft-spec-done/SKILL.md`: bump the spec to `in-review` in BOTH `.joycraft-spec-queue.json` and the spec file's `status:` frontmatter; write a 2-line discovery stub at `docs/discoveries/` ONLY if something contradicted the spec; commit as `spec: <spec-name>`. Do NOT push, do NOT open a PR, do NOT run session-end, do NOT touch other specs.
   > 3. Reply with: tests written and passing (counts), each Acceptance Criterion's status, the commit hash, and the discovery stub path if any. If you could not get tests green, say so explicitly and DO NOT bump the status or commit a broken state.

4. **Verify, don't trust**: when the subagent returns, confirm in the queue JSON that the spec is `in-review` and in `git log` that the `spec: <name>` commit exists. Both present → continue the loop. Either missing, or the subagent reported failure → fail-fast (Step 3).

**Sequential by default.** Run a wave's specs in parallel ONLY when both hold: the README marks that wave **parallel-safe** (disjoint Affected Files), AND the user asked for parallelism. Never parallelize an unmarked wave — concurrent edits to shared files produce exactly the conflicts the wave plan exists to prevent.

## Step 3: Fail-Fast

When a spec fails (tests not green, wrap-up missing, subagent reports failure, or all remaining specs are blocked):

- **Stop the loop.** Start no further specs.
- Report: which spec failed and why, what reached `in-review`, what remains `todo`. Leave the queue exactly as it is — never mark anything to cover a failure.
- Suggest the recovery path: investigate in a fresh conversation with `{{skill_prefix}}implement <failed-spec>`, then re-run `{{skill_prefix}}implement-feature` to finish the remainder.

## Step 4: Finish — Session-End Once

When no `todo` specs remain, run the once-per-feature finisher yourself, in this conversation: invoke `{{skill_prefix}}session-end` (or read and follow `{{skills_dir}}/joycraft-session-end/SKILL.md`). It owns the gates the loop deliberately skipped: full validation (must pass before anything graduates `in-review → done`), discovery consolidation, and push/PR per the project's {{boundary_file}} git autonomy rules.

## Final Report

```
Feature run: <slug>
- Specs completed: N of M (now in-review/done) · failures: [none | <spec> — <reason>]
- Session-end: [ran — see its report | skipped: <reason>]
- Discoveries: [n stubs consolidated | none]
```
<!-- /harness -->
<!-- harness:codex -->
One invocation runs a feature's whole spec queue: `{{skill_prefix}}implement-feature docs/features/<slug>/`. You drive the queue **sequentially in this conversation** — Codex has no subagent boundary to give each spec a fresh context, so the chain shares context and compensates with disciplined per-spec wrap-ups. This is ordinary interactive use — one human invocation, no headless loop, no ToS/cost caveat.

> **Context honesty:** for queues of heavy `isolated`-mode specs, a shared-context chain is the wrong tool — true per-spec isolation comes from Pi's `joycraft-implement-loop` (fresh process per spec) or guided-manual (`/new` + re-invoke per spec). Say so up front when you see a queue dominated by `isolated` specs, then proceed only if the user confirms.

## Step 1: Load the Queue

1. Resolve the specs directory: if the given path contains a `specs/` subdirectory, use it; otherwise use the path itself. Look for `.joycraft-spec-queue.json` there.
2. **No queue** → stop:

   > No spec queue found in [path]. Run `{{skill_prefix}}decompose` first — it writes the queue, the specs, and the wave plan.

3. Read the sibling `README.md` (the wave plan) for the intended order. Waves marked parallel-safe still run sequentially here — parallelism needs isolation this harness chain doesn't have.
4. Report the plan before starting: feature slug, M specs, current statuses, the order you'll run them in. If the queue is dominated by `isolated` specs, surface the context-honesty note above and get a confirmation.
5. If **no `todo` specs remain**, skip to Step 4 and say why.

## Step 2: The Chain — One Spec at a Time

Repeat until no `todo` specs remain:

1. **Find the next ready spec**: the first `todo` whose `depends_on` are all `in-review`/`done` (read the queue JSON).
2. **None ready but `todo` specs remain** → fail-fast (Step 3): report which specs are blocked and on what.
3. **Execute the spec** by following `{{skills_dir}}/joycraft-implement/SKILL.md` end to end — strict TDD (failing tests first, implement until green, every Acceptance Criterion met), then its per-spec wrap-up: bump to `in-review` in BOTH the queue JSON and the spec's frontmatter, terse discovery stub only if surprised, commit `spec: <spec-name>`. (Treat `isolated` specs the user approved into this chain as `checkpoint`.)
4. **Verify before advancing**: queue shows `in-review`, `git log` shows the `spec:` commit, tests green. Anything off → fail-fast (Step 3).
5. Report one line — `Spec complete: <name> (spec N of M)` — and continue.

## Step 3: Fail-Fast

When a spec fails (tests not green, or all remaining specs are blocked):

- **Stop the chain.** Start no further specs.
- Report: which spec failed and why, what reached `in-review`, what remains `todo`. Leave the queue exactly as it is — never mark anything to cover a failure.
- Suggest the recovery path: fix in a fresh conversation (`/new`, then `{{skill_prefix}}implement <failed-spec>`), then re-run `{{skill_prefix}}implement-feature` for the remainder.

## Step 4: Finish — Session-End Once

When no `todo` specs remain, run the once-per-feature finisher yourself: read and follow `{{skills_dir}}/joycraft-session-end/SKILL.md`. It owns the gates the chain deliberately skipped: full validation (must pass before anything graduates `in-review → done`), discovery consolidation, and push/PR per the project's {{boundary_file}} git autonomy rules.

## Final Report

```
Feature run: <slug>
- Specs completed: N of M (now in-review/done) · failures: [none | <spec> — <reason>]
- Session-end: [ran — see its report | skipped: <reason>]
- Discoveries: [n stubs consolidated | none]
```
<!-- /harness -->
<!-- harness:pi -->
One invocation runs a feature's whole spec queue: `{{skill_prefix}}implement-feature docs/features/<slug>/`. On Pi the driver already exists as a script — `.pi/scripts/joycraft/joycraft-implement-loop` — and the process boundary it creates (a fresh `pi -p` per spec) is the verified context isolation. **Your job is to point the loop at the right queue and run it, not to reimplement it.**

## Step 1: Load the Queue

1. Resolve the specs directory: if the given path contains a `specs/` subdirectory, use it; otherwise use the path itself. Look for `.joycraft-spec-queue.json` there.
2. **No queue** → stop:

   > No spec queue found in [path]. Run `{{skill_prefix}}decompose` first — it writes the queue, the specs, and the wave plan.

3. Read the sibling `README.md` (the wave plan) and report the plan: feature slug, M specs, current statuses, the order the loop will serve them in (`joycraft-next-spec` order: first `todo` whose `depends_on` are all `in-review`/`done`).
4. If **no `todo` specs remain**, report that and suggest `{{skill_prefix}}session-end` if the feature was never finished; do not run the loop.

## Step 2: Run the Loop

Invoke the driver via the shell, pointing at the specs dir:

```
joycraft-implement-loop docs/features/<slug>/specs
```

What it does (so you can narrate it, not reimplement it): `joycraft-next-spec` → fresh `pi -p "{{skill_prefix}}implement <spec>"` → fresh `pi -p "{{skill_prefix}}spec-done <spec>"` → repeat; **fail-fast** (exits non-zero naming the failing spec, queue left intact); runs `joycraft-session-end` exactly once when the queue is exhausted.

Notes:
- The driver spawns `pi -p` subprocesses; nesting it under an already-running Pi session is sound by design but not yet smoke-tested end-to-end — if the nested `pi -p` misbehaves, fall back to telling the human to run the command above in a separate terminal.
- **ToS/cost:** this path is for Pi with a BYO API key or open-weight model — do not route a subscription OAuth through it.

## Step 3: Report

Relay the loop's outcome:

- **Success** → which specs ran, and session-end's own report (validation, graduation `in-review → done`, push/PR per AGENTS.md autonomy).
- **Failure** → which spec failed (the loop names it), what reached `in-review`, what remains `todo`. Suggest fixing in a fresh session (`{{skill_prefix}}implement <failed-spec>`), then re-running the loop for the remainder — it picks up where it stopped.
<!-- /harness -->
