# Harness blocks do not nest — nesting silently corrupts every variant

> **Date:** 2026-09-03
> **Surfaced by:** `docs/features/2026-09-02-omp-support` spec 3 (harness-block audit)
> **Affects:** `scripts/lib/skill-template.mjs` → `processHarnessBlocks`

## What happened

While splitting a `pi`-only block in `joycraft-implement-feature` so omp could get
the no-runtime text, the natural edit was to nest a narrower block inside a wider
one. The generated output was wrong — and wrong in a way no existing test caught.

## The mechanism

`processHarnessBlocks` finds an open tag, then takes the **first** `<!-- /harness -->`
after it as the match (`scripts/lib/skill-template.mjs:160-162`):

```js
const closeRe = /<!--\s*\/harness\s*-->/g;
closeRe.lastIndex = openEnd;
const closeM = closeRe.exec(body);
```

There is no depth counter. With a nested block, the **inner** close tag terminates
the **outer** block. The cursor then advances past it (`openRe.lastIndex = cursor`),
so the inner open tag is never processed as a tag — it is emitted verbatim as body
text — and the outer's real close tag is left orphaned in the output.

## Reproduction

```
<!-- harness:claude|codex -->
OUTER-START
<!-- harness:claude -->
INNER-CLAUDE-ONLY
<!-- /harness -->
OUTER-END
<!-- /harness -->
```

Both the claude and codex variants render identically as:

```
OUTER-START
<!-- harness:claude -->
INNER-CLAUDE-ONLY
OUTER-END
<!-- /harness -->
```

Two distinct failures, neither of which raises an error:

1. **Content leaks across harnesses.** `INNER-CLAUDE-ONLY` was gated to claude and
   still appears in the codex variant. The allow-list is bypassed entirely.
2. **Raw markup ships to users.** `<!-- harness:claude -->` and a stray
   `<!-- /harness -->` land in the installed `SKILL.md`.

This corrupts *every* harness variant, not just the one being added. The
`unclosed harness block` guard does not fire, because from the parser's view every
open tag found a close tag.

## What to do instead

Flatten: close the outer block, emit the narrower blocks as siblings, reopen the
outer if more shared text follows. Sibling selectors must be mutually exclusive for
any given harness, or the variant renders the same text twice (the transform does
not dedupe).

```
<!-- harness:claude|codex -->
OUTER-START
<!-- /harness -->
<!-- harness:claude -->
INNER-CLAUDE-ONLY
<!-- /harness -->
<!-- harness:claude|codex -->
OUTER-END
<!-- /harness -->
```

## Why this is worth remembering

Harness blocks are allow-lists, so the usual failure mode of a bad selector is
*missing* content — invisible, but at least inert. Nesting fails the other way: it
*adds* content to harnesses that were meant to be excluded, and leaks comment
markup into shipped files, while the suite stays green. It is the same class of
silent-wrong-output problem as the 0.7.3 stale-installed-tree incident.

Verify with a direct `applyTemplate` call on a fixture before trusting a
restructured block — the parity tests check what a variant contains, not whether
the tags parsed the way the author intended.

## Not fixed here

`processHarnessBlocks` still has no depth counter and no diagnostic for a nested
open tag. Adding either — a real nesting implementation, or a build-time error
that rejects nesting outright — is a contained change to one function plus tests,
and the error is probably the better of the two (nesting has no established use
case, and flattening is always available). Logged rather than done because the omp
feature's specs did not own that file.
