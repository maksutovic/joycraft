---
name: joycraft-context
description: Find and rank relevant project decisions, references and implementation files when a request needs context beyond the current files.
compatibility: Requires Node.js 22+ and the installed .joycraft runtime for retrieval. Git improves tracked-file discovery, with local search fallback.
---

Read the project's boundaries and context map first. If these are missing during
authorized setup or implementation, use the first-use procedure in
[first-use setup](../../../.joycraft/references/setup.md); retrieval alone does not create project
knowledge. Keep read-only research read-only. Use a concrete request to
find local candidates and their bounded snippets:

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
