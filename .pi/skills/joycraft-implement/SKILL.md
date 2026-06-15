---
name: joycraft-implement
description: Execute atomic specs with TDD — read spec, write failing tests, implement until green, wrap up and continue the queue
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

Look for `specs/.joycraft-spec-queue.json` inside that directory. Read it. Find the **first `todo` spec whose dependencies are satisfied** (a dependency is satisfied once it is `in-review` or `done`). This matches what `joycraft-next-spec` serves. That single spec file is your target. Do NOT read any other specs.

> Using spec queue: found [spec-file-name] as the next spec.

If the directory has no queue or no `todo` specs:

> No remaining specs found in [directory].

**If the path is a file** ending in `.md`:

Use it directly as the spec to implement.

## Step 2: Read the Sibling README.md FIRST (if present)

Before reading the spec itself, check for a sibling `README.md` in the same folder as the spec — i.e., `<spec-path>/../README.md`. This file is the wave-plan + spec-table that `/skill:joycraft-decompose` writes per feature.

- **If present:** Read the README first. It tells you the spec's position in the wave plan, its dependencies, and which sibling specs (in the same folder) need to be done before this one.
- **If absent:** That's fine — proceed normally. The convention is forward-only and many legacy spec folders pre-date it.

### Warn on Unmet Dependencies

If the README shows that this spec depends on other specs in the same folder, check whether those dependencies are satisfied. A dependency is satisfied once its frontmatter `status:` is `in-review` or `done` (see `docs/reference/spec-status-lifecycle.md`) — a checkpoint chain progresses on `in-review` without waiting for session-end to graduate it to `done`. A dependency still at `todo` is unmet.

If any dependency is **not** complete, tell the user:

> "This spec lists unmet dependencies in the sibling README.md: [list]. Proceed anyway, or stop?"

Wait for confirmation before continuing. The user might be deliberately running out of order (a hotfix, an exploration, etc.) — your job is to surface the warning, not to gate.

## Step 3: Read and Understand the Spec

1. **Read the spec file.** The spec is your execution contract — the Acceptance Criteria and Test Plan define "done."
2. **Check the spec's Status field.** If it says "Complete," warn the user and ask if they want to re-implement or skip.
3. **Read the Acceptance Criteria** — these are your success conditions.
4. **Read the Test Plan** — this tells you exactly what tests to write and in what order.
5. **Read the Constraints** — these are hard boundaries you must not violate.

### Finding Additional Context

Specs are designed to be self-contained, but if you need more context:

- **Parent brief:** Linked in the spec's body (`> **Parent Brief:**` line). The new convention is `docs/features/<slug>/brief.md`. Read it for broader feature context.
- **Related specs:** Live in the same directory (typically `docs/features/<slug>/specs/`). The sibling `README.md` (read in Step 2 above) is the index.
- **Affected Files:** The spec's Affected Files table tells you which files to create or modify.


### Before writing code against an external API:

⚠️ If the spec references a third-party SDK or package, read its official documentation and type definitions FIRST. Never write a `declare module` stub for a package that actually exists — use the real package as a devDependency instead. The stub will make typecheck pass but the code will fail at runtime.

## Step 4: Execute the TDD Cycle

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

## Step 5: Handle Edge Cases

Check the spec's Edge Cases table. For each scenario:

- Verify the expected behavior is handled.
- If the spec says "warn the user" or "prompt," make sure that path works.

## Step 6: Wrap Up and Continue (mode-aware — do the wrap-up yourself)

**Loop-iteration check FIRST.** If this process is one iteration of the `joycraft-implement-loop` driver (you were launched by `pi -p` with a single spec path), STOP after the implementation report — do **not** wrap up and do **not** continue. The loop runs `/skill:joycraft-spec-done` as its own fresh `pi -p` step and advances the queue itself; wrapping up here would double-run it.

Otherwise (interactive session), when the spec is implemented and all its tests pass, wrap up and advance according to the spec's **execution mode**. Read the `mode:` field from the spec's frontmatter (written by `joycraft-decompose`). If the spec has **no `mode:` field**, default to **`batch`** (back-compat with pre-mode specs). If the value is unrecognized, treat it as `batch` and note the unrecognized value.

