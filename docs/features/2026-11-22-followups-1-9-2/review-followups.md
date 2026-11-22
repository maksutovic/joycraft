# 1.9.2 review follow-ups

## Spec 1 (PASS r1)
- f1 (already there): a one-part gate with a trailing separator (`npm test;`) does not refuse `npm test`; the spec kept one-part gates as before.
- f2: `commandParts` does not handle backslash-escaped quotes or a single `&` (background); rare in recorded gates.
- f3: `completion.md` does not describe the gate-part rule (the spec allowed that).

## Spec 2 (PASS r1)
- f1: the any-case backlog folder is tested through `new-doc` only; age-out uses the same `backlogFile`.
- f2: every word of `run` counts, helpers included (`sh`, `cat`), so `sh rules.sh` printing `x: sh: not found` is still skipped; rare.

## Spec 3 (PASS r2; round 1 went stale when spec 5 touched a shared check file)
- f1: `delivery.md:49` "a clean `HEAD`" (was "a clean tree at `HEAD`") is slightly less exact; the point is a clean working tree.
- f2: `delivery.md:56` dropped "so it stays a record" after the `probe.mjs.txt` instruction.
- f3: commit 5022789 also carried spec 1's reviewer receipt (harmless).
