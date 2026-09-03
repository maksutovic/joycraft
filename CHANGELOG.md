# Changelog

Joycraft auto-publishes to npm on every merge to `main` (a patch bump if the
version wasn't changed manually), so many small versions exist between the
entries here. This file records the releases that changed how Joycraft *works*,
in a before → now → side-effects format, newest first.

---

## Unreleased — omp Support

Joycraft installed to four harnesses: Claude Code, Codex, Pi, and GitHub
Copilot. A developer working in omp got nothing from `npx joycraft init`. omp
(Oh My Pi, binary `omp`, npm package `@oh-my-pi/pi-coding-agent`) is a
Bun-based fork of Pi with its own config directory — it does not read the
`.pi/` tree at all, so a Pi install left it empty-handed.

**Now:** omp is a fifth first-class harness. `init` offers it in the harness
selection, skills generate into `.omp/skills/<name>/SKILL.md` in omp's own
invocation form (`/skill:joycraft-*`, `/new` to clear), `upgrade` manages that
tree, and the `private` gitignore profile scopes to `.omp/`. `joycraft
telemetry` reads omp session transcripts from
`~/.omp/agent/sessions/<encoded-cwd>/`, reusing the Pi JSONL parser, so omp
sessions count alongside Claude, Pi, and Codex. Every skill's harness blocks
were audited for omp rather than inherited from Pi: omp gets Pi's invocation
syntax but the no-headless-loop runtime text that Codex and Copilot carry.

**Side-effects:**

- **Existing installs gain omp on upgrade.** Projects whose state predates
  harness selection resolve to "all available" harnesses, which is now five
  rather than four. Such a project upgrading will find a new `.omp/skills/`
  tree. Remove it if unwanted; a recorded harness selection (any install from
  0.6.x forward) is unaffected.
- **The headless runtime did not ship.** omp gets skills, not Pi's
  `joycraft-implement-loop` pipeline, and no omp deny patterns from `harden` or
  `lockdown`. Both are captured at
  `docs/backlog/2026-09-02-omp-headless-runtime.md` and
  `docs/backlog/2026-09-02-cross-harness-deny-patterns.md`.

---

## 0.7.11 — Curated Harness (2026-09-03)

The knowledge layer had no read evidence: optimize's Reaper judged docs by
judgment alone, discoveries sat forever once written, the generated
CLAUDE.md/AGENTS.md carried a hand-maintained architecture tree that only
drifted, and fact capture routed to prose first.

**Now:** a `joycraft telemetry` subcommand scans Claude and Pi session
transcripts (and Codex best-effort, labeled `fidelity: "degraded"`) into a
gitignored, machine-local `docs/.joycraft/telemetry.json` — paths and counters
only, never transcript content. `session-end` runs the scan at wrap-up and
`optimize`'s Reaper cites the counts under pre-committed thresholds, with the
evidence vocabulary grown to exactly seven labels. Discoveries get a 7-day
advisory staleness rule, defined once in `knowledge-lifecycle.md` and invoked
by citation. `add-fact` rejects three decay categories up front and escalates
check-shaped facts to `harden` *before* doc classification. The generated
architecture section becomes a check-shaped folder map — regenerated from the
real tree at init/upgrade, drift-diffed by `tune` — and both generators can
emit an elicit-first `## Product Identity` section fed by `gather-context`.
`init` gains an interactive, guarded offer to set `autoMemoryEnabled: false`
in the project's `.claude/settings.json`, and `tune` raises a
graduate-then-archive auto-memory finding (always sparing `joycraft-owner.txt`).

Side-effects on upgrade: an existing folder-map block is regenerated in place
(structure from the machine, your wording preserved); a project with no
architecture section gets the map appended. All skill copies regenerated.

## 0.7.10 — Quiet the stale-CLI upgrade nudge (2026-08-11)

A stale cached CLI that re-exec'd `joycraft@latest upgrade` (the 0.7.x
self-update guard) still printed "Joycraft X available (you have Y)" from the
outer stale process after the delegated run finished — reading as if the
upgrade had failed.

