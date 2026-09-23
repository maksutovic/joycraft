---
status: in-review
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Point Memory File At Profile — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 5 files / ~200 lines

---

## What

When claude, pi, or omp is among the selected harnesses, the project's memory
file gains exactly one `## Context Map` row pointing at the Fable 5.1 model
profile:

```
| `docs/templates/reference/model-profile-claude-fable-5-1.md` | Working with Claude Fable 5.1 — finishing whole tasks, scope, progress updates, prose |
```

Three paths must produce it:

1. **Fresh install.** `src/update-inventory.ts` calls `generatorContent(...)`,
   which routes to `generateCLAUDEMd` (`src/improve-claude-md.ts:391`) or
   `generateAgentsMd` (`src/agents-md.ts:80`) depending on selection —
   `multiTool` is `harnesses.some(h => h !== 'claude')`, and the CLAUDE.md /
   AGENTS.md split is decided there. `generateContextMapSection()`
   (`src/improve-claude-md.ts:258`) today emits the H2, a lean-docs teaching
   line, and an empty two-row table skeleton. It gains the one data row when
   an eligible harness is selected.

2. **Existing customized memory file, `npx joycraft update`.** The row is
   inserted through the merge logic without touching anything else.

3. **Second run.** No-op — the row is not duplicated and no other byte moves.

**Codebase finding that reshapes this spec — read before planning.** The brief
says update "inserts the profile pointer into existing CLAUDE.md or AGENTS.md
through the merge logic." The merge logic exists (`improveCLAUDEMd` at
`src/improve-claude-md.ts:312`, `improveAgentsMd` at `src/agents-md.ts:127`)
but **has no production caller**. A grep across `src/` and `scripts/` finds
only the `src/agents-md.ts` and `src/update-inventory.ts` *import* lines for
sibling helpers — the two `improve*` functions are exercised only by
`tests/context-map-section.test.ts`, `tests/agents-md.test.ts`,
`tests/execution-profile.test.ts`, and `tests/improve-claude-md.test.ts`. On
the real update path, `materializeDocuments` in `src/update-inventory.ts`
treats `CLAUDE.md` and `AGENTS.md` as `create-once` entries: when the file
already exists and is recorded, it returns `[]` and the file is preserved
untouched. `src/update-plan.ts` reinforces this with its
`old?.kind === 'create-once'` branch — "Create-once document is user-owned
after its first creation; preserve local content."

So this spec does **two** things, not one: it adds the row to the generators,
and it wires the existing merge logic into the update path for the first time,
scoped to this one insertion. The mechanism already exists for exactly this
shape of edit: `InventoryPatchOperation` (`src/update-inventory.ts`), the same
transaction-ready `{ path, kind: 'write', content, currentPresent,
rawPrecondition, reason }` record that `settingsPatch` and `tsconfigPatch`
return, collected into `setup.patchOperations` by
`materializeFreshInstallInventory`. A third producer, `contextMapPointerPatch`,
joins them. It reads the existing memory file, runs the scoped insertion, and
returns an operation only when the bytes actually change — so a second run
returns `undefined` and the update is a no-op.

## Why

Without the pointer row, the profile doc installs and is never read: Fable 5.1
gets no model-specific steering, and users keep the silent-agent, stop-short,
and scope-creep behaviors the guide documents fixes for. D1 puts the guidance
in one home and has CLAUDE.md point at it, so the pointer is the whole delivery
mechanism for D1 on the memory-file side. D14 decides existing installs get the
row inserted rather than being left behind, and that users otherwise stay
advisory.

## Acceptance Criteria

