# 1.9.2 review follow-ups

## Spec 1 (PASS r1)
- f1 (already there): a one-part gate with a trailing separator (`npm test;`) does not refuse `npm test`; the spec kept one-part gates as before.
- f2: `commandParts` does not handle backslash-escaped quotes or a single `&` (background); rare in recorded gates.
- f3: `completion.md` does not describe the gate-part rule (the spec allowed that).
