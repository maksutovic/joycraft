---
id: 3
status: in-review
---
# gone-symbol finds guides that still name removed code

Parent: [brief](../brief.md), sections `gone-symbol`. Decisions are answered; quote them by ID. Testing mechanisms are out of scope (brief, Context).

## acceptance

- Identifiers on code lines removed in the range (generic tokenizer: words of 3+ chars with a letter, from non-Markdown files), intersected with backticked identifiers in context pages and entry files, then one `git grep -F -w` at HEAD over non-Markdown tracked files; names with no hit remain. Check: a fixture deletes `getWidget` from `src/widget.ts` while `docs/context/guide.md` names `getWidget()` in backticks: one `gone-symbol` finding at that line.
- A name that still exists in code is not reported. Check: the fixture moves `getWidget` to another file in the same range: no finding.
- It works for any language. Check: the same fixture in Python (`def get_widget` removed from `app/widget.py`) gives one finding.
- A hit in an entry file is marked `fixable: false`; a hit in a context page `fixable: true`. Check: a fixture naming the removed symbol in AGENTS.md gives a finding with `fixable: false`.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit the source in `payload/` only; then run `node scripts/pin-payload.mjs` and, if the change touches installed copies, refresh them as AGENTS.md says.
- Files: `payload/.joycraft/runtime/cleanup.mjs`.
- Test: `tests/runtime-cleanup-gone-symbol.test.ts` (git fixtures in a temp dir, as `tests/runtime-archive-merge-amendment.test.ts` does). Tag each test `[AC:spec-3-<n>]`.
- Gate: `pnpm test && pnpm typecheck`.
