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

## Spec 4 (PASS r1)
- f1: `archive.mjs` `markdownLines` (Markdown link rewrites) and the as-is note's owner-instruction quote still split on `\n` only.
- f2: the 1.9.1 `[AC:spec-1-4]` test in `tests/runtime-archive-as-is.test.ts` was reworded to the new blank-instruction message (required by spec 4, not listed in its Test changes).

## Spec 5 (PASS r1)
- f1: `setup.md:247` folds "its conventions" into the keep-guidance sentence, where "its" attaches only to the second home and "keep" is weaker than the old "preserve"; a same-length rewording could fix it later.
- f2: the `[AC:spec-5-2]` tag sits in a comment, since the criterion forbids an assertion change; evidence is the unchanged guard run plus a diff receipt.

## Spec 6 (FAIL r1, PASS r2)
- r1 f1 (fixed in c4f24fe): the 1.9.2 update note overclaimed; `deno.jsonc` already needed the gate, and `pnpm-workspace.yaml` already needed it outside feature and archive folders.
- r1 f2: criterion spec-6-2 has no test tag, because `release-preparation.test.ts` must stay unchanged; the evidence is the passing run and an empty diff.
- r2 f4: the `joycraft.summary` line says `pnpm-workspace.yaml` needs the gate again "under the docs root"; it is new only inside feature and archive folders (the CHANGELOG gives the exact scope).
