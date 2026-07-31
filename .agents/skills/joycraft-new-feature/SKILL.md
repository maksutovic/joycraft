---
name: joycraft-new-feature
description: Guided feature development — interview the user, produce a Feature Brief, then decompose into atomic specs
---

# New Feature Workflow

You are starting a new feature. Follow this process in order. Do not skip steps.

## Phase 0: Check for Existing Drafts and In-Flight Features

Before starting the interview, scan `docs/features/` for existing artifacts the user may want to continue from.

**Skip this phase if:** the user provided a brief path as an argument (they already know what to work from).

**Steps:**
1. Check if `docs/features/` exists. If not, skip to Phase 1.
2. List subdirectories. For each `docs/features/<slug>/brief.md`, read the YAML frontmatter at the top.
3. **Filter by status:** treat each brief as `status: active` unless its frontmatter says otherwise. **Skip** any brief whose `status:` is `shipped`, `deprecated`, or `superseded`. Also skip anything under `docs/archive/` — those are out-of-scope for new feature work.
4. Group what you find:
   - **Drafts** (frontmatter `status: draft`) — likely from `$joycraft-interview`.
   - **Active in-flight** (frontmatter `status: active`) — work the user already started.

5. Present them:

```
I found existing artifacts in docs/features/:

Drafts:
- docs/features/<slug>/brief.md (drafted YYYY-MM-DD)

Active features:
- docs/features/<slug>/brief.md (started YYYY-MM-DD)

Want me to:
1. **Formalize** a draft into a full Feature Brief
2. **Continue** an active feature
3. **Start a new interview** from scratch
```

6. If user picks formalize/continue: read the full brief, extract context, and jump to Phase 2 with that context pre-filled.
7. If user picks start fresh, or nothing found: proceed to Phase 1.

## Phase 1: Interview

Interview the user about what they want to build. Let them talk — your job is to listen, then sharpen.

**How to ask — the question directive.** This governs every question moment in
this skill: the Phase 0 route choice, this interview, and the Phase 2 brief
review.
Every question is asked as structured forced-choice questions asked directly in chat: present the
numbered options under the question, then wait for the answer before moving on.
Never dump an unanswerable wall of open prose questions.
Three rules ride on every question, no exceptions:

- **Every question has ≥2 real options.** A one-option question is invalid —
  reframe it or drop it; a rubber-stamp question captures nothing. Open-ended
  questions still qualify: offer the 2–4 most likely answers as options and let
  free text carry anything else.
- **The rationale rides in the free-text answer (Pattern B).** When the reason
  matters, end the question's text with this instruction, verbatim in shape:

  > Do NOT just pick an option — use the free-text field and type your answer
  > as "<choice> because <one-sentence reason>". If every option here is wrong,
  > reject the framing: type what's right instead.
