---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
mode: batch
---

# Add Tune Auto-Memory Finding — Atomic Spec

> **Parent Brief:** `docs/research/2026-08-30-curated-harness-brief.md` (design: `docs/features/2026-08-30-curated-harness/design.md`)
> **Status:** Ready
> **Date:** 2026-09-01
> **Estimated scope:** 1 session / skill source + copies + tests / ~15 net lines

---

## What

`joycraft-tune` gains an advisory harness finding: when Claude Code auto-memory is enabled for the project AND the project's memory dir (`$HOME/.claude/projects/<cwd-dash-encoded>/memory/`, derived at runtime) is non-empty, tune raises it with a graduate-then-archive recommendation — a mini-Reaper: anything durable moves to `docs/context/` via add-fact routing, the rest goes dormant or is deleted with approval. The cleanup guidance explicitly spares `joycraft-owner.txt` (the owner-resolution cache — it is not a stale memory). A one-line note covers the other harnesses: Pi reportedly ships no auto-memory (unverified), Codex equivalent unknown.

## Why

Without the tune finding, existing projects that adopted Joycraft before the init offer keep two homes for the same facts indefinitely.

## Acceptance Criteria

- [ ] tune detects auto-memory enabled + non-empty project memory dir and raises an advisory finding inside a dimension row [src: design §2 WS6]
- [ ] The finding recommends graduate-then-archive: durable content → `docs/context/` via add-fact routing; the rest dormant or deleted with approval [src: brief "6. Recommend disabling"]
- [ ] The cleanup guidance names `joycraft-owner.txt` as exempt — never treated as stale memory [src: design §2 WS6]
- [ ] The Pi/Codex situation is one line (Pi: reportedly none, unverified; Codex: unknown), not machinery [src: design §2 WS6]
- [ ] The memory-dir path is described as derived from `$HOME` + encoded cwd — no literal absolute path in the skill text [src: design §3]
- [ ] Net growth in tune (228 lines, over budget) paid same-commit [src: design §4]
- [ ] Generated + installed copies regenerated and synced same-commit [src: design §2 WS3]
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Finding present | content test: detection condition + finding wording in canonical source | unit |
| Owner-file exemption | content test: `joycraft-owner.txt` exemption named in the cleanup guidance | unit |
| Advisory voice | content test: no auto-edit/auto-delete instruction in the finding | unit |
| No absolute paths | content test: no `/Users/` or literal `$HOME`-expanded path in the skill body | unit |
| Copies in sync | bundle-regen + sync tests green | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the owner-file exemption content test.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep the finding advisory, inside a dimension row — tune never auto-edits [src: design §1]
- MUST: spare `joycraft-owner.txt` in all cleanup guidance — owner resolution survives via the dir; the `git config user.name` fallback exists but the file is not stale memory [src: design §2 WS6]
- MUST: route graduation through add-fact (which, post spec 8, escalates harden-first) [src: brief "6. Recommend disabling"]
- MUST: pay for added lines same-commit [src: design §4]
- MUST NOT: verify or claim Pi/Codex auto-memory behavior beyond the one-line research note [src: design §2 WS6 — anchor 50 on the Pi claim]
- MUST NOT: instruct deletion without human approval [src: brief "6. Recommend disabling"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/skills/joycraft-tune.md` | Detection + finding + graduate-then-archive guidance + exemption + paying trims |
| Modify | `src/{claude,codex,pi,copilot}-skills/joycraft-tune.md` | Regenerated |
| Modify | `.claude/.agents/.pi/.github skill trees (tune)` | Synced |
| Create/Modify | tune content tests | Assertions per Test Plan |

## Approach

Detection instructions in the skill: check the setting via the settings files' `autoMemoryEnabled` (project overrides global; absent = enabled) and check the derived memory dir for files other than `joycraft-owner.txt`. Finding text points at the init offer (spec 13) as the fix for the setting and at add-fact routing for the content. Rejected alternative: a standalone auto-memory audit skill — a new door for a finding tune already has a home for.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Memory dir contains only `joycraft-owner.txt` | No finding — nothing to graduate |
| Auto-memory disabled but dir non-empty | Softer note: dormant content can still graduate, no urgency |
| Settings unreadable | Treat setting as unknown; report only what was checked (tune's untrusted-data posture) |
| MEMORY.md index present | Treated as memory content like any other file — graduate or archive |
