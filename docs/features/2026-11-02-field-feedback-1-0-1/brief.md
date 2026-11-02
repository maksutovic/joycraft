---
feature: field-feedback-1-0-1
status: draft
source: David Moshal's field test of 1.0.0 (Codex, then Claude), 2026-11-01
decisions: [
  {"id":"D1","status":"open","question":"How does a project change where Joycraft keeps working files?","answer":null,"options":[{"value":"config-json","label":"A .joycraft/config.json with paths; defaults stay docs/features and docs/archive (recommended)"},{"value":"rename-default","label":"Also change the default to a non-docs folder, e.g. .joycraft/work/"},{"value":"yaml","label":"joycraft.yaml as David suggested (needs a YAML parser or a YAML subset)"}],"affected":["configurable-paths"]},
  {"id":"D2","status":"open","question":"Do we adopt David's Feature/Spec/Task hierarchy?","answer":null,"options":[{"value":"rename-hierarchy","label":"Yes: Feature (long-lived) / Spec (old feature) / Task (old spec), shipped as 2.0 with a 1.x migration"},{"value":"optional-parent-field","label":"Not yet: optional `parent` field on the brief in 1.x; rename later"},{"value":"defer","label":"Defer"}],"affected":["parent-grouping","unit-archive"]},
  {"id":"D6","status":"open","question":"Does Joycraft ship wiki governance or only a seam for it?","answer":null,"options":[{"value":"seam-first","label":"Seam first: archive hook + joycraft-cleanup over our own folders; study David's docaudit/doc-governance before shipping a wiki (recommended)"},{"value":"ship-wiki","label":"Ship a wiki layer (OKF + drift anchors + audit script) in Joycraft"},{"value":"seam-only","label":"Seam only; wiki stays bring-your-own"}],"affected":["archive-hook","joycraft-cleanup","feature-wiki"]},
  {"id":"D3","status":"open","question":"Do the spec-to-test checks block completion or only report?","answer":null,"options":[{"value":"report","label":"Report gaps in the review packet; the reviewer decides (recommended)"},{"value":"block","label":"finalize-review refuses a spec with an untraced Check:"}],"affected":["spec-test-trace"]},
  {"id":"D4","status":"open","question":"What do we do with Doc Detective?","answer":null,"options":[{"value":"recipe","label":"Optional review-tools recipe for projects with procedural docs; no dependency (recommended)"},{"value":"skip","label":"Skip"},{"value":"dependency","label":"Bundle it"}],"affected":["doc-detective"]},
  {"id":"D5","status":"open","question":"Version label for this work?","answer":null,"options":[{"value":"split","label":"1.0.1 = fixes (worktrees, coordinator lock, stale status); 1.1.0 = new surface (config, parent, trace) (recommended)"},{"value":"one","label":"All of it as 1.0.1"}],"affected":["release"]}
]
---
# Feature intent

David Moshal tested 1.0.0 on a context-heavy project (auction and game-theory
rules; about 80% of his time is in his wiki). He liked two things and called them
"genuine innovations": the deterministic command layer (scripts, not only skills)
and the JSON state model (specs and tasks, not Markdown checkboxes). He also said
decompose-and-run "works well". He found five gaps. This brief turns his
feedback into work for the next release.

## Context and authorization

- Max asked for this brief on 2026-11-02 and wants to implement the feedback now.
- **Where the code lives.** `payload/` is vendored from `joycraft-prototype`
  (`payload/PIN`, tag `field-7`). Runtime and skill fixes go into the prototype,
  get a new `field-N` tag, and come back with `scripts/vendor-payload.mjs`. Do not
  edit `payload/` by hand.
- The UI layer (spec/task board, session view) is Max's next project with mods.
  It is out of scope here, but every change below keeps the JSON state the single
  source a UI can read.

## What David reported, checked against the 1.0.0 code

