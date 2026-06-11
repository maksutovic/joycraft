---
name: joycraft-implement-feature
description: Run a feature's entire spec queue from one invocation — delegates to the joycraft-implement-loop driver (fresh pi -p process per spec)
---

# Implement Feature (Whole-Queue Driver)

One invocation runs a feature's whole spec queue: `/skill:joycraft-implement-feature docs/features/<slug>/`. On Pi the driver already exists as a script — `.pi/scripts/joycraft/joycraft-implement-loop` — and the process boundary it creates (a fresh `pi -p` per spec) is the verified context isolation. **Your job is to point the loop at the right queue and run it, not to reimplement it.**

## Step 1: Load the Queue

1. Resolve the specs directory: if the given path contains a `specs/` subdirectory, use it; otherwise use the path itself. Look for `.joycraft-spec-queue.json` there.
2. **No queue** → stop:

   > No spec queue found in [path]. Run `/skill:joycraft-decompose` first — it writes the queue, the specs, and the wave plan.

3. Read the sibling `README.md` (the wave plan) and report the plan: feature slug, M specs, current statuses, the order the loop will serve them in (`joycraft-next-spec` order: first `todo` whose `depends_on` are all `in-review`/`done`).
4. If **no `todo` specs remain**, report that and suggest `/skill:joycraft-session-end` if the feature was never finished; do not run the loop.

## Step 2: Run the Loop

Invoke the driver via the shell, pointing at the specs dir:

```
joycraft-implement-loop docs/features/<slug>/specs
```

What it does (so you can narrate it, not reimplement it): `joycraft-next-spec` → fresh `pi -p "/skill:joycraft-implement <spec>"` → fresh `pi -p "/skill:joycraft-spec-done <spec>"` → repeat; **fail-fast** (exits non-zero naming the failing spec, queue left intact); runs `joycraft-session-end` exactly once when the queue is exhausted.

Notes:
- The driver spawns `pi -p` subprocesses; nesting it under an already-running Pi session is sound by design but not yet smoke-tested end-to-end — if the nested `pi -p` misbehaves, fall back to telling the human to run the command above in a separate terminal.
- **ToS/cost:** this path is for Pi with a BYO API key or open-weight model — do not route a subscription OAuth through it.

## Step 3: Report

Relay the loop's outcome:

- **Success** → which specs ran, and session-end's own report (validation, graduation `in-review → done`, push/PR per CLAUDE.md autonomy).
- **Failure** → which spec failed (the loop names it), what reached `in-review`, what remains `todo`. Suggest fixing in a fresh session (`/skill:joycraft-implement <failed-spec>`), then re-running the loop for the remainder — it picks up where it stopped.