- [ ] A fresh install with `claude` selected writes a `CLAUDE.md` whose `## Context Map` table contains exactly one row naming `docs/templates/reference/model-profile-claude-fable-5-1.md` [src: D6]
- [ ] A fresh install with `pi` only, and one with `omp` only, each write a memory file carrying the same single row [src: D6]
- [ ] A fresh install with `codex` only writes a memory file whose Context Map carries no row naming the profile doc [src: D6]
- [ ] A fresh install with `claude,codex` — the multiTool AGENTS.md path — carries the row, because an eligible harness is selected [src: D6]
- [ ] `npx joycraft update` on a project whose `CLAUDE.md` already exists, is customized, and lacks the row inserts exactly that one row [src: D14]
- [ ] The same update leaves every other byte of that `CLAUDE.md` unchanged — headings, ordering, trailing whitespace, and CRLF style are preserved [src: brief "Success Criteria"]
- [ ] The same behavior holds for a customized `AGENTS.md` on an AGENTS.md-selected project [src: D14]
- [ ] A second `npx joycraft update` on the now-updated project changes no bytes in the memory file and reports no action for it [src: brief "Success Criteria"]
- [ ] An update on a codex-only project inserts nothing into the memory file [src: D6]
- [ ] Insertion is skipped, with the file preserved verbatim, when the memory file already names the profile doc path anywhere — including inside a hand-written row or prose [src: brief "Success Criteria"]
- [ ] A memory file with no `## Context Map` section at all receives the section plus the one row, appended, rather than being left without a pointer [src: D16]
- [ ] `tests/context-map-section.test.ts`'s existing assertion that the section has only a header row and a separator is updated deliberately, with the eligible/ineligible cases distinguished rather than the guard deleted [src: brief "Test Strategy"]
- [ ] `pnpm build` passes [src: brief "Test Strategy"]
- [ ] `pnpm test` and `pnpm typecheck` pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Fresh claude install carries the row | `update(dir, { nonInteractive: true, harnesses: ['claude'] })` into a temp dir; `readFileSync(join(dir,'CLAUDE.md'))` contains the profile path exactly once — new `tests/model-profile-pointer.test.ts` | integration |
| Pi-only and omp-only carry it | same with `harnesses: ['pi']` and `['omp']` — new `tests/model-profile-pointer.test.ts` | integration |
| Codex-only carries nothing | same with `harnesses: ['codex']`; the memory file does not contain the profile path — new `tests/model-profile-pointer.test.ts` | integration |
| Mixed claude+codex carries it | same with `harnesses: ['claude','codex']` — new `tests/model-profile-pointer.test.ts` | integration |
| Generator-level row gating | `generateCLAUDEMd` / `generateAgentsMd` emit the row for eligible selections and omit it for codex-only — `tests/context-map-section.test.ts`, `tests/agents-md.test.ts` | unit |
| Section shape preserved | `generateContextMapSection` still yields the H2, the lean-docs line, a header row, and a separator — `tests/context-map-section.test.ts` | unit |
| Insertion into a customized file | `improveCLAUDEMd` on a hand-written CLAUDE.md with a populated Context Map returns the same string plus one row — `tests/context-map-section.test.ts` | unit |
| Nothing else changes | byte-diff of the customized fixture before and after update is exactly the inserted line — new `tests/model-profile-pointer.test.ts` | integration |
| CRLF preserved | a CRLF-line-ending fixture comes back CRLF throughout — new `tests/model-profile-pointer.test.ts` | integration |
| Second run is a no-op | run update twice on the same temp project; the memory file bytes after run two equal the bytes after run one — new `tests/model-profile-pointer.test.ts` | integration |
| Already-present pointer is left alone | a fixture naming the profile path in prose comes back byte-identical — new `tests/model-profile-pointer.test.ts` | integration |
| Missing Context Map section | a memory file with no `## Context Map` gains the section and the row — `tests/context-map-section.test.ts` | unit |
| Precondition hash present | the patch operation returned for a pending insertion carries a `rawPrecondition` matching `rawFileHash` of the bytes read — new `tests/model-profile-pointer.test.ts` | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the insertion-and-idempotence unit pair (`pnpm test tests/context-map-section.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: pause for the user's approval before the first edit to `src/improve-claude-md.ts` or `src/agents-md.ts` — the CLAUDE.md merge/improve logic is an ASK FIRST boundary in `AGENTS.md`, and this spec both changes it and gives it its first production caller [src: brief "Execution Strategy"]
- MUST: emit exactly one Context Map row, never a block of rows or a duplicated pointer [src: D1]
- MUST: cite the profile doc by its installed project-relative path `docs/templates/reference/model-profile-claude-fable-5-1.md`, never an absolute path and never a Joycraft repo path [src: brief "Hard Constraints"]
- MUST: gate the row on the same eligible-harness list spec 2 gates the file on — claude, pi, omp — so a project never points at a doc it did not receive [src: D6]
- MUST: put the eligible-harness list in one place shared by spec 2's gate table and this spec's row gate, so the two can never disagree [src: D1]
- MUST: return no patch operation when the insertion would be a no-op, so a second update reports nothing for the memory file [src: brief "Success Criteria"]
- MUST: preserve the file's existing newline style when inserting, the way `mergeOwnedSettings` does [src: brief "Success Criteria"]
- MUST NOT: rewrite, reorder, reformat, or re-render any other section of an existing memory file — this is a single-line insertion, not a regeneration [src: D14]
- MUST NOT: copy any block text from the profile doc into the memory file; the row is a pointer only [src: D1]
- MUST NOT: add a Pi- or omp-scoped memory file; both harnesses read the root CLAUDE.md and AGENTS.md pair [src: brief "Hard Constraints"]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]
- MUST NOT: auto-edit a user's CLAUDE.md from optimize — this spec's write is the updater's, under the user's explicit `npx joycraft update` [src: D5]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/improve-claude-md.ts` | `generateContextMapSection` takes the selected harnesses (or an eligibility flag) and appends the one profile row when eligible; `generateCLAUDEMd` and `improveCLAUDEMd` thread it through; export the scoped insertion helper the update path calls |
| Modify | `src/agents-md.ts` | `generateAgentsMd` and `improveAgentsMd` thread the same flag so the AGENTS.md path emits the identical row |
| Modify | `src/update-inventory.ts` | New `contextMapPointerPatch(input, diagnostics)` producer returning an `InventoryPatchOperation` for an existing `CLAUDE.md` or `AGENTS.md` that lacks the row; added to the `patchOperations` array in `materializeFreshInstallInventory` alongside `settingsPatch` and `tsconfigPatch`; `generatorContent` passes the harness list down to the generators |
| Modify | `tests/context-map-section.test.ts` | Row-present/row-absent cases; the "only header and separator" guard split by eligibility; the missing-section case |
| Modify | `tests/agents-md.test.ts` | AGENTS.md row cases for eligible and codex-only selections |
| Create | `tests/model-profile-pointer.test.ts` | Temp-dir updater integration: fresh installs per selection, insertion into a customized file, byte-diff, CRLF, second-run no-op, already-present pointer, precondition hash |
| Modify | `docs/features/2026-09-22-fable-native-sdlc-harness/specs/point-memory-file-at-profile.md` | Status bump to `in-review` at wrap-up |

## Approach

Define the eligible-harness list once — the natural home is
`src/bundle-inventory.ts` beside spec 2's gate table, exported so both the
installer gate and this row gate read the same constant.

Generators: give `generateContextMapSection` an optional eligibility argument
and append the row below the separator when set. `generateCLAUDEMd` and
`generateAgentsMd` pass it from the harness list that `generatorContent`
already has in `src/update-inventory.ts`.

Merge logic: `improveCLAUDEMd` and `improveAgentsMd` gain a scoped step that
runs before their existing section-addition pass. When the file is eligible and
does not already name the profile path anywhere, insert the row immediately
after the `## Context Map` table's separator line, preserving the file's
newline style; when there is no Context Map section, fall through to the
existing `hasSection(sections, /context\s*map/i)` branch, which already appends
a fresh section — now carrying the row.

Update path: `contextMapPointerPatch` resolves which of `CLAUDE.md` /
`AGENTS.md` this project uses (the same `multiTool` decision
`generatorContent` makes), reads it, runs the scoped insertion, and returns an
`InventoryPatchOperation` only when the result differs from what it read. The
`rawPrecondition` is `rawFileHash(raw)`, exactly as `settingsPatch` does, so
the transaction rechecks before writing.

Shape and mechanics to hold to while implementing. `generateContextMapSection`
keeps its current shape — the H2, the lean-docs teaching line, the table
header and the separator — with the one row appended below the separator, so
the section's existing tests stay meaningful. The update-path insertion is
derived from a read of the file's current bytes and carries
`rawPrecondition: rawFileHash(raw)`, matching the `settingsPatch` and
`tsconfigPatch` idiom in `src/update-inventory.ts`; the transaction rechecks
that hash before writing, so a concurrent edit aborts rather than overwrites.
The fresh-install and update paths are separate and neither is conditional on
the other: the generators emit the row when they build a new memory file, and
the patch producer inserts it into one that already exists.

**Rejected alternative:** dropping `CLAUDE.md` and `AGENTS.md` out of
`create-once` and letting `improveCLAUDEMd` regenerate them on every update.
That would give the pointer for free, but it re-renders sections the user owns,
violates the create-once contract the planner enforces, and puts every
Joycraft update one bug away from rewriting a user's instructions file. The
patch-operation route touches one line and nothing else.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Memory file missing entirely on an update | Preserved as a local deletion by the existing planner branch; no patch operation, no resurrection |
| `## Context Map` header cased differently (`## context map`) | Matched case-insensitively, as today's `hasSection` regex already does; row inserted into the existing table |
| Context Map table already has user rows | Row appended to the table; user rows untouched and in their original order |
| Profile path already named in prose, not a table row | No insertion; file byte-identical |
| Memory file uses CRLF throughout | Inserted line uses CRLF; no other line's endings change |
| File exists but is empty or whitespace only | Context Map section plus the row appended; nothing else invented |
| Codex-only project that once had claude selected and carries the row | Row left in place — this spec inserts, it never removes; D14 keeps existing-install cleanup advisory |
| Both `CLAUDE.md` and `AGENTS.md` present | Row goes into the one the project's selection designates, matching `generatorContent`'s existing choice; the other is untouched |
| Concurrent edit between read and write | `rawPrecondition` mismatch aborts the operation in the transaction; the user's bytes win |
| Spec 1's profile doc not yet landed | Row still emitted — it points at the path spec 2 installs; the wave ordering (1, 2 before 3) makes this transient only during development |
