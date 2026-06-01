---
name: joycraft-decompose
description: Break a feature brief into atomic specs — small, testable, independently executable units
instructions: 32
---

# Decompose Feature into Atomic Specs

You have a Feature Brief (or the user has described a feature). Your job is to decompose it into atomic specs that can be executed independently — one spec per session.

## Step 1: Verify the Brief Exists

Look for a Feature Brief at `docs/features/<slug>/brief.md`. If the user provided a brief path as an argument, use that. Otherwise, scan `docs/features/*/brief.md`.

**Status filter when scanning neighbor briefs and specs:** read the YAML frontmatter at the top of each file. Treat each as **live** unless its `status:` is `done`, `deprecated`, or `superseded` — those three are the only states you **skip / ignore**. Every other state is live and must be considered. The status vocabulary is `todo → in-review → done` (see `docs/reference/spec-status-lifecycle.md`); both `todo` and `in-review` are live. An `in-review` spec is finished-but-unverified work that still constrains neighboring decomposition, so it stays in scope. Also ignore anything under `docs/archive/` entirely.

If no brief exists, tell the user:

> No feature brief found. Run `/joycraft-new-feature` first to interview and create one, or describe the feature now and I'll work from your description.

If the user describes the feature inline, work from that description directly. You don't need a formal brief to decompose — but recommend creating one for complex features.

## Step 2: Identify Natural Boundaries

**Why:** Good boundaries make specs independently testable and committable. Bad boundaries create specs that can't be verified without other specs also being done.

Read the brief (or description) and identify natural split points:

- **Data layer changes** (schemas, types, migrations) — always a separate spec
- **Pure functions / business logic** — separate from I/O
- **UI components** — separate from data fetching
- **API endpoints / route handlers** — separate from business logic
- **Test infrastructure** (mocks, fixtures, helpers) — can be its own spec if substantial
- **Configuration / environment** — separate from code changes

Ask yourself: "Can this piece be committed and tested without the other pieces existing?" If yes, it's a good boundary.

## Step 3: Build the Decomposition Table

For each atomic spec, define:

| # | Spec Name | Description | Dependencies | Size |
|---|-----------|-------------|--------------|------|

**Rules:**
- Each spec name is `verb-object` format (e.g., `add-terminal-detection`, `extract-prompt-module`)
- Each description is ONE sentence — if you need two, the spec is too big
- Dependencies reference other spec numbers — keep the dependency graph shallow
- More than 2 dependencies on a single spec = it's too big, split further
- Aim for 3-7 specs per feature. Fewer than 3 = probably not decomposed enough. More than 10 = the feature brief is too big

## Step 4: Present and Iterate

Show the decomposition table to the user. Ask:
1. "Does this breakdown match how you think about this feature?"
2. "Are there any specs that feel too big or too small?"
3. "Should any of these run in parallel (separate worktrees)?"

Iterate until the user approves.

## Execution Modes (assign a mode per spec)

Every spec carries an **execution mode** that controls how `joycraft-implement` wraps up after building it. Assign one to each spec — recommended by you, **approved by the human** (never silent).

| Mode | Per-spec wrap-up | Context between specs | Best for |
|------|------------------|-----------------------|----------|
| `batch` | implement all, wrap once at the end (one `joycraft-session-end`) | shared (one conversation) | clusters of tiny specs |
| `checkpoint` | `joycraft-spec-done` after each (commit + status bump), keep going | shared | medium specs wanting atomic commits without fresh context |
| `isolated` | `joycraft-spec-done`, then a **fresh context**, then the next spec | fresh per spec | heavy specs that would pollute one context |

**Project default.** Read the default mode from the project's `CLAUDE.md`: look for a line `**Default execution mode:** <mode>`. If that line is **absent, default to `batch`** (the safest: shared context, wrap once). Do not hard-fail when it's missing — just use `batch` and say so in your recommendation.

**Size → mode heuristic** (a starting recommendation, not a rule):

| Spec size | Recommended mode |
|-----------|------------------|
| XS / S | `batch`-eligible (fold into the batch) |
| M | `checkpoint` |
| L / XL | `isolated` |

Size is your estimate from the spec's scope (files touched, surface area, risk). The heuristic is only a starting point: a tiny spec inside a risky feature may still warrant `isolated`, and only the human knows that — which is why the recommendation is **approved, not auto-applied**.

**Surface the recommendation and get approval.** Before writing any spec files, present your per-spec mode recommendation and wait for the human's OK. Worked example:

