# Brief: Incorporating the memory-systems critique into Joycraft

**Date:** 2026-08-30
**Status:** Draft — for discussion / decomposition
**Source material:** `docs/max-discussion-transcripts/2026-08-30-memory-systems-critique.md`
(local, untracked)
**Attribution note:** The source video is by Theo Browne (t3.gg), reacting to a
clip of Mario Zechner (creator of Pi) in conversation with Armin Ronacher
(creator of Flask), and citing Lauren (Cursor)'s intervention-elimination
hierarchy and recent Robert C. Martin ("Uncle Bob") commentary. The clip
Theo quotes is from https://x.com/Voxyz_ai/status/2089729031033729036 —
"the two authors of Pi share three design principles" — and those two
authors are **Mario Zechner** (creator of Pi) and **Armin Ronacher**
(creator of Flask). They are the primary credit for the "code is truth" /
minimal-harness thesis this brief responds to.

---

## Why this matters to Joycraft

Joycraft scaffolds exactly the kind of knowledge layer this critique
interrogates. The critique does **not** invalidate Joycraft — everything
Joycraft writes is in-repo, visible, and PR-reviewed, the opposite of the
hidden auto-memory that gets torched in the video. But four of its claims land
squarely on parts of our design, and one of them (the write/read audit) hands
us a measurable health metric we currently lack.

The core distinction to internalize and to teach users:

> **Curated, directional, in-repo context = good. Automatic, accreted,
> point-in-time state = decay waiting to mislead.**

Joycraft's job is to keep users (and itself) on the right side of that line —
and to be the tool that *notices* when a file crosses it.

## The five claims and Joycraft's exposure

| Claim | Verdict for Joycraft |
|---|---|
| "Code is truth; no separate memory system for code" | Agrees for code-shape knowledge. Does NOT cover intent: specs, decisions-with-rationale, product direction — code can't express those. Joycraft's knowledge layer must hold only what code cannot say. |
| Auto-memory decays: redundant / expired / point-in-time (45 files, 26 never read, 3:1 write-to-read) | Bites `docs/discoveries/`, decision log, fact rows — being in git doesn't stop decay, only makes it auditable. Matches our own 52-agent reading-fatigue verdict: delete/tier/verify, not compress. |
| Lauren's hierarchy: architecture > lint/CI > skills/rules > human | Validates `joycraft-harden`; implies harden should be the *default* routing, not a fallback. Prose is the residue after checks fail. |
| Uncle Bob: impose values, not disciplines | Critique of our ALWAYS/NEVER-heavy AGENTS.md template style. Directional/values content (what the product is, taste, glossary) prevents whole failure categories; rules patch single ones. |
| Skills over-reached for; good for *process*, not code knowledge | Joycraft's 22 skills are process-lifecycle — the endorsed category. Keep it that way; resist skills that encode codebase facts. |

## Proposed workstreams (ranked by value / cost)

### 1. Read-telemetry for the knowledge layer ("earn your keep") — highest leverage
Theo's audit method is directly automatable: grep session transcripts for
which context docs were ever *read* vs *written*. A doc written N times and
read 0 times across M sessions is an empirical RETIRE signal.

- Feed write/read ratios into `joycraft-optimize` as a new evidence label
  (e.g. `NEVER_READ`, `WRITE_HEAVY`), making Reaper dispositions defensible
  instead of judgment-only.
- Implementation sketch: transcripts live in `~/.claude/projects/<slug>/`;
  a pure function maps transcript tool calls → per-doc read/write counts.
  No telemetry infra, no network.
- Success metric: optimize report shows a ratio column; RETIRE recommendations
  cite it.

### 2. Lifecycle for discoveries and fact rows ("graduate or die")
Point-in-time state must not sit forever. Give every discovery/fact an
implicit lifecycle: **fresh → graduated (into AGENTS.md / a check) → retired**.

- `joycraft-session-end` and `joycraft-optimize` flag discoveries older than a
  threshold (e.g. 60 days) that were never graduated.
- The shipped ledger is the existing graduation target for "this happened";
  AGENTS.md/harden for "this is always true"; deletion for "this was a moment".
- Explicitly ban the three decay categories in the add-fact routing rubric:
  redundant-with-AGENTS.md, expired shipped-state, point-in-time hazard
  (PR numbers, "currently broken", live URLs to unshipped work).

### 3. Harden-first routing in session-end / add-fact
Reorder the capture question: **"Can this be architecture? A deny pattern or
CI check? Only then, which doc?"** Today routing asks "which doc" first.

