---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: batch
---

# Update Contributor Docs — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / 2 files / ~80 lines

---

## What

Update `docs/guides/agent-compatibility.md` so it documents the **canonical format** (`src/skills/`), the three template primitives (variable substitution, `<!-- harness:NAME -->` conditional blocks, frontmatter strip), the fixed 4-variable lookup, and the "edit canonical, not the per-harness dirs" workflow. Fix the outdated manual-regeneration snippet at `CONTRIBUTING.md:91-128` — replace it with a one-line pointer to `pnpm build`.

## Why

After spec 4, all 20 skills are single-sourced and contributors editing `src/<harness>-skills/` files will have their work overwritten on next `pnpm build`. The contributor docs must steer them to `src/skills/` and explain the template syntax, or this whole feature creates a new footgun.

## Acceptance Criteria

- [ ] `docs/guides/agent-compatibility.md` contains a section titled (e.g.) "Canonical skill format" describing the `src/skills/` source layout.
- [ ] The guide lists the four template variables (`{{skill_prefix}}`, `{{clear}}`, `{{skills_dir}}`, `{{boundary_file}}`) and their per-harness expansions in a table.
- [ ] The guide explains `<!-- harness:NAME -->...<!-- /harness -->` syntax, including pipe-list support (`claude|codex`), and notes that unknown variables fail the build (per spec 1).
- [ ] The guide explains frontmatter-stripping behavior (`instructions:` field dropped for codex/pi).
- [ ] The guide tells contributors: "edit canonical files in `src/skills/`; run `pnpm build` to regenerate; commit canonical + all per-harness + `bundled-files.ts` together (per the same-commit invariant)."
- [ ] `CONTRIBUTING.md:91-128` no longer contains the outdated inline `node -e "..."` regeneration command; it points contributors to run `pnpm build` and edit `src/skills/`.
- [ ] `pnpm test --run && pnpm typecheck` pass (no test should regress; this is docs-only).

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Agent-compatibility guide describes canonical format | Grep `docs/guides/agent-compatibility.md` for `src/skills/`, `{{skill_prefix}}`, `<!-- harness:` — all present | manual |
| Variable table present | Guide has a table with rows for all 4 variables and columns for claude/codex/pi expansions | manual |
| CONTRIBUTING.md snippet replaced | `grep "node -e" CONTRIBUTING.md` returns no match in the regen section; `grep "pnpm build" CONTRIBUTING.md` shows the replacement | manual |
| No test regression | `pnpm test --run && pnpm typecheck` pass | integration |

**Execution order:**
1. Read current `docs/guides/agent-compatibility.md` (likely needs a partial rewrite, not append-only).
2. Read current `CONTRIBUTING.md:91-128`.
3. Draft replacement text for both. Keep guide ≤ ~150 lines total.
4. Confirm test suite still passes.

**Smoke test:** `pnpm test --run` (single full run) — docs-only spec, no granular smoke needed.

**Before implementing, verify your test harness:**
1. Read both target files first; don't draft blind.
2. If `docs/guides/agent-compatibility.md` doesn't exist, create it (lazy-create).
3. Variable table values must match design.md Section 4 verbatim — copy, don't paraphrase.

## Constraints

- MUST: variable expansions in the table match `scripts/lib/skill-template.mjs` lookup exactly.
- MUST: tell contributors to commit `src/skills/`, per-harness dirs, and `src/bundled-files.ts` together (frictionless-implement discovery applies).
- MUST: keep the guide focused — this is about how to edit skills, not joycraft's harness compatibility story in general.
- MUST NOT: invent template features that don't exist (no `else` blocks, no negation, no nested blocks).
- MUST NOT: re-document drift-resolution policy in the guide — that's a PR-description-only audit trail per design.md.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify (or Create) | `docs/guides/agent-compatibility.md` | Add "Canonical skill format" section with template syntax docs and variable table. |
| Modify | `CONTRIBUTING.md` (lines ~91-128) | Replace outdated `node -e "..."` regen snippet with one-liner pointing at `pnpm build`. |

