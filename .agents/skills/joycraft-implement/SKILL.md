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
> `$joycraft-implement docs/features/<slug>/specs/spec-name.md`
> or `$joycraft-implement docs/features/<slug>/`

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

## Step 5: Wrap Up and Continue (mode-aware — do the wrap-up yourself)

When the spec is implemented and all its tests pass, wrap up and advance according to the spec's **execution mode**. Read the `mode:` field from the spec's frontmatter (written by `$joycraft-decompose`). If the spec has **no `mode:` field**, default to **`batch`** (back-compat with pre-mode specs). If the value is unrecognized, treat it as `batch` and note the unrecognized value.

**You perform the wrap-up. You find the next spec. Do not stop to tell the human to run `$joycraft-spec-done` or to paste the next file path — those hand-backs carry zero information and break the feature's momentum.**

### 5a. Per-spec wrap-up

| Spec `mode:` | Wrap-up you perform now |
|--------------|------------------------|
| **batch** | **Status bump only**: set the spec to `in-review` in both systems (see below). No commit, no discovery stub — batch wraps once at feature end. (The bump is required: the queue treats a dependency as satisfied at `in-review`, so without it dependent specs would look blocked.) |
| **checkpoint** / **isolated** | The full `joycraft-spec-done` wrap-up, performed by you (canonical definition: `.agents/skills/joycraft-spec-done/SKILL.md`): **(1)** bump status to `in-review` in both systems, **(2)** terse 2-line discovery stub at `docs/discoveries/YYYY-MM-DD-topic.md` ONLY if something contradicted the spec — usually skip, **(3)** commit `spec: <spec-name>` (implementation + status edits + stub, nothing unrelated), **(4)** no validation re-run, no push, no PR — those belong to `joycraft-session-end`. |

**Both systems** means: the queue JSON (`joycraft-mark-done <spec-id> --to in-review <specs-dir>` if `.pi/scripts/joycraft/` is installed, else edit `.joycraft-spec-queue.json` directly) AND the spec file's `status:` frontmatter. Never `done` — the agent doesn't self-certify (`docs/reference/spec-status-lifecycle.md`).

### 5b. Continue the queue (batch and checkpoint)

Re-read `.joycraft-spec-queue.json` in the spec's directory and find the next `todo` spec whose dependencies are all `in-review`/`done` (same rule as Step 1). Then:

- **Next ready spec exists** → announce one line — `Continuing: <next-spec> (spec N of M)` — and go back to Step 2 with it, in this same conversation.
- **Remaining `todo` specs are all blocked** → stop and report which specs are blocked and on what.
- **No `todo` specs remain** → this was the feature's last spec; go to 5d.
- **No queue** (you were invoked with a bare spec file outside a queue) → report the spec complete and stop; there is nothing to continue from.

### 5c. isolated — fresh context per spec

A conversation cannot clear its own context, so after the wrap-up the fresh context comes from outside:

- **Guided-manual:** tell the human to clear context (`/new`), then re-invoke `$joycraft-implement <next-spec>`. (Always fine, no ToS/cost surprise.)
- **Sequential fallback:** `$joycraft-implement-feature docs/features/<slug>/` chains the remaining specs in this conversation — momentum without isolation; fine for small remainders.
- **Pi:** the `joycraft-implement-loop` driver automates true isolation — a fresh `pi -p` process per spec.
- **Headless (`claude -p` / `codex exec` loop):** opt-in only. **Surface the caveat, don't bury it:** unattended headless loops draw metered, full-rate API usage and carry a ToS posture the user must **knowingly opt into** (Anthropic meters `claude -p` from a separate full-rate pool; routing subscription OAuth through third-party harnesses is prohibited). The responsible default is Pi (BYO API key / open weights). Do not silently auto-run a subscription-backed headless loop.

### 5d. Feature's last spec (any mode)

Run the once-per-feature finisher yourself: read and follow `.agents/skills/joycraft-session-end/SKILL.md`. It carries its own gates — validation is mandatory and must pass before specs graduate `in-review → done`, and push/PR honor the project's AGENTS.md git autonomy rules — so running it automatically is safe.

### Report

After each spec's wrap-up, report tersely before continuing:

```
Spec complete: [spec name] · mode: [mode] · tests: [N] passing · [wrapped up + committed | status bumped (batch)]
[Continuing: <next-spec> (spec N of M) | Feature complete — running session-end | Blocked: <specs + reasons>]
```

**Tip:** In `isolated` mode your artifacts are saved to files — the conversation context is disposable; `/new` between specs keeps each one sharp.
