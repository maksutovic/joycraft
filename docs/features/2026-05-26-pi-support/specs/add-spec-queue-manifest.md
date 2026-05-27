# Add Spec Queue Manifest — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file modified / ~30 lines

---

## What

The `joycraft-decompose` skill is updated to emit a `.joycraft-spec-queue.json` manifest alongside the existing spec markdown files and README. This JSON manifest is the machine-readable, authoritative spec queue that the Pi pipeline's bash scripts and extension consume to track progress, resolve dependencies, and find the next spec.

## Why

Without a machine-readable spec queue, the autonomous pipeline has no deterministic way to know which spec comes next or which specs are complete — the bash scripts would need to parse markdown tables or YAML frontmatter, both of which are fragile and error-prone.

## Acceptance Criteria

- [ ] `joycraft-decompose` skill instructions include a step to generate `.joycraft-spec-queue.json`
- [ ] The manifest format matches the design: `{ "feature": "<slug>", "specs": [{ "id", "file", "depends_on", "status" }] }`
- [ ] The manifest is generated alongside the spec files in `docs/features/<slug>/specs/`
- [ ] Each spec entry links to its file via relative path from the specs directory
- [ ] Initial status for all specs is `"active"`
- [ ] Dependencies reference spec `id` values, not file paths
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Manifest format is valid JSON | Parse `.joycraft-spec-queue.json`, assert no parse error | integration |
| Manifest has required top-level keys | Assert `feature` is string, `specs` is array | integration |
| Each spec entry has required fields | Assert every spec has `id`, `file`, `depends_on`, `status` | integration |
| Dependencies are valid | Assert every `depends_on` entry references an existing spec `id` | integration |
| File paths are relative and exist | Assert each `file` path + spec directory resolves to an existing `.md` file | integration |
| Decompose skill text includes manifest generation | Grep skill file for `.joycraft-spec-queue.json` | unit |

**Execution order:**
1. Write the manifest format test (parse + validate a known-good JSON)
2. Update the decompose skill to include the manifest generation step
3. Run decompose end-to-end on a sample feature brief, verify the manifest is produced
4. Confirm all tests pass

**Smoke test:** JSON parse test — fails if the manifest doesn't exist or is malformed.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: The JSON manifest is authoritative — if it and the README drift, the JSON wins
- MUST: The manifest lives in `docs/features/<slug>/specs/.joycraft-spec-queue.json` (alongside the spec files and README)
- MUST: `id` values are sequential integers starting from 1
- MUST: `file` values are filenames relative to the specs directory (e.g., `"add-pi-detection.md"`)
- MUST: `depends_on` is an array of integers (spec ids), empty array means no dependencies
- MUST NOT: Change any other part of the decompose skill's behavior — this is purely additive
- MUST NOT: Remove or alter the existing README generation

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| MODIFY | `.agents/skills/joycraft-decompose/SKILL.md` | Add Step 5a: generate `.joycraft-spec-queue.json` after writing specs |
| MODIFY | `src/claude-skills/joycraft-decompose.md` | Mirror the manifest generation step |
| MODIFY | `src/codex-skills/joycraft-decompose.md` | Mirror the manifest generation step |
| MODIFY | `src/pi-skills/joycraft-decompose.md` | Mirror (or create as part of spec 1 — whichever runs first) |

## Approach

1. **Define the format** in the decompose skill instructions:
   ```json
   {
     "feature": "<slug>",
     "specs": [
       { "id": 1, "file": "add-pi-detection.md", "depends_on": [], "status": "active" },
       { "id": 2, "file": "add-pi-skills.md", "depends_on": [1], "status": "active" }
     ]
   }
   ```
2. **Add generation step** to decompose skill (after the spec files are written, before the hand-off message):
   > Step 5a: Write `.joycraft-spec-queue.json` to the specs directory. Use the same spec data from the decomposition table. All specs start with `status: "active"`. Map dependency spec numbers to their `id` values.
3. **Sync all variants** — update the Claude and Codex decompose skills with the same addition. If the Pi variant exists (from spec 1), update it too.
4. **Test** by running decompose end-to-end on a sample brief and validating the output JSON structure.

**Rejected alternative:** Bash-parsing the markdown README table. Fragile — markdown tables have subtle formatting variants, and bash string parsing is error-prone. JSON is deterministic for both bash (`jq` or simple grep+sed) and TypeScript.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Feature has no specs (shouldn't happen) | `specs` array is empty; pipeline reports "no specs found" |
| Spec depends on a non-existent id | Validate at generation time — all ids must exist in the array |
| Manifest already exists (re-decompose) | Overwrite — decompose is idempotent at the file level |
| Spec file is renamed after manifest created | Manual fix required — this is a human operation, not automated |
| Feature slug changes | Manifest `feature` field is updated; old manifest is stale (human reconciles) |
