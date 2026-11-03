---
name: joycraft-context
description: Find, add, change or remove project context. Use when a request needs decisions, references or files beyond the current ones ("what does the map say about billing?"), when the user says "add this to the project context", "remember that ...", "that's no longer true", "forget/remove that rule", or hands over meeting notes, a screenshot or pasted text whose facts the project should keep.
compatibility: Requires Node.js 22+ and the installed .joycraft runtime for retrieval and the map check. Git improves tracked-file discovery, with local search fallback.
---

Read the project's boundaries and context map first. If these are missing during
authorized setup or implementation, use the first-use procedure in
[first-use setup](../../../.joycraft/references/setup.md); retrieval alone does not create project
knowledge. Keep read-only research read-only.

## Find context

Use a concrete request to find local candidates and their bounded snippets:

```sh
node .joycraft/runtime/context/cli.mjs --query "<current request>"
```

Narrow discovery with `--paths docs/context src/relevant-area` when the relevant
area is known. Retrieval excludes `docs/archive/` unless historical material is
specifically needed; add `--history` to inspect it as reading context, never as
current authority. An optional model ranker orders the results when it is
installed; otherwise they come in local-search order. Read `.joycraft/references/context.md` for output
and failure details.

Read useful ranked source files and follow their relevant links. Scores guide
reading order; low scores do not remove files or define task scope. Check omitted,
unreadable and unranked reasons; a provider failure still leaves local references.
Refine the query or paths when local keyword matching misses a known dependency.
When the requested change has an unclear state, data, or responsibility seam,
trace the actual counterpart sources beyond the ranked list: for example, the
owner alongside its callers, readers, writers, or persistence boundary. Add
discovered sources to the work's declared inputs and report any unresolved
coverage. Read `.joycraft/references/architecture.md` only for that
conditional discovery; it is navigation, not a decision authority or constraint.
Do not dump entire files, secrets or transcripts into a scoring request. Reuse
settled decisions, and surface contradictions affecting scope or consequential
choices while continuing understood authorized work.

## Add, change or remove context

When the user asks to record, correct or drop project knowledge, or gives you
notes, a screenshot or pasted text to capture, follow
[knowledge guidance](../../../.joycraft/references/knowledge.md) and the
"Changing context" steps in `.joycraft/references/context.md`. In short:

1. Split the input into separate facts. From notes keep only what was settled or
   observed; list action items, open questions and ideas as left out.
2. Search the live homes for each subject first. A fact already stated is
   rewritten in place, never stated twice.
3. Add: write the fact in its one home. A kind of fact the map has no home for
   gets a new page and a map row with a real "read when".
4. Change: rewrite the statement in place; the reason and the replaced choice go
   in a new decision-log entry.
5. Remove: delete the live statement wherever it appears and add a decision-log
   entry that names what was removed and why. A page left with no facts is
   deleted together with its map row and any links to it.
6. Show the proposed changes as a diff and write only on the user's yes. A
   request that already says to apply the change counts as the yes.
7. Run `node .joycraft/runtime/cleanup.mjs` and fix any `missing-path`,
   `unmapped`, `orphan` or `broken-link` finding the change caused.
