---
name: joycraft-add-context
description: Author one long-form reference doc -- a design system, frontend/backend methodology, testing conventions, or any other long-form reference doc -- scaffolding it from a template and wiring a pointer into the project boundary file's Context Map
---

# Add Context

The user wants to author ONE long-form reference doc — a design system, a frontend or backend methodology, testing conventions, or any other long-form reference for this project. Your job is to scaffold that doc from the matching template, fill in what the user has told you, write it immediately, and wire a pointer row into the project's `## Context Map`.

This is the single-doc primitive. Write-as-you-go is correct here: you scaffold and write ONE doc per invocation, immediately — not a batch.

This skill is self-contained. Everything you need is below; do not call into or import another skill's logic.

## Step 1: Determine Topic and Slug

Figure out what reference doc the user wants. If they named it (e.g., `$joycraft-add-context our design system`), use that. Otherwise ask: "What reference doc do you want to author?" — then wait.

Derive a kebab-case `<slug>` from the topic (e.g., "our design system" → `design-system`, "payments service backend" → `payments-backend`).

## Step 2: Pick the Matching Template

Choose the bundled template in `docs/templates/context/reference/` that best fits the topic:

| Topic | Template |
|-------|----------|
| Design system, tokens, components, visual language | `design-system.md` |
| Frontend architecture, state, folder conventions, patterns | `frontend-methodology.md` |
| Service boundaries, API conventions, data model, errors | `backend.md` |
| Test pyramid, frameworks, fixtures, CI gates | `testing.md` |
| Anything else not covered above | `reference-doc.md` (generic fallback) |

If the topic matches none of the four named templates, use the generic `reference-doc.md`.

## Step 3: Scaffold the Doc to `docs/context/reference/<slug>.md`

1. **Lazy-create `docs/context/reference/`** — create the directory only now, on first write. Do not create it preemptively in projects that never call this skill.
2. Read the chosen template from `docs/templates/context/reference/`. If that template file isn't present in the project, fall back to a minimal skeleton: an `# H1` title, a `>` purpose blockquote, and one `##` section.
3. Copy the template to `docs/context/reference/<slug>.md`, set the H1 to the real topic, and fill in whatever the user has already told you. Leave the rest of the template's deletable italic examples in place for the author to replace.
4. **Write the doc immediately** — this single doc, this invocation. Do not defer or batch.

If `docs/context/reference/<slug>.md` already exists (the user is re-running for the same slug), update it in place rather than creating a duplicate.

## Step 4: Add or Update the Context Map Pointer Row (Idempotent)

Read the project's boundary file — CLAUDE.md and/or AGENTS.md, whichever the project uses — and maintain a pointer row for this doc in the `## Context Map` section. The row format is:

```
| docs/context/reference/<slug>.md | <when to read it> |
```

Apply this idempotent logic exactly:

1. **If a `## Context Map` section does not exist**, create it (place it after the project intro / Behavioral Boundaries area, before deep architecture). Add the header and a two-column table:

   ```markdown
   ## Context Map

   | Doc | When to read it |
   |-----|-----------------|
   ```

2. **If a row whose first cell is `docs/context/reference/<slug>.md` already exists**, update that row in place (refresh the "when to read it" cell). Do NOT add a second row for the same path.

3. **Otherwise**, append one new row to the Context Map table.

Never duplicate a row. The Context Map is a lightweight pointer index — one row per reference doc, nothing more.

## Step 5: Confirm

Report what you did:

```
Scaffolded docs/context/reference/<slug>.md from the <template> template.
Context Map row [added | updated]:
  | docs/context/reference/<slug>.md | <when to read it> |

Fill in the doc's sections — the italic examples are placeholders to replace or delete.
```
