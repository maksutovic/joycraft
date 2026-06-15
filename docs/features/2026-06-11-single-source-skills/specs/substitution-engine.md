---
status: done
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: checkpoint
---

# Substitution Engine — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** 1 session / 2 files / ~150 lines

---

## What

Create `scripts/lib/skill-template.mjs` exporting a pure function `applyTemplate(source, harness)` that transforms a canonical skill markdown into a per-harness variant. The function implements three primitives: (1) `{{var}}` variable substitution from a fixed 4-variable lookup table, (2) `<!-- harness:NAME -->...<!-- /harness -->` conditional blocks where `NAME` is `claude`, `codex`, `pi`, or a pipe-list (`claude|codex`), (3) frontmatter field stripping (drop `instructions:` for codex and pi). Throws `Error("unknown template variable: {{x}} in <file>")` on any unknown `{{x}}`. Backed by unit tests in `tests/skill-template.test.ts`.

## Why

Without a pure, testable transform function, the generator can't single-source the 20 skills. This is the foundational primitive that specs 2–4 build on. Extracting it from the orchestrator means it can be tested in isolation without fs mocking.

## Acceptance Criteria

- [ ] `scripts/lib/skill-template.mjs` exists and exports `applyTemplate(source, harness, filename?)` as a pure function (no I/O).
- [ ] `applyTemplate` substitutes `{{skill_prefix}}`, `{{clear}}`, `{{skills_dir}}`, `{{boundary_file}}` from a fixed per-harness lookup (claude / codex / pi values per design.md Section 4).
- [ ] `applyTemplate` throws `Error("unknown template variable: {{x}} in <file>")` (with the offending var and the filename if provided) on any unknown `{{x}}` encountered in the source.
- [ ] `applyTemplate` keeps `<!-- harness:NAME -->...<!-- /harness -->` block contents iff the current harness ∈ NAME (pipe-list supported, e.g. `claude|codex`), otherwise strips the entire block including delimiters.
- [ ] `applyTemplate` parses the YAML frontmatter (if present), drops `instructions:` for `codex` and `pi`, keeps it for `claude`, preserves key order, and re-serializes; output has no leftover blank lines from the strip.
- [ ] Unit tests in `tests/skill-template.test.ts` cover: per-harness variable values, unknown-variable throw, single-harness blocks kept/stripped, pipe-list blocks, frontmatter strip + retain.
- [ ] Build passes (`pnpm typecheck`).
- [ ] Tests pass (`pnpm test --run`).

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Variable substitution (claude) | `applyTemplate('use {{skill_prefix}}foo', 'claude')` → `'use /joycraft-foo'` | unit |
| Variable substitution (codex) | same input, harness=`codex` → `'use $joycraft-foo'` | unit |
| Variable substitution (pi) | same input, harness=`pi` → `'use /skill:joycraft-foo'` | unit |
| `{{clear}}` (claude) | `applyTemplate('When done, {{clear}}.', 'claude')` → contains `/clear` | unit |
| `{{clear}}` (codex multi-surface) | same input, harness=`codex` → output contains both `/clear in the CLI` AND `Cmd+N` (multi-surface sentence — see design.md) | unit |
| `{{clear}}` (pi) | same input, harness=`pi` → contains `/new`, not `/clear` (substring check: no standalone `/clear` outside of `/clear in the CLI` substring) | unit |
| `{{skills_dir}}` per harness | `.claude/skills`, `.agents/skills`, `.pi/skills` | unit |
| `{{boundary_file}}` per harness | `CLAUDE.md`, `AGENTS.md`, `AGENTS.md` | unit |
| Unknown variable throws | `applyTemplate('hi {{nope}}', 'claude', 'x.md')` throws `unknown template variable: {{nope}} in x.md` | unit |
| Single-harness block kept | source has `<!-- harness:claude -->X<!-- /harness -->`, harness=claude → output contains `X`, no delimiters | unit |
| Single-harness block stripped | same source, harness=pi → output has neither `X` nor the delimiters | unit |
| Pipe-list block kept | `<!-- harness:claude\|codex -->Y<!-- /harness -->`, harness=codex → keeps `Y` | unit |
| Pipe-list block stripped | same source, harness=pi → strips entirely | unit |
| Frontmatter `instructions:` strip (codex) | frontmatter with `instructions: foo`, harness=codex → output frontmatter omits the field | unit |
| Frontmatter `instructions:` strip (pi) | same input, harness=pi → field omitted | unit |
| Frontmatter `instructions:` retained (claude) | same input, harness=claude → field preserved verbatim | unit |
| Frontmatter key order preserved | `name: a\ndescription: b\ninstructions: c\nextra: d` w/ codex → `name`, `description`, `extra` in original order | unit |
| Pure function (no I/O) | `applyTemplate` does not import `fs`/`path`/etc. (greppable assertion or import-graph check) | unit |

