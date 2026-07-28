---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-27
area: pi-scripts
---

# Fix Pi Scripts Misparsing Pretty-Printed Spec Queue JSON — Bug Fix Spec

> **Parent Brief:** none (bug fix)
> **Issue/Error:** `joycraft-mark-done` prints `Spec #N marked in-review` and changes nothing; `joycraft-spec-status` prints an empty queue; `joycraft-next-spec` prints `Pipeline complete` with specs still `todo`.
> **Status:** Ready
> **Date:** 2026-07-27
> **Estimated scope:** 1 session / 3 scripts × 3 copies + 1 test file / ~120 lines

---

## Bug

All three queue-reading Pi scripts misread `.joycraft-spec-queue.json` whenever
the manifest is pretty-printed with one key per line:

- **`joycraft-mark-done`** — exits 0, prints `Spec #N marked in-review`, and does
  not change the file. The queue silently desyncs from the spec frontmatter.
- **`joycraft-spec-status`** — prints the header and no rows, as if the queue
  were empty.
- **`joycraft-next-spec`** — prints `Pipeline complete` regardless of how many
  specs are still `todo`.

`next-spec` is the most dangerous: "Pipeline complete" is also the correct output
for a finished queue, so an autonomous Pi loop ends before running any spec and
nothing looks wrong.

Observed live during the `2026-07-27-human-readable-output-style` feature run,
where spec 1's queue bump was reported as successful and never landed. See
`docs/discoveries/2026-07-27-human-readable-output-style.md`.

## Root Cause

The scripts are not wrong about the format they were written for — they are
pinned to a format the manifest on disk does not use.

`src/skills/joycraft-decompose.md:253-259` documents the manifest as **one JSON
object per line**:

```
{ "id": 1, "file": "<spec-name>.md", "depends_on": [], "status": "todo", "mode": "batch" },
```

All three scripts parse line-wise against that contract:

- `joycraft-mark-done:71` — `sed -E "/\"id\": *$SPEC_ID[,}]/s/\"status\": *\"[^\"]*\"/…/"`.
  The address matches the line holding `"id": N`; the substitution targets
  `"status"` on that **same line**. Pretty-printed, `"status"` is ~3 lines below,
  so the address matches a line with nothing to substitute and the edit is a
  no-op. The script never checks whether the write landed.
- `joycraft-next-spec:47` and `joycraft-spec-status:36` — `grep -o '{[^}]*}'`.
  `grep` is line-oriented, so a `{...}` spanning lines never matches and the
  extraction yields zero entries.

Verified in both directions: against the documented one-object-per-line format
all three scripts behave correctly; against the pretty-printed format all three
fail. The bug is a format-contract mismatch, not a broken regex.

No test covers any of the three scripts.

## Fix

Make the scripts format-agnostic rather than re-pinning them to one layout.

1. **Shared normalization.** Before parsing, collapse each JSON object onto one
   line — read the manifest, join the `specs` array's objects so `{ … }` is
   contiguous, and feed the existing line-oriented logic. This keeps every
   current `sed` extraction working and makes both layouts parse identically.
   Implement it once as a small shell function duplicated across the three
   scripts (they are standalone by contract — no shared library exists, and
   introducing one would change how they are installed).

2. **`mark-done` verifies its own write.** After the substitution, re-read the
   entry and confirm the status equals the requested state. On mismatch, print a
   diagnostic to stderr and `exit 1`. Silent success is the worse half of this
   bug: a loud parse failure would have been caught immediately.

3. **Test coverage.** New `tests/pi-scripts-queue.test.ts` executes the real
   scripts against fixture manifests in **both** layouts and asserts behavior.

Fix the canonical copies under `src/templates/pi-scripts/`, then regenerate and
sync so `docs/templates/pi-scripts/` and `.pi/scripts/joycraft/` match.

## Acceptance Criteria

