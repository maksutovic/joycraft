---
name: joycraft-implement
description: Execute atomic specs with TDD — read spec, write failing tests, implement until green, hand off to session-end
---

# Implement Atomic Spec

You have exactly one atomic spec file to execute. Your job is to implement it using strict TDD — tests first, confirm they fail, then implement until green.

## Step 1: Parse Arguments

The user MUST provide a path. No path = stop immediately.

**If no path was provided:**

> No spec path provided. Provide a spec file or a feature directory:
> `/skill:joycraft-implement docs/features/<slug>/specs/spec-name.md`
> or `/skill:joycraft-implement docs/features/<slug>/`

**If the path is a directory** (ends with `/` or does not end with `.md`):

Look for `specs/.joycraft-spec-queue.json` inside that directory. Read it. Find the **first `todo` spec whose dependencies are satisfied** (a dependency is satisfied once it is `in-review` or `done`; see `docs/reference/spec-status-lifecycle.md`). This matches what `joycraft-next-spec` serves. That single spec file is your target. Do NOT read any other specs.

> Using spec queue: found [spec-file-name] as the next active spec.

If the directory has no queue or no active specs:

> No active specs found in [directory].

**If the path is a file** ending in `.md`:

Use it directly as the spec to implement.

## Step 2: Read and Understand the Spec

1. **Read the spec file.** The spec is your execution contract — the Acceptance Criteria and Test Plan define "done."
2. **Check the spec's Status field.** If it says "Complete," warn the user and ask if they want to re-implement or skip.
3. **Read the Acceptance Criteria** — these are your success conditions.
4. **Read the Test Plan** — this tells you exactly what tests to write and in what order.
5. **Read the Constraints** — these are hard boundaries you must not violate.

### Finding Additional Context

Specs are designed to be self-contained, but if you need more context:

- **Parent brief:** Linked in the spec's frontmatter (`> **Parent Brief:**` line). Read it for broader feature context.
- **Related specs:** Live in the same directory. The spec directory convention is `docs/features/<slug>/specs/` where the slug is the feature folder name (e.g., `2026-04-06-token-discipline`). Bugfix specs live under `docs/bugfixes/<area>/`.
- **Affected Files:** The spec's Affected Files table tells you which files to create or modify.


### Before writing code against an external API:

⚠️ If the spec references a third-party SDK or package, read its official documentation and type definitions FIRST. Never write a `declare module` stub for a package that actually exists — use the real package as a devDependency instead. The stub will make typecheck pass but the code will fail at runtime.

## Step 3: Execute the TDD Cycle

**This is not optional. Write tests FIRST.**

### 3a. Write Tests (Red Phase)

Using the spec's Test Plan:

1. Write ALL tests listed in the Test Plan. Each Acceptance Criterion must have at least one test.
2. Tests should call the actual function/endpoint — not a reimplementation or mock of the underlying library.
3. Run the tests. **They MUST fail.** If any test passes immediately:
   - Flag it — either the test isn't testing the right thing, or the code already exists.
   - Investigate before proceeding. A test that passes before implementation is a test that proves nothing.

### 3b. Implement (Green Phase)

1. Follow the spec's Approach section for implementation strategy.
2. Implement the minimum code needed to make tests pass.
3. Run tests after each meaningful change — use the spec's Smoke Test for fast feedback.
4. Continue until ALL tests pass.

### 3c. Verify Acceptance Criteria

Walk through every Acceptance Criterion in the spec:

- [ ] Is each one met?
- [ ] Does the build pass?
- [ ] Do all tests pass?

If any criterion is not met, keep implementing. Do not move on until all criteria are green.

## Step 4: Handle Edge Cases

Check the spec's Edge Cases table. For each scenario:

- Verify the expected behavior is handled.
- If the spec says "warn the user" or "prompt," make sure that path works.

## Step 5: Hand Off (mode-aware)

When the spec is implemented and all its tests pass, the hand-off depends on the spec's **execution mode**. Read the `mode:` field from the spec's frontmatter (written by `/skill:joycraft-decompose`). If the spec has **no `mode:` field**, default to **`batch`** (back-compat with pre-mode specs). If the value is unrecognized, treat it as `batch` and note the unrecognized value.

| Spec `mode:` | What to do now |
|--------------|----------------|
| **batch** | Do **not** wrap per spec. Move to the **next spec in this same conversation** (shared context). Only when you finish the feature's **last** spec, hand off to `/skill:joycraft-session-end`. |
| **checkpoint** | Hand off to `/skill:joycraft-spec-done` (it bumps status `todo → in-review` + commits), then **continue to the next spec**. |
| **isolated** | Hand off to `/skill:joycraft-spec-done`, then start the next spec in a **fresh context** (see the harness sub-cases below). |

**`isolated` — fresh context per harness:**
- **Pi:** the `joycraft-implement-loop` driver automates it — a fresh `pi -p` process per spec (the process boundary IS the context isolation). The loop runs `joycraft-next-spec` → implement → spec-done → repeat, then `joycraft-session-end` once.
  - **If THIS process is one iteration of that loop** (you were launched by `pi -p` with a single spec): you have nothing to do beyond spec-done — the loop advances on its own.
  - **If you are an interactive Pi session and the user asks you to run the remaining specs autonomously** ("automate this", "run the queue", "you're the harness — do it"): do **not** implement the specs inline in this conversation, and do **not** spawn a subagent — neither gives the verified process-boundary isolation. Instead **invoke the loop driver via the shell**, pointing it at the feature's specs dir:

    ```
    joycraft-implement-loop docs/features/<slug>/specs
    ```

    That one command runs the whole queue headless (fresh `pi -p` per spec) and finishes with session-end. (Note: the driver spawns `pi -p` subprocesses; nesting it under an already-running Pi session is sound by design but not yet smoke-tested end-to-end — if the nested `pi -p` misbehaves, fall back to telling the human to run the command in a separate terminal.) ToS/cost note: this path is for Pi with a BYO API key or open weights — do not route a subscription OAuth through it.
- **Claude Code / Codex, interactive:** tell the human to run `/clear`, then re-invoke `/skill:joycraft-implement <next-spec>`. (Guided-manual — always fine, no ToS/cost surprise.)
- **Claude Code / Codex, headless:** the opt-in `claude -p` / `codex exec` loop. **Surface the caveat, don't bury it:** unattended headless loops draw metered, full-rate API usage and carry a ToS posture the user must **knowingly opt into** (Anthropic meters `claude -p` from a separate full-rate pool; routing subscription OAuth through third-party harnesses is prohibited). The responsible default is Pi (BYO API key / open weights). Do not silently auto-run a subscription-backed headless loop.

Report, then emit the next step that matches the mode:

```
Implementation complete:
- Spec: [spec name] — all Acceptance Criteria met · mode: [batch|checkpoint|isolated]
- Tests: [N] written, all passing
- Build: passing

Next steps:
- batch (more specs remain): continue to the next spec in this conversation
- checkpoint / isolated: run /skill:joycraft-spec-done, then continue (isolated interactive: /new first)
- isolated, autonomous: run the loop — `joycraft-implement-loop docs/features/<slug>/specs`
- feature's last spec: run /skill:joycraft-session-end (the once-per-feature finisher)
```

**Tip:** On Pi, isolated mode is driven by the `joycraft-implement-loop` script (fresh process per spec) — that's the autonomous path; you Bash-invoke it. For step-by-step interactive control instead, run `/skill:joycraft-spec-done`, then `/new` before the next spec. Your artifacts are saved to files — this conversation context is disposable.
