---
name: joycraft-decompose
description: Break a feature brief into atomic specs — small, testable, independently executable units
---

# Decompose Feature into Atomic Specs

You have a Feature Brief (or the user has described a feature). Your job is to decompose it into atomic specs that can be executed independently — one spec per session.

## Step 0: Retrieve Before You Reason (PROTOCOL)

Before identifying spec boundaries or writing any spec file, run a bounded grep-first retrieval pass over the durable knowledge layer. This is not optional and it is not open-ended — it is a capped lookup, not a reading assignment.

1. Derive **3-6 search terms** from the brief's (or inline description's) nouns and verbs — the feature's key concepts, not generic words.
2. Grep the knowledge layer for those terms, in priority order:
   - `docs/context/decision-log.md` (why past choices were made)
   - `docs/context/shipped.md` (what/where already exists)
   - `docs/discoveries/` (negative knowledge — things that didn't work)
   - remaining `docs/context/*.md` files
3. Read **at most 5 files/rows** total — the matches, not the surrounding context. If a grep term returns dozens of hits, read only the newest matches within the cap and say the result was truncated.
4. If the knowledge layer is empty or missing (fresh project), report "nothing to retrieve" in one line and proceed — never block.

**Output contract:** when presenting the decomposition table (Step 4), include a **"Prior knowledge reused"** list — each entry citing doc + row date/heading — or the explicit line "retrieval ran (terms: …), nothing relevant found." Silently skipping this is not compliant.

**Contradictions:** if a retrieved decision contradicts the direction implied by the brief, surface it explicitly to the human before building the decomposition table — do not silently pick a side or omit the conflict.

## Step 1: Verify the Brief Exists

Look for a Feature Brief at `docs/features/<slug>/brief.md`. If the user provided a brief path as an argument, use that. Otherwise, scan `docs/features/*/brief.md`.

**Status filter when scanning neighbor briefs and specs:** read the YAML frontmatter at the top of each file. Treat each as **live** unless its `status:` is `done`, `deprecated`, or `superseded` — those three are the only states you **skip / ignore**. Every other state is live and must be considered. The status vocabulary is `todo → in-review → done` (see `docs/reference/spec-status-lifecycle.md`); both `todo` and `in-review` are live. An `in-review` spec is finished-but-unverified work that still constrains neighboring decomposition, so it stays in scope. Also ignore anything under `docs/archive/` entirely.

If no brief exists, tell the user:

> No feature brief found. Run `/joycraft-new-feature` first to interview and create one, or describe the feature now and I'll work from your description.

If the user describes the feature inline, work from that description directly. You don't need a formal brief to decompose — but recommend creating one for complex features.

## Step 1.5: Decision Gate

Before decomposing a brief file, parse its YAML frontmatter `decisions:` list. Frontmatter is the gate's **single source** — do not scan the body for open questions.

- **No `decisions:` block** → pass; legacy briefs keep working.
- **Frontmatter fails to parse** → fail **closed**: report the parse error, point at the brief file, and stop. Never decompose over a brief whose decision state is unreadable.
- **Any entry with `status: open`** → refuse to decompose. Name only the open decisions (id + question) and stop:

  > [N] open decision(s) gate this brief: [D2 — <question>, …]. Run `/joycraft-decide <brief path>` to terminate them (clarified / backlogged / discarded), or explicitly defer specific ones ("backlog D2 — <reason>").

- **Explicit defer** — the user says backlog it / skip for now / don't worry: set each named decision to `status: backlogged` with their one-line reason in the brief's frontmatter, add it to the feature's `docs/backlog/` entry (create one if needed), then re-evaluate the gate. Proceed only when zero decisions remain `open`, confirming in one line what was backlogged and where it was recorded (visible residue, never a silent edit).
- `backlogged` and `discarded` never block — only `open` blocks.

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

Before the decomposition table, show the **"Prior knowledge reused"** list from Step 0's retrieval pass (or the explicit nothing-found line).

Write this presentation, and the hand-off in Step 8, to the style contract in `docs/templates/reference/output-style.md`.

### Render and open the decomposition

Write `docs/features/<slug>/decompose.md` first — the decomposition table and the
review questions below it — and keep it **canonical**: agents read the md, never
the HTML. The HTML is a render of it and never invents content.

1. Read `docs/templates/REVIEW_GATE_TEMPLATE.html`. Fill ONLY the
   `<!-- SLOT:name — … -->` regions per each slot's inline guidance; the
   template's structure, class names, CSS, and theme script stay
   **byte-identical** — never generate freeform gate HTML.
2. Write it to `docs/features/<slug>/decompose.html` (committed later — the path
   is already linguist-generated, so PRs collapse it). Re-decomposing overwrites
   the same file; the md is the record.
3. Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail, print the absolute path and continue — headless, CI,
   and isolated mode are a no-op here, never a failure.
4. Offer — don't push — an optional extra render: "I can also publish this
   decomposition as a hosted artifact for a shareable link." Only publish if the
   human says yes; the local file remains the canonical render. If declined, no
   retry.

At this gate, your chat message is EXACTLY this template — nothing outside it.
The content lives in the artifact, not the chat. The decomposition table goes
in the artifact — never paste it into chat.

```markdown
**Decomposition ready: <N> specs across <M> waves**
Artifact: <absolute path> (opened) · canonical: docs/features/<slug>/specs/
Decisions needed: <N> — <ids/titles, comma-separated>
<one-line summary per decision, only if N ≤ 4>
Next: <the single action you want from the human>

Ten lines maximum. If you are about to write an eleventh line, the content
belongs in the artifact — move it there.
```

Keep it inline here on purpose: inline placement is load-bearing — referenced
docs get partially read or skipped at output time (Anthropic skill-authoring
guidance; observed live 2026-07-29).

The review questions below belong in the artifact beside the table. Ask:
1. "Does this breakdown match how you think about this feature?"
2. "Are there any specs that feel too big or too small?"
3. "Should any of these run in parallel (separate worktrees)?"

Iterate until the user approves.

### Step 4.5: INVENTED Review Gate (PROTOCOL)

Every Constraint and Acceptance Criterion you are about to write into a spec (Step 5) needs a traceable source. Before generating any spec file, walk the constraints/ACs you intend to write for each row and classify each one's cite:

- `[src: D<n>]` — traces to a stamped decision in the brief's `decisions:` frontmatter
- `[src: design §<n>]` — traces to a numbered section of `docs/features/<slug>/design.md`
- `[src: brief "<section>"]` — traces to a named section of the brief (or the inline description)
- `[src: INVENTED]` — you could not trace it to any of the above; it's a premise you introduced

List every `INVENTED` item in the table presentation, grouped by which spec row it belongs to. This review happens here, in the table, **before any spec file is written** — reviewing 10 generated files instead of one table is exactly the unreviewed-premise failure this gate exists to kill.

For each `INVENTED` item, ask the human to pick one:
1. **Approve** — the premise is correct and should be locked in. Append it to the brief's `decisions:` frontmatter block as a new entry (`id: D<next>`, `status: clarified`, the constraint's own text as `choice`, and a one-line `rationale`). Re-cite the constraint `[src: D<new-id>]`.
2. **Reword to a traceable source** — the human points you at where it actually comes from (a brief section, a design section, an existing decision). Re-cite accordingly.
3. **Drop** — remove the constraint/AC entirely from the spec you're about to generate.

