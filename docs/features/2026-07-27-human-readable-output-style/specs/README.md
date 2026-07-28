# Human-Readable Output Style — Feature Specs

> **Parent Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md`
> **Design:** `docs/features/2026-07-27-human-readable-output-style/design.md`
> **Dossier:** `docs/features/2026-07-27-human-readable-output-style/dossier.html`
> **Research:** `docs/research/2026-07-27-human-readable-output-style.md` (structure)
> **Research:** `docs/research/2026-07-27-prose-style-techniques.md` (sentence-level prose)
> **Status:** Decomposed 2026-07-27, ready for implementation

## What this feature does

Joycraft's human-facing output moments — assessment reports, handoffs, design
presentations, decomposition tables, dossiers — get one short, explicit style
contract. The rules live in a single bundled reference doc that ships to user
projects, and eleven skills cite it by path at the moment they produce output.
Agent-facing artifacts (specs, queue JSON, frontmatter, knowledge-layer rows,
deny patterns) are explicitly exempt and stay dense. The scarce resource is the
human channel; it should carry decisions, not acknowledgments.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [write-output-style-reference.md](write-output-style-reference.md) | — | checkpoint | Author `src/templates/reference/output-style.md`: 6–10 positively-framed rules, each with motivation, plus a worked before/after example. |
| 2 | [test-output-style-template.md](test-output-style-template.md) | 1 | batch | Assert the doc's existence, rule count, worked example, shape, relative paths, and bundle key. |
| 3 | [add-style-pointers-to-skills.md](add-style-pointers-to-skills.md) | 1 | isolated | Add a one-line style-doc citation to eleven skills' output moments, clear of the position-fragile test windows. |
| 4 | [test-style-pointer-presence.md](test-style-pointer-presence.md) | 3 | batch | Presence-only assertion that all eleven skills cite the doc and `joycraft-setup` does not. |
| 5 | [document-repo-local-style-guidance.md](document-repo-local-style-guidance.md) | 1 | batch | Add the repo-only path-asymmetry note to `docs/reference/skill-authoring.md`. |
| 6 | [regenerate-bundles-and-sync-installed.md](regenerate-bundles-and-sync-installed.md) | 2, 3, 4, 5 | checkpoint | Run the generator, refresh all three harness trees + `bundled-files.ts`, sync installed copies to byte-match. |

## Execution waves

- **Wave 1: spec 1** — sequential (everything depends on the doc existing).
- **Wave 2: specs 2, 3, 5** — parallel-safe (Affected Files disjoint: spec 2 creates `tests/output-style-template.test.ts`, spec 3 edits eleven files under `src/skills/`, spec 5 edits `docs/reference/skill-authoring.md`).
- **Wave 3: spec 4** — sequential (depends on 3).
- **Wave 4: spec 6** — sequential, terminal. NOT parallel-safe with anything: it regenerates output derived from every preceding spec's files.

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

**Caveat on wave 2.** The three specs touch disjoint files, but spec 3 is marked
`isolated` because of its risk profile, not its file overlap — eleven skill
bodies edited near position-fragile 1500-char test windows. If you run wave 2
concurrently, spec 3 should still get its own context.

## Known hazard: the windowed tests

`tests/retrieval-pass-skill.test.ts` slices a 1500-char window from the
`Retrieve Before You Reason` heading in `joycraft-research`, `joycraft-design`,
and `joycraft-decompose`. `tests/confidence-scoring-skill.test.ts` slices between
fences from `Use this structure for each spec body:` in `joycraft-design` and
`joycraft-new-feature`, and bans the word `percentage` file-wide in
`joycraft-design`, `joycraft-new-feature`, and `joycraft-decide`.

Both suites read the **installed** copies at `.claude/skills/<name>/SKILL.md`.
They stay green during spec 3 because those copies are stale — the pointer edits
only reach them in spec 6. **A placement mistake made in spec 3 surfaces in spec
6.** When it does, fix the placement in `src/skills/` and regenerate; never widen
a window or edit an assertion.

## Decisions stamped during decomposition

Two questions that reached decompose as `INVENTED` premises were terminated and
recorded in the brief's `decisions:` block:

- **D6** — the style doc must carry at least one worked before/after example.
- **D7** — eleven skills carry the pointer; only `joycraft-setup` is excluded.
  This resolves the previously-backlogged D4. The rationale: the artifact
  decides, not the door — `optimize`, `verify`, and `decide` are `entry: agent`
  but emit heavily human-read reports and dossiers.

Still open and deliberately not resolved here: **D3**'s presence-vs-ordering half
(settled as presence-only for these specs, unstamped) and **D5** (consolidating
the four scattered terseness directives, deferred to an `optimize` ONE_HOME
pass). Both tracked in
`docs/backlog/2026-07-27-output-style-deferred-decisions.md`.

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-07-27-human-readable-output-style/` —
it executes the specs in wave order (parallel-safe waves may run as concurrent
subagents; everything else runs sequentially in the driving conversation) and
finishes with session-end. Or run one spec at a time with
`/joycraft-implement docs/features/2026-07-27-human-readable-output-style/specs/write-output-style-reference.md`;
the implement skill reads this README first so it understands the spec's position
in the wave plan, and continues through the queue itself. Each spec is
self-contained for the actual implementation; this README provides ordering
context only.
