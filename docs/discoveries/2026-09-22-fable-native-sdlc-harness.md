---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
---

# Discoveries — Fable-native SDLC harness

**Date:** 2026-09-22
**Spec:** `docs/features/2026-09-22-fable-native-sdlc-harness/specs/README.md` (twelve specs; each finding names its spec)

## Existing tests cap skill file length, and no spec listed them
**Expected:** Specs 6, 7, and 11 budgeted new prose for the interview, optimize, and tune skills as ordinary line growth.
**Actual:** `tests/gather-context-skill.test.ts` caps `src/skills/joycraft-interview.md` at 329 lines, `tests/discovery-staleness.test.ts` caps optimize at 285, and `tests/tune-auto-memory-finding.test.ts` caps tune at 228. Session-end sits at 210 against a 211 cap in `tests/session-end-telemetry.test.ts`. The new prose was packed into single-line paragraphs and hard-wrapped lines were rejoined without changing words.
**Impact:** Any spec that adds prose to a capped skill must name the cap in Affected Files and pay the budget in the same commit. Decompose should grep `toBeLessThanOrEqual` over `tests/` when a skill is in scope.

## The generated block-dangerous hook never blocks (pre-existing)
**Expected:** Spec 9 assumed `.claude/hooks/joycraft/block-dangerous.sh` follows the exit-code contract it documents.
**Actual:** The script reads the tool name from `$1`, which Claude Code never passes, so as registered it always exits 0. It also prints its reason to stdout, which the hook runner does not surface. A separate contract mistake in the spec: exit 1 is a non-blocking warning, not an ask. A real ask is exit 0 plus a JSON `permissionDecision`.
**Impact:** Fixed 2026-09-23 on the same PR: `generateHookScript` now reads `tool_name` and `tool_input.command` from the stdin JSON (jq when present, a tolerant grep fallback otherwise), ignores argv, and writes the reason to stderr. The harden test had passed `Bash` as argv, which is why it never caught the no-op; it now invokes the hook the way Claude Code does. The exit-code-gate recipe in `docs/templates/hooks/` shows the correct three outcomes.

## Gated templates leak into the updater's harness scans
**Expected:** Spec 2 said canonical-order ownership would keep a harness-gated template out of the updater's harness detection.
**Actual:** `selectedHarnessIgnoreWarning` picked the claude-owned profile doc instead of `.claude/skills/`, and `recognizedHarnesses` counted a stray doc as a claude install.
**Impact:** `src/update.ts` now has a `harnessTreeEntry` predicate that skips `docs/templates/`. Any future gated template inherits that guard; a new scan over manifest entries must use it.

## The memory-file pointer collided with two byte-identical contracts
**Expected:** Spec 3 listed the generator and update-inventory files only.
**Actual:** `tests/harness-selection.test.ts` and `tests/upgrade.test.ts` asserted that init and upgrade leave an existing AGENTS.md byte-identical. D14 overrides that, so both now expect the original bytes plus one row. `generateAgentsMd` is never the designated memory file (the multi-tool AGENTS.md comes from `generateCLAUDEMd`), so its new flag stays off in production. The harness list lives in `src/model-profile.ts` so improve-claude-md does not import the bundled files.
**Impact:** The updater now patches a user memory file through the merge logic for the first time. Automatic updates are ineligible when a setup patch exists, so existing installs need one manual `npx joycraft update` to get the row.

## Fresh-install integration tests must select harnesses
**Expected:** Spec 10's Test Plan used `update(tmp, { nonInteractive: true })` to install the scaffold.
**Actual:** On a fresh project with no harness selection that call installs nothing.
**Impact:** Integration tests of a fresh install pass `harnesses: [...]` explicitly.

## The fresh-directory loop skipped regular files silently
**Expected:** Spec 5 said a regular file at `docs/context` or `docs/backlog` already produced a "not a directory" diagnostic.
**Actual:** The loop in `materializeFreshInstallInventory` skipped regular files without a diagnostic. It now reports them for all three directories, and `freshIntentEntry` refuses to write into a non-directory `docs/intent`. `freshBacklogEntry` still lacks that guard.
**Impact:** A future spec on update-inventory should add the same guard to the backlog entry.

## The converged updater never previews zero actions
**Expected:** Spec 12 asked for a second `update . --preview` that plans zero actions.
**Actual:** The planner lists `reconcile` for every verified file whose bytes already match, so a steady-state preview on this repo shows 164 reconciles, 1 pre-existing conflict, and 3 preserves. Convergence was proven by a second apply that changed no file and only the manifest transaction id.
**Impact:** "Zero actions" means zero content-changing actions. A backlog item could make the preview collapse reconciles into one summary line.

## `src/bundled-files.ts` is gitignored
**Expected:** Specs 9, 10, and 11 listed the regenerated bundle as a file to commit.
**Actual:** It is gitignored and the test suite regenerates it.
**Impact:** Spec templates should stop listing it under Affected Files.

## Parallel worktree agents starve the test suite
**Expected:** Wave 2 ran four agents in worktrees, each running the full suite.
**Actual:** Load reached 15 and the 5-second per-test timeout tripped in init, upgrade, and folder-map tests in every worktree; the same tests pass with a longer timeout or on an idle machine. A fresh worktree also needs `pnpm install` and `pnpm build` before `tests/package-acceptance.test.ts` can pass.
**Impact:** The driver should verify the merged branch on an idle checkout, which it did. Worktree agents should run the full suite once at the end, not per iteration.
