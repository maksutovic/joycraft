---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-03
feature: 2026-09-02-omp-support
mode: checkpoint
---

# Add omp Harness Core — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-02-omp-support/brief.md`
> **Status:** Ready
> **Date:** 2026-09-03
> **Estimated scope:** 1 session / ~6 source files + 22 generated files / ~120 lines hand-written

---

## What

Add `omp` (Oh My Pi — binary `omp`, npm package `@oh-my-pi/pi-coding-agent`) as the fifth value in Joycraft's harness enum and wire it through the single-source skill pipeline. After this spec: `HARNESSES` in `src/harness.ts` contains `omp` with a menu label; `scripts/lib/skill-template.mjs` has an `omp` row in `LOOKUP` and an entry in `STRIP_INSTRUCTIONS`; `scripts/generate-bundled-files.mjs` emits `src/omp-skills/` and an `OMP_SKILLS` record into `src/bundled-files.ts`; and `scripts/sync-skills.mjs` copies that generated tree into this repo's own `.omp/skills/` dogfood install.

This is the plumbing spec only. It does **not** touch `src/init.ts`, `src/upgrade.ts`, or `src/gitignore.ts` (spec 2 owns those), and it does **not** edit any skill body in `src/skills/` (spec 3 owns that). The omp skills generated here will be missing harness-block content until spec 3 runs — that is expected and is why spec 3 is a hard follow-on rather than optional polish.

## Why

Without the enum entry and the transform row, no other omp work can start: `applyTemplate(source, 'omp')` throws `unknown harness: omp`, there is no `OMP_SKILLS` record for init/upgrade to install, and `parseHarnessSelection('omp')` returns `null` so the CLI rejects the harness name.

## External API Contract

**Package:** `@oh-my-pi/pi-coding-agent` (binary `omp`, repo `github.com/can1357/oh-my-pi`)

**Canonical sources:**
- The locally installed v18.1.5 bundled docs (Homebrew install) — the source every discovery claim in the parent brief was read from.

**Key API facts (validated against v18.1.5):**
- omp discovers skills at `.omp/skills/<name>/SKILL.md`. Discovery is **non-recursive** — a nested directory below `<name>/` is not found.
- omp's native skill provider **rejects a skill whose frontmatter has no non-empty `description`**.
- omp's user-facing skill invocation form is `/skill:<name>`; `/new` is its built-in session-boundary command.
- omp also discovers `.claude/skills` (priority 80), `.agents/skills` (priority 70), `.github/skills` (priority 30); a native `.omp/skills` entry wins any name collision at priority 100.
- omp reads the root `AGENTS.md` and `CLAUDE.md`, expanding `@` imports.
- No SDK or runtime dependency is required — discovery is purely file-based.

## Acceptance Criteria