**Execution order:**
1. Write all tests above — they should fail against an empty/stub `applyTemplate`.
2. Run tests to confirm they fail (red).
3. Implement `applyTemplate` until all tests pass (green).

**Smoke test:** `pnpm test --run tests/skill-template.test.ts` — must complete in <1s per brief Test Strategy.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing).
2. Each test calls `applyTemplate` directly — not a reimplementation.
3. Smoke test runs in <1s.

## Constraints

- MUST: pure function — zero I/O, zero side effects, no `fs`/`path`/`process`/network imports.
- MUST: throw fast on unknown `{{x}}` variables (don't silently pass through).
- MUST: stay under ~150 lines combined for `applyTemplate` and helpers; hand-rolled regex/string ops.
- MUST: preserve frontmatter key order when re-serializing.
- MUST NOT: introduce any runtime dependency (no `js-yaml`, no `mustache`, no `eta`). Hand-rolled YAML is fine — frontmatter is shallow scalar key/value.
- MUST NOT: support `else` / negation / nested conditional blocks. Single flat blocks only.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Create | `scripts/lib/skill-template.mjs` | New module exporting `applyTemplate(source, harness, filename?)`. |
| Create | `tests/skill-template.test.ts` | Vitest unit tests covering all three primitives. |

## Approach

**Pipeline inside `applyTemplate`:**
1. Split frontmatter from body (detect leading `---\n...\n---\n`).
2. Apply frontmatter strip rules per harness (claude=keep `instructions:`, codex/pi=drop). Preserve order by parsing as ordered key/value pairs, not a Map.
3. On the body: process `<!-- harness:NAME -->...<!-- /harness -->` blocks first — for each match, keep inner content (with surrounding newlines normalized to one) iff `harness ∈ NAME.split('|')`, else strip entirely including delimiters.
4. Then substitute `{{var}}` from the lookup. Use one regex to find every `{{x}}`; for each match, replace if known, throw if not.
5. Return the reassembled frontmatter + body.

**Lookup table (literal in module):**
```js
const LOOKUP = {
  claude: { skill_prefix: '/joycraft-', clear: '/clear',
            skills_dir: '.claude/skills', boundary_file: 'CLAUDE.md' },
  codex:  { skill_prefix: '$joycraft-',
            clear: 'run `/clear` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app',
            skills_dir: '.agents/skills', boundary_file: 'AGENTS.md' },
  pi:     { skill_prefix: '/skill:joycraft-', clear: '/new',
            skills_dir: '.pi/skills', boundary_file: 'AGENTS.md' },
};
```

**Codex `clear` is a sentence, not a token** — design.md decision based on web research 2026-06-14: Codex desktop has no `/clear` slash command; only `Cmd+N` works. The expansion gives both CLI and desktop instructions in one sentence so canonical authors write `{{clear}}` once and Codex users on either surface get a correct instruction. Canonical sentences should accommodate this length (e.g. `When you're done, {{clear}} before starting the next spec.`).

**Rejected alternative:** generic templating library. Adds a runtime dep for ~20 lines of regex.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| No frontmatter in source | Body-only processing; output also has no frontmatter. |
| Frontmatter present but no `instructions:` field | All harnesses output unchanged frontmatter. |
| `{{var}}` inside a `<!-- harness:claude -->` block stripped for codex | Block is stripped first, so the variable is never seen — no throw. |
| `{{var}}` inside a `<!-- harness:claude -->` block kept for claude | Variable substituted normally. |
| Two `{{var}}` on the same line | Both replaced. |
| Unclosed `<!-- harness:claude -->` (no `<!-- /harness -->`) | Throw `Error("unclosed harness block: <name> in <file>")`. |
| Unknown harness name in block (e.g. `<!-- harness:emacs -->`) | Stripped (not in `claude|codex|pi` for any current harness); record in tests but don't throw. |
| `{{x}}` literal text the author wanted escaped | Out of scope — author rewrites. (No escape syntax in v1.)
| Pipe-list with whitespace `claude | codex` | Trim parts; both forms supported. |
