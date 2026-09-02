---
status: done
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: checkpoint
---

# Add Product Identity Generators — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / 2 source files + 2 test files / ~120 lines

---

## What

Both generators — `improveCLAUDEMd` (`src/improve-claude-md.ts`) and `improveAgentsMd` (`src/agents-md.ts`) — gain support for one `## Product Identity` section with subsections Values / Glossary / Taste, appended via the existing header-regex guard pattern so existing user files are never modified. The section is generated **only when elicited content is supplied** (a new optional input on the generator API); with no content, nothing is emitted — init never scaffolds a TODO stub. Note: the two files do not share matching code, so the guard + generator is implemented in both.

## Why

Directional/values content prevents whole failure categories where discipline rules patch single ones — but only if it lands in the always-injected L1 files, which currently have no identity section at all.

## Acceptance Criteria

- [ ] Each generator can append one `## Product Identity` section with Values / Glossary / Taste subsections populated from supplied elicited content [src: D5]
- [ ] The section is appended only when no existing header matches its regex — existing user content is never modified [src: design §2 WS4]
- [ ] With no elicited content supplied, no section and no stub is emitted [src: D5]
- [ ] Both merge chains (`src/improve-claude-md.ts` and `src/agents-md.ts`) implement the guard — one regex line + one generator each [src: design §3]
- [ ] The emitted section is dated (ships small and dated, ready for the pre-committed optimize review) [src: D5]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Section emitted with content | generator called with identity content → section with three subsections + date | unit |
| Regex guard | input file already containing a Product Identity header → unchanged output | unit |
| Elicit-first | generator called without identity content → output contains no Product Identity header, no TODO | unit |
| Both chains | mirrored tests in `tests/agents-md.test.ts` and the improve-claude-md test file | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the elicit-first (no-stub) test.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: exactly one top-level section (`## Product Identity`) with three subsections — not three top-level sections [src: D5]
- MUST: use the append-only header-regex guard pattern (`hasSection(sections, /product\s*identity/i)`) in both files [src: design §3]
- MUST: be elicit-first — no TODO stubs, ever, from init or upgrade [src: D5]
- MUST NOT: modify existing user content in either file [src: design §2 WS4]
- MUST NOT: change the architecture/tree section here — that is spec `add-folder-map-check`, which edits the same files afterward [src: D6]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/improve-claude-md.ts` | `generateProductIdentitySection(content)` + guard line + optional identity input threading |
| Modify | `src/agents-md.ts` | Same, in that file's idiom |
| Modify | `tests/agents-md.test.ts` | New cases per Test Plan |
| Modify | improve-claude-md test file (existing) | New cases per Test Plan |

## Approach

Thread an optional `identity?: { values?: string[]; glossary?: Record<string,string> | string[]; taste?: string[] }` (exact shape is implementation judgment) through the generator entry points; emit only non-empty subsections. Stamp the section with a `_Added YYYY-MM-DD — review at next optimize run_` line so D5's pre-committed review is self-announcing. Consumers (spec 10's elicitation flow) supply the content later; this spec makes the generators able and safe, nothing more. Rejected alternative: three top-level sections — six regex guards across two unshared merge chains (D5's rejected option).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Identity content with only a Glossary | Section emitted with just that subsection |
| User renamed the section but kept the words "product identity" in a header | Regex matches → skip append (correct: never duplicate) |
| Empty strings/arrays supplied | Treated as no content — nothing emitted |
| Both CLAUDE.md (via @AGENTS.md import) and AGENTS.md in one repo | Each generator applies its own guard — the AGENTS.md-import pattern means content lands once in practice |
