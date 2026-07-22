---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: checkpoint
---

# Add Reaper Pass — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 1 file / ~80 lines

---

## What

Optimize v2 gains the Reaper — the single deletion authority for feature exhaust. **Shipped path (D1):** find briefs marked `reap: eligible`, verify the PR actually merged via `gh` (PR link from the feature's ledger row), propose the deletion list, and on human approval `git rm -r` each folder — the deletion commit rides the current feature branch (mains are protected). `dossier.html` dies with its folder. **Undead path (D6):** folders that were never built (no queue, or queue all-`todo` and stale) are proposed for **archive-move** to `docs/archive/features/<slug>/` — per folder, human-approved, one-line reason recorded in the disposition table. The Reaper never deletes unextracted content.

## Why

47 feature folders exist and 29+ were never built (RF-4) — exhaust pollutes agent context forever unless something with verified-merge evidence and human approval disposes of it.

## Acceptance Criteria

- [ ] Reaper section in optimize's SKILL.md with the two paths clearly separated: delete (shipped, extracted) vs archive-move (undead, unextracted)
- [ ] Shipped path (PROTOCOL): eligibility = brief `reap: eligible` AND ledger row exists in `docs/context/shipped.md` AND `gh pr view <PR> --json state` (or equivalent) confirms `MERGED`; any leg failing → folder skipped with the reason shown
- [ ] Deletions are batched into a proposal list; human approves per run (reject-framing escape available); approved folders removed with `git rm -r` on the current branch — never a direct push, never on main
- [ ] Undead path: candidate = feature folder with no `.joycraft-spec-queue.json`, or all-`todo` queue with no commits referencing the feature — proposed **per folder** with a one-line reason; approved folders `git mv`'d to `docs/archive/features/<slug>/`
- [ ] The Reaper never deletes undead folders (archive-move only — they had no extraction, so deletion loses the only copy)
- [ ] Live features (any spec `in-review`, or brief status not terminal) are never candidates for either path
- [ ] Edits carry the PILOT divergence marker
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Two paths present | grep optimize SKILL.md for `reap: eligible`, `gh pr`, `git rm`, `docs/archive/features/` | structural |
| Merge verification required | grep for the MERGED check preceding any delete instruction | structural |
| Per-folder human approval | grep for the approval gate on both paths | structural |
| Never-delete-undead | grep for an explicit statement that undead folders are moved, never deleted | structural |
| Behavioral | Fresh-subagent eval — fixture reap-eligible folder + unmerged PR → skipped with reason; merged → proposed — in spec `run-gate-evals` | integration |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** grep assertions (red) → write the Reaper section (green). The behavioral fixture check belongs to `run-gate-evals`.

**Smoke test:** `grep -c 'reap' .claude/skills/joycraft-optimize/SKILL.md` > 0.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL first (no Reaper section exists)
2. Checks inspect the installed optimize skill
3. Smoke test runs in seconds

## Constraints

- MUST: verify merge with `gh` before any deletion — deletion never outruns review (D1)
- MUST: propose per folder / per run with human approval — never auto-apply (D6; RF reject-framing)
- MUST: ride the current feature branch for deletion commits (protected mains — D1)
- MUST: leave the ledger row + decision-log rows as the surviving record (the extraction happened before eligibility)
- MUST NOT: delete or archive anything with `in-review` work, and never delete unextracted (undead) content
- MUST NOT: touch `src/` or `templates/` (pilot pattern)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Edit | `.claude/skills/joycraft-optimize/SKILL.md` | Reaper section: shipped-delete + undead-archive paths |

## Approach

The Reaper lives inside optimize v2 (D1 names "optimize v2 / next session-start" as the reaping moment) as a distinct pass after the disposition table — undead candidates surface naturally from the audit, so the disposition table's RETIRE rows feed the archive proposal. `gh` is the merge oracle because squash merges make git-log inference unreliable (RF-KILL-7). Rejected alternative: a standalone `joycraft-reaper` skill — another internal against the description budget for a pass that already needs optimize's audit context.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `gh` unauthenticated or offline | Shipped path reports INACCESSIBLE and skips all deletions this run — never falls back to git-log guessing |
| Ledger row missing but brief says reap-eligible | Skip + flag: extraction incomplete — re-run session-end's graduation path first |
| PR closed without merge | Skip with reason "PR closed, not merged"; suggest undead review instead |
| Archive destination already has the slug | Suffix with `-2`; never overwrite |
| Folder is the feature the current session is working in | Never a candidate (live work) |
