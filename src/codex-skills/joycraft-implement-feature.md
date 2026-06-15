---
name: joycraft-implement-feature
description: Run a feature's entire spec queue from one invocation — sequential chain with per-spec wrap-up, fail-fast, session-end once at the end
---

# Implement Feature (Whole-Queue Driver)

One invocation runs a feature's whole spec queue: `$joycraft-implement-feature docs/features/<slug>/`. You drive the queue **sequentially in this conversation** — Codex has no subagent boundary to give each spec a fresh context, so the chain shares context and compensates with disciplined per-spec wrap-ups. This is ordinary interactive use — one human invocation, no headless loop, no ToS/cost caveat.

> **Context honesty:** for queues of heavy `isolated`-mode specs, a shared-context chain is the wrong tool — true per-spec isolation comes from Pi's `joycraft-implement-loop` (fresh process per spec) or guided-manual (`/new` + re-invoke per spec). Say so up front when you see a queue dominated by `isolated` specs, then proceed only if the user confirms.

## Step 1: Load the Queue

1. Resolve the specs directory: if the given path contains a `specs/` subdirectory, use it; otherwise use the path itself. Look for `.joycraft-spec-queue.json` there.
2. **No queue** → stop:

   > No spec queue found in [path]. Run `$joycraft-decompose` first — it writes the queue, the specs, and the wave plan.

3. Read the sibling `README.md` (the wave plan) for the intended order. Waves marked parallel-safe still run sequentially here — parallelism needs isolation this harness chain doesn't have.
4. Report the plan before starting: feature slug, M specs, current statuses, the order you'll run them in. If the queue is dominated by `isolated` specs, surface the context-honesty note above and get a confirmation.
5. If **no `todo` specs remain**, skip to Step 4 and say why.

## Step 2: The Chain — One Spec at a Time

Repeat until no `todo` specs remain:

1. **Find the next ready spec**: the first `todo` whose `depends_on` are all `in-review`/`done` (read the queue JSON).
2. **None ready but `todo` specs remain** → fail-fast (Step 3): report which specs are blocked and on what.
3. **Execute the spec** by following `.agents/skills/joycraft-implement/SKILL.md` end to end — strict TDD (failing tests first, implement until green, every Acceptance Criterion met), then its per-spec wrap-up: bump to `in-review` in BOTH the queue JSON and the spec's frontmatter, terse discovery stub only if surprised, commit `spec: <spec-name>`. (Treat `isolated` specs the user approved into this chain as `checkpoint`.)
4. **Verify before advancing**: queue shows `in-review`, `git log` shows the `spec:` commit, tests green. Anything off → fail-fast (Step 3).
5. Report one line — `Spec complete: <name> (spec N of M)` — and continue.

## Step 3: Fail-Fast

When a spec fails (tests not green, or all remaining specs are blocked):

- **Stop the chain.** Start no further specs.
- Report: which spec failed and why, what reached `in-review`, what remains `todo`. Leave the queue exactly as it is — never mark anything to cover a failure.
- Suggest the recovery path: fix in a fresh conversation (`/new`, then `$joycraft-implement <failed-spec>`), then re-run `$joycraft-implement-feature` for the remainder.

## Step 4: Finish — Session-End Once

When no `todo` specs remain, run the once-per-feature finisher yourself: read and follow `.agents/skills/joycraft-session-end/SKILL.md`. It owns the gates the chain deliberately skipped: full validation (must pass before anything graduates `in-review → done`), discovery consolidation, and push/PR per the project's AGENTS.md git autonomy rules.

## Final Report

```
Feature run: <slug>
- Specs completed: N of M (now in-review/done) · failures: [none | <spec> — <reason>]
- Session-end: [ran — see its report | skipped: <reason>]
- Discoveries: [n stubs consolidated | none]
```
