---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-31
feature: 2026-07-31-team-ready-gates
mode: batch
---

# Stamp Gate Artifacts — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-31-team-ready-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-31
> **Estimated scope:** 1 session / template + 6 canonical skills + state plumbing / ~120 lines

---

## What

Three artifact-tracking fixes. (1) Every rendered gate HTML shows a generated timestamp and a revision number in its header context strip and footer — revision is an integer read from the previous render's footer and incremented; filenames stay stable. (2) Auto-open becomes a persisted on/off setting in `docs/.joycraft/state.json`: gate skills read it before running `open`, and tune offers to flip it. (3) The gate skills' stale references to `docs/templates/REVIEW_GATE_TEMPLATE.html` are made true: the template ships to `docs/templates/` via init/upgrade (and exists there in this repo), because installed skills run in user projects where `src/templates/` does not exist. Ends with a zero-drift verification: run the generators, assert nothing changes.

## Why

With many gate tabs open across six projects, there's no way to tell which render is latest; auto-open is forced on; and today the skills point at a template path that doesn't exist in user projects (only `src/templates/` has it — verified 2026-07-31).

## Acceptance Criteria

- [ ] Every gate skill's render step stamps the HTML with generation timestamp + revision integer; re-rendering the same artifact increments the revision, filenames unchanged `[src: D6]`
- [ ] Revision is read from the previous render's footer and incremented — no new state file `[src: D13]`
- [ ] `docs/.joycraft/state.json` gains an `autoOpen` boolean (default true); gate skills check it before `open`/`xdg-open`; tune offers to toggle it `[src: D6]`, location `[src: D12]`
- [ ] Auto-open off, headless, CI, and isolated mode all skip opening silently — never a failure `[src: brief "Hard Constraints"]`
- [ ] `REVIEW_GATE_TEMPLATE.html` is copied to `docs/templates/` by init and upgrade, and exists at `docs/templates/` in this repo, so the skills' `docs/templates/REVIEW_GATE_TEMPLATE.html` reference resolves in user projects and here `[src: brief "Hard Constraints" — known trap]`
- [ ] Zero-drift check: running the generators (`generate-bundled-files.mjs`, `sync-skills.mjs`) after this feature's specs produces no diff `[src: brief "Hard Constraints"]`
- [ ] `pnpm sync-skills` run; regenerated + installed copies committed in the same commit `[src: brief "Hard Constraints"]`
- [ ] Build passes
- [ ] Tests pass

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skills instruct timestamp + revision stamping | `tests/gate-contract.test.ts`: assert the render steps name the timestamp and revision-increment behavior | unit |
| autoOpen in state schema | extend the state/version tests: state.json round-trips `autoOpen`; missing key defaults to true | unit |
| init/upgrade ship the template to docs/templates/ | extend `tests/init.test.ts` + `tests/upgrade.test.ts`: template file exists in the scaffolded project | integration |
| Zero drift | run generators in a test (or CI step) and assert clean `git status` on generated paths | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** `pnpm test tests/gate-contract.test.ts` — seconds.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep gate HTML skeleton byte-identical outside slots — timestamp/revision live in the existing eyebrow/context-strip/footer slot regions `[src: brief "Hard Constraints"]`
- MUST: keep filenames stable — revision lives inside the artifact, never in the filename `[src: D6]`
- MUST: keep every skill path project-relative — the template fix ships the file to `docs/templates/`, it does not point skills at `src/` `[src: brief "Hard Constraints"]`
- MUST: preserve unknown keys when writing `state.json` `[src: D12]`
- MUST: run `pnpm sync-skills` and commit regenerated + installed copies in this spec's own commit `[src: brief "Hard Constraints"]`
- MUST NOT: turn a failed `open` into an error anywhere — print the path and continue `[src: brief "Hard Constraints"]`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/REVIEW_GATE_TEMPLATE.html` | slot-comment guidance for timestamp/revision (comments only; structure/CSS untouched) |
| Add | `docs/templates/REVIEW_GATE_TEMPLATE.html` | repo copy so the referenced path resolves here |
| Modify | `src/init.ts`, `src/upgrade.ts` | copy the template into user projects' `docs/templates/` |
| Modify | `src/version.ts` (state read/write) | `autoOpen` field |
| Modify | `src/skills/joycraft-interview.md`, `joycraft-new-feature.md`, `joycraft-tune.md`, `joycraft-design.md`, `joycraft-bugfix.md`, `joycraft-decide.md`, `joycraft-decompose.md` | stamp instructions + autoOpen check in render/open steps; tune gains the toggle offer |
| Modify | `tests/init.test.ts`, `tests/upgrade.test.ts`, `tests/gate-contract.test.ts`, state tests | coverage |
| Modify | generated trees + installed copies | regenerated via `pnpm sync-skills` |

## Approach

Timestamp + revision ride the slots that already exist (eyebrow line and footer), so the skeleton contract is untouched — the render step's instructions tell the agent to read the old footer's revision integer before overwriting. The autoOpen flag piggybacks on the existing state read/write in `src/version.ts` (preserving unknown keys). The template-path fix follows the project's own rule — installed skills may only reference project-relative paths — so the file moves to where the skills already claim it lives, in user projects via init/upgrade and in this repo directly. Rejected alternative: rewriting all skill references to `src/templates/` — that path exists only in the Joycraft repo and would break every user project.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| First render (no previous file) | Revision 1 |
| Previous render's footer unparseable (hand-edited) | Fall back to revision 1 and note it in the footer; never fail the render |
| `state.json` missing entirely | Treat autoOpen as true; create the key on next state write |
| Existing user project upgrade with a hand-placed template at docs/templates/ | Never overwrite without `--force` — skip and report |
| CI/headless with autoOpen true | Still a no-op — environment check precedes the setting |