- Small skill-content change to `joycraft-add-fact` and `joycraft-session-end`
  (note: skill content changes = ask-first boundary; this brief is the ask).
- Theo's bandwidth-CI story is the model outcome: "my agents don't bug me
  until they fix them."

### 4. Directional/values content in the AGENTS.md template + interview
Shift template weight from discipline lists toward directionality:

- New template sections: *What makes this product special* (values that shape
  suggestions), *Glossary*, *Taste* (code aesthetics the team holds).
- `joycraft-gather-context` / `joycraft-interview` gain questions that elicit
  product identity and taste, not just commands and structure.
- Trim the architecture-tree habit: a `where code lives` map is "probably the
  least useful thing" and the fastest to drift — keep it to folders + one-line
  descriptions, agent-maintainable, or drop it.
- (Template content = core product = ask-first. This brief is the proposal.)

### 5. Positioning + acknowledgments
- README/docs: state Joycraft's stance plainly — "curated harness, not a
  memory system": in-repo, reviewed, reaped. The anti-memory discourse is
  favorable ground; the Reaper is the differentiator.
- Add an **Acknowledgments** section crediting the thinking that shaped this
  direction: Mario Zechner (Pi) & Armin Ronacher — "code is truth",
  minimal-harness; Theo Browne — the memory audit and directional AGENTS.md
  practice; Lauren (Cursor) — the intervention-elimination hierarchy;
  Robert C. Martin — values-not-disciplines.

### 6. Recommend disabling Claude Code auto-memory in Joycraft projects
A Joycraft project and Claude Code's auto-memory are two homes for the same
class of fact — the ONE_HOME condition optimize exists to flag. The curated
layer (AGENTS.md, decision log, discoveries + Reaper) is in-repo, reviewed,
and shared; auto-memory is hidden, per-machine, unreviewed, and has the decay
profile Theo's audit demonstrated (26/45 never read). Recommendation: in a
Joycraft-managed project, auto-memory should be off.

Verified mechanism (Claude Code docs: code.claude.com/docs/en/memory.md,
settings-reference.md, cli-reference.md):

- **Setting:** `"autoMemoryEnabled": false` (default `true`). Scopes:
  `~/.claude/settings.json` (global), `./.claude/settings.json` (project,
  overrides global), `./.claude/settings.local.json` (personal, highest).
  **Per-project disable works with global left on** — this is the shape we
  recommend; a global recommendation would overstep into users' other
  projects.
- **Effect:** disabling stops both writing AND session-start injection of
  `MEMORY.md`. Existing memory dirs go dormant — no deletion required, though
  `~/.claude/projects/<slug>/memory/` can be removed after graduating anything
  worth keeping into `docs/context/`.
- **Ephemeral forms:** `claude --disable-auto-memory` flag,
  `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` env var, `/memory` in-session toggle
  (writes the user-scope setting).

Product hooks:
- **init:** offer (ask-first, it touches user config) to write
  `"autoMemoryEnabled": false` into the project's `.claude/settings.json`
  alongside the other scaffolding, with a one-line explanation of why.
- **tune:** detect auto-memory enabled + a non-empty memory dir for the
  project and raise it as a harness finding, with a graduate-then-archive
  step — mini-Reaper: anything durable moves to `docs/context/` via add-fact
  routing, the rest goes dormant or is deleted with approval.
- **docs:** README/setup guidance states the recommendation and the rationale
  (one home, reviewed, shared) — not "memory bad" but "a Joycraft project
  supersedes it."
- Codex/Pi equivalents: research question — check whether those harnesses
  have comparable auto-memory to disable (Pi reportedly ships none by design).

### Non-goals
- No embeddings, graphs, or retrieval machinery — the critique's strongest
  empirical point (Cursor abandoning code-traversal systems) says don't.
- No new skill that encodes codebase facts.
- Do not remove the knowledge layer — tier and reap it.

## Dependencies / sequencing
1 and 2 compose (telemetry feeds lifecycle). 3 and 4 are skill/template
content edits gated on Max's approval. 5 rides on any release PR. 6 is
approved in principle (per-project disable — Max, 2026-08-30) and splits into
an init offer + a tune detection; it can ship independently of 1–4.
Suggested first feature slug: `earn-your-keep` covering workstreams 1–2.

## Open questions for Max
- Threshold for discovery staleness (60 days? releases-based?).
- Should read-telemetry run automatically in optimize, or as a separate
  opt-in audit (transcript access is privacy-adjacent for team installs)?