- [ ] `joycraft-mark-done` flips the target spec's `status` in a pretty-printed manifest.
- [ ] `joycraft-mark-done` still works on the documented one-object-per-line manifest.
- [ ] `joycraft-mark-done` exits non-zero and prints a diagnostic to stderr when the status write does not land.
- [ ] `joycraft-mark-done` leaves every other spec entry byte-identical.
- [ ] `joycraft-spec-status` lists all specs with correct glyphs in a pretty-printed manifest.
- [ ] `joycraft-next-spec` returns the first ready `todo` spec in a pretty-printed manifest.
- [ ] `joycraft-next-spec` prints `Pipeline complete` only when no `todo` specs remain.
- [ ] `joycraft-next-spec` still honors `depends_on` — a spec whose dependencies are `todo` is not served.
- [ ] All three scripts behave identically on both manifest layouts.
- [ ] `tests/pi-scripts-queue.test.ts` covers all three scripts against both layouts.
- [ ] The three installed/generated copies byte-match their canonical sources.
- [ ] `pnpm test --run` passes.
- [ ] `pnpm typecheck` passes.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| mark-done works pretty-printed | Run script on pretty fixture, assert status flipped | integration |
| mark-done works compact | Run script on compact fixture, assert status flipped | integration |
| mark-done fails loudly | Point at a manifest whose entry cannot be rewritten; assert non-zero exit + stderr | integration |
| mark-done touches only its entry | Diff fixture before/after; assert exactly one status changed | integration |
| spec-status lists specs | Run on pretty fixture, assert all ids and glyphs present | integration |
| next-spec serves ready spec | Run on pretty fixture with specs `todo`, assert it names the first | integration |
| next-spec respects deps | Fixture where spec 2 depends on `todo` spec 1; assert 2 is not served | integration |
| next-spec completion | Fixture with all specs `done`; assert `Pipeline complete` | integration |
| Copies in sync | Existing bundle/sync assertions | unit |
| No regressions | `pnpm test --run` | integration |

**Execution order:**

1. Write the tests against both layouts. The pretty-printed cases FAIL and the
   compact cases PASS — that split is the bug, and seeing it is the point.
2. Confirm that red/green split before touching the scripts. If the pretty cases
   pass, the fixture is not actually pretty-printed.
3. Apply normalization + `mark-done` verification to the canonical scripts.
4. All cases green. Regenerate and sync the copies.
5. Full suite.

**Smoke test:** `npx vitest run tests/pi-scripts-queue.test.ts` — seconds.

**Before implementing, verify your test harness:**

1. Run the new tests before the fix — the pretty-printed cases MUST fail. If they
   pass, the test is not exercising the bug.
2. Tests must execute the real scripts via a shell, not reimplement their logic.
3. Each test needs its own temp fixture — `mark-done` mutates the file, so shared
   fixtures make results order-dependent.

## Constraints

- MUST fix the canonical copies under `src/templates/pi-scripts/` and propagate to `docs/templates/pi-scripts/` and `.pi/scripts/joycraft/`.
- MUST keep all three scripts working on the documented one-object-per-line format — this is a widening, not a swap.
- MUST make `mark-done` exit non-zero when its write does not land.
- MUST keep the scripts dependency-free POSIX-ish bash — no `jq`, no Node, no Python.
- MUST keep each script standalone — no shared sourced library.
- MUST NOT change the manifest format that `joycraft-decompose` writes.
- MUST NOT change the `todo → in-review → done` vocabulary.
- MUST NOT add any runtime dependency to the npm package.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/templates/pi-scripts/joycraft-mark-done` | Normalize before parse; verify the write; fail loudly on no-op. |
| Modify | `src/templates/pi-scripts/joycraft-next-spec` | Normalize before the `grep -o '{[^}]*}'` extraction. |
| Modify | `src/templates/pi-scripts/joycraft-spec-status` | Normalize before the `grep -o '{[^}]*}'` extraction. |
| Sync | `docs/templates/pi-scripts/*`, `.pi/scripts/joycraft/*` | Regenerated/synced copies of the three scripts. |
| Create | `tests/pi-scripts-queue.test.ts` | Executes the real scripts against both manifest layouts. |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Manifest is compact (documented format) | Works exactly as before — the fix widens, never narrows. |
| Manifest mixes layouts | Both parse; normalization is per-object, not per-file. |
| A string value contains `{` or `}` | Out of scope for this fix, but must not crash. Spec filenames and statuses do not contain braces; note the limitation rather than building a JSON parser in bash. |
| `mark-done` targets a nonexistent id | Existing behavior preserved: hard error, exit 1, never a silent no-op. |
| Manifest is empty or malformed | `spec-status`/`next-spec` report an empty queue rather than crashing; `mark-done` exits non-zero. |
| `next-spec` with all specs `done` | `Pipeline complete` — the one case where that output is correct. |
| A spec's `depends_on` names a missing id | Treat as unsatisfied and do not serve the spec; do not crash. |
