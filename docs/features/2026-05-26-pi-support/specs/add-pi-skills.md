# Add Pi Skill Variants — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / ~20 new files + 2 modified / ~200 lines

---

## What

A third skill variant directory `src/pi-skills/` is created containing all 18 Joycraft skills adapted for Pi. The bundler script is updated to read this directory and export `PI_SKILLS` alongside the existing `SKILLS` and `CODEX_SKILLS` exports. The `joycraft-research` and `joycraft-verify` skills are rewritten to use Pi's subagent pattern instead of Claude's sub-agent spawning API.

## Why

Without Pi-adapted skill files, `joycraft init` cannot install Joycraft skills to `.pi/skills/` with correct `/skill:joycraft-*` invocation syntax and adapted sub-agent workflows, making the entire Pi pipeline impossible.

## Acceptance Criteria

- [ ] `src/pi-skills/` exists with all 18 skill `.md` files
- [ ] All Pi skills use `/skill:joycraft-*` invocation syntax (not `/joycraft-*` or `$joycraft-*`)
- [ ] All Pi skills are free of Claude-specific tool references (`TodoWrite`, `EnterWorktree`, `LSP`)
- [ ] `joycraft-research` instructs the agent to use the `subagent` tool with agent `joycraft-researcher` instead of spawning a Claude sub-agent
- [ ] `joycraft-verify` instructs the agent to use the `subagent` tool with agent `joycraft-verifier` instead of spawning a concurrent subagent thread
- [ ] `scripts/generate-bundled-files.mjs` reads `src/pi-skills/` and outputs `PI_SKILLS` in `src/bundled-files.ts`
- [ ] `PI_SKILLS` is exported from the generated `src/bundled-files.ts`
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| 18 Pi skill files exist | Count `.md` files in `src/pi-skills/`, assert 18 | unit |
| All Pi skills use `/skill:joycraft-` syntax | Grep for `/joycraft-` (without `skill:` prefix) — assert zero matches in Pi skills | unit |
| No Claude tool references in Pi skills | Grep for `TodoWrite\|EnterWorktree\|LSP` in `src/pi-skills/` — assert zero matches | unit |
| research skill references subagent tool | Assert `src/pi-skills/joycraft-research.md` contains `subagent` and `joycraft-researcher` | unit |
| verify skill references subagent tool | Assert `src/pi-skills/joycraft-verify.md` contains `subagent` and `joycraft-verifier` | unit |
| Bundler generates PI_SKILLS | Run `node scripts/generate-bundled-files.mjs`, assert `PI_SKILLS` export exists in output | unit |
| PI_SKILLS has 18 entries | `Object.keys(PI_SKILLS).length === 18` | unit |
| Parity: Claude, Codex, Pi all have same skill names | Compare `Object.keys(SKILLS)`, `CODEX_SKILLS`, `PI_SKILLS` — assert identical set | unit |

**Execution order:**
1. Write all tests above — they should fail against current code (no `PI_SKILLS`, no `src/pi-skills/`)
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** Parity test — fastest assertion, no file I/O needed after build.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Derive Pi skills from the Codex variant content (not Claude) — Codex variants are already free of Claude-specific tools
- MUST: Mechanical adaptation (invocation syntax) plus substantive rewrites (research/verify subagent sections). No other skill content changes.
- MUST: All 18 Pi skills must pass YAML frontmatter validation (valid `name`, `description` fields)
- MUST: The `generate-bundled-files.mjs` script must produce deterministic output (sorted keys, stable formatting)
- MUST NOT: Modify Claude or Codex skill variants during this spec
- MUST NOT: Change the output format of `bundled-files.ts` — only add a fourth export (`PI_SKILLS`) following the existing pattern

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| CREATE | `src/pi-skills/joycraft-*.md` (18 files) | Pi-adapted skill variants |
| MODIFY | `scripts/generate-bundled-files.mjs` | Add `PI_SKILLS_DIR` constant, add reading loop, add export formatting |
| MODIFY | `src/bundled-files.ts` | Auto-generated — gains `PI_SKILLS` export |
| MODIFY | `tests/codex-skill-parity.test.ts` | Extend to 3-way parity (Claude, Codex, Pi) |
| CREATE | `tests/pi-skill-content.test.ts` | New test file for Pi-specific content checks |

## Approach

1. **Create Pi skills.** For each Codex skill, copy to `src/pi-skills/` and:
   - Replace `$joycraft-` with `/skill:joycraft-` everywhere (invocation syntax)
   - For research/verify: rewrite the sub-agent spawning sections to use Pi's subagent tool pattern
2. **Update bundler.** Add `PI_SKILLS_DIR = 'src/pi-skills'` to `generate-bundled-files.mjs`, mirroring the existing `SKILLS_DIR` and `CODEX_SKILLS_DIR` processing. Format the export with same indentation/style as existing exports.
3. **Regenerate.** Run `node scripts/generate-bundled-files.mjs` to produce updated `bundled-files.ts`.
4. **Write tests.** Extend parity test to 3-way comparison. Add content checks for Pi-specific invocation syntax and subagent references.

**Rejected alternative:** Runtime string replacement on Codex skills at install time. Fragile — would need to handle code blocks, file paths, and edge cases. A third source directory follows the existing pattern exactly.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| CREATE | `src/pi-skills/joycraft-*.md` (18 files) | Pi-adapted skill variants derived from Codex content |
| MODIFY | `scripts/generate-bundled-files.mjs` | Add `PI_SKILLS_DIR = 'src/pi-skills'`, loop for reading, format export |
| AUTO | `src/bundled-files.ts` | Regenerated — gains `PI_SKILLS: Record<string, string>` export |
| MODIFY | `tests/codex-skill-parity.test.ts` | Extend from 2-way to 3-way (Claude, Codex, Pi) parity check |
| CREATE | `tests/pi-skill-content.test.ts` | Test: invocation syntax, no Claude tools, subagent references in research/verify |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A Codex skill has `$joycraft-` inside a code block | The replacement should still apply — it's an invocation reference regardless of context |
| A skill file has no invocation references at all | No changes beyond the copy — the skill already works as-is |
| `src/pi-skills/` already exists (re-run) | Bundler overwrites files in the directory with current content; deterministic output |
| Bundler generates different ordering than expected | Sort keys alphabetically — `Object.keys(files).sort()` |
