# Add Frontmatter Module — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-05-09-collaborative-mode-draft.md`
> **Status:** Complete
> **Date:** 2026-05-09
> **Estimated scope:** 1 session / 2 files / ~200 lines incl. tests

---

## What

Create `src/frontmatter.ts` — a self-contained module that produces and parses YAML frontmatter blocks for the three artifact-metadata schemas defined in the design (personal artifacts, shared artifacts, backlog entries). Includes owner-resolution logic that reads `git config user.name`, falls back to a value persisted in the agent's auto-memory directory, and ultimately asks the user once if neither is available. This module is consumed by spec 6 (skill updates) and spec 7 (collaborative-setup skill) — it has no callers in this spec, but its public API must be stable.

## Why

Without a single source of truth for frontmatter shape and owner resolution, every doc-producing skill would re-implement the YAML emission and the git-config / memory / ask-user fallback chain inline. That duplication breaks on the first schema change and produces inconsistent owner values across artifacts.

## Acceptance Criteria

- [ ] `src/frontmatter.ts` exports `emitPersonalFrontmatter(input: { feature?: string; createdISO?: string; status?: PersonalStatus }): string`. Produces a YAML block (leading `---\n`, trailing `---\n`) with fields `status`, `owner`, `created`, `feature` (omitted entirely when not provided).
- [ ] Exports `emitSharedFrontmatter(input: { lastUpdatedISO?: string }): string` producing `last_updated`, `last_updated_by`.
- [ ] Exports `emitBacklogFrontmatter(input: { source?: string; createdISO?: string; status?: BacklogStatus }): string` producing `status`, `owner`, `created`, `source` (omitted when not provided).
- [ ] Exports `parseFrontmatter(content: string): { frontmatter: Record<string, string> | null; body: string }` — extracts the leading YAML block if present, returns `{ frontmatter: null, body: content }` otherwise. Handles files that don't start with `---` gracefully.
- [ ] Exports `resolveOwner(opts?: { memoryDir?: string }): Promise<string>` with this resolution order: (1) `git config user.name` via `execSync('git config user.name')`, (2) value at `<memoryDir>/joycraft-owner.txt` if it exists, (3) prompt the user via stdin (`readline`) and persist the answer to `<memoryDir>/joycraft-owner.txt`. After successful resolution, if step (1) failed and the user provided a value, log a one-line nudge to stderr: `tip: set "git config --global user.name" so this doesn't ask again.`
- [ ] `memoryDir` defaults to `${process.env.HOME}/.claude/projects/<encoded-cwd>/memory/` matching the format in the existing user MEMORY.md path conventions; in tests it is overridable.
- [ ] Type exports: `PersonalStatus = 'active' | 'shipped' | 'deprecated' | 'superseded' | 'draft'`, `BacklogStatus = 'backlog' | 'promoted' | 'pruned'`.
- [ ] Build, typecheck, and tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| `emitPersonalFrontmatter` produces the 4-field schema | `tests/frontmatter.test.ts` — call with all fields, assert output is exactly `---\nstatus: active\nowner: ...\ncreated: 2026-05-09\nfeature: auth-redesign\n---\n` | unit |
| `emitPersonalFrontmatter` omits `feature` when not given | Same test file — call without `feature`, assert no `feature:` line in output | unit |
| `emitSharedFrontmatter` produces `last_updated` + `last_updated_by` | Same test file — assert both fields present | unit |
| `emitBacklogFrontmatter` produces backlog-specific schema | Same test file — assert `status: backlog` default, `source` omitted when not provided | unit |
| `parseFrontmatter` extracts leading YAML block | Same test file — pass content with `---\nfoo: bar\n---\nbody`, assert `{ frontmatter: { foo: 'bar' }, body: 'body' }` | unit |
| `parseFrontmatter` returns null for content without frontmatter | Same test file — pass `# heading\n\nbody`, assert `frontmatter: null` | unit |
| `parseFrontmatter` doesn't choke on `---` later in body | Same test file — pass content where a horizontal rule appears after some prose, assert frontmatter null | unit |
| `resolveOwner` reads from git config when present | Same test file — mock `execSync` returning a name, assert returned | unit |
| `resolveOwner` falls back to memory file | Same test file — mock `execSync` to throw, pre-write memory file, assert read | unit |
| `resolveOwner` prompts and persists when both unavailable | Same test file — mock execSync to throw + readline to return "max", assert returned value AND memory file written | unit |
| Owner-not-set nudge is logged to stderr | Same test file — capture stderr during the prompt path, assert nudge text appears | unit |

