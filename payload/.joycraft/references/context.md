# Project context ranking

From the consumer Git project root:

```sh
node .joycraft/runtime/context/cli.mjs --query "Fix CSV export encoding and reuse the existing format decision"
node .joycraft/runtime/context/cli.mjs --query "CSV export format" --paths docs/context src/export
node .joycraft/runtime/context/cli.mjs --query "CSV export format" --history
```

Add `--out docs/context-rank.json` to save the entire report and print only its
status and counts. The destination must be a new project-relative file in an
existing plain directory; existing files are never overwritten. Without `--out`,
stdout contains the complete JSON, including all exclusion records.

The command inventories Git-tracked and untracked nonignored files, then selects
UTF-8 text using deterministic keyword/path matches. Ordinary retrieval excludes
`docs/archive/` before files are read or scored and records each exclusion as
`archived-context`. Use `--history` only when historical material is relevant;
it remains reading context and never current authority. Programmatic callers use
`includeArchive: true` for the same opt-in. Explicit `--paths` accepts
project-relative files or directory prefixes and selects their safe text files
even without a keyword match. It never follows symlinks. Known secret/credential
paths, environment files, private keys, dependency directories, Git internals,
and transcript/session paths are excluded before reading. Ignored untracked
files are not in the inventory. This path filter cannot recognize every secret
placed in an ordinary source file; keep credentials in excluded private files.
The scanner rejects observed symlinks and checks opened-file identity before
reading. Like the rest of this local runtime, it is not a filesystem sandbox
against a hostile process concurrently replacing project ancestors.

Files over 512 KiB, binary/non-UTF-8 files, and nonregular entries are omitted
with reasons. The query is limited to 4,000 UTF-8 bytes. Each selected file keeps
its project-relative path, SHA-256 of the complete bytes read, local match score,
and a snippet of at most 1,800 UTF-8 bytes around the first matching line.
Snippets include source line numbers and whether they are partial. Large files
are never described as searched or ranked. Read those separately when needed.

Every selected candidate is retained, including a zero-scored file. Jev scores
all selected candidates in batches of at most 20; there is no candidate cap or
score cutoff. Encoded states over 60,000 bytes split into smaller batches, leaving
room for the shared question rubric. Narrow the query or paths before calling when a large area would
create unnecessary calls. A keyword search can miss paraphrases or dependencies;
this result never claims exhaustive context. Refine and follow relevant links.

The JSON `references` are sorted by Jev relevance, then local score/path. Each
reference identifies `provenance`, `relevance` (or `null`), and its scoring batch.
`batches` records candidate IDs, returned model, usage and elapsed time for each
successful call. `omitted`, `unreadable`, and `unranked` explain files that were
not scored. Hashes bind the result to the bytes read, not future edits. Open the
current source before relying on it; a bounded snippet is not the full file.

For an unclear state, data, or responsibility boundary, use the result as a
starting point and inspect the actual coupled sources as well: the owner and its
callers, readers, writers, or persistence boundary as applicable. Add discovered
paths to the brief/spec verification inputs before dispatch, and state any
unresolved coverage. Read `architecture.md` for focused examples. This expands
source discovery only when the seam matters; it does not make the context map a
second source of product decisions or a Jev-enforced prohibition.

Live scoring is the default. `.joycraft/hooks-config.json` supplies
`enabled`, `timeoutMs`, and Keychain service `JEV_API_KEY`; `--keychain-service` overrides it. The
shared `.joycraft/runtime/hooks/judge.mjs` primitive uses an existing
environment credential first, then the configured macOS Keychain service.
Credentials are never saved in the config, command arguments, result or project.
No dotenv file, transcript, or whole-project model dump is used.
The shared redactor removes recognizable credential patterns from outgoing
query/snippet strings before the Jev call; content hashes still identify the
original local bytes. Pattern redaction cannot identify arbitrary secret text.
Setting `enabled: false` selects explicit `local-search-only` output without
credential lookup; each candidate is marked unranked with `scoring-disabled`.

Missing credentials, malformed provider output or an outage stop further model
calls for that invocation. All selected references remain available in local
order where unranked; previously successful scores retain their provenance.
`status: incomplete-provider-ranking`, `provenance: local-search-fallback` and
`fallbackReason` make this explicit. Exit success means a usable result exists,
not that every candidate was scored; inspect `status` and `scoredCount`.
Invalid inputs or an unavailable Git inventory exit nonzero. Provider scores
advise reading order and never approve intent, authorize work or certify evidence.
