---
status: done
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: checkpoint
---

# Execution Modes in Decompose — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / decompose skill × 3 variants + queue template + 1 test

---

## What
Teach `joycraft-decompose` about **execution modes** (`batch` / `checkpoint` / `isolated`). When decomposing, the skill: (1) reads a project-default mode from CLAUDE.md (absent ⇒ `batch`); (2) infers a per-spec recommendation from each spec's size/complexity via a documented heuristic; (3) **surfaces the recommendation to the human for approval** before writing; (4) records the chosen mode in each spec's frontmatter (`mode:`) and in the queue JSON entry. The skill change ships in all three variants (`src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`) plus this repo's installed copies, and the queue-JSON template gains a `mode` field with `status: "todo"`.

## Why
The whole feature is mode-driven, but nothing currently emits a mode. Decompose is the natural place to assign it — it already sizes specs and writes both the frontmatter and the queue. Without this, `joycraft-implement` (spec 7) and the Pi loop (spec 8) have no `mode` to read.

## Acceptance Criteria
- [ ] The decompose SKILL.md (all 3 variants) documents the three modes and a size→mode heuristic (e.g. XS/S ⇒ `batch`-eligible, M ⇒ `checkpoint`, L/XL ⇒ `isolated`)
- [ ] The skill instructs the agent to read a project default from CLAUDE.md (a documented field, e.g. `Default execution mode:`), defaulting to `batch` when absent
- [ ] The skill instructs the agent to present the per-spec mode recommendation to the human and get approval before writing (the brief's "not silent" requirement)
- [ ] The spec frontmatter template in the skill gains a `mode:` field
- [ ] The queue-JSON template in the skill includes `"mode": "<mode>"` per entry and uses `"status": "todo"` (not `"active"`)
- [ ] The skill's neighbor-scan filter no longer ignores `in-review` (it must treat `in-review` specs as live), and treats files as live unless `status:` is `done`/`deprecated`/`superseded`
- [ ] All 3 skill variants carry the same changes; this repo's installed copies (`.claude/skills/`, `.agents/skills/`, `.pi/skills/`) are synced
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Modes documented in skill | `tests/decompose-modes.test.ts`: read each of the 3 source skill files, assert each contains `batch`, `checkpoint`, `isolated` and the heuristic | unit |
| Queue template uses todo + mode | Assert each skill's embedded queue-JSON example contains `"status": "todo"` and `"mode"` | unit |
| Frontmatter template has mode | Assert each skill's frontmatter template block contains a `mode:` line | unit |
| Filter no longer ignores in-review | Assert the skill text does NOT instruct ignoring `in-review`; assert the skip-set is `done`/`deprecated`/`superseded` (not `shipped`, which is migrated away) | unit |
| Default-mode read documented | Assert the skill references reading a default mode from CLAUDE.md and defaulting to `batch` | unit |
| 3-variant parity | Assert the mode-relevant sections are present in all three variant files | unit |

**Execution order:**
1. Write tests over the source skill files — MUST fail (skills don't mention modes yet)
2. Confirm red
3. Edit the 3 source skill variants + sync installed copies until green

**Smoke test:** `pnpm vitest run tests/decompose-modes.test.ts`.

**Before implementing, verify your test harness:**
1. Tests read the actual SKILL.md files from `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/` — not a fixture
2. Because skills are prose, tests assert on presence of required tokens/sections (the contract), not exact wording
3. Single test file = smoke test

## Constraints
- MUST: edit all three source variants — `src/claude-skills/joycraft-decompose.md`, `src/codex-skills/joycraft-decompose.md`, `src/pi-skills/joycraft-decompose.md` (these are FLAT `.md` files, not `<dir>/SKILL.md`) — and sync this repo's installed copies under `.claude/skills/joycraft-decompose/SKILL.md`, `.agents/skills/joycraft-decompose/SKILL.md`, `.pi/skills/joycraft-decompose/SKILL.md` (installed layout IS the `<dir>/SKILL.md` form). CLAUDE.md constraint: all 3 variants for any skill change.
- MUST: keep the human-approval step — mode is *recommended* then approved, never silently assigned (brief: "reviewable — not silent")
- MUST: default mode = `batch` when CLAUDE.md declares none (safest: shared context, wrap once)
- MUST: update the queue-JSON template's status word to `todo` (recon found it currently emits `"active"`) and add `"mode"`
- MUST NOT: hard-fail decomposition if CLAUDE.md has no default-mode field — just default to `batch`
- MUST NOT: regenerate `src/bundled-files.ts` here — that's spec 9's job (this spec only edits the human-readable skill sources + installed copies)
- ASK FIRST (CLAUDE.md): skill + template content changes — the brief is that authorization; no further ask needed for the decomposed specs

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/claude-skills/joycraft-decompose.md` | modes doc, heuristic, default-read, approval step, `mode:` frontmatter, `todo`+`mode` queue template, filter fix |
| Modify | `src/codex-skills/joycraft-decompose.md` | same |
| Modify | `src/pi-skills/joycraft-decompose.md` | same |
| Modify | `.claude/skills/joycraft-decompose/SKILL.md` | sync installed copy |
| Modify | `.agents/skills/joycraft-decompose/SKILL.md` | sync installed copy |
| Modify | `.pi/skills/joycraft-decompose/SKILL.md` | sync installed copy |
| Create | `tests/decompose-modes.test.ts` | Skill-content assertions |

## Approach
Add a "## Execution Modes" section to the decompose skill explaining the three modes (cite the brief's mode table semantics), the size→mode heuristic, and a worked approval prompt example ("Your project defaults to `batch`, but specs 1, 2, 7 are large — recommend `isolated` for those. OK?"). Update Step 5's frontmatter template to include `mode:` and Step 5a's queue-JSON template to `"status": "todo"` + `"mode"`. Update Step 1's neighbor-scan filter wording. Define the CLAUDE.md default-mode field name once and reuse it verbatim in spec 9's docs.

**Default-mode field convention (decided):** a single line in the project's CLAUDE.md, e.g. `**Default execution mode:** batch`. Decompose greps for it; absent ⇒ `batch`.

**Rejected alternative:** Auto-assigning mode purely from size with no human gate. Rejected — the brief explicitly requires the recommendation be human-approved; a tiny spec inside a risky feature may still warrant `isolated`, which only a human knows.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| CLAUDE.md has no default-mode line | Default to `batch`; mention in the recommendation that no project default was found |
| Human overrides every recommendation | Honor the human's choices verbatim in frontmatter + queue |
| A feature mixes modes across specs | Allowed — `mode` is per-spec; the README/wave-plan notes the mix |
| Inline-described feature (no brief) | Still assign modes; default applies the same way |
