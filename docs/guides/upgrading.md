# Upgrading Joycraft

> [Back to README](../../README.md)

## Upgrade

When Joycraft templates and skills evolve, update without losing your customizations:

```bash
npx joycraft upgrade
```

Joycraft tracks what it installed vs. what you've customized. Unmodified files update automatically. Customized files show a diff and ask before overwriting. Use `--yes` for CI.

`upgrade` only refreshes the harnesses you installed at init — a Codex-only project stays Codex-only and never grows a `.claude/` tree. (Projects from before harness selection existed have no recorded choice, so `upgrade` refreshes all available harnesses, preserving the old behavior.)

> **Note:** If you're upgrading from an early version, deprecated skill directories (e.g., `/joy`, `/joysmith`, `/tune`) are automatically removed during upgrade.

## What's new in 0.7 — the living harness

Through 0.6, Joycraft was excellent at *writing things down*: interviews became
briefs, briefs became specs, sessions ended with discoveries and decision-log
rows. What nothing enforced was whether any of it stayed **true** — specs could
quietly invent constraints, agents re-derived decisions the project had already
made, and the harness only ever grew. 0.7 closes that loop; the harness now
audits itself:

| | Before (≤0.6) | Now (0.7) |
|---|---|---|
| **Spec constraints** | Decompose could invent numbers/conventions that looked authoritative downstream | Every constraint carries a cite — `[src: D3]`, `[src: brief "Scope"]` — or is flagged `[src: INVENTED]` and stopped at a human gate; open decisions block decomposition entirely |
| **Design claims** | All claims read equally confident | Load-bearing claims are self-scored against fixed anchors (0/25/50/75/100); anything ≤50 is blocked from propagating until deepened or decided |
| **Prior knowledge** | Agents reasoned from scratch each phase | Research/design/decompose open with a bounded retrieval pass over `docs/context/` + `docs/discoveries/` and must cite what they reused |
| **Boundaries** | Prose rules an agent could drift past | `joycraft-harden` converts eligible rules into machine-checked deny patterns, stamped with provenance + a probation marker |
| **Harness growth** | Only ever grew | `joycraft-optimize` v2 assigns every control one of six dispositions (KEEP/ONE_HOME/LOAD_LATER/MAKE_A_CHECK/PROBATION/RETIRE); its Reaper deletes shipped feature folders only after the PR verifiably merged, and archive-moves abandoned ones |
| **Shipped features** | Folders sat forever; deleting lost the story | Session-end extracts a one-line ledger row to `docs/context/shipped.md` + marks the folder reap-eligible before the Reaper may touch it |
| **Skill surface** | All skills looked alike to discovery | Skills declare `entry: human \| agent \| situational` — human doors stay discoverable, internals get terse anti-discovery descriptions |
| **Trust** | The gates were assumed to work | Each gate was evaluated with N=3 fresh-context agent runs graded from tool-call timelines — one gate failed 2/3, got fixed, and re-passed 3/3 |

**Side effects to expect:** new files in your knowledge layer
(`docs/context/shipped.md`, `docs/context/anchors.md`,
`docs/reference/knowledge-lifecycle.md`), `(anchor: N)` annotations in design
artifacts, decompose refusing to run while a brief has an open decision, and
hardened rules being genuinely blocked at the hook layer — including for you.

As of **0.7.1 the full pilot ring ships in the npm package** — it piloted in
Joycraft's own repo first (the same discipline Joycraft asks of your projects)
and now needs real external projects to iterate against. The full
before/now/side-effects record is in [CHANGELOG.md](../../CHANGELOG.md).

## Upgrading to 0.7

From your project root:

```bash
npx joycraft@latest upgrade
```

What this does to an existing setup:

- **Your customizations survive.** Upgrade diffs every file it installed against
  what's on disk: unmodified files update silently, customized files show you
  the diff and ask. Nothing is overwritten without a yes (or `--yes` in CI).
- **State file moves.** `.claude/.joycraft/state.json` migrates to
  `docs/.joycraft/state.json` (gitignored, harness-neutral) automatically.
- **Session-end gains the extraction step.** The next time a feature finishes,
  it writes a `docs/context/shipped.md` ledger row and marks the brief
  `reap: eligible` — it never deletes anything.
- **Every skill gains `entry:` frontmatter** (human / agent / situational).
  Purely additive; invocation is unchanged.
- **Harness selection is honored.** A Codex-only project stays Codex-only.
- **The pilot ring arrives (0.7.1).** Two new skills (`joycraft-decide`,
  `joycraft-harden`), the retrieval pass, the decision gate + provenance-cited
  specs, confidence anchors, and optimize v2 with the Reaper. The gates you'll
  feel first: decompose blocks on open decisions, and invented spec premises
  stop at a human review before any spec file is written.
- **Gates get succinct (0.7.6).** Every approval bookend (brief, design,
  decompose, research, decide, plus the tune and optimize reports) renders an
  auto-opened HTML artifact and caps its chat message at ~10 fixed slots — the
  markdown stays the canonical record agents read. Handoffs become fenced,
  copy-pasteable briefing prompts. `upgrade` adds an `## Execution Profile`
  section to AGENTS.md (swarm opt-in + per-harness model/effort) that flows
  into those briefings. And a stale CLI now re-runs itself through
  `npx joycraft@<latest>` instead of telling you to update separately —
  upgrade is one command again.
- **The harness gets read evidence (0.7.11).** A new `npx joycraft telemetry`
  command scans Claude Code, Pi, and (best-effort) Codex transcripts into a
  gitignored `docs/.joycraft/telemetry.json` — paths and counters only.
  Session-end runs the scan; optimize's Reaper cites the counts instead of
  judging docs by feel. On upgrade, the architecture section of your
  AGENTS.md/CLAUDE.md is regenerated as a check-shaped folder map from the
  real tree (structure from the machine, your wording preserved; a project
  with no architecture section gets one appended), and tune diffs it for
  drift from then on. Discoveries older than 7 days are flagged as advisory
  stale. Nothing here touches your transcripts or commits them.

**Or let your agent drive it.** Paste this prompt into Claude Code, Codex, Pi,
or GitHub Copilot inside your project and it will run the upgrade, show you
what changed, and leave a reviewable commit:

```text
Upgrade Joycraft in this project to 0.7. Steps: (1) Create a branch
chore/joycraft-0.7. (2) Run `npx joycraft@latest upgrade` interactively —
when it shows a diff for a file I customized, summarize the diff for me in
one or two sentences and ask before accepting; never blanket-accept.
(3) After the upgrade, list every file it changed, added, or migrated
(including the docs/.joycraft/state.json move), and read CHANGELOG.md's
0.7.0 entry from the joycraft package to explain in plain terms what
changed about how my harness behaves — before vs. now, plus side effects
I should expect. (4) Confirm my harness selection and gitignore profile
were preserved, and that my CLAUDE.md/AGENTS.md customizations are intact.
(5) Run my project's test and typecheck commands to confirm nothing broke.
(6) Commit the result with message "chore: upgrade joycraft to 0.7" and
show me the diff stat — do not push or open a PR without asking.
```
