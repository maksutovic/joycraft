---
name: joycraft-gather-context
description: First-run onboarding pass that populates the project context layer -- read what context already exists, then offer a gap-only interview and batch-write the missing fact rows and long-form reference docs
---

# Gather Context

This is the first-run **read-then-offer** onboarding pass — the lowest-intervention way to populate the project's context layer. You read what context already exists, summarize coverage, offer a gap-only interview, and write everything in one reviewable batch at the end.

This skill is self-contained. It composes the same conventions the single-doc skills use, but everything you need is inlined below — do not call into or import another skill's logic.

## Step 1: Read What Already Exists First

The user has invoked the first-run onboarding pass (e.g., `/skill:joycraft-gather-context`). Before asking the user anything, scan the project's existing context. Default scan breadth is **README + `docs/` + AGENTS.md only**:

- The README(s) at the repo root and any obvious sub-package READMEs.
- `docs/**` — existing design, architecture, or style docs.
- `docs/context/*` — the flat operational fact-docs (production-map, dangerous-assumptions, decision-log, institutional-knowledge, troubleshooting) and `docs/context/reference/*` long-form docs.
- The current AGENTS.md content — including any `## Context Map` section.

Then summarize for the user what context already exists and what's covered.

**Do NOT auto-run a code-inference scan.** Reading the actual source to infer architecture costs significantly more tokens. Offer that deeper/full review ONLY if the user explicitly asks for it, and when you do, note clearly that it costs more tokens. The default pass never reads the codebase to infer context.

## Step 2: Offer a Gap-Only Interview (Don't Force)

From the summary, identify genuine gaps: no design-system doc? no production map? no decision log? Offer an **optional** interview that targets only those gaps. The user can decline any or all of it — offer, never force.

**Per-doc skip guard (not all-or-nothing):** Never re-interview for a doc that already has real content. Skip each doc that's already populated individually, and interview only the empty or missing ones. If everything is already covered, say so and offer nothing.

## Step 3: Route by Shape (Inline Test)

For each thing the user wants to capture, apply this minimal shape test inline — do not defer to another skill:

- **"Could this be one row in a table?"** → it's an **operational fact**. Route it to one of the five flat fact-docs under `docs/context/`:
  - `docs/context/production-map.md` — infrastructure, services, environments, URLs, credentials, safe/unsafe to touch.
  - `docs/context/dangerous-assumptions.md` — false assumptions an agent might make.
  - `docs/context/decision-log.md` — an architectural/tooling choice and why.
  - `docs/context/institutional-knowledge.md` — team conventions, unwritten rules, ownership.
  - `docs/context/troubleshooting.md` — when X happens, do Y.
  Append it as a table row (or list item for institutional-knowledge), removing any italic example rows in that table first.

- **"Does explaining it take paragraphs?"** → it's **long-form reference**. Scaffold `docs/context/reference/<slug>.md` from the matching template in `docs/templates/context/reference/` (`design-system`, `frontend-methodology`, `backend`, `testing`, or the generic `reference-doc` fallback), lazy-creating `docs/context/reference/` on first write.

If an item is ambiguous, apply the test literally: one row → fact bucket; paragraphs → reference doc.

## Step 4: Batch-Write + One Final Confirm

Do NOT write per-answer. Collect ALL of the user's gap answers across the whole interview first. Then, in ONE batch:

1. Write all the fact rows into their fact-docs.
2. Scaffold and write all the reference docs into `docs/context/reference/`.
3. Add or update the `## Context Map` pointer rows in AGENTS.md — one row per reference doc, in the form `| docs/context/reference/<slug>.md | <when to read it> |`. Create the `## Context Map` section (header + two-column table) if it doesn't exist; update an existing row in place rather than duplicating it.

Present the full set of intended changes and get ONE final confirm ("do it in one go") before writing. If the user aborts at the final confirm, write nothing — there are no partial writes in this batch model. The result is one clean, reviewable diff.

## Step 5: Confirm

Report the batch: which fact rows were added, which reference docs were scaffolded, and which Context Map rows were created or updated.