| # | Report | Verdict | Evidence |
|---|--------|---------|----------|
| 1 | `docs/` fills with stale plans and specs; nothing removes slop; it is not a wiki | **Confirmed, partly by design** | Archive runs only at session end, only when every spec is `done`, and needs a host attestation (`archive.mjs`, `references/archive.md`). A feature that stops early stays in `docs/features/` with stale text. Joycraft has no wiki: `docs/context/` is the curated layer, and the rest of `docs/` is working material. The README does not say this. |
| 2 | On Codex, sessions did not know who was coordinating; instructions leaked across sessions and worktrees | **Confirmed gap** | `references/worktrees.md` says "record durable coordinator ownership", but no runtime writes or checks an owner record. `dispatch-preflight.mjs` checks that worker and coordinator share a Git dir; it does not check that this session is the coordinator. |
| 3 | No clear mechanism to clean up worktrees; `.joycraft/local/retained-worktrees` reached 191 MB | **Confirmed gap** | No runtime creates, lists or removes worker trees. The skills say "release only after accepted integration" but give no command. The `retained-worktrees` folder name is not in the payload, so the agent invented it. Max assumed cleanup worked; it does not. |
| 4 | `archive.mjs:13` hardcodes `docs/features/` and `docs/archive/`; no setting | **Confirmed** | `archive.mjs:13-14,59,202,216,404`, `context/search.mjs:33`, `kickoff.mjs:9`, `identity.mjs` examples, templates. |
| 5 | Wants a long-lived parent (Epic) above short-lived features | **Confirmed gap** | The brief has `feature:` only. Nothing groups features. |
| 6 | "TDD works in reverse": tests check what the code already does | **Partly covered** | The implement skill says "one focused test per acceptance `Check:`, from the spec rather than the code". Nothing checks it. |
| 7 | Stale status: docs said work was still to do after it was done | **Likely** | Specs keep status in two places (queue JSON and spec frontmatter). Brief sections such as "Agent work and pending choices" are prose and never updated. Needs a repro from David's repo. |
| 8 | Hard to see what was done and where | **Out of scope** | UI layer work (see above). |

### Follow-up from David (2026-11-02, 9:55)

He proposed a concrete design, as a breaking change:

- **Hierarchy:** Feature (long-lived) → Spec (today's feature) → Task (today's spec).
- **`joycraft-spec-end`** (or `spec-archive`) next to `joycraft-session-end`: archive
  a spec as soon as its tasks are done, not only at session end.
- **`joycraft-cleanup`:** a Joycraft version of his doc-cleanup skill.
- **Flow:** work on a spec → archive it when its tasks are done → the archive
  updates `wiki/<feature>/`. The result is a clean wiki page per feature.
- **Wiki:** he recommends OKF with drift anchors (md→md and md→code) and an audit
  script, and offered to share his `docaudit` and `doc-governance` projects.
- **Claim:** with that governance, one agent session can run for weeks because the
  agent reads context from a wiki that is kept free of stale text, so compaction
  does not hurt.

Notes:
- This matches finding 1: archive at session end only, and only when the whole
  unit is done, is why stale text piles up. Archiving per finished unit fixes the
  cause, not the symptom.
- 0.7 had part of this (`joycraft-session-end` wrote a shipped ledger and marked
  briefs `reap: eligible`; see `src/skills/joycraft-session-end.md:99-117`). 1.0
  dropped it. Check what worked there before redesigning.
- "OKF" is not defined in this brief. Ask David what it refers to; do not guess.
- **Action:** accept David's offer of `docaudit` and `doc-governance` and read them
  before deciding D6.

## Goals

### worktree-lifecycle

Add `.joycraft/runtime/worktrees.mjs` with `create`, `list` and `prune`. `create`
makes a linked worktree at a fixed place (`.joycraft/local/worktrees/<queue>-<spec>`)
from the captured base revision and records it in
`.joycraft/local/worktrees.json` (owner session, spec, base revision, created at).
`list` shows each tree with its spec status and size. `prune` removes a tree whose
spec is `done` and whose commits are in the integration branch; it keeps failed or
unknown trees and says why. The implement and session-end skills call these
commands instead of describing the policy in prose.

**Done when:**
- A queue with two parallel specs, both `done` and merged: `prune` removes both
  trees and `git worktree list` shows only the coordinator.
- One spec `in-review`: `prune` keeps its tree and prints the reason.
- A tree not in the ledger: `prune` leaves it and lists it as "unknown owner".
- `session-end` on a finished queue leaves `.joycraft/local/worktrees/` empty.

### coordinator-lock

