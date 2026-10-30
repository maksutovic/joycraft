# First-use project setup

Use this on first entry, an explicit setup/init request, or a missing context
home. It is an agent-guided part of `joycraft-entry`, not an installer side
effect or a separate interview; the one exception is the opt-in
[kickoff for a new project](#kickoff-for-a-new-project). Work inside the current project. Read-only
requests do not authorize setup writes.

For a reviewed clone, `node scripts/setup.mjs --target <project>` previews the
smallest missing knowledge homes. Add `--write` only after reviewing the preview.
It reads only plain target-local repository facts; it never reads `.env.local`,
Keychain, sibling projects, or private directories. Its `ready` and `partial`
status describes context discovery, never hook trust or a successful command.

## Contents

- [Discover before writing](#discover-before-writing)
- [Small shared entry point](#small-shared-entry-point)
- [Kickoff for a new project](#kickoff-for-a-new-project)
- [Review loop tools](#review-loop-tools)
- [Project-owned worktrees](#project-owned-worktrees)
- [Knowledge grows with the work](#knowledge-grows-with-the-work)
- [Finish setup and continue](#finish-setup-and-continue)
- [Upgrade and agent onboarding](#upgrade-and-agent-onboarding)

## Discover before writing

Read applicable instructions, root `AGENTS.md` and `CLAUDE.md` if present, README,
and the relevant existing context links. Inspect manifests, lockfiles, task
scripts and CI only as needed to establish the stack and actual commands. Follow
the project's documentation conventions instead of migrating them into ours.
Do not scan neighboring projects or credential files. Do not run installs,
deployments, destructive commands, or application setup just to populate a table.

Use the current conversation for intended users, purpose, stakeholders and
constraints. Separate user-stated intent from repository observations and your
assumptions. A declared command is not a verified successful command: cite its
manifest/script source and mark it unrun until actually executed. On a bare
project, say the stack and commands are not established; do not choose them for
the sake of setup. Offer the kickoff below instead.

When the current authorized work exposes an unclear state, data, or
responsibility boundary, inspect the relevant owner and its actual counterparts
before recording guidance. Preserve source-backed navigation in the existing
context map or reference home; keep product behavior in the current brief. Read
`architecture.md` for this focused, conditional discovery. Do not create an
architecture phase, architecture-complete marker, or empty map during setup.

## Small shared entry point

If `AGENTS.md` is missing, create a concise project-specific file with:

- Project purpose supported by the request or repository; if unknown, say so.
- Existing commands, their source and execution status, when available.
- Only established project constraints, preserving their scope.
- A context map with project-relative links and a short “read when” for each.

Do not copy prototype-maintainer rules or fill it with generic coding advice.
Link detail rather than duplicating it. Do not encode a tentative product idea
as a permanent boundary. Keep current feature intent in its brief.

If `AGENTS.md` already exists, preserve its content and add only missing facts
and useful context pointers with a targeted edit. Reuse an existing context map
rather than adding another. Read linked content before deciding it is missing.
When its map names a project-context home, use that exact project-relative home;
use `docs/context/project.md` only when no context home exists. Do not link a
context document that setup did not create or find. This keeps a bare project
free of dangling links.
Do not reformat, delete, or replace user instructions. Surface consequential
contradictions rather than silently resolving them. Respect symlinks and managed
files; do not replace them or write outside the project through them.

For a missing `CLAUDE.md`, create a thin pointer after `AGENTS.md` exists:

```md
@AGENTS.md
```

For an existing `CLAUDE.md`, preserve all guidance. Add the import only if there
is no equivalent link and it would not create a reference cycle. If CLAUDE.md is
already the shared authority, keep it there and let the new AGENTS.md point to
it; do not create reciprocal imports or duplicate its rules. This shared context
pointer does not itself install skills or hooks; the exporter must use
`--harness claude` to place those in Claude discovery paths.

Before assigning workers, read an existing `.joycraft/preferences.json`. Reuse
explicit model, effort, role, concurrency, and verification choices. Then inspect
the active host for the actual planner, implementer, reviewer, testing, UI, and
fixture capabilities. Generated defaults and an `unknown` fixture status do not
prove capability. Until actual isolation is established, use at most four workers
and one UI worker. Relevant acceptance requires both an inspected rendered UI
and independent review; if one is unavailable, hold only the claim it would
support. Ask one short combined question only when a consequential choice remains
after that inspection.

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

Create additional homes only when they have content:

| Content | Default home when no existing convention applies |
|---|---|
| Durable project knowledge | `docs/context/project.md` or a focused reference linked by the map |
| Source-backed cross-boundary navigation | The existing context map or a focused reference linked by it |
| Reusable decision rationale | `docs/context/decision-log.md`, linking to the owning decision |
| Current feature or mixed change | `docs/features/<slug>/brief.md` |
| Authorized implementation queue | `docs/features/<slug>/specs/` |

The brief retains decision authority under `workflow.md`; the context document
and decision log must not become competing answer stores. Later accepted facts
update their existing home. Repeating entry with no new knowledge should make
no setup edits, create no duplicate links, and ask no repeated questions. There
is no setup-complete sentinel: useful source content, not a flag, determines
whether context is available.

Ask only for missing human knowledge that materially changes the next action.
Prefer one short contextual question and continue independent work while it is
pending. An explicit setup-only request with no product context may end with that
question or the kickoff offer; do not generate a questionnaire or start building
an imagined app.

Use the project’s existing interaction home for a choice. A question with
options goes in the decision artifact; only one quick yes/no or an open question
with no options stays in native chat. Retain a chat answer in the
owning brief and do not ask it again.

## Finish setup and continue

Check that newly added links resolve, command claims match their cited source,
and existing guidance survived the diff. Briefly tell the user which knowledge
homes were created or extended and any important unknown; then continue the
original request. Setup does not approve hooks, change credentials, install
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
