# Changelog

Joycraft auto-publishes to npm on every merge to `main` (a patch bump if the
version wasn't changed manually), so many small versions exist between the
entries here. This file records the releases that changed how Joycraft *works*,
in a before → now → side-effects format, newest first.

---

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