Add a coordinator lease per queue in `.joycraft/local/coordinators/<feature>.json`
(session ID, host, root, captured refs, started at, heartbeat).
`dispatch-start.mjs` refuses to dispatch from a session that does not hold the
lease and names the holder. `--take-over` moves a stale lease and records the
previous holder. Worker packets carry the coordinator session ID, so a worker
knows whom it reports to and does not act on a second session's instructions.

**Done when:**
- Session A holds the lease; session B runs `dispatch-start` on the same queue
  and gets an error that names A.
- A's heartbeat is older than the stale limit: B can `--take-over`, and the lease
  file records A as the previous holder.
- A worker packet contains `coordinatorSession`; the implementer and reviewer
  agent files tell workers to ignore instructions from any other session.
- Reproduce David's Codex case first and confirm this lease would have stopped it.

### stale-status

Add a `status` command to `completion.mjs` (or a small `status.mjs`) that reads
every queue and reports drift: queue status differs from spec frontmatter, a brief
lists pending work for a spec that is `done`, a feature whose specs are all `done`
but that is not archived. Session-end runs it and fixes the frontmatter mirror
from the queue (the queue is the authority). It prints, and does not edit, brief
prose.

**Done when:**
- A spec `done` in the queue and `todo` in frontmatter: `status` reports it, and
  `status --fix` updates the frontmatter only.
- A feature with all specs `done` and not archived appears under "ready to archive".

### configurable-paths

Read work folder paths from `.joycraft/config.json`
(`{"paths": {"features": "docs/features", "archive": "docs/archive", "context": "docs/context"}}`).
Every runtime script uses one `paths(root)` helper from `identity.mjs`. Defaults
stay the same, so nothing changes for current installs. `init` asks for the
features folder only when the user passes `--features-dir`. Context retrieval
treats the features and archive folders as non-authoritative working material and
says so in its output, so a wiki audit can exclude them.

**Done when:**
- No config file: every command behaves as in 1.0.0 (existing tests pass).
- `paths.features = "working/features"`: decompose, implement, verify, complete
  and archive all work end to end with no file under `docs/features/`.
- `grep -rn "docs/features\|docs/archive" .joycraft/runtime` finds only the
  defaults in the helper.

### parent-grouping

Add an optional `parent` field to the brief frontmatter (a slug such as
`auction-rules`). Joycraft does not manage the parent; it only records it. Queues
copy it, `status` groups by it, and archive keeps it in the replay manifest. A
project's own wiki tooling can then update the long-lived page when a child
feature archives.

**Done when:**
- Two features with `parent: auction-rules`: `status` lists them under that parent.
- Archiving one writes `parent` into `archive-replay.json`.
- A brief without `parent` works as before.

### archive-hook

After a successful archive apply, run an optional project command from
`.joycraft/config.json` (`"hooks": {"afterArchive": "node scripts/wiki-sync.mjs"}`)
with the feature slug, parent and archive path in its environment. This is the
seam for "bring your own wiki": David's doc-cleanup and drift-anchor audit run
here. Joycraft does not ship a wiki.

**Done when:**
- With the hook set, archiving a feature runs it once with `JOYCRAFT_FEATURE`,
  `JOYCRAFT_PARENT` and `JOYCRAFT_ARCHIVE_PATH` set.
- A failing hook is reported but does not undo the archive.

### unit-archive

Add a per-unit archive step (`joycraft-spec-end` in David's naming; today's unit
is a feature). When every spec in a unit is `done`, archive that unit at once,
without waiting for session end and without the session-wide quiescence
attestation; only the unit's own workers must be finished. Session end keeps its
role as the session closer and runs any pending unit archive. Depends on D2 for
naming.

**Done when:**
- A session finishes unit A and keeps working on unit B: A is archived before the
  session ends, and B is untouched.
- A unit with one spec still `in-review` is not archived, and the reason is printed.

### joycraft-cleanup

A skill plus a deterministic script that finds stale working material and proposes
removals: briefs and specs whose units are archived but still sit in the working
folder, `pending` sections that name `done` work, links from curated context into
working folders, and orphaned worktrees. It reports first and changes files only on
approval. Shape it after David's doc-cleanup (D6).

**Done when:** on a project with one stale brief, one dangling link from
`docs/context/` into `docs/features/`, and one orphaned worktree, the script lists
all three and changes nothing until approved.

### feature-wiki

