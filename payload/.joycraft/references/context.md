# Project context

## Contents

- [Finding context](#finding-context)
- [Changing context](#changing-context)

## Finding context

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

Treat only the context homes as current authority. `docs/features/` is working
material that can be stale until its feature is archived, and `docs/archive/` is
history; see [knowledge guidance](knowledge.md) for which home holds what. Joycraft ships no wiki. Skills
do not need to be named by the user: pick the step from the request.

## Changing context

The same skill writes project knowledge when the user asks: "add this to the
project context", "remember that ...", "forget that rule", or a meeting note,
screenshot or pasted text to capture. `knowledge.md` owns the rule (one home per
fact, current state only, reasons in the decision log, history in the archive);
these steps apply it to a request.

**Read the map and homes.** Start from the context map in `AGENTS.md` (or the
project's own map). Search the live homes, not `docs/features/` or
`docs/archive/`, for the subject of each fact: a different wording of the same
rule counts as the same fact.

**Turn input into facts.** A meeting note, screenshot or pasted thread usually
holds several facts and some noise. Keep each statement that was settled or
observed: a decision and its reason, a trap and how to avoid it, a reference, a
production fact. Leave out action items, open questions, ideas nobody decided
on, attendance and opinions; name them in the proposal as left out, so the user
can correct the cut. For a screenshot, read the facts from what it shows and
say which ones you could not read. Do not copy the raw note into the project,
and do not keep a link to it as a source: the homes state the facts themselves.

**Add.** Route each fact by the table in `knowledge.md` to the home the map
already names for that kind. When the map has no home for it, create a focused
page under the context folder with the fact and add a map row whose "read when"
names the work that needs it, not the page's title. Write a decision's current
choice in the home that owns its area and its reason and rejected options as a
decision-log entry. A widened home keeps a "read when" that covers its new
content.

**Change.** Rewrite the existing statement in place. Add a decision-log entry
that names the old choice, the new one and why. Leave no dated addendum,
"previously" note or struck-through text in the live home.

**Remove.** Delete the statement from every live home that holds it, including
copies in `AGENTS.md`. Add a decision-log entry headed with what was removed,
with the user's reason; when the user gives none, ask, and in a pre-approved
non-interactive run write that it was removed at the user's request. An older
decision-log entry that chose the rule stays as history; the new entry records
that it no longer applies. When the page that held it has no facts left, delete
the page, its map row and every link or backticked mention of it. Do not leave
an empty page, a row to a missing file or a "removed" note in a live home.

**Approve, then write.** Before writing, show each affected file and the change
as a unified diff (or the new file in full), the home chosen for each fact, and
anything left out. Write only after the user says yes, and only what they
approved. A prompt that already approves the change, as in a scripted run, is
that yes; still show what you wrote afterwards.

**Check the map.** Run `node .joycraft/runtime/cleanup.mjs`. The change must not
add a `missing-path`, `unmapped`, `orphan`, `broken-link` or `working-link`
finding; fix any it did. Report findings that were already there without fixing
them unless the user asks. Every page you created or edited must be reachable
from the map.