- [ ] `HARNESSES` in `src/harness.ts` is `['claude', 'codex', 'pi', 'copilot', 'omp']` and `HARNESS_LABELS` has an `omp` entry naming `.omp/` [src: brief "Hard Constraints"]
- [ ] `parseHarnessSelection('omp')` returns `['omp']`, and `parseHarnessSelection('all')` includes `omp` [src: brief "Hard Constraints"]
- [ ] `sanitizeHarnesses(['omp'])` returns `['omp']` [src: brief "Hard Constraints"]
- [ ] `LOOKUP.omp` in `scripts/lib/skill-template.mjs` is exactly `{ skill_prefix: '/skill:joycraft-', clear: '/new', skills_dir: '.omp/skills', boundary_file: 'AGENTS.md' }` [src: D8]
- [ ] `STRIP_INSTRUCTIONS.omp` is `true` [src: D8]
- [ ] `applyTemplate(source, 'omp')` substitutes all four variables and does not throw [src: D8]
- [ ] `pnpm build`-time generation produces `src/omp-skills/` with one `.md` per canonical skill in `src/skills/` [src: brief "Hard Constraints"]
- [ ] `src/bundled-files.ts` exports an `OMP_SKILLS: Record<string, string>` with the same key count as `PI_SKILLS` [src: brief "Hard Constraints"]
- [ ] `scripts/sync-skills.mjs` has an `omp` target writing to `.omp/skills` and running it populates this repo's `.omp/skills/<name>/SKILL.md` [src: brief "Hard Constraints"]
- [ ] Every generated omp skill has a non-empty `description:` in frontmatter [src: brief "Hard Constraints"]
- [ ] Every generated omp skill sits flat at `<name>/SKILL.md` once installed — no nested subdirectories [src: brief "Hard Constraints"]
- [ ] No generated omp skill contains an absolute path (`/Users/`, `/home/`) [src: brief "Hard Constraints"]
- [ ] `src/omp-skills/` and `.omp/skills/` are regenerated, synced, and committed in the same commit as this spec's source changes [src: AGENTS.md]
- [ ] `pnpm test` and `pnpm typecheck` pass [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| HARNESSES contains omp; label present | `tests/harness-selection.test.ts` — assert `HARNESSES` includes `'omp'` and its length is 5 | unit |
| parseHarnessSelection('omp') / 'all' | `tests/harness-selection.test.ts` — assert both return arrays containing `'omp'` | unit |
| sanitizeHarnesses round-trips omp | `tests/harness-selection.test.ts` — `sanitizeHarnesses(['omp'])` → `['omp']` | unit |
| LOOKUP.omp exact values | `tests/skill-template.test.ts` — transform a fixture with all four `{{vars}}`, assert `/skill:joycraft-`, `/new`, `.omp/skills`, `AGENTS.md` in output | unit |
| STRIP_INSTRUCTIONS.omp true | `tests/skill-template.test.ts` — a fixture with `instructions:` in frontmatter renders without it under omp | unit |
| applyTemplate doesn't throw | `tests/skill-template.test.ts` — `expect(() => applyTemplate(src, 'omp')).not.toThrow()` | unit |
| src/omp-skills/ generated fresh | `tests/generated-skills-fresh.test.ts` — extend to assert the omp tree matches a fresh generation | integration |
| OMP_SKILLS export parity | `tests/bundled-files.test.ts` — assert `Object.keys(OMP_SKILLS).length === Object.keys(PI_SKILLS).length` | unit |
| .omp/skills synced | `tests/installed-skills-sync.test.ts` — extend the harness loop to include the `.omp/skills` target | integration |
| non-empty description | `tests/omp-skill-parity.test.ts` is spec 3's; assert here in `tests/bundled-files.test.ts` that every `OMP_SKILLS` value has a non-empty `description:` | unit |
| flat layout | `tests/installed-skills-sync.test.ts` — assert every installed omp path matches `.omp/skills/<name>/SKILL.md` with no deeper nesting | integration |
| no absolute paths | extend the existing absolute-path assertion (see `tests/gate-contract.test.ts` "Skills are copied into user projects" comment) to cover `src/omp-skills/` | unit |

**Execution order:**
1. Write all tests above — they should fail against current code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/skill-template.test.ts` — runs in seconds and covers the transform row every other spec depends on.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes

## Constraints

- MUST: add `omp` to `HARNESSES` in `src/harness.ts` and give it a `HARNESS_LABELS` entry [src: brief "Hard Constraints"]
- MUST: add the `omp` row to `LOOKUP` with exactly the D8 values and an `omp: true` entry in `STRIP_INSTRUCTIONS` [src: D8]
- MUST: generate `src/omp-skills/` from `src/skills/` and export `OMP_SKILLS` from `src/bundled-files.ts`, wired through `scripts/generate-bundled-files.mjs` [src: brief "Hard Constraints"]
- MUST: add an `omp` entry to `TARGETS` in `scripts/sync-skills.mjs` with `installed: join('.omp', 'skills')` [src: brief "Hard Constraints"]
- MUST: run `pnpm sync-skills` and commit the regenerated `src/omp-skills/` and installed `.omp/skills/` in this spec's own commit [src: AGENTS.md]
- MUST: keep every generated omp skill flat at `.omp/skills/<name>/SKILL.md` — omp discovery is non-recursive [src: brief "Hard Constraints"]
- MUST: ensure every generated omp skill carries a non-empty `description` — omp's native provider rejects skills without one [src: brief "Hard Constraints"]
- MUST NOT: edit any file in `src/skills/` — spec 3 owns skill bodies [src: brief "Decomposition"]
- MUST NOT: edit `src/init.ts`, `src/upgrade.ts`, or `src/gitignore.ts` — spec 2 owns those [src: brief "Decomposition"]
- MUST NOT: hand-edit `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, or `src/omp-skills/` [src: brief "Hard Constraints"]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]
- MUST NOT: reference absolute paths in any generated omp skill [src: brief "Hard Constraints"]
- MUST NOT: write `.omp/AGENTS.md`, `.omp/RULES.md`, `.omp/config.yml`, `.omp/extensions/`, `.omp/agents/`, or `.omp/scripts/` [src: D1, D2]

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `src/harness.ts` | `omp` added to `HARNESSES`; `HARNESS_LABELS.omp = 'Oh My Pi (.omp/)'`; doc comment gains the `.omp/` mapping row |
| Modify | `scripts/lib/skill-template.mjs` | `LOOKUP.omp` row (D8 values); `STRIP_INSTRUCTIONS.omp = true`; JSDoc `@param` union gains `'omp'`; header comment's harness list updated |
| Modify | `scripts/generate-bundled-files.mjs` | `OMP_SKILLS_DIR` const; `['omp', OMP_SKILLS_DIR]` in `HARNESS_TARGETS`; `readFlatDir(OMP_SKILLS_DIR)`; `formatRecord('OMP_SKILLS', ompSkills)`; console summary counts omp |
| Modify | `scripts/sync-skills.mjs` | `{ harness: 'omp', generated: 'omp-skills', installed: join('.omp', 'skills') }` in `TARGETS` |
| Generate | `src/omp-skills/*.md` | 22 generated files (never hand-edited) |
| Generate | `src/bundled-files.ts` | `OMP_SKILLS` record added |
| Generate | `.omp/skills/<name>/SKILL.md` | 22 installed dogfood copies |
| Modify | `tests/harness-selection.test.ts` | omp cases |
| Modify | `tests/skill-template.test.ts` | omp transform cases |
| Modify | `tests/bundled-files.test.ts` | `OMP_SKILLS` parity + description assertions |
| Modify | `tests/generated-skills-fresh.test.ts` | omp tree freshness |
| Modify | `tests/installed-skills-sync.test.ts` | `.omp/skills` target + flat-layout assertion |

