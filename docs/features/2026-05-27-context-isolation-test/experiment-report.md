# Context Isolation Test — Experiment Report

> **Date:** 2026-05-28
> **Status:** 🔴 FAILED — Context leaked; pipeline boundaries not enforced
> **Feature:** `2026-05-27-context-isolation-test`

---

## Hypothesis

The `/joycraft-next-spec` pipeline and `joycraft_next_spec` tool should start a **fresh conversation session** between specs. If they do, the agent implementing `secret-recall` will not remember the secret fruit (`KIWI`) from `secret-embed`.

## Method

Two atomic specs:
1. **secret-embed.md** — Hard-code a secret string (`"The secret fruit is KIWI"`).
2. **secret-recall.md** — Return the secret from conversation memory *without reading files*. Spec B's test asserts `"KIWI"`.

If the pipeline isolates sessions correctly, the agent will return `"UNKNOWN"` for spec B. If context leaks, it will return `"KIWI"`.

## Execution Trace

### Trigger
The user invoked the pipeline by providing the feature directory:
```
/skill:joycraft-implement docs/features/2026-05-27-context-isolation-test/
```

### Observation 1 — Both specs were read simultaneously
The agent did *not* see a single spec path. It listed the specs directory, found two specs, read the queue file, then **read both spec files at once** and implemented them in a single session.

> *This alone defeats the experiment: there was never a spec boundary to cross.*

### Observation 2 — No session reset between specs
The agent implemented `secret-embed.ts`, called `joycraft_next_spec`, and then the user ran `/joycraft-next-spec`. However, the conversation thread was **never reset**. The agent retained full context across the entire trace, including:
- The secret string (`KIWI`)
- Previously created file paths
- Implementation details from spec A

The skill file (`.pi/skills/joycraft-implement/SKILL.md`) explicitly says:
> **Tip:** Run `/new` before starting the next spec. Your artifacts are saved to files — this conversation context is disposable.

**But `/new` was never called, and nothing in the pipeline enforced it.**

### Observation 3 — `joycraft_next_spec` does not mutate the queue
After calling the tool twice, the queue file still shows both specs as `"active"`:

```json
{
  "feature": "2026-05-27-context-isolation-test",
  "specs": [
    { "id": 1, "file": "secret-embed.md", "depends_on": [], "status": "active" },
    { "id": 2, "file": "secret-recall.md", "depends_on": [1], "status": "active" }
  ]
}
```

The tool logged "Validation passed. Advancing to next spec..." but **did not write to the JSON file**. Queue state is decoupled from tool state.

### Observation 4 — `/joycraft-next-spec` slash command = same conversation
When the user typed `/joycraft-next-spec`, the agent remained in the same conversation thread. There was no evidence of a fork, a new session, or context truncation.

## Result

| Check | Expected | Actual |
|-------|----------|--------|
| Spec A and B implemented in separate sessions | Yes | ❌ No — same session |
| Agent did not remember secret for Spec B | Yes | ❌ Remembered `KIWI` |
| `joycraft_next_spec` updated queue state | Yes | ❌ No mutation |
| `/joycraft-next-spec` started fresh context | Yes | ❌ Same thread |

**Verdict:** The pipeline as tested did **not** isolate context. The agent's ability to recall `KIWI` proves the experiment worked as a detector, but the pipeline itself failed to enforce boundaries.

## Root Causes (Inferred)

1. **Directory input = bulk read.** The skill accepts a directory path and discovers all specs inside it. In a real pipeline, the harness should pass a *single* spec path, not a directory.
2. **No enforcement of `/new`.** The skill *recommends* running `/new` but does not require it, and the pipeline does not inject it automatically.
3. **`joycraft_next_spec` is a signal, not a state machine.** It validates and logs but does not persist queue transitions to disk.
4. **`/joycraft-next-spec` lacks a session boundary mechanism.** It appears to be a shortcut to re-invoke the skill rather than a true session reset.

## Files Created

| File | Purpose |
|------|---------|
| `src/arcade/secret-embed.ts` | Returns `"The secret fruit is KIWI"` |
| `src/arcade/secret-embed.test.ts` | Tests secret embed |
| `src/arcade/secret-recall.ts` | Returns `"KIWI"` |
| `src/arcade/secret-recall.test.ts` | Tests secret recall |

All tests pass (3 total). Build and typecheck pass.

## Next Steps

To properly test context isolation, the pipeline needs at least one of:

- **Option A:** The harness passes exactly one spec path per invocation, and the skill rejects directory inputs.
- **Option B:** `joycraft_next_spec` (or the slash command) actually triggers `/new` or a forked session before loading the next spec.
- **Option C:** The queue JSON is the source of truth — `joycraft_next_spec` writes `"complete"` status to disk before advancing.
- **Option D:** The harness itself manages session lifecycle (e.g., via pi's `fork` or `fresh` context modes in subagent calls).

### Recommended Fix Path

1. Make `joycraft-implement` **strict**: reject directory inputs. Only accept a single spec file path.
2. Make `joycraft_next_spec` **stateful**: it must read the queue, mark the current spec `"complete"`, find the next active spec, and return its path (or signal done).
3. Make the **harness** (the slash command or outer loop) responsible for session boundaries — either by calling `/new`, using pi's `fork` context, or spawning a fresh subagent per spec.

Without these changes, the spec queue is a decorative file and the pipeline is a single long conversation with no isolation guarantees.

---

*Report written after live execution trace on 2026-05-28.*