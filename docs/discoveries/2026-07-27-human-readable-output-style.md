---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-27
feature: 2026-07-27-human-readable-output-style
---

# Discoveries — human-readable output style

**Date:** 2026-07-27
**Spec:** `docs/features/2026-07-27-human-readable-output-style/specs/`

Consolidates the two stubs written during the run
(`2026-07-27-mark-done-script-silently-noops.md`,
`2026-07-27-test-suite-regenerates-bundles.md`).

## `joycraft-mark-done` silently no-ops on pretty-printed queue JSON

**Expected:** `.pi/scripts/joycraft/joycraft-mark-done <id> --to in-review` bumps
the queue entry, and its exit code plus `Spec #N marked in-review` confirm it.

**Actual:** It changes nothing. The `sed -E "/\"id\": *$SPEC_ID[,}]/s/\"status\": *\"[^\"]*\"/…/"`
addresses the single line holding `"id": N`, but in the pretty-printed manifest
`"status"` sits three lines below — so the address matches a line with no
`"status"` on it and the substitution never fires. It still exits 0 and prints
success. The script only works if `id` and `status` share a line, which the
format `joycraft-decompose` writes never does.

**Impact:** Any `spec-done` or `session-end` run that trusts this script leaves
the queue unbumped while the frontmatter advances — precisely the two-systems
desync `docs/reference/spec-status-lifecycle.md` exists to prevent. It bit spec 1
of this feature: the commit captured an unbumped queue and needed a hand-patch.
Every bump in this run was done by direct JSON edit instead. The script needs a
multi-line-aware fix (address the object, not the line) plus a post-write
verification that fails loudly; until then, do not trust its exit code.

## Running the test suite rewrites the generated trees

**Expected:** A spec scoped to `src/skills/` leaves `src/{claude,codex,pi}-skills/`
and `src/bundled-files.ts` untouched, so "must not edit generated trees" is
satisfied by simply not editing them.

**Actual:** `tests/regenerate-bundled-files.test.ts` shells out to
`scripts/generate-bundled-files.mjs`, so *running the suite* regenerates all
three trees as a side effect. Any spec that runs tests ends with dirty generated
trees it never touched, and concurrent specs running the suite make the dirty set
shift between otherwise identical runs.

**Impact:** A constraint of the form "do not modify the generated trees" cannot be
verified with `git status` while tests are running — the check reports work the
spec never did. Verify such constraints against the *content* (does the tree match
what the generator produces from current sources?) rather than against dirtiness.
This also means spec 6's regeneration was partly already applied before it ran;
its value was the explicit generator run plus the installed-copy sync, which no
test side effect performs.

## A standalone regeneration spec worked, contradicting the 2026-06-11 guidance

**Expected:** Per `docs/discoveries/2026-06-11-bundle-regen-per-commit.md` —
"don't create a standalone 'regenerate the bundle' spec; fold regeneration into
each skill-editing spec" — spec 6 should have failed, because the per-commit test
gate fails the moment a source skill diverges from its generated copies.

**Actual:** Spec 3 committed eleven edited skills with stale generated trees and
stale installed copies, and the suite stayed green (1409 passing). The windowed
suites read the *installed* copies, which were stale, and `implement-mode-handoff`
byte-matches only `joycraft-implement` — not in this feature's edit set. So no
test observed the divergence until spec 6 synced it.

**Impact:** The 2026-06-11 rule is narrower than written. It holds when a spec
adds a skill (count assertions) or edits one that a byte-match test covers; it
does not hold generally, because installed-copy coverage is spotty. Deferring
regeneration to a terminal spec is viable and keeps generated churn in one
reviewable commit — but it depends on that coverage gap, which is itself the
weakness. The durable lesson is the gap: byte-match testing covers one skill, so
eleven skills can ship out of sync without a single red test.