**You perform the wrap-up. You find the next spec. Do not stop to tell the human to run `/skill:joycraft-spec-done` or to paste the next file path — those hand-backs carry zero information and break the feature's momentum.**

### 6a. Per-spec wrap-up

| Spec `mode:` | Wrap-up you perform now |
|--------------|------------------------|
| **batch** | **Status bump only**: set the spec to `in-review` in both systems (see below). No commit, no discovery stub — batch wraps once at feature end. (The bump is required: the queue treats a dependency as satisfied at `in-review`, so without it dependent specs would look blocked.) |
| **checkpoint** / **isolated** | The full `joycraft-spec-done` wrap-up, performed by you (canonical definition: `.pi/skills/joycraft-spec-done/SKILL.md`): **(1)** bump status to `in-review` in both systems, **(2)** terse 2-line discovery stub at `docs/discoveries/YYYY-MM-DD-topic.md` ONLY if something contradicted the spec — usually skip, **(3)** commit `spec: <spec-name>` (implementation + status edits + stub, nothing unrelated), **(4)** no validation re-run, no push, no PR — those belong to `joycraft-session-end`. |

**Both systems** means: the queue JSON (`joycraft-mark-done <spec-id> --to in-review <specs-dir>` if `.pi/scripts/joycraft/` is installed, else edit `.joycraft-spec-queue.json` directly) AND the spec file's `status:` frontmatter. Never `done` — the agent doesn't self-certify (`docs/reference/spec-status-lifecycle.md`).

### 6b. Continue the queue (batch and checkpoint)

Re-read `.joycraft-spec-queue.json` in the spec's directory and find the next `todo` spec whose dependencies are all `in-review`/`done` (same rule as Step 1). Then:

- **Next ready spec exists** → announce one line — `Continuing: <next-spec> (spec N of M)` — and go back to Step 2 with it, in this same conversation.
- **Remaining `todo` specs are all blocked** → stop and report which specs are blocked and on what.
- **No `todo` specs remain** → this was the feature's last spec; go to 6d.
- **No queue** (you were invoked with a bare spec file outside a queue) → report the spec complete and stop; there is nothing to continue from.

### 6c. isolated — fresh context per spec

A conversation cannot clear its own context, so after the wrap-up the fresh context comes from outside:

- **Driver (recommended):** `/skill:joycraft-implement-feature docs/features/<slug>/` runs the remaining queue with a fresh-context subagent per spec — in-session, interactive, no headless loop.
- **Guided-manual:** tell the human to run `/new`, then re-invoke `/skill:joycraft-implement <next-spec>`. (Always fine, no ToS/cost surprise.)
- **Pi:** the `joycraft-implement-loop` driver automates it — a fresh `pi -p` process per spec. Nothing for you to do beyond the wrap-up; the loop advances.
- **Headless (`claude -p` / `codex exec` loop):** opt-in only. **Surface the caveat, don't bury it:** unattended headless loops draw metered, full-rate API usage and carry a ToS posture the user must **knowingly opt into** (Anthropic meters `claude -p` from a separate full-rate pool; routing subscription OAuth through third-party harnesses is prohibited). The responsible default is Pi (BYO API key / open weights). Do not silently auto-run a subscription-backed headless loop.

### 6d. Feature's last spec (any mode)

Run the once-per-feature finisher yourself: invoke `/skill:joycraft-session-end` (or read and follow `.pi/skills/joycraft-session-end/SKILL.md`). It carries its own gates — validation is mandatory and must pass before specs graduate `in-review → done`, and push/PR honor the project's AGENTS.md git autonomy rules — so running it automatically is safe.

### Report

After each spec's wrap-up, report tersely before continuing:

```
Spec complete: [spec name] · mode: [mode] · tests: [N] passing · [wrapped up + committed | status bumped (batch)]
[Continuing: <next-spec> (spec N of M) | Feature complete — running session-end | Blocked: <specs + reasons>]
```