> Your project defaults to `batch` (no `**Default execution mode:**` line in CLAUDE.md, so I'm using the safe default). Based on size, I recommend: specs 1, 2 → `batch`; spec 5 → `checkpoint`; specs 7, 8 → `isolated` (large/risky). OK, or adjust?

If the human overrides any recommendation, **honor their choice verbatim** in both the frontmatter and the queue. Record the approved mode in each spec's `mode:` frontmatter field (Step 5) and in each queue entry's `"mode"` field (Step 5a). A feature may mix modes across its specs — that's expected; note the mix in the README/wave plan. This applies even when there's no brief and the feature was described inline: still assign a mode to every spec, and the CLAUDE.md default applies the same way.

## Step 5: Generate Atomic Specs

For each approved row, create `docs/features/<slug>/specs/<spec-name>.md`. The slug is the feature folder name (e.g., `2026-04-06-token-discipline`). Lazy-create `docs/features/<slug>/specs/` if it doesn't exist.

If no brief exists and the user described the feature inline, derive a kebab-case slug yourself: `YYYY-MM-DD-<short-name>`. Create the folder structure under `docs/features/<slug>/`.

**Why:** Each spec must be self-contained — a fresh Claude session should be able to execute it without reading the Feature Brief. Copy relevant constraints and context into each spec.

Each spec file MUST start with YAML frontmatter — the personal schema:

```yaml
---
status: todo
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
mode: <approved mode — batch | checkpoint | isolated>
---
```

New specs always start at `status: todo` (the canonical first state — see `docs/reference/spec-status-lifecycle.md`). The `mode:` value is the human-approved execution mode from the Execution Modes step above.

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist.

Use this structure for the body:

```markdown
# [Verb + Object] — Atomic Spec

> **Parent Brief:** `docs/features/<slug>/brief.md` (or "standalone")
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## What
One paragraph — what changes when this spec is done?

## Why
One sentence — what breaks or is missing without this?

## External API Contract

_Include this section ONLY when the spec touches a third-party SDK, package, or service API. Omit it entirely otherwise._

**Package:** `<npm-package-name>`

**Canonical sources:**
- <link to docs>
- <link to types>

**Key API facts (validated against vX.Y.Z):**
- <fact 1>
- <fact 2>


## Acceptance Criteria
- [ ] [Observable behavior]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| [Each AC above] | [What to call/assert] | [unit/integration/e2e] |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** [Identify the fastest test for iteration feedback]

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints
- MUST: [hard requirement]
- MUST NOT: [hard prohibition]

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|

## Approach
Strategy, data flow, key decisions. Name one rejected alternative.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
```

If `docs/templates/ATOMIC_SPEC_TEMPLATE.md` exists, reference it for the full template with additional guidance.

Fill in all sections — each spec must be self-contained (no "see the brief for context"). Copy relevant constraints from the Feature Brief into each spec. Write acceptance criteria specific to THIS spec, not the whole feature. Every acceptance criterion must have at least one corresponding test in the Test Plan. If the user provided test strategy info from the interview, use it to choose test types and frameworks. Include the test harness verification rules in every Test Plan.

### Step 5a: Write the Spec Queue Manifest

After all spec `.md` files are written, create `.joycraft-spec-queue.json` in the specs directory alongside the spec files and README. This manifest is the machine-readable, authoritative spec queue consumed by the Pi pipeline automation.

```json
{
  "feature": "<slug>",
  "specs": [
    { "id": 1, "file": "<spec-name>.md", "depends_on": [], "status": "todo", "mode": "batch" },
    { "id": 2, "file": "<spec-name>.md", "depends_on": [1], "status": "todo", "mode": "checkpoint" }
  ]
}
```

Map each row in your decomposition table to a spec entry:
- `id`: sequential integer starting from 1 (matches the decomposition table's # column)
- `file`: the spec filename relative to the specs directory
- `depends_on`: array of spec ids this spec depends on (empty array `[]` for no dependencies)
- `status`: always `"todo"` initially — the agent advances each spec to `"in-review"` via `joycraft-spec-done`, and `joycraft-session-end` graduates it to `"done"` (see `docs/reference/spec-status-lifecycle.md`)
- `mode`: the human-approved execution mode for this spec (`batch` | `checkpoint` | `isolated`) — must match the spec file's `mode:` frontmatter

Validate: every id referenced in `depends_on` must exist as an `id` in the specs array; the queue `status`/`mode` for each spec must match that spec file's frontmatter.

## Step 6: Recommend Execution Strategy and Update Parent Brief

Based on the dependency graph, group specs into execution waves:
- **Independent specs** — "These can run in parallel worktrees"
- **Sequential specs** — "Execute these in order: 1 -> 2 -> 4"
- **Mixed** — "Start specs 1 and 3 in parallel. After 1 completes, start 2."

**Update the parent brief's Execution Strategy section** at `docs/features/<slug>/brief.md` with this wave plan, so the brief stays a useful one-stop reference for feature reviewers.

## Step 7: Write the Feature-Folder README.md (Single Source of Truth for Implementers)

After generating per-spec files, ALSO write a `README.md` at the spec folder root: `docs/features/<slug>/specs/README.md` (for feature work). For area-level bugfixes, the path is `docs/bugfixes/<area>/README.md`.

The README is the single source of truth for *implementers*. It contains a **spec table** (one row per spec with dependencies) and the execution wave plan. Use this template:

```markdown
# <Feature Name> — Feature Specs

> **Parent Brief:** `docs/features/<slug>/brief.md`
> **Design:** `docs/features/<slug>/design.md` (when present)
> **Research:** `docs/features/<slug>/research.md` (when present)
> **Status:** Decomposed YYYY-MM-DD, ready for implementation

## What this feature does

<one paragraph summary, derived from the brief>

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [spec-name.md](spec-name.md) | — | batch | <one-line description> |
| 2 | [other-spec.md](other-spec.md) | 1 | checkpoint | <one-line description> |

## Execution waves

- Wave 1 (parallel): specs ...
- Wave 2 (after wave 1): specs ...

## How to use this file

If you're running `/joycraft-implement <spec-path>`, the implement skill reads this README first so it understands the spec's position in the wave plan. Each spec is self-contained for the actual implementation; this README provides ordering context only.
```

The brief and the README serve different audiences: the brief is for *feature reviewers* (vision, scope, decomposition decisions); the README is for *implementers* (what to run next, what depends on what).

## Step 8: Hand Off

Tell the user a one-line summary, then emit the canonical Handoff block.

## Recommended Next Steps

Next:
```bash
/joycraft-implement docs/features/<slug>/specs/<first-spec>.md
```
Run /clear first.