## Approach

**Guide structure (new section):**
```markdown
## Canonical skill format

All 20 skills live in `src/skills/` as canonical `.md` files. The build pipeline
(`pnpm build`) transforms each canonical into three per-harness variants written
to `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, then bundles
them into `src/bundled-files.ts`.

**Edit `src/skills/`. Never edit the per-harness dirs by hand — your changes
will be overwritten on next `pnpm build`.**

### Three template primitives

1. **Variable substitution:** `{{var}}` replaced from a fixed lookup.

   | Variable | claude | codex | pi |
   |---|---|---|---|
   | `{{skill_prefix}}` | `/joycraft-` | `$joycraft-` | `/skill:joycraft-` |
   | `{{clear}}` | `/clear` | `run /clear in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app` | `/new` |
   | `{{skills_dir}}` | `.claude/skills` | `.agents/skills` | `.pi/skills` |
   | `{{boundary_file}}` | `CLAUDE.md` | `AGENTS.md` | `CLAUDE.md and/or AGENTS.md` |

   The Codex `{{clear}}` expansion is a **multi-surface sentence** because the Codex
   desktop app does not support `/clear` — only `Cmd+N` works there (per Codex docs:
   [CLI](https://developers.openai.com/codex/cli/slash-commands),
   [desktop](https://developers.openai.com/codex/app/commands)). Write canonical
   sentences that read fluently with the longer expansion substituted in (e.g.
   `When you're done, {{clear}} before the next spec.`). Avoid `{{clear}}` in
   tight clauses where the long form would break readability — split into a
   separate sentence instead.

   Unknown variables fail the build immediately
   (`Error("unknown template variable: {{x}} in <file>")`).

2. **Conditional blocks:**
   `<!-- harness:NAME -->...<!-- /harness -->` where `NAME` is `claude`,
   `codex`, `pi`, or a pipe-list (e.g. `claude|codex`). The block content is
   kept iff the current harness ∈ `NAME`; otherwise the entire block including
   delimiters is stripped. Use sparingly — only for content that's genuinely
   harness-specific (different machinery, not just different prose).

3. **Frontmatter stripping:** The generator parses YAML frontmatter and drops
   the `instructions:` field for `codex` and `pi`. All other fields preserved.

### Workflow

1. Edit a file in `src/skills/`.
2. Run `pnpm build` — this regenerates the three per-harness dirs and
   `src/bundled-files.ts` in one step.
3. Commit canonical, all three per-harness files, AND `src/bundled-files.ts`
   together (same commit). The sync tests
   (`tests/bundled-files-sync.test.ts`) enforce this invariant.
4. Run `pnpm test --run && pnpm typecheck` to verify.
```

**CONTRIBUTING.md fix** — replace the ~30-line `node -e "..."` snippet with:
```markdown
After changing any file in `src/skills/` or `src/templates/`, run:

    pnpm build

This regenerates the three `src/*-skills/` dirs and `src/bundled-files.ts`.
Commit all changes together. See `docs/guides/agent-compatibility.md` for the
canonical skill format and template syntax.
```

**Rejected alternative:** put the variable table inline in CONTRIBUTING.md too. Duplication; the guide is the home for syntax details.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `docs/guides/agent-compatibility.md` already has content unrelated to skill format | Append the new section; don't overwrite existing content. |
| `docs/guides/agent-compatibility.md` doesn't exist | Create it with just the canonical-format section (plus a brief intro paragraph). |
| `CONTRIBUTING.md:91-128` line numbers shift between brief authorship and now | Locate the snippet by content (`node -e "..."` + the surrounding "After changing" text), not by absolute line. |
| Guide ends up duplicating something in a future spec-6 design doc | Out of scope here; spec 6 is about a different concern (brief reconciliation). |
