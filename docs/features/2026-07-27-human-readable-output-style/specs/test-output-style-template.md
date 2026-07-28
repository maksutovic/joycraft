---
status: done
owner: Maximilian Maksutovic
created: 2026-07-27
feature: 2026-07-27-human-readable-output-style
mode: batch
---

# Test Output Style Template — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md`
> **Status:** Ready
> **Date:** 2026-07-27
> **Estimated scope:** 1 session / 1 new test file / ~90 lines

---

## What

Add `tests/output-style-template.test.ts` asserting that the style reference doc
at `src/templates/reference/output-style.md` exists, holds 6–10 rules, carries at
least one worked before/after example, follows the established reference-doc
shape, uses project-relative paths only, and maps to the expected
`reference/output-style.md` bundle key.

The test reads the canonical source under `src/templates/` directly. It does NOT
read the generated `src/bundled-files.ts` — spec 6 owns regeneration, and a test
that depends on generated output would fail before that spec runs.

## Why

Without it, nothing enforces the shape D2 and D6 decided. The rule-count bound
and the worked-example requirement would exist only as prose in the decision log,
free to drift the first time someone edits the doc.

## Acceptance Criteria

- [ ] `tests/output-style-template.test.ts` exists and runs under `pnpm test --run`. [src: design §2 item 5]
- [ ] A test asserts `src/templates/reference/output-style.md` exists. [src: D1]
- [ ] A test asserts the doc contains between 6 and 10 rules inclusive, counted structurally. [src: D2]
- [ ] A test asserts the doc contains at least one worked before/after example. [src: D6]
- [ ] A test asserts the doc has an H1, a blockquote line, and at least one `##` section. [src: design §3 "Pattern 4"]
- [ ] A test asserts the doc contains no `/Users/` and no `joycraft/src` path. [src: brief "Hard Constraints"]
- [ ] A test asserts the doc maps to the bundle key `reference/output-style.md` under `src/templates/`. [src: D1]
- [ ] A test asserts the doc contains no numeric self-scoring rubric. [src: design §4 "Do not add a rubric self-scoring loop"]
- [ ] The test file does not read `src/bundled-files.ts` or any `src/*-skills/` tree. [src: design §2 item 7]
- [ ] `pnpm test --run` passes. [src: brief "Success Criteria"]
- [ ] `pnpm typecheck` passes. [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Doc exists | `expect(existsSync(STYLE_DOC)).toBe(true)` | unit |
| 6–10 rules | Count rule markers, `expect(count).toBeGreaterThanOrEqual(6)` and `.toBeLessThanOrEqual(10)` | unit |
| Worked example | `expect(content).toMatch(/before/i)` and `/after/i` within the example section | unit |
| Reference-doc shape | Assert a `^# ` line, a `^> ` line, and a `^## ` line all present | unit |
| Project-relative paths | `expect(content).not.toMatch(/\/Users\//)` and `.not.toMatch(/joycraft\/src/)` | unit |
| Bundle key | `relative(TEMPLATES_DIR, STYLE_DOC)` normalizes to `reference/output-style.md` | unit |
| No rubric | `expect(content).not.toMatch(/\b(?:1-10|1 to 10|score .* out of)\b/i)` | unit |
| Suite green | `pnpm test --run` | integration |
| Types green | `pnpm typecheck` | unit |

**Execution order:**

1. Write all tests above. If spec 1 has not landed, they fail on the existence
   assertion — that is the correct red state.
2. Run tests to confirm they fail (red) when the doc is absent or malformed.
3. With spec 1's doc in place, all assertions pass (green).

**Smoke test:** `pnpm test --run output-style-template` — a single file, runs in
under a second.

**Before implementing, verify your test harness:**

1. Run the new test file with the style doc absent or renamed — every assertion
   must FAIL. A test that passes against a missing file is asserting nothing.
2. Each test reads the real file at `src/templates/reference/output-style.md` —
   not a fixture copy, not a string literal of the expected content.
3. Identify your smoke test — the single new file, seconds not minutes.

## Constraints

- MUST read the canonical source at `src/templates/reference/output-style.md`. [src: D1]
- MUST count rules structurally (heading or list markers), not by matching prose. [src: D2]
- MUST assert the rule count as a 6–10 inclusive bound. [src: D2]
- MUST mirror the assertion idiom in `tests/reference-templates.test.ts` — existence, shape, relative paths, bundle key. [src: design §3 "Pattern 3"]
- MUST NOT read `src/bundled-files.ts`, `src/claude-skills/`, `src/codex-skills/`, or `src/pi-skills/`. [src: design §2 item 7]
- MUST NOT assert a line count, character count, or word count on the doc. [src: design §4 "Enforce with a content test on the pointer; do not test prose quality"]
- MUST NOT assert on prose quality, tone, or the presence or absence of specific words beyond the structural markers listed above. [src: brief "Out of Scope"]
- MUST NOT edit any file under `src/skills/`. [src: brief "Hard Constraints"]
- MUST NOT add any runtime dependency. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `tests/output-style-template.test.ts` | New vitest file: existence, rule count, worked example, reference-doc shape, relative paths, bundle key, no-rubric. |

## Approach

Copy the structure of `tests/reference-templates.test.ts` — it already does
exactly this job for the five `context/reference/` templates, including the
`walkDir` helper and the bundle-key assertion that mirrors the bundler's
`relative(TEMPLATES_DIR, file)` normalization. Reuse that shape rather than
inventing a parallel idiom.

The one genuinely new assertion is the rule count. Count structurally rather than
semantically: pick whichever marker spec 1's doc actually uses for rules (`###`
headings, or top-level `-` list items under a rules section) and count those,
scoped to the rules section so that the scope section and worked example don't
inflate the count. Read the doc before writing the counter — guessing the marker
and then loosening the regex until it passes is how this assertion becomes
decorative.

Note the bound is on rule *count*, not length. D2 decided "~6-10 rules"; there is
no stamped line or byte bound, and asserting one would fight D2's own requirement
that each rule state its motivation and D6's requirement for a worked example.
That is the RF-KILL-2 failure shape — a hard cap satisfied by silently cutting
the prose the decision exists to require.

**Rejected alternative:** asserting a maximum line count on the doc. Rejected
upstream as RF-KILL-2 (hard word-caps with silent cutting), and nothing in the
decisions block bounds document length.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Spec 1 has not landed yet | Every assertion fails on the missing file. Correct red state — do not stub or skip. |
| The doc's rule marker differs from the guess | Read the doc and fix the counter to match the real marker. Do not loosen the regex until it passes. |
| The worked example section itself uses rule-like markers | Scope the count to the rules section only, so the example cannot inflate it. |
| The doc legitimately grows past 10 rules later | The test fails, which is the point — exceeding the bound needs a new stamped decision, not a quiet test edit. |
| `src/templates/reference/` gains other files later | This test targets `output-style.md` by name and must not assert the directory's full contents — that would couple it to unrelated additions. |
| A path assertion trips on a legitimate mention of the word "joycraft" | Only `joycraft/src` is banned, not the bare product name. Keep the pattern narrow. |