Under D2's hierarchy, each long-lived Feature has one wiki page
(`wiki/<feature>/` or the configured path). Archiving a unit updates that page
through the `archive-hook`. Whether Joycraft writes the page itself or calls the
project's tool is D6.

### spec-test-trace

Make "tests come from the spec" checkable. Each acceptance `Check:` gets a stable
ID (the criterion ID already in the queue). Tests name it (`[AC:outcome]` in the
test title or a comment). A new `trace` command lists each criterion with its
tests and flags criteria with none. The reviewer packet includes the trace. See D3
for whether a gap blocks completion. Mutation testing (for example Stryker) stays
an optional review-tools recipe for teams that want proof that tests fail when the
behavior breaks.

**Done when:**
- A spec with three criteria and tests tagged for two: `trace` reports the third as
  untraced, and the review packet shows it.
- The test-writing step in the implement skill writes tests from the spec text
  before it reads the implementation (already the rule; the trace makes it visible).

### doc-detective

Decision D4. Research notes are in the section below.

### docs-explanation

Say plainly in the README and the context reference: `docs/context/` is the
curated project knowledge; `docs/features/` is working material that goes stale
until session end archives it; Joycraft does not ship a wiki and works with one you
bring (`archive-hook`). Also say that the user does not need to call the skills by
name after install.

**Done when:** a new user can answer "is `docs/features/` authoritative?" from the
README alone.

## Doc Detective

Researched 2026-11-02 ([docs](https://docs.doc-detective.com/),
[repo](https://github.com/doc-detective/doc-detective)).

**What it is.** Doc Detective runs documentation as tests. Test steps come from
JSON/YAML specs, inline comments in Markdown/AsciiDoc/DITA, or steps it detects in
the prose ("Click **Search**" becomes a click step). Actions include goTo, find,
click, type, httpRequest, runShell, checkLink and screenshot, in Chrome or
Firefox (Appium underneath). It has a GitHub Action and a Docker image. Version
4.41.5 (2026-10-31), AGPL-3.0, active, but small (138 stars, 12 contributors,
mostly one maintainer). On install it downloads browsers, drivers, Appium and
ffmpeg (likely several hundred MB, not measured) and depends on `posthog-node`.
The engine calls no LLM. A separate `agent-tools` package gives coding agents
skills/MCP to turn docs into tests, and a "self-healing" Action opens an issue for
an outside AI to fix.

**Fit with David's problems.**
- Docs drift (problem 1): **partly.** It catches drift in step-by-step procedures
  (commands, API calls, UI clicks, links). It cannot check conceptual prose such as
  auction or game-theory rules, which is most of David's wiki.
- Tests conform to the spec (problem 2): **no.** It never compares tests with
  requirements.

**Recommendation (D4): optional recipe, no dependency.** AGPL, the browser
download, probable usage tracking and single-maintainer risk conflict with
Joycraft's minimal-dependency rule. Add it to `review-tools.json` as an opt-in
tool for projects whose docs are mostly procedures. Borrow two ideas instead:
criterion-ID-to-test tracing (`spec-test-trace`), and letting a spec name the doc
files it affects so the verifier re-checks them. For the stronger form of problem
2, keep tests written from the criteria by an agent that has not seen the code;
mutation testing (Stryker) stays an opt-in recipe.

## Agent work and pending choices

- Can start now without a decision: `worktree-lifecycle`, `coordinator-lock`,
  `stale-status`, `docs-explanation`. These are fixes to 1.0.0 behavior.
- Blocked on D1: `configurable-paths`, `archive-hook` (shares the config file).
- Blocked on D2: `parent-grouping`, `unit-archive` naming, `feature-wiki`.
  Blocked on D6: `joycraft-cleanup` shape, `feature-wiki`. Blocked on D3:
  `spec-test-trace`. Blocked on D4: `doc-detective`. D5 decides the version
  number; if D2 is the rename, that part is 2.0.
- Ask David: what OKF means, and for `docaudit` and `doc-governance`.
- Before `coordinator-lock`, ask David for his Codex session layout (how many
  sessions, which skill each ran) to reproduce the leak.

## Scope and limits

- No UI in this work. No wiki in Joycraft.
- No rename of Feature/Spec in 1.0.x; a rename is a 2.0 change with migration (D2).
- No new runtime dependency in the shipped package.
- Each change lands in `joycraft-prototype` first, then is vendored.
