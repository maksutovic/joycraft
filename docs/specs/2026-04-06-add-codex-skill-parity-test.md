# Add Codex Skill Parity Test — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-codex-skills-support.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 1 file / ~60 lines

---

## What

Add a test file that verifies every Claude skill in `src/skills/` has a corresponding Codex skill in `src/codex-skills/` with a matching `name` frontmatter field, and that Codex skills contain no Claude-specific tool references. This is a guardrail that catches drift between the two skill sets.

## Why

Without a parity test, a developer could add a new Claude skill and forget to create the Codex counterpart, or accidentally leave Claude-specific tool references in a Codex skill. This test catches both issues at CI time.

## Acceptance Criteria

- [ ] Test verifies every `.md` file in `src/skills/` has a corresponding `.md` file in `src/codex-skills/`
- [ ] Test verifies every Codex skill's `name` frontmatter matches its Claude counterpart's `name`
- [ ] Test verifies no Codex skill contains references to banned Claude-specific tools (`TodoWrite`, `Skill` tool, `EnterWorktree`, `LSP`)
- [ ] Test verifies no Codex skill uses `/joycraft-` invocation syntax (should be `$joycraft-`)
- [ ] All tests pass
- [ ] Tests run in <5 seconds

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| File parity | List both dirs, compare filenames | unit |
| Name match | Parse frontmatter from both, compare `name` fields | unit |
| No banned tools | Regex search each Codex file for banned tool names | unit |
| No `/joycraft-` syntax | Regex search each Codex file for `/joycraft-` | unit |

**Execution order:**
1. Write the parity test file
2. Run tests — if Spec 1 is complete, they should pass; if not, they'll fail (which is expected)

**Smoke test:** `pnpm test --run tests/codex-skill-parity.test.ts` completes in <3 seconds.

**Before implementing, verify your test harness:**
1. Tests read actual source files from `src/skills/` and `src/codex-skills/`
2. Tests parse real YAML frontmatter (not hardcoded values)
3. Tests will fail if a new Claude skill is added without a Codex counterpart

## Constraints

- MUST: Read actual files from `src/skills/` and `src/codex-skills/` (not hardcoded lists)
- MUST: Parse YAML frontmatter to extract `name` fields
- MUST: Check for banned tool references: `TodoWrite`, `EnterWorktree`, `LSP` (as tool names, not prose mentions)
- MUST: Check for `/joycraft-` invocation pattern (should be `$joycraft-`)
- MUST NOT: Import or depend on `bundled-files.ts` — this test validates source files directly

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `tests/codex-skill-parity.test.ts` | Parity test between Claude and Codex skill source files |

## Approach

1. Use `readdirSync` to list all `.md` files in `src/skills/` and `src/codex-skills/`
2. Verify 1:1 mapping — every Claude skill has a Codex counterpart and vice versa
3. For each pair, parse YAML frontmatter (split on `---`, parse the middle section) and compare `name` fields
4. For each Codex skill, scan content for:
   - Banned tool patterns: `/\bTodoWrite\b/`, `/\bEnterWorktree\b/`, `/\bLSP\b/` (as tool references)
   - Wrong invocation syntax: `/\/joycraft-/` (slash prefix instead of dollar)
5. Use `describe.each` or a loop to generate one test per skill file for clear failure messages

**Rejected alternative:** Hardcoded list of expected skills. Rejected because the test should automatically detect new skills added to either directory — a hardcoded list would need manual updates.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| New Claude skill added without Codex counterpart | Test fails with clear message: "Missing Codex skill for: joycraft-foo" |
| Codex skill exists without Claude counterpart | Test fails: "Orphan Codex skill: joycraft-foo" |
| Codex skill mentions "TodoWrite" in prose context (e.g., "unlike Claude's TodoWrite") | Flagged — err on the side of strictness; Codex skills shouldn't reference Claude internals at all |
| Codex skill has different `description` than Claude | Allowed — only `name` must match exactly |
| Frontmatter parsing fails | Test fails with descriptive error identifying the file |
