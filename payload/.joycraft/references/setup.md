# First-use project setup

Run this after every install from the prompt, when the user asks ("set up
Joycraft", "check the context map"), and whenever
`node .joycraft/runtime/wiring.mjs --root .` exits 2. The CLI knows nothing
about the project, so it writes nothing to `AGENTS.md` or `CLAUDE.md`; you build
the context map from the repository and a short interview with the user. Many
installs land in existing, sometimes large, projects, so the interview is part
of every setup, not only a new project's. Work inside the current project. A
read-only request gets the findings reported, not written.

For a reviewed clone, `node scripts/setup.mjs --target <project>` previews the
smallest missing knowledge homes. Add `--write` only after reviewing the preview.
It reads only plain target-local repository facts; it never reads `.env.local`,
Keychain, sibling projects, or private directories. Its `ready` and `partial`
status describes context discovery, never hook trust or a successful command.

## Contents

- [Set up the context map](#set-up-the-context-map)
- [Kickoff for a new project](#kickoff-for-a-new-project)
- [Review loop tools](#review-loop-tools)
- [Project-owned worktrees](#project-owned-worktrees)
- [Knowledge grows with the work](#knowledge-grows-with-the-work)
- [Finish setup and continue](#finish-setup-and-continue)
- [Upgrade and agent onboarding](#upgrade-and-agent-onboarding)

## Set up the context map

The context map in `AGENTS.md` is the project's memory index. Each row points to
one home for one kind of knowledge and says when to read it, so an agent loads
only what its work needs; the map then grows with every decision, trap and
feature ([knowledge.md](knowledge.md)). A project without a real map gets
nothing from Joycraft, so build it from the project, never from a template.

**Nothing new, nothing done.** When `wiring.mjs` exits 0, every doc worth
reading already has a row, and nothing the user told you or the audit found is
unrecorded, say in one line that Joycraft is already set up. Write nothing,
render nothing, ask nothing: a repeated setup must leave the project unchanged.

1. **Read.** Read `AGENTS.md`, `CLAUDE.md`, the README and every doc they point
   to, then the other Markdown docs (skip dependencies, generated files,
   `.joycraft/` and installed skills). Give each doc a role: **entry**,
   **required** (an entry doc says to read it), **reference** (read when a task
   needs it) or **historical** (kept for lookup, not guidance). Check what each
   doc claims against the code it describes. Inspect manifests, scripts and CI
   only to establish the stack and real commands; a declared command is unrun
   until executed. In a large repo, read the entry docs and their pointers
   first, then one area at a time, and tell the user which areas you have not
   read yet. Do not scan neighboring projects or credential files, and do not
   run installs, deployments or destructive commands.
2. **Audit.** Run the report phase of `joycraft-cleanup` (its steps 1–3:
   inventory, diagnose, report) on what you read. Change nothing yet; the
   findings feed the interview.
3. **Interview.** Ask only what the repository cannot tell you: purpose, users,
   who owns what, constraints, decisions already made and why, which docs are
   trusted, and each audit finding that needs a human. Ask in short rounds of
   at most three questions, each one that changes what you will write. A choice
   with options goes on the decision page ([artifacts.md](artifacts.md)); an
   open question stays in chat. Stop when the user says enough. Never ask again
   what the user answered or a home already states. Keep the user's words apart
   from your observations and assumptions. On a bare project, offer the
   [kickoff](#kickoff-for-a-new-project) instead.
4. **Propose.** Draft every change:
   - **Joycraft lines** in `AGENTS.md`, each only when missing:
     “First action in each session: run
     `node .joycraft/runtime/update-check.mjs check`. If it prints JSON, follow
     `.joycraft/references/update.md`.” and “Show every document a person must
     read, review or answer (a brief, plan, spec set, review or set of
     questions) as a rendered page, never only as Markdown in chat: use the
     decision artifact (`node .joycraft/runtime/artifacts/cli.mjs`, see
     `.joycraft/references/artifacts.md`) for a brief or questions, or an HTML
     page for any other document. Open it for the person and say where it is.”
   - **The map**: one `## Context Map` table (`| Document | Read when |`). One
     row per real home: each required or reference doc, and each home you
     create. A read-when names the work that needs the doc ("Changing how counts
     are stored"), not its topic. Add a row for
     `.joycraft/references/artifacts.md`, read when "showing a document or
     questions to a person". Historical docs get no row. In an existing map,
     append rows below the user's rows; never edit, reorder or reformat theirs.
     Every row targets a file that exists after the write.
   - **Homes**, only with content. An interview fact goes to the doc that owns
     its area; facts no doc owns go to `docs/context/project.md` (from
     `.joycraft/templates/project-context.md`), decisions with reasons and
     rejected options to `docs/context/decision-log.md`. Use the project's own
     context home when the map names one. No empty pages, no second copy of a
     fact a doc already states.
   - **`CLAUDE.md`**, only when `.joycraft/installation.json` lists the
     `claude` host: missing → create it as `@AGENTS.md` followed by an empty
     `## Claude Code` section; present without an `@AGENTS.md` line → add
     `@AGENTS.md` as line 1; present with it → leave it alone. When `AGENTS.md`
     already imports or defers to `CLAUDE.md`, add no reciprocal import.
   - **Audit fixes** the user agreed to, made as joycraft-cleanup step 4 says.

   Add lines, rows and pages. Do not reword, reformat, reorder or delete user
   content: every existing line of `AGENTS.md` and `CLAUDE.md` survives. With
   no `AGENTS.md`, create one with the purpose (or "unknown"), established
   constraints, commands with their source, the Joycraft lines and the map. Keep
   generic coding advice and tentative product ideas out; feature intent stays
   in its brief. Respect symlinks and managed files.
5. **Show, then write.** Render the diff of every file you would change or
   create as one HTML page under `.joycraft/local/setup/`. That folder is
   machine-local: give `.joycraft/local/` a `.gitignore` of `*` when it has
   none, so the page never becomes a project change. Open it, say
   where it is, and write only on the user's yes. A request that already
   approves the files you propose counts as the yes.
6. **Check.** `wiring.mjs` exits 0. `node .joycraft/runtime/cleanup.mjs`
   reports no `missing-path`, `unmapped`, `orphan` or `broken-link` for the
   files you touched. Every original line of `AGENTS.md` and `CLAUDE.md` is
   still there. Fix what fails, then tell the user in a few lines which docs the
   map now reaches, which homes you created and what you have not read or do
   not know yet. Continue the original request.

When the work exposes an unclear state, data, or responsibility boundary,
inspect the owner and its actual counterparts before recording guidance; read
`architecture.md` for that focused check. Do not create an architecture phase,
architecture-complete marker, or empty map during setup.

## Kickoff for a new project

A bare project has no source outside `docs/`, `README*`, `LICENSE*`, host entry
files and dotfiles. The founder's context is then only in their head, so on first
entry offer a kickoff in one line, before any brief or scaffold:

```sh
node .joycraft/runtime/kickoff.mjs detect --root .
```

Offer it only when `offer` is true; on an existing codebase run it only when the
user asks ("kickoff", "let me tell you about this project", `--requested`). The
user can decline; then continue as usual.

1. `kickoff.mjs start --root .` records what exists, so the check can prove what
   the kickoff changed.
2. Ask the user to talk freely; voice-to-text dumps are fine. Pipe each message,
   verbatim, to `kickoff.mjs note --root .`. It appends to
   `docs/context/kickoff-notes.md`, so nothing is lost to summarizing.
3. Decide which topics the dump answered and run
   `kickoff.mjs round --root . --answered <topics>`. Ask only the topics it
   returns (at most 3 a round), each as one short question that would change a
   decision. Pipe each answer to `note`. Repeat until `done`; pass `--enough`
   when the user says enough or wants to start right away.
4. Write the knowledge homes, following the rules above: `AGENTS.md` (purpose,
   established constraints, stack and commands marked `decided`, `proposed` or
   `not established`, context map), the `CLAUDE.md` pointer, `docs/context/project.md`
   from `.joycraft/templates/project-context.md`, and, when there is a
   decision, `docs/context/decision-log.md` from `templates/decisions.md`, with
   reasons and rejected options. Keep the user's words apart from assumptions.
   A stated stack preference stays `proposed` until the user confirms it.
5. Run `kickoff.mjs check --root .` and fix every problem it reports: no
   scaffold, manifest or source file; no empty file; no dangling link; every
   existing guidance line kept.
6. Show `kickoff.mjs summary --root .` and apply the user's corrections.
7. Then write the first brief for the first outcome, with its "Done when"
   settled. Choosing the stack and scaffolding the app are normal work after
   that: a brief, specs and review.

## Review loop tools

The review loop needs tools that can show the work: a browser for a web app, a
simulator or emulator for a mobile app, an HTTP check for an API. On first entry,
setup and every upgrade, run the read-only plan:

```sh
node .joycraft/runtime/review-tools.mjs plan --root . --host-tools <observed host tools>
```

Pass `--host-tools browser`, `simulator` or `computer-use` only for tools the
active host actually reports; they can stand in for a missing install. The plan
detects each package from its manifests, probes versions read-only, and prints
one table and at most one question. It never installs. When it prints
`Review loop unchanged.`, ask nothing.

Show the table and ask its one question. Only after the user's yes in this
conversation, run `review-tools.mjs install --root . --yes` (add
`--tools <ids>` for a per-tool choice); it adds project-local tools with the
project's own package manager and lockfile. Never run a system install, `sudo`,
a license acceptance or a sign-in: give the user the printed steps. Then record
the choice, with `--skip <ids>` for declined tools:

```sh
node .joycraft/runtime/review-tools.mjs record --root . --skip <ids>
```

This writes or replaces only the `## Review loop` section of `AGENTS.md`: each
tool, the command that starts the app and the command that takes the evidence.
Worker packets carry that section. For a skipped UI tool, say in one line that
its UI claims stay `UNVERIFIED`. With no network, the probes still run; offer
the install later. For a CI-only project, record the CI job as the evidence
source when the user picks it.

`review-tools.json` also lists `optIn` tools that detection never plans. Offer
one only when it fits the project. Example: Doc Detective, for docs that are
step-by-step procedures. Say what it does not cover and that it is AGPL-3.0 with a
large browser download, and install nothing without the user's yes. Record an
accepted opt-in tool in the `## Review loop` section by hand, with its evidence
command.

## Project-owned worktrees

For an observed Git project with a parallel-worker preference, keep bootstrap
guidance in the existing `docs/context/worktrees.md` home or another mapped
worktree/bootstrap home. If neither exists, setup may create
`docs/context/worktrees.md` and add one concise `AGENTS.md` context-map link.
Preserve an existing equivalent home and its conventions. Do not create a
worktree document for a non-Git or explicitly serial project, and do not use it
to turn setup into a questionnaire.

Create a worker worktree before setup. Its first action, before editing or UI
work, is to inspect the manifest, lockfile, and documented commands from inside
that new worktree. A manifest command or observed lockfile can identify an
appropriate dependency bootstrap such as `pnpm install --frozen-lockfile`, but
setup never runs it automatically. Run a dependency command only when the
current request authorizes it. Do not infer that a package manager, cache, port,
browser, or other host feature exists because another worktree had one.

Use a gitignored file only when its path appears in an explicit project
allowlist. Begin with an empty allowlist when no project policy exists. The
project owner may authorize copying an allowed path from the same project's
coordinator through native `.worktreeinclude` or an explicit manual equivalent.
Do not copy files by default, including secrets, credentials, browser profiles,
or host configuration.

Keep each worker's `node_modules`, build caches such as `.next`, runtime state,
development-server port, and browser session separate. An immutable
package-manager download/store cache may be shared when the project allows it.
Before concurrent workers use a scarce project resource, follow the project's
resource-lease convention and record the owner, resource, and release condition.
If no lease convention or isolated alternative exists, treat the shared resource
as unavailable until the project owner establishes one.

Do not silently write host configuration. Verify that the active host created an
isolated worktree from the intended base before worker start. In Claude Code,
the default base is its default branch; use an observed `worktree.baseRef: head`
policy or verify the captured current commit. A Claude `.worktreeinclude` copies
only matched gitignored files for native isolated workers; a `WorktreeCreate`
hook replaces creation and disables that automatic include. `CLAUDE_PROJECT_DIR`
is the original project while the event working directory is the active
worktree. On other hosts, use an observed native-isolation capability or an
explicit manual Git-worktree workflow.

## Knowledge grows with the work

Reuse existing documents for project facts. If none exists and there are durable
facts worth retaining, create `docs/context/project.md` with the known purpose,
users/stakeholders and constraints, their source, and any consequential unknowns.
Create its parent directory and link it from the context map. Omit empty sections
and private contact details that are unnecessary for the work. If nothing is
known yet, create only the instruction files; gather the first useful fact before
creating a context document. Do not manufacture a directory tree of empty files.

Create additional homes only when they have content. Which home holds which
kind of fact is in [knowledge guidance](knowledge.md). A current feature lives in
`docs/features/<slug>/brief.md` and its queue in `docs/features/<slug>/specs/`.

A project can move these folders, add an after-archive hook and map code to
context pages in an optional root `joycraft.yaml`. It is project-owned: create it
from `.joycraft/templates/joycraft.yaml` only when the user wants one of those
settings, and never overwrite it. `node .joycraft/runtime/config.mjs` prints the
settings in effect.

Only the context homes are current project knowledge. `docs/features/` is working
material: a brief or spec there can be out of date until the feature is archived,
and `docs/archive/` is history. Context retrieval and any project wiki or doc audit
should treat both as non-authoritative and must not link to them as current
truth. Joycraft ships no wiki; a project that keeps one keeps it in its own home
and links it from the context map.

The brief retains decision authority under `workflow.md`; the context document
and decision log must not become competing answer stores. Later accepted facts
update their existing home; [knowledge.md](knowledge.md) owns how each fact is
routed, changed in place and kept current. Repeating entry with no new knowledge should make
no setup edits, create no duplicate links, and ask no repeated questions. There
is no setup-complete sentinel: useful source content, not a flag, determines
whether context is available.

Outside setup's interview, ask only for missing human knowledge that materially
changes the next action. Prefer one short contextual question and continue
independent work while it is pending. Do not generate a questionnaire or start
building an imagined app.

Use the project’s existing interaction home for a choice. A question with
options goes in the decision artifact; only one quick yes/no or an open question
with no options stays in native chat. Retain a chat answer in the
owning brief and do not ask it again.

## Finish setup and continue

Step 6 of [Set up the context map](#set-up-the-context-map) is the finish
check; also check that command claims match their cited source. Setup does not approve hooks, change credentials, install
dependencies, or replace the user's workflow. Read `hooks-install.md` only when
hook activation is part of the requested setup.

## Upgrade and agent onboarding

Use `node scripts/export.mjs --target <project> --check --upgrade` to preview an
upgrade. It names only recognized old Joycraft files that would be replaced.
Applying without `--check` copies those replaced bytes to `.joycraft-backups/`
first and writes `.joycraft/installation.json`, whose hashes attest to
the actual installed skill, reference, and runtime bytes. A changed file absent
from the prior installation manifest remains a conflict; there is no blanket
force flag. The manifest is dispatch input, not proof that hooks ran or that a
review was independent.

For a new worker, copy the onboarding prompt from the setup preview. It directs
the worker to read existing project preferences before work, reuse explicit
model/effort/role/concurrency/verification choices, and inspect the host's
currently available planner, implementer, reviewer, testing, UI, and fixture
capabilities rather than claiming a hardcoded model is available. State
unavailable roles and native-hook checks plainly. Do not alter accepted queues,
decision state, user guidance, or credentials during setup or upgrade.