**Now:** `upgrade()` reports when the stale-CLI guard handled the run, and the
CLI suppresses its post-command update nudge in that case. The guard's own
messages are unchanged; all other commands nudge as before.

## 0.7.9 — STE Human Output (2026-08-11)

The house style doc gave positive rules but no controlled language, so gate
prose still drifted into jargon and slop, and no mechanical check held the
shipped templates to their own contract.

**Now:** `docs/templates/reference/output-style.md` is rewritten as one
integrated Simplified Technical English (ASD-STE100, pragmatic mode) rule set —
11 rules merging the prior 8 with STE sentence mechanics, the doc itself
written in STE, governing all human-facing output (gate artifacts, PR bodies,
session-end summaries, interview playback, gate dialogue). Users get a manual
two-tier self-check (fix-to-zero on contractions, semicolons, banned modals,
Latin abbreviations, slop words; advisory on sentence length and synonym
rotation) — no script obligation. Maintainer-side, `scripts/ste-lint.py` is
vendored from SimpleEnglish `evals/ste_lint.py` at v1.2.0 (MIT, commit
`dfd0ca7`, retrieved 2026-08-11) — Python stdlib only, `--self-test` flag, ten
comparative violation classes, not a compliance verdict — and
`tests/ste-lint.test.ts` holds this repo's shipped template prose to zero
fix-to-zero violations (skipping legibly without python3). The interview
playback gate regains its one-line style citation (D6).

**Side effects:** this is the repo's first vendored code, so the file carries
an SPDX + upstream + retrieval-date header and the rule that fixes go upstream
rather than into the copy. The script is maintainer tooling only — `scripts/`
is absent from package.json `files`, so it reaches no npm consumer or
scaffolded project, and no dependency was added. Gate-contract group 7 now
permits a tone-only citation under the playback heading.

## 0.7.8 — Team-Ready Gates (2026-07-31)

The gates became the team surface: PRDs drafted across many projects, shared
into Notion, answered by people who aren't in the session, and handed to an
engineer with a paste-ready prompt. Six things stood in the way — the question
picker appeared only intermittently, a question could only be answered or
parked, output structure was fixed, the agent prompt was hand-built per PRD,
stale gate tabs were indistinguishable, and auto-open was forced on.

**Now:** every gate question routes through the harness-native question UI
(AskUserQuestion on claude; structured chat on codex/pi/copilot) with ≥2 real
options and Pattern B rationale. "Defer to <name>" is a first-class answer:
questions terminate `assigned`, the artifact ends with an "Open Questions —
Assigned" section, and the gate HTML tags the assignee on the existing
question cards. A team's own PRD template dropped into `docs/templates/output/`
shapes brief output (exact filename match, machine-required sections always
appended). Briefs end with a fenced "Prompt for the implementing agent"
briefing block. Every render carries a timestamp + revision stamp in the
existing slots (revision read from the previous footer — no new state), and
auto-open persists as `autoOpen` in `docs/.joycraft/state.json` (unknown keys
now survive state rewrites; tune offers the toggle). Tune's execution-profile
offer asks model and effort as their own enumerated questions — the bundled
prose block that silently dropped them is gone, and the CLI's interview no
longer hangs when stdin ends mid-offer.

**Side effects:** `REVIEW_GATE_TEMPLATE.html` now actually ships to
`docs/templates/` (the path the skills always cited); the README is
install-first with a TOC and a thin `SECURITY.md` points at the harness
vendors' security docs.

## 0.7.7 — Interview Joins the Gate Set (2026-07-29)

Succinct Gates (0.7.6) covered seven approval bookends but skipped
`/joycraft-interview`, the skill most sessions start with. A same-day field
test showed the cost: the human had to ask "where's my artifact?", the draft
brief's content crossed the chat three times (playback wall, file, recap),
and the confirmation gate self-approved — playback and file-write landed in
the same turn.

