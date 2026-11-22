---
id: 9
status: done
---
# Archive's `next` message calls a line a comment only when it surely is one, and says to run the gate

Parent: [brief](../brief.md), section `archive`. Source: [review follow-ups](../review-followups.md), spec 1 review f1 and f4. Decision `archive-list-kill` = `keep-quiet` stays: `namedFiles` is unchanged; only the `next` message changes. A false "comment-only" call tells the agent a test needs no change when it reads the folder, which is the dangerous direction; a false "code" call only asks for a needless look.

## acceptance

- Sure comments only: `nextSteps` treats a line as a comment only when (a) its trimmed text starts with `//`; (b) it starts with `/*` or `<!--` and nothing but whitespace follows the closing `*/` or `-->` on that line (or the comment does not close on it); (c) it starts with `*` and an earlier line of the file opened a `/*` block that has not closed; or (d) it starts with `#` and the file's extension is one of `.py`, `.sh`, `.bash`, `.rb`, `.pl`, `.r`, `.yaml`, `.yml`, `.toml`. Every other line that names the folder counts as code. Check: `tests/runtime-archive-named-files.test.ts` `[AC:spec-9-1]` after a real `--apply`: `/* x */ const p = 'docs/features/<slug>/a'`, a `.ts` line `#dir = 'docs/features/<slug>'` and a template-literal line `* [b](docs/features/<slug>/c.md)` (no open block) each make `next` name that test and line; a `.py` test with only `# docs/features/<slug>` lines, a `.ts` test with `// Spec: docs/features/<slug>/x.md` and a `.ts` test whose path sits on a ` * ` line inside an open `/** ... */` block are comment-only.
- Plain wording: when every listed test names the folder only in comments, `next` says no path change looks needed and tells the agent to run the gate, because a red test means one reads the folder. Check: the same file `[AC:spec-9-2]`: that `next` contains "run the gate" and does not contain "Leave their paths as they are".
- Archive from a subfolder: `archive.mjs archive --feature <slug> --phase session-end --attestation <file>` run from a subfolder previews and applies against the project root. Check: `tests/runtime-archive-ignore.test.ts` `[AC:spec-9-3]`: the preview from `src/deep` equals the root preview, and `--apply` from `src/deep` moves the folder at the root and creates nothing under `src/deep`.

## Test changes

- `tests/runtime-archive-named-files.test.ts` class 1: acceptance bullets 1 and 2 add the cases; an existing `[AC:spec-1-5]` assertion on the old comment-only wording ("Leave their paths as they are") changes to the new wording, as bullet 2 requires.
- `tests/runtime-archive-ignore.test.ts` class 1: acceptance bullet 3 adds the subfolder archive case.

## Not covered

Anything in the brief's Scope and limits. A path built from a variable is still not listed. Other comment syntaxes (`--` in SQL or Lua, `;` in Lisp) count as code, the safe direction.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`.
- Files: `payload/.joycraft/runtime/archive.mjs` (`isCommentLine`, `nextSteps`), `tests/runtime-archive-named-files.test.ts`, `tests/runtime-archive-ignore.test.ts`.
- Tests: the two test files above. Tag each new test `[AC:spec-9-<n>]`.
- Start after spec 1 is done. Spec 8 (release) waits for this spec.