**Execution order:**
1. Write all twelve tests above; they fail (module doesn't exist).
2. Confirm red.
3. Implement `src/frontmatter.ts` until all tests pass (green).

**Smoke test:** `pnpm test --run tests/frontmatter.test.ts` — pure unit tests, runs in <2s.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL.
2. Each test calls the actual exports of `src/frontmatter.ts` (after stubbing in a TODO module skeleton with the right signatures so imports resolve but bodies throw).
3. Smoke test runs the unit file in isolation.

## Constraints

- MUST: Be self-contained — no new runtime dependencies. Use built-ins (`node:child_process` for `execSync`, `node:fs`, `node:readline/promises`).
- MUST: Emit YAML by hand using a small writer — do NOT pull in `js-yaml` or similar (CLAUDE.md ASK FIRST rule on dependencies; the YAML we emit is trivial). The writer only needs to handle string values; quote them only when they contain `:`, `#`, or leading/trailing whitespace.
- MUST: `parseFrontmatter` use a permissive regex that matches `^---\n([\s\S]*?)\n---\n` only at the start of the file — never elsewhere. Lines inside the block are split on the first `: `.
- MUST: `resolveOwner` be the only function that touches stdin or auto-memory. Pure functions (`emit*`, `parse*`) take all their inputs as args.
- MUST: `created` and `last_updated` default to today's ISO date (`YYYY-MM-DD`) when the caller doesn't pass one.
- MUST NOT: Take the user's name from `process.env.USER` — design Q7 explicitly rejected this fallback.
- MUST NOT: Block CI runs — if stdin is not a TTY (`!process.stdin.isTTY`) and resolution falls through to the prompt step, throw a clear error with the suggested fix (`set git config user.name or pre-populate the memory file`). Don't hang.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/frontmatter.ts` | New module — emit/parse functions + resolveOwner |
| Create | `tests/frontmatter.test.ts` | Unit tests for all exports |

## Approach

**Strategy:** Pure functions for emit + parse so they're trivially testable. Effectful function (`resolveOwner`) isolated and dependency-injectable via the `memoryDir` option. The schemas are small enough that a hand-rolled YAML writer is simpler than pulling in a parser; the parser side handles the equally narrow subset we'll ever encounter (we wrote it).

**Data flow for resolveOwner:**
```
resolveOwner({ memoryDir })
  → try { execSync('git config user.name') }
      ↳ success → return name
      ↳ fail    → continue
  → if exists(memoryDir/joycraft-owner.txt) → return readFileSync
  → if !process.stdin.isTTY → throw
  → prompt via readline → readFileSync → write memoryDir/joycraft-owner.txt
  → log stderr nudge
  → return name
```

**Key decisions:**
- One file, multiple exports, no class wrapper. Skills will call these as plain functions; no state to encapsulate.
- Parsing returns `Record<string, string>` not a typed object — different artifact types have different schemas, and `parseFrontmatter` doesn't need to know which. Callers narrow as needed.
- Memory file is plain text (`joycraft-owner.txt`), not JSON. Single-value file; no need for structure.

**Rejected alternative:** Use `js-yaml` for emission. Rejected — adds a runtime dependency for trivially-shaped YAML; CLAUDE.md ASK FIRST rule explicitly applies. Hand-rolled emission is ~30 LOC and our schemas have <6 fields each.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| File starts with frontmatter but second `---` is missing | `parseFrontmatter` returns `frontmatter: null` (regex requires both delimiters). |
| Frontmatter value contains a colon (e.g., `last_updated_by: First: Last`) | Caller must pass single-quoted value or escape. The emitter quotes values containing `: `. |
| Memory dir path contains characters that need URL-encoding (cwd has spaces) | Use the same encoding the existing memory system uses (path-as-is with slashes replaced by dashes); document the assumption in the module's top comment. |
| `git config user.name` returns empty string | Treat as failure; fall through to memory file. |
| Concurrent runs both prompt for owner | Last-write-wins on the memory file; rare and harmless (the names should be the same person anyway). |
| Caller passes `createdISO` already set (e.g., during migration when preserving original date) | Pass through verbatim; don't replace with today's date. |