**Now:** interview is the eighth gate skill. The draft brief renders as an
auto-opened `brief.html` from the shared `REVIEW_GATE_TEMPLATE.html` (open
questions as cards; the markdown stays the canonical agent-readable record),
the post-write chat is the ~10-line slot template with an explicit "the
artifact is the summary" rule, the playback is a fixed four-slot shape that
blocks the file write until the human confirms or corrects, and questions are
numbered for the session — referenced by number afterward, never re-listed.
There is deliberately no per-turn question cap: the field failure was
repetition, not batching.

**Side effect:** an adversarial review panel drove the changes and its
refuted over-corrections are recorded as MUST NOTs in the two follow-on specs
under `docs/features/2026-07-29-succinct-gates/specs/`, so future edits don't
resurrect one-question-per-turn serialization or a ban on invited pushback.

## 0.7.6 — Succinct Gates + One-Command Upgrade (2026-07-29)

Every approval bookend (new-feature, design, decompose, research, decide, plus
the tune and optimize reports) delivered its content as chat prose of whatever
length the agent felt like; the 0.7.2 pointer mechanism meant to cap it failed
live on 2026-07-29. And `npx joycraft upgrade` on a stale npx cache detected
its own staleness and bailed with a two-step "npm install -g, then re-run"
instruction.

**Now:** gates render an auto-opened HTML artifact from one generic
`REVIEW_GATE_TEMPLATE.html` (the markdown stays the canonical agent-readable
record), chat messages are capped by a fixed ~10-line slot template inline in
each skill, decide fires before presentation, handoffs are fenced briefing
prompts, and an `## Execution Profile` section in AGENTS.md (captured at init,
inserted by upgrade, offered by tune) flows into those briefings as an
`Execution:` line that implement-feature maps onto subagent model/effort. All
of it is enforced by `tests/gate-contract.test.ts`.

**Side effect:** a stale CLI now re-executes the upgrade through the pinned
latest version via npx (with `--yes` or an interactive confirmation), so
upgrade is one command again; the fallback message recommends
`npx joycraft@latest upgrade`, which bypasses the npx cache that caused the
staleness in the first place.

## 0.7.5 — GitHub Copilot Support (2026-07-27)

Joycraft installed to three harnesses: Claude Code, Codex, and Pi. A maintainer
or user on GitHub Copilot had nothing to install.

**Now:** Copilot is a fourth first-class harness. `init` offers it in the
harness selection, skills generate into `.github/skills/<name>/SKILL.md`, and
the `private` gitignore profile scopes to `.github/skills/joycraft-*/` rather
than `.github/` — Actions workflows and issue templates stay tracked.