Do not proceed to Step 5 for a row that still has an unresolved `INVENTED` item. Decompose never self-approves an invented premise — this is a human-gated checkpoint on every pass, not a suggestion.

If every constraint/AC in the decomposition traced cleanly with no `INVENTED` items, say so explicitly in the table presentation: **"All constraints traced — zero INVENTED."** Earned silence, not the absence of the check.

## Execution Modes (assign a mode per spec)

Every spec carries an **execution mode** that controls how `joycraft-implement` wraps up after building it. Assign one to each spec — recommended by you, **approved by the human** (never silent).

| Mode | Per-spec wrap-up | Context between specs | Best for |
|------|------------------|-----------------------|----------|
| `batch` | implement all, wrap once at the end (one `joycraft-session-end`) | shared (one conversation) | clusters of tiny specs |
| `checkpoint` | `joycraft-spec-done` after each (commit + status bump), keep going | shared | medium specs wanting atomic commits without fresh context |
| `isolated` | `joycraft-spec-done`, then a **fresh context**, then the next spec | fresh per spec | heavy specs that would pollute one context |

**Project default.** Read the default mode from the project's `AGENTS.md`: look for a line `**Default execution mode:** <mode>`. If that line is **absent, default to `batch`** (the safest: shared context, wrap once). Do not hard-fail when it's missing — just use `batch` and say so in your recommendation.

**Size → mode heuristic** (a starting recommendation, not a rule):

| Spec size | Recommended mode |
|-----------|------------------|
| XS / S | `batch`-eligible (fold into the batch) |
| M | `checkpoint` |
| L / XL | `isolated` |

Size is your estimate from the spec's scope (files touched, surface area, risk). The heuristic is only a starting point: a tiny spec inside a risky feature may still warrant `isolated`, and only the human knows that — which is why the recommendation is **approved, not auto-applied**.

**Surface the recommendation and get approval.** Before writing any spec files, present your per-spec mode recommendation and wait for the human's OK. Worked example:

> Your project defaults to `batch` (no `**Default execution mode:**` line in AGENTS.md, so I'm using the safe default). Based on size, I recommend: specs 1, 2 → `batch`; spec 5 → `checkpoint`; specs 7, 8 → `isolated` (large/risky). OK, or adjust?

If the human overrides any recommendation, **honor their choice verbatim** in both the frontmatter and the queue. Record the approved mode in each spec's `mode:` frontmatter field (Step 5) and in each queue entry's `"mode"` field (Step 5a). A feature may mix modes across its specs — that's expected; note the mix in the README/wave plan. This applies even when there's no brief and the feature was described inline: still assign a mode to every spec, and the AGENTS.md default applies the same way.

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

**Cite every Constraints and Acceptance Criteria line (PROTOCOL).** Each line you write under `## Constraints` and `## Acceptance Criteria` carries a trailing `[src: …]` cite, resolved during Step 4.5's INVENTED review — one of exactly four forms: `[src: D<n>]`, `[src: design §<n>]`, `[src: brief "<section>"]`, `[src: INVENTED]` (only for items the human explicitly chose to leave as INVENTED, which should not happen given Step 4.5 resolves them first — this vocabulary extends the existing `decisions:` frontmatter gate, it is not a parallel provenance scheme). If a constraint traces to multiple sources, cite the most specific: `D<n>` over `design §<n>` over `brief "<section>"`. This cite requirement is scoped to Constraints and Acceptance Criteria only — the `## Approach` and `## Edge Cases` sections stay judgment prose, uncited; the cite load lands exactly where variance is born.

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

**Mark each multi-spec wave's parallel-safety.** A wave is **parallel-safe** only when its specs' Affected Files tables are disjoint — no file appears in two of the wave's specs. Overlapping files → mark the wave NOT parallel-safe and name the overlapping files. Dependency order says what *may* run together; parallel-safety says what *won't conflict* when it does — `joycraft-implement-feature` only parallelizes waves you mark safe.

**Update the parent brief's Execution Strategy section** at `docs/features/<slug>/brief.md` with this wave plan, so the brief stays a useful one-stop reference for feature reviewers.