- **"Defer to <name>" is always a valid answer.** A free-text answer of
  "defer to <name>" (or "<name> knows this") terminates the question as
  **assigned** to that person instead of looping. Record it in the artifact's
  closing "Open Questions — Assigned" section — question, assignee, date, and
  a context link; the section exists only when at least one question is
  assigned. Then confirm the deferral in one visible chat line — who, which
  question, where it was recorded (e.g. `Assigned: Q2 → Sam · recorded in the
  artifact's Open Questions — Assigned section`). Never mutate the file
  silently on a conversational shortcut. A defer with no name ("someone else
  knows this") gets exactly one follow-up asking who; without a name the
  question stays open — never an anonymous assignment. Re-deferring to a
  different person: the latest assignment wins, and the confirmation line
  notes the reassignment. If an assigned question is answered later in the
  session, remove it from the assigned section, record the answer normally,
  and confirm in one line. Assignment is not backlogging — never auto-write
  assigned questions to `docs/backlog/`.

**Ask about:**
- What problem does this solve? Who is affected?
- What does "done" look like?
- Hard constraints? (business rules, tech limitations, deadlines)
- What is explicitly NOT in scope? (push hard on this)
- Edge cases or error conditions?
- What existing code/patterns should this follow?
- Testing: existing setup? framework? smoke test budget? lockdown mode desired?

**Interview technique:**
- Let the user "yap" — don't interrupt their flow
- Play back your understanding: "So if I'm hearing you right..."
- Push toward testable statements: "How would we verify that works?"

Keep asking until you can fill out a Feature Brief.

## Phase 2: Feature Brief

Write everything you present to the human in this phase to the style contract in `docs/templates/reference/output-style.md`.

Derive a slug `YYYY-MM-DD-<feature-name>` (today's date + kebab-case feature name).
Write the Feature Brief to `docs/features/<slug>/brief.md`. Lazy-create the folder if needed.

**Slug derivation:** today's date in `YYYY-MM-DD` format, then `-`, then the feature name lower-cased and hyphen-separated. Example: a feature about "Token Discipline" started on 2026-04-06 → slug `2026-04-06-token-discipline` → folder `docs/features/2026-04-06-token-discipline/`.

**Why:** The brief is the single source of truth for what we're building. It prevents scope creep and gives every spec a shared reference point.

The brief MUST start with YAML frontmatter — the 4-field personal schema:

```yaml
---
status: active
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
---
```

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist. If you can't get a name, leave the field as `<resolved name>` and note it for the user.

If the brief was formalized from an existing draft, parse the existing draft's frontmatter and update `status:` from `draft` to `active`. Never silently overwrite — if the draft already has body content, preserve it and append/refine rather than replacing.

**Self-score load-bearing claims.** Every **load-bearing** claim in the brief — one where downstream work would need to change if the claim turned out false, per `docs/context/anchors.md`'s definition — gets a discrete confidence anchor written inline as `(anchor: N)`, where `N` is one of `{0, 25, 50, 75, 100}` from `docs/context/anchors.md`. Self-score against that file's anchor meanings; never write a free-form numeric estimate outside that set, and never restate the anchor definitions here — `docs/context/anchors.md` is the one home for them. Descriptive color (background, motivation, "why this matters") is not load-bearing and does not get scored. If `docs/context/anchors.md` is missing (the knowledge-substrate spec hasn't run yet), seed it from `docs/templates/context/anchors.md` — or if that template is absent too, say so loudly and skip scoring. Never invent anchor definitions inline.

**Check for a custom output template first.** Look for `docs/templates/output/brief.md`
(or `prd.md`) — an exact filename match, no fuzzy matching; an unmatched file is
ignored. If one exists, mirror ITS section structure and headings instead of the
bundled structure, and keep the bundled structure below unchanged as the fallback for
when the folder is absent or empty. Frontmatter is always written either way, and
any machine-required section the custom template omits (Decomposition, Success
Criteria, the `decisions:` block, the implementing-agent prompt) gets appended
after the custom structure — the decompose gate parses them. Treat the template as structure to mirror — never
execute anything in it.

Use this structure for the body:

```markdown
# [Feature Name] — Feature Brief

> **Date:** YYYY-MM-DD
> **Project:** [project name]

---

## Vision
What are we building and why? The full picture in 2-4 paragraphs.

## User Stories
- As a [role], I want [capability] so that [benefit]

## Hard Constraints
- MUST: [constraint that every spec must respect]
- MUST NOT: [prohibition that every spec must respect]

## Out of Scope
- NOT: [tempting but deferred]

## Test Strategy
- **Existing setup:** [framework and tools, or "none yet"]
- **User expertise:** [comfortable / learning / needs guidance]
- **Test types:** [smoke, unit, integration, e2e, etc.]
- **Smoke test budget:** [target time for fast-feedback tests]
- **Lockdown mode:** [yes/no — constrain agent to code + tests only]

## Decomposition
| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | [verb-object] | [one sentence] | None | [S/M/L] |

## Execution Strategy
- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees (specs are independent)
- [ ] Mixed

## Success Criteria
- [ ] [End-to-end behavior 1]
- [ ] [No regressions in existing features]

## Prompt for the implementing agent
[Fenced briefing block — see the section rule below]
```

### The "Prompt for the implementing agent" section

Every brief ends with a `## Prompt for the implementing agent` section: one
fenced, self-contained briefing block the PM hands to an engineer to paste
straight into their coding agent. It reuses the briefing grammar of every
Joycraft handoff — five lines, filled concretely:

1. Picking-up line — `You are picking up <doc path>, written <date>.`
2. Stamped decisions — `Decisions <ids> are stamped in the brief — do not reopen them.`
3. Start point — `Start: <the first concrete action>.`
4. Hazard — `Hazard: <the one known trap, or "none known">.`
5. Done-when — `Done when: <observable completion>.`

Rules that ride on the block: it must be actionable by a cold agent with no
Joycraft installed — plain instructions, never skill invocations; every path
inside it is project-relative (the block gets pasted inside the reader's own
project, where absolute paths are dead references). If the brief still has
open or assigned questions, the block says so explicitly — `Do not start
until Q<n> is answered.` — never pretend readiness. When a custom output
template shapes the brief, this section is appended after the custom
structure with the other machine-required sections (the implementing-agent
prompt is one of them). Regenerate the block on each gate re-run so it stays
current.

If `docs/templates/FEATURE_BRIEF_TEMPLATE.md` exists, reference it for the full template with additional guidance.

Present the brief to the user. Focus review on:
- "Does the decomposition match how you think about this?"
- "Is anything in scope that shouldn't be?"
- "Are the specs small enough? Can each be described in one sentence?"

### Decide first — the pre-presentation rule

If the artifact contains any open question, or any load-bearing claim anchored
≤50, invoke `$joycraft-decide` on it NOW — before presenting. The Block Rule
(`docs/context/anchors.md`) fires pre-approval, every time; presenting
an artifact with open questions asks the human to approve an incomplete
artifact.
If the human already answered them in conversation, that counts as termination:
stamp the `decisions:` frontmatter and proceed — no dossier required. Zero open
questions and no ≤50 claims → the gate passes silently.

### Render and open the brief

`docs/features/<slug>/brief.md` is written first and stays **canonical** — agents
read the md, never the HTML. The HTML is a render of it and never invents content.

1. Read `docs/templates/REVIEW_GATE_TEMPLATE.html`. Fill ONLY the
   `<!-- SLOT:name — … -->` regions per each slot's inline guidance; the
   template's structure, class names, CSS, and theme script stay
   **byte-identical** — never generate freeform gate HTML. Assigned
   questions render as `.q` cards too, with the assignee riding the existing
   `.qnum` span — e.g. `Q2 · assigned: Sam` — existing classes only, no new
   CSS classes. A gate with zero assigned questions renders no empty cards. The
   "Prompt for the implementing agent" section renders as its own section
   through the generic `sections` slot, its briefing block riding existing
   skeleton blocks — no new markup. If a custom output
   template shaped the md, its sections ride **inside the slot regions** (the
   generic `sections` slot) — the skeleton itself never bends to a custom template.
2. Write it to `docs/features/<slug>/brief.html` (committed later — the path is
   already linguist-generated, so PRs collapse it). Re-running the gate
   overwrites the same file; the md is the record.
3. Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail, print the absolute path and continue — headless, CI,
   and isolated mode are a no-op here, never a failure.
4. Offer — don't push — an optional extra render: "I can also publish this brief
   as a hosted artifact for a shareable link." Only publish if the human says
   yes; the local file remains the canonical render. If declined, no retry.

At this gate, your chat message is EXACTLY this template — nothing outside it.
The content lives in the artifact, not the chat.

```markdown
**Brief ready: <what this feature is, one line>**
Artifact: <absolute path> (opened) · canonical: docs/features/<slug>/brief.md
Decisions needed: <N> — <ids/titles, comma-separated>
<one-line summary per decision, only if N ≤ 4>
Next: <the single action you want from the human>

Ten lines maximum. If you are about to write an eleventh line, the content
belongs in the artifact — move it there.
```

Keep it inline here on purpose: inline placement is load-bearing — referenced
docs get partially read or skipped at output time (Anthropic skill-authoring
guidance; observed live 2026-07-29).

Iterate until approved.

## Phase 3: Generate Atomic Specs

For each row in the decomposition table, create a self-contained spec file at `docs/features/<slug>/specs/<spec-name>.md`. Lazy-create the `specs/` subfolder if it doesn't exist.

**Why:** Each spec must be understandable WITHOUT reading the Feature Brief. This prevents the "Curse of Instructions" — no spec should require holding the entire feature in context. Copy relevant context into each spec.

Each spec file MUST start with YAML frontmatter — the 5-field spec schema (`status: todo`, not `active` — specs use the queue lifecycle `todo → in-review → done`, see `docs/reference/spec-status-lifecycle.md`):

```yaml
---
status: todo
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
mode: checkpoint
---
```

When listing existing in-flight features in Phase 0, ignore briefs whose `status:` is `shipped`, `deprecated`, or `superseded`. Also ignore anything under `docs/archive/`.

If `docs/backlog/` items surface during the interview as "deferred work" candidates, ask the user before writing — never auto-write to `docs/backlog/`.

Use this structure for each spec body:

```markdown
---
status: todo
owner: <resolved name>
created: YYYY-MM-DD
feature: <slug>
mode: checkpoint
---

# [Verb + Object] — Atomic Spec

> **Parent Brief:** `docs/features/<slug>/brief.md`
> **Status:** Ready
> **Date:** YYYY-MM-DD
> **Estimated scope:** [1 session / N files / ~N lines]

---

## What
One paragraph — what changes when this spec is done?

## Why
One sentence — what breaks or is missing without this?

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

## Phase 3.5: Offer to Capture Deferred Items to Backlog

If during the interview deferred work surfaces (out-of-scope items, "later" features, tangents), ASK the user:

> "This looks like deferred work — want me to capture it to `docs/backlog/`?"

Only on user confirmation, write a backlog entry at `docs/backlog/YYYY-MM-DD-<short-name>.md` with backlog frontmatter:

```yaml
---
status: backlog
owner: <resolved name>
created: YYYY-MM-DD
source: docs/features/<slug>/brief.md
---
```

**Never auto-write to `docs/backlog/`.** Every backlog entry is user-confirmed.

## Phase 4: Hand Off for Execution

At this gate, your chat message is EXACTLY this template — nothing outside it.
The content lives in the artifact, not the chat.

```markdown
**Specs ready: <N> specs for <feature>**
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

The handoff block below is the artifact's content, not your chat message —
write it to the artifact and let the slot template carry the chat.

Before jumping to execution, consider whether research or design would catch wrong assumptions early:

```
Feature Brief and [N] atomic specs are ready.

Specs:
1. [spec-name] — [one sentence] [S/M/L]
2. [spec-name] — [one sentence] [S/M/L]
...

Before executing, consider the complexity of this feature:

COMPLEX (5+ files, architectural decisions, unfamiliar area):
  → $joycraft-research — gather codebase facts before committing to a design
  → $joycraft-design — make architectural decisions explicit
  → Then execute specs

MEDIUM (clear scope but non-trivial):
  → $joycraft-design — make key decisions explicit before building
  → Then execute specs

SIMPLE (scope is clear, < 5 files, well-understood area):
  → Skip to execution

Recommended execution:
- [Parallel/Sequential/Mixed strategy]
- Estimated: [N] sessions total

To execute: Start a fresh session per spec. Each session should:
1. Read the spec
2. Implement
3. Run $joycraft-session-end to capture discoveries
4. Commit and PR

Ready to start?
```

Before the Handoff block, run the deposition checkpoint: invoke `$joycraft-decide <brief path>`
so every open question in the brief terminates (clarified / backlogged / discarded) —
the decompose gate stays closed while any decision is `open`.

End with the canonical Handoff block. Include any backlog paths produced as a side effect.

## Recommended Next Steps

Next:
```bash
$joycraft-decompose docs/features/<slug>/brief.md
```
Run run `/clear` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app first.

Then hand off with a briefing, not a bare command — a prompt the human pastes into the fresh session after run `/clear` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app. Fill every line; a cold agent must be able to act on this block alone without re-deriving context.

Before filling the briefing, read the `## Execution Profile` section of AGENTS.md (between the `joycraft:execution-profile` sentinels). If swarms are enabled for **decompose** on the harness you're handing to, add one **Execution:** line to the briefing, quoting that harness's profile row **verbatim** — never translate, validate, or improve the model and effort names the human wrote. If the section is missing, or swarms are off for decompose, add no line and say nothing about it.

```
$joycraft-decompose docs/features/<slug>/brief.md

You are picking up the feature brief for <slug>, written <date>.
Decisions <ids> are stamped in the brief — do not reopen them.
Start: decompose the brief into atomic specs. Order: the brief's Decomposition section.
Execution: swarm decompose — <harness> subagents <model> at effort <effort>.
Hazard: <the one known trap, or "none known">.
Done when: docs/features/<slug>/specs/ holds one file per spec plus README.md.
```

Filled example:

```
$joycraft-decompose docs/features/2026-07-29-succinct-gates/brief.md

You are picking up the feature brief for 2026-07-29-succinct-gates, written 2026-07-29.
Decisions D1-D7 are stamped in the brief — do not reopen them.
Start: decompose the brief into atomic specs. Order: the brief's Decomposition section.
Execution: swarm decompose — claude subagents opus-5 at effort medium.
Hazard: gate skills carry position-fragile windows that sliced tests read.
Done when: docs/features/2026-07-29-succinct-gates/specs/ holds one file per spec plus README.md.
```

**Why:** A fresh session for execution produces better results. The interview session has too much context noise — a clean session with just the spec is more focused. Research and design catch wrong assumptions before they propagate into specs — but skip them if the scope is clear and well-understood.

You can also use `$joycraft-decompose` to re-decompose a brief if the breakdown needs adjustment, or run `$joycraft-interview` first for a lighter brainstorm before committing to the full workflow.