## Approach

Mirror Copilot everywhere it appears — the 0.7.5 Copilot addition is the exact template, and both scripts already iterate a list rather than hardcoding harnesses, so each change is one array entry plus one record.

Order of work, chosen so the suite goes green monotonically rather than thrashing:

1. `src/harness.ts` — enum + label. This alone makes `parseHarnessSelection('omp')` work.
2. `scripts/lib/skill-template.mjs` — the `LOOKUP` row and strip entry. Run the smoke test here; everything downstream depends on this row being right.
3. `scripts/generate-bundled-files.mjs` — the generator target and record. Run `pnpm build` (or the generator directly) to produce `src/omp-skills/` and the `OMP_SKILLS` record.
4. `scripts/sync-skills.mjs` — the sync target, then `pnpm sync-skills` to fill `.omp/skills/`.
5. Tests last, then `pnpm test && pnpm typecheck`.

The D8 values make omp's row identical to Pi's except `skills_dir`. That is deliberate and correct: omp is a Pi fork sharing `/skill:` invocation and `/new`, differing only in config dir. Do not "simplify" by aliasing omp to the Pi row — the rows must stay independent so spec 3 can diverge their block membership without coupling.

**Rejected alternative:** teaching `sync-skills.mjs` to derive its target list from `HARNESSES` so a new harness needs one edit instead of four. Tempting, but `HARNESSES` is TypeScript consumed by an `.mjs` script, the installed-path shapes are irregular (`.github/skills` vs `.agents/skills`), and Pi carries extra non-skill trees. The refactor is a bigger, riskier diff than the four literal entries it saves, and it would touch the one script whose staleness caused the 0.7.3 twelve-wrong-copilot-skills incident.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `applyTemplate(src, 'omp')` on a skill with no frontmatter | Body-only transform; no `---` fences synthesized (existing `splitFrontmatter` path) |
| A canonical skill whose frontmatter has a per-harness `description` block | Blocks inside frontmatter are processed before var substitution, so the omp variant gets its own description — must remain non-empty |
| `parseHarnessSelection('OMP')` (uppercase) | Returns `['omp']` — the parser lowercases tokens |
| `parseHarnessSelection('omp,pi')` | Returns `['omp', 'pi']` reordered to canonical `HARNESSES` order? No — `parseHarnessSelection` preserves input order and dedupes; only `sanitizeHarnesses` reorders. Assert the existing behavior, don't change it |
| `sanitizeHarnesses(['omp', 'omp'])` | `['omp']` — deduped via the Set |
| State file from an older version listing only `['claude']` | Unchanged; omp absent. Spec 2 owns the D5 legacy-fallback behavior |
| `src/omp-skills/` already exists from a partial run | Generator overwrites; freshness test is the guard |
| A skill body containing a literal `{{` that isn't a known var | Existing unknown-variable error path fires identically for omp |