The harness plumbing came from a community contribution
([#61](https://github.com/maksutovic/joycraft/pull/61), thanks
[@admhn](https://github.com/admhn)), which also carried two harness-agnostic
Windows fixes: the template engine now normalizes CRLF before parsing, and the
generator writes native line endings so regenerated files stop showing as
spuriously modified on Windows checkouts. Both benefit Claude, Codex, and Pi
equally.

**Also fixed — `joycraft-optimize` audited the wrong directories.** It
hardcoded a "Claude Code Path" globbing `.claude/skills/**` and a "Codex Path"
globbing `.agents/skills/**`, with no harness conditional. Pi shipped those
wrong paths since Pi support landed; Copilot inherited them. The failure was
quiet rather than loud — the audit globbed a directory the project didn't have,
found nothing, and reported clean. It now resolves per harness, and the plugin,
MCP, and hook steps carry real per-harness branches.

**Side-effects:**

- **Existing installs gain Copilot on upgrade.** Projects whose state predates
  harness selection resolve to "all available" harnesses, which is now four
  rather than three. A Claude-only project upgrading will find a new
  `.github/skills/` tree. Remove it if unwanted; a recorded harness selection
  (any install from 0.6.x forward) is unaffected.
- Twelve Copilot skills shipped stale in 0.7.3 — generated before 0.7.2's
  output-style pointers landed, and merged without a textual conflict. Fixed in
  0.7.4. If you installed Copilot skills from 0.7.3, run `npx joycraft upgrade`.

---

## 0.7.2 — Human-Readable Output Style (2026-07-27)

Skills produced correct output that read like machine transcripts — dense
tables, status glyphs, and enumerated findings where prose would communicate
better.

**Now:** a shared style contract lives at
`docs/templates/reference/output-style.md`, and twelve skills point at it
rather than restating terseness rules inline. The reference is the one home for
the guidance; skills cite it.

**Side-effects:** the scenarios starter ships as
`example-scenario.test.ts.template` rather than `.test.ts`, so it stays out of
your main project's test, lint, and build globs when scaffolded. Rename it on
first use.

---

## 0.7.1 — Pilot Ring Graduates (2026-07-23)

0.7.0 split the release into a product ring (shipped) and a pilot ring (Joycraft's
own repo only). 0.7.1 graduates the entire pilot ring into the npm package — the
pilot needs real external projects to iterate against, and the only way to learn
what helps is to ship it.

**Now shipped (previously pilot-only):**

- **Two new skills.** `joycraft-decide` — the deposition checkpoint at the design
  bookend: open questions become a decision dossier, the human answers
  forced-choice questions with typed rationale, and every decision terminates
  clarified / backlogged / discarded. `joycraft-harden` — converts eligible
  prose boundaries into machine-checked deny patterns with your approval on an
  exact diff, stamping provenance + a probation marker.
- **Retrieve before you reason.** Research, design, and decompose open with a
  bounded grep pass (3–6 terms, ≤5 files) over your knowledge layer and must
  cite what they reused ("Prior knowledge reused: …") or state that nothing
  relevant exists. Contradictions between a brief and a recorded decision are
  surfaced, never silently resolved.
- **Decision gate + provenance-cited specs.** Decompose refuses to run while a
  brief has an unresolved `status: open` decision, and every constraint /
  acceptance criterion in a generated spec carries a cite (`[src: D3]`,
  `[src: design §2]`, `[src: brief "Scope"]`) or is stopped at the INVENTED
  review gate before any spec file is written.
- **Confidence anchors.** Design and new-feature self-score load-bearing claims
  against a fixed anchor set (0/25/50/75/100); decide audits the scores and
  blocks any load-bearing claim at ≤50 from propagating. The anchor definitions
  ship as `docs/templates/context/anchors.md` — skills seed
  `docs/context/anchors.md` from it on first use.
- **`joycraft-optimize` v2 + the Reaper.** The overhead audit became a semantic
  self-audit: every control gets one of six dispositions (KEEP / ONE_HOME /
  LOAD_LATER / MAKE_A_CHECK / PROBATION / RETIRE) with an honest evidence
  label, advisory only. Its Reaper pass is the single place feature folders
  die: shipped folders are deleted only after `gh` confirms the PR merged
  (ledger row + reap marker + merge = three legs), undead drafts are
  archive-moved to `docs/archive/features/`, never deleted — all per-run
  human-approved.
- **Verifier oracle widening.** `joycraft-verify` now gathers the brief's Hard
  Constraints, its stamped `decisions:`, and your project boundaries alongside
  the spec, and reports spec-vs-brief drift as a distinct finding instead of
  rubber-stamping the spec as the oracle.
- **One home per fact.** Add-fact runs an overlap grep before writing;
  time-ordered docs (decision log, shipped ledger) are newest-first,
  prepend-only, with a 200-line budget and a rotation procedure — shipped as
  `docs/templates/reference/knowledge-lifecycle.md`.
- **Full `entry:` taxonomy.** Every skill now declares
  `entry: human | agent | situational`; internal skills carry terse
  "invoked by X" descriptions so they stop being auto-invoked by accident.
- **Referenced docs now actually ship.** `docs/templates/reference/spec-status-lifecycle.md`
  (referenced by shipped skills since 0.7.0) and
  `docs/templates/DECISION_DOSSIER_TEMPLATE.html` (decide's locked dossier
  skeleton) are in the package.

*Side effects:* upgrade adds the two new skills and four new template files;
skills you customized prompt before overwrite as usual. The graduated gates are
new behavior — decompose blocking on open decisions and the INVENTED review are
the two you'll feel first.

## 0.7.0 — The Living Harness (2026-07-21)

0.6 made the workflow excellent at writing things down. 0.7 makes the harness
**accountable for what it wrote down**: every claim an agent propagates now has
a source, a confidence score, or a machine check behind it — and the harness
audits, prunes, and hardens itself instead of only growing.

This release lands in two rings. The **product ring** ships in the npm package
today. The **pilot ring** runs in Joycraft's own repo harness first (marked
with `PILOT` comments) and graduates into the package once it survives real
use — the same discipline Joycraft asks of your projects.

**To upgrade:** `npx joycraft@latest upgrade` — or hand your agent the
ready-made upgrade prompt in the README's
[Upgrading to 0.7](README.md#upgrading-to-07) section, which walks any harness
(Claude Code, Codex, Pi) through upgrading, explaining the diffs, and leaving a
reviewable commit.

### Shipped in the npm package

**Session-end now extracts before you delete.**
- *Before:* `joycraft-session-end` consolidated discoveries, validated,
  graduated specs, and pushed — but a shipped feature's folder just sat there
  forever, and deleting it meant losing the story.
- *Now:* when a feature reaches `done`, session-end runs an extraction step: it
  prepends a one-line row to a `docs/context/shipped.md` ledger (what/where/PR/
  who), verifies the feature's decisions actually landed in the decision log,
  and stamps the brief `reap: eligible`. Deletion itself is reserved for a
  separate Reaper pass that first confirms via `gh` that the PR really merged.
- *Side effects:* a new `docs/context/shipped.md` file appears in your knowledge
  layer; brief frontmatter gains a `reap:` key. Session-end never deletes
  anything itself — if you don't run the Reaper, the only change is the marker.

**Skills declare what kind of door they are.**
- *Before:* all skills looked alike; agents (and humans) had no signal for
  which skills are entry points versus internal machinery, and skill
  descriptions competed for the same always-loaded context budget.
- *Now:* skills carry `entry: human | agent | situational` frontmatter
  (shipping first on decompose, implement, spec-done, and session-end; the full
  set follows the pilot). Human doors keep rich, discoverable descriptions;
  internals get terse "invoked by X" descriptions so they stop being
  auto-invoked by accident.
- *Side effects:* internal skills become less visible in skill listings — by
  design. If you invoked an internal skill directly by habit, it still works;
  it just no longer advertises itself.

**Docs layout and state file.**
- *Before (≤0.6.x):* upgrade state lived at `.claude/.joycraft/state.json`.
- *Now:* state lives harness-neutrally at `docs/.joycraft/state.json`
  (gitignored), beside a committed `docs/.joycraft/config.json` (piloted) for
  shared harness configuration.
- *Side effects:* upgrade migrates the state file automatically; nothing to do.

### Piloted in the Joycraft repo (graduates after pilot survival)

**Half A — kill silent variance before it propagates:**

- **Retrieve before you reason.** Research, design, and decompose open with a
  bounded grep pass (3–6 terms, ≤5 files) over your knowledge layer and must
  cite what they reused — "Prior knowledge reused: …" — or state that nothing
  relevant exists. *Before:* agents re-derived (or contradicted) decisions your
  project had already made. *Side effect:* contradictions between a brief and a
  recorded decision are surfaced to you instead of silently resolved.
- **Provenance-cited specs.** Every constraint and acceptance criterion in a
  decomposed spec carries a cite — `[src: D3]`, `[src: design §2]`,
  `[src: brief "Scope"]` — or is flagged `[src: INVENTED]` and stopped at a
  human review gate before any spec file is written. *Before:* decompose could
  quietly invent numbers and conventions that looked authoritative by the time
  they reached implementation. *Side effect:* decompose refuses to run while a
  brief has an unresolved `status: open` decision.
- **Confidence anchors.** Design and new-feature self-score load-bearing claims
  against a fixed anchor set (0/25/50/75/100 defined in
  `docs/context/anchors.md`); decide audits the scores and blocks any
  load-bearing claim at ≤50 from propagating — deepen it or turn it into a
  dossier question. *Side effect:* design artifacts sprout `(anchor: N)`
  annotations; the deposition step gets slightly longer and much more honest.
- **One home per fact.** New skills and docs run an overlap grep before writing;
  time-ordered context docs (decision log, shipped ledger) are newest-first,
  prepend-only, with a 200-line budget and a defined rotation procedure
  (`docs/reference/knowledge-lifecycle.md`).

**Half B — keep the installed harness true:**

- **`joycraft-harden`** (new, agent-invoked): converts eligible prose
  boundaries ("NEVER push to main") into machine-checked deny patterns, with
  your approval on an exact diff, and stamps each converted rule with
  provenance + a probation marker naming the model that hardened it. *Before:*
  boundaries were prose an agent could drift past. *Side effect:* converted
  rules are actually blocked at the hook layer — including for you.
- **`joycraft-optimize` v2 + the Reaper**: the overhead audit became a semantic
  self-audit — every control (rule, skill, hook, permission) gets one of six
  dispositions (KEEP / ONE_HOME / LOAD_LATER / MAKE_A_CHECK / PROBATION /
  RETIRE) with an honest evidence label, advisory only. Its Reaper pass is the
  single place folders die: shipped feature folders are deleted only after
  `gh` confirms the PR merged (ledger row + reap marker + merge = three legs),
  and undead drafts are archive-moved to `docs/archive/features/`, never
  deleted. *Before:* nothing ever got smaller. *Side effect:* deletion commits
  ride the next feature branch, so they still pass through PR review.
- **Gate evals.** The three new gates were evaluated with N=3 fresh-context
  subagent runs each, graded from tool-call timelines rather than self-report.
  Results: decompose refusal 3/3, INVENTED flagging 3/3, session-end extraction
  3/3, optimize table 1/3 → a real vocabulary gap was found in the skill, fixed,
  and re-run to 3/3. The eval fixtures and results live in
  `docs/features/2026-07-21-living-harness/`.

### Under the hood

- Skill sources were consolidated: `src/skills/*.md` is the single canonical
  source; `src/claude-skills/`, `src/codex-skills/`, and `src/pi-skills/` are
  generated per-harness variants. (Contributors: never edit the generated
  dirs — see AGENTS.md.)

## 0.6.x highlights (2026-06 → 2026-07)

- **Per-feature docs layout** (0.6.0): `docs/features/<slug>/{brief, research,
  design, specs/}` replaced the flat `docs/briefs|research|designs|specs`
  layout; upgrade migrates automatically.
- **Harness selection** at init: choose any combination of Claude Code, Codex,
  and Pi; single-harness installs carry no footprint from the others.
- **Headless Pi pipeline**: `joycraft-implement-loop` runs a whole spec queue
  as one fresh `pi -p` process per spec — fail-fast, session-end once.
- **`/joycraft-implement-feature`** for Claude Code: one invocation runs the
  whole queue in-session; the `todo → in-review → done` spec lifecycle with a
  light per-spec `joycraft-spec-done` and session-end as the single
  validation/push/PR gate.
- **AGENTS.md as the shared instruction file**: multi-tool installs write
  CLAUDE.md as an `@AGENTS.md` import so nothing drifts.
- **Gitignore profiles** (`--gitignore=shared|private`) and
  `.gitattributes` `linguist-generated` marking so PRs collapse workflow
  exhaust and show reviewers only code + durable knowledge.
