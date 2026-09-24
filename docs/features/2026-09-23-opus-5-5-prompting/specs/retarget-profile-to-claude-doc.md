---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-24
feature: 2026-09-23-opus-5-5-prompting
mode: checkpoint
---

# Retarget the Model Profile to One Claude Doc — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-23-opus-5-5-prompting/brief.md`
> **Status:** Ready
> **Date:** 2026-09-24
> **Estimated scope:** 1 session / ~20 files (mostly path swaps) / ~150 lines

---

## What

Rename the bundled profile `src/templates/reference/model-profile-claude-fable-5-1.md` to `src/templates/reference/model-profile-claude.md` (`git mv`). Retitle it `# Model Profile: Claude`. Rewrite its header blockquote and `## Scope` so the doc is the single home for steering across Claude models, and add the model-selection rule. Put one `**Applies to:** <models>` line as the first non-empty line under every block heading except `## Scope`, with the tags below. Keep every existing block heading byte-for-byte, because skills cite headings. Move every reference to the old path (constants, 7 skills, 7 test files — `tests/dogfood-update.test.ts` keeps the old path until spec 9 — code comments, reason strings) to the new path in the same commit, regenerate and sync skills, and copy the source doc to `docs/templates/reference/model-profile-claude.md`.

Tags (from the brief's tag table, decision D1):

| Block heading | `**Applies to:**` value |
|---|---|
| Finish the Whole Task | Fable 5.1, Opus 5.5 |
| Keep Changes and Tests to What the Task Asks | Fable 5.1 |
| Give User-Facing Progress Updates | Fable 5.1, Opus 5.5 |
| Mannered Prose | Fable 5.1 |
| Compaction Retention | All Claude models |
| Targeted Edits Over Whole-File Rewrites | All Claude models |
| Batch Independent Tool Calls | All Claude models |
| Formatting When Appropriate | All Claude models |
| End State of Every Prompt | All Claude models |
| Paths to Choose Between | All Claude models |

Scope must state, in plain sentences: apply a block when its `Applies to` line names the model you run or says "All Claude models"; when you cannot tell which model you run, apply every block tagged for any current Claude model; the block guidance stays model-specific and is re-checked when the model changes (keep the existing "apply a block only when it fixes a problem you can observe" paragraph).

## Why

Joycraft installs a Fable-only profile into every Claude, Pi, and omp project, so an Opus 5.5 project (this repo included) gets steering written for another model and has no place to receive Opus 5.5 blocks.

## Acceptance Criteria

- [ ] `src/templates/reference/model-profile-claude.md` exists; `src/templates/reference/model-profile-claude-fable-5-1.md` does not. [src: D1]
- [ ] Every `## ` heading except `## Scope` has `**Applies to:** <value>` as its first non-empty line, with the values in the table above. [src: brief "Block tags for the Claude profile"]
- [ ] Scope states the selection rule and the cannot-tell fallback. [src: brief "Hard Constraints"]
- [ ] All ten existing block headings are unchanged. [src: brief "Hard Constraints"]
- [ ] `src/model-profile.ts`: `MODEL_PROFILE_TEMPLATE_KEY` is `reference/model-profile-claude.md`; `MODEL_PROFILE_CONTEXT_MAP_ROW` reads `` | `docs/templates/reference/model-profile-claude.md` | Working with a Claude model — steering blocks tagged by model; apply the ones tagged for the model you run | ``; the module doc comment no longer says "Fable 5.1 model profile". [src: D1]
- [ ] The 7 skills (`implement`, `implement-feature`, `session-end`, `new-feature`, `interview`, `tune`, `optimize`) cite `docs/templates/reference/model-profile-claude.md` with the same block names as before. [src: brief "Decomposition"]
- [ ] `grep -rn "model-profile-claude-fable-5-1" src --include='*.ts' --include='*.md' | grep -v bundled-files` returns nothing. [src: brief "Success Criteria"]
- [ ] `docs/templates/reference/model-profile-claude.md` exists and is byte-identical to the source. [src: brief "Hard Constraints"]
- [ ] `pnpm sync-skills` output is committed in the same commit. [src: brief "Hard Constraints"]
- [ ] Build passes (`pnpm typecheck`). [src: brief "Success Criteria"]
- [ ] Tests pass (`pnpm test`). [src: brief "Success Criteria"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| New file exists, old gone | `tests/model-profile-template.test.ts`: `PROFILE_DOC` and `INSTALLED_PATH` point at the new name; the enumeration guard's `EXPECTED_FILES` lists `model-profile-claude.md` and not the Fable name | unit |
| Applies-to line per block | New test in `tests/model-profile-template.test.ts`: for each `[heading, tag]` pair in the table, the first non-empty line after the heading equals `**Applies to:** <tag>`; `## Scope` has none | unit |
| Scope rule | New assertion: the Scope section mentions "Applies to" and a cannot-tell fallback sentence (match a stable phrase you write, e.g. "cannot tell which model") | unit |
| Headings unchanged | Existing `BLOCKS` roster test still passes unchanged | unit |
| Constants and row text | `tests/model-profile-pointer.test.ts`, `tests/context-map-section.test.ts`, `tests/agents-md.test.ts`, `tests/bundle-inventory.test.ts`: update path constants; assert the row text | unit |
| Skills cite new path | `tests/model-profile-citations.test.ts`: `PROFILE_INSTALLED` and `PROFILE_SOURCE` use the new name; every citation line still names a known heading | unit |
| No old path in src | New test (in `tests/model-profile-citations.test.ts`): walk `src/skills`, `src/templates`, and `src/*.ts` except `src/bundled-files.ts`, and assert no file contains `model-profile-claude-fable-5-1` | unit |
| Installed copy identical | Existing "installed copy stays byte-identical" test, retargeted | unit |
| optimize/tune text | `tests/upgrade-optimize-v2.test.ts`: update the path it asserts | unit |

**Execution order:**
1. Update the test constants and add the new assertions first — they should fail against the current tree (red).
2. Run `pnpm test` and confirm the failures are the ones you expect.
3. Rename, edit, regenerate, copy — until green.

**Smoke test:** `pnpm vitest run tests/model-profile-template.test.ts tests/model-profile-citations.test.ts`

**Before implementing, verify your test harness:**
1. Run all tests — the retargeted ones must FAIL (if they pass, you're testing the wrong thing)
2. Each test reads the real files — not a reimplementation
3. The smoke test runs in seconds

## Constraints

- MUST: land every path change in one commit; a partial rename leaves the suite red. [src: brief "Decomposition"]
- MUST: keep all ten block headings byte-identical. [src: brief "Hard Constraints"]
- MUST: run `pnpm sync-skills` and commit `src/*-skills/`, `src/bundled-files.ts`, and the installed trees (`.claude/skills`, `.agents/skills`, `.pi/skills`, `.github/skills`, `.omp/skills`) in the same commit. [src: brief "Hard Constraints"]
- MUST: copy the source to `docs/templates/reference/model-profile-claude.md` by hand (`cp`). [src: brief "Hard Constraints"]
- MUST NOT: run the built updater (`node dist/cli.js update`) on this repo. The row swap arrives in spec 3; an update now adds the new row beside the old one. Spec 9 runs it. [src: brief "Hard Constraints"]
- MUST NOT: delete `docs/templates/reference/model-profile-claude-fable-5-1.md` or edit `docs/.joycraft/manifest.json` or `AGENTS.md`/`CLAUDE.md`. `tests/dogfood-update.test.ts` checks the checked-in manifest, which still lists the Fable doc until spec 9. [src: brief "Hard Constraints"]
- MUST NOT: add Opus 5.5 blocks here (spec 2). [src: brief "Decomposition"]
- MUST NOT: change the updater's row logic (spec 3). [src: brief "Decomposition"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Rename+edit | `src/templates/reference/model-profile-claude-fable-5-1.md` → `model-profile-claude.md` | Title, header, Scope rule, Applies-to lines |
| Modify | `src/model-profile.ts` | Key, row text, doc comment |
| Modify | `src/improve-claude-md.ts` | Comment near line 43 that names the Fable 5.1 profile |
| Modify | `src/update-inventory.ts` | `contextMapPointerPatch` reason string (~line 590) |
| Modify | `src/skills/joycraft-{implement,implement-feature,session-end,new-feature,interview,tune,optimize}.md` | Path in citations |
| Regenerate | `src/{claude,codex,copilot,pi,omp}-skills/*.md`, `src/bundled-files.ts`, installed skill trees | `pnpm sync-skills` |
| Create | `docs/templates/reference/model-profile-claude.md` | Copy of source |
| Modify | `tests/{model-profile-template,model-profile-citations,model-profile-pointer,context-map-section,agents-md,bundle-inventory,upgrade-optimize-v2}.test.ts` | Paths, new assertions |

## Approach

Mechanical rename plus one content pass on the doc. Do the doc edit first, then `git mv`, then sweep with `grep -rn "model-profile-claude-fable-5-1"` over `src/` and `tests/`. `tests/dogfood-update.test.ts` is the one test that must keep the old path until spec 9. The tune tip that says a memory file "predates the installed model profile" keeps its wording with the new path.

Rejected alternative: keep the Fable filename and add blocks to it. The name would lie about the content, and D1 chose a model-neutral name.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A skill citation names a heading that is not in the doc | `tests/model-profile-citations.test.ts` fails; fix the citation, not the heading |
| codex/copilot generated variants keep the citation | Allowed — this is the existing behavior; optimize already reports the doc as `INACCESSIBLE` on Codex |
| `src/bundled-files.ts` still contains the old key | Regenerate; the generator reads the disk |
