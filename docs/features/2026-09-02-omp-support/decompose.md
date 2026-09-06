# omp Support — Decomposition

> **Feature Brief:** `docs/features/2026-09-02-omp-support/brief.md`
> **Decomposed:** 2026-09-03 · revision 1
> **Decision gate:** PASS — D1–D9 all terminated (D3 backlogged, D7 clarified). Zero `open`.

---

## Prior knowledge reused

Retrieval terms: `omp`, `copilot`, `harness`, `telemetry`, `gitignore`.

| Source | Row / heading | What it constrains |
|---|---|---|
| `docs/context/decision-log.md` | 2026-06-15 — "`init` offers interactive harness multi-select; state relocated to `docs/.joycraft/state.json`; harness selection persisted so `upgrade` honors it" | Names the exact migration hazard this feature re-triggers: the persisted `harnesses` list plus `sanitizeHarnesses` fallback need attention whenever a harness is added. This is D5's mechanism — spec 2 owns it. |
| `docs/context/decision-log.md` | 2026-09-01 — "Curated-harness D3: telemetry scanner ships as a pure TS module in `src/` + a `joycraft telemetry` CLI subcommand" | Fixes spec 4's shape: a pure TS module with a default-dir function and an injectable override, not skill prose. Confirms the `defaultOmpTranscriptDir` + `ompDir?` option pattern. |
| `docs/context/decision-log.md` | 2026-07-31 — "Team-ready-gates D1: every gate question routes through the harness-native question UI — AskUserQuestion on claude, structured chat fallback on codex/pi/copilot" | The live contract `tests/gate-contract.test.ts` asserts. omp joins the fallback side, which is why spec 3 must extend that test's harness loop rather than only editing skills. Matches the brief's "NOT: omp's `ask` tool" scope line. |
| `docs/context/decision-log.md` | 2026-07-31 — "Team-ready-gates D8: Cursor skill discovery — backlogged" | Precedent that a new-harness question terminates as a backlog entry, not scope creep. The same disposal already applied to D1/D3 here (both backlog files exist on disk). |
| `docs/discoveries/2026-06-15-harness-selection-state-move.md` | whole file | The prior harness-addition session's surprises; read for spec 2's init/upgrade gates. |

Truncation: the `omp` grep matched on the substring inside unrelated words (`comp*`, `omp` in "component"), so those hits were discarded as noise rather than read. Read 5 files, at the cap.

**Contradictions:** none. No retrieved decision opposes the brief's direction.

---

## Constraint provenance

**All constraints traced — zero INVENTED.**

Every Constraint and Acceptance Criterion across the five specs cites `[src: D<n>]`, `[src: brief "<section>"]`, or `[src: AGENTS.md]`. The brief's Hard Constraints section is unusually complete — it already enumerates the enum, the transform row, the generator wiring, the `multiTool` expression, the flat-discovery rule, the non-empty `description` rule, and the full test list — so each spec's constraints are copied down from a stamped source rather than invented at decomposition time.

Two constraints deserve a note on where they trace, because they are the ones that would otherwise look invented:

- **"regenerate and sync in the same commit"** on specs 1 and 3 — `[src: AGENTS.md]`, the ALWAYS rule (`pnpm sync-skills` after editing `src/skills/`, commit regenerated + installed copies together). It is also a decompose-skill protocol rule: derived-artifact sync is never deferred to a terminal spec, because each intermediate commit would otherwise be red. Spec 5 is therefore scoped as docs only, **not** as the owner of the sync.
- **"omp inherits nothing until each block names it"** on spec 3 — `[src: brief "Hazards carried into the specs"]`, which states harness blocks are allow-lists verbatim.

---

## Specs

| # | Spec Name | Description | Depends On | Size | Mode |
|---|-----------|-------------|------------|------|------|
| 1 | `add-omp-harness-core` | Add `omp` to the harness enum, labels, transform table, and generator so `src/omp-skills/` and `OMP_SKILLS` exist and `sync-skills` fills `.omp/skills` in this repo. | — | M | checkpoint |
| 2 | `wire-omp-init-upgrade` | Install `.omp/skills` at init with hash recording, include omp in `multiTool`, manage the tree in upgrade, add `.omp/` to the private gitignore profile, print omp in the summary. | 1 | M | checkpoint |
| 3 | `audit-harness-blocks-for-omp` | Apply the D9 rule to all 68 `<!-- harness:… -->` blocks across the 22 skills, fix the optimize MCP path row, add the omp parity test, update the two gate-contract tests. | 1 | M | isolated |
| 4 | `add-omp-telemetry-scanner` | Add the omp transcript dir default, reuse the Pi line parser, thread the dir through `telemetry-store.ts`, cover with tests. | — | S | batch |
| 5 | `document-omp-support` | README harness list, AGENTS.md architecture row for `src/omp-skills/`, CHANGELOG entry with the D5 side effect; assert zero generator drift. | 1, 2, 3, 4 | S | batch |

### Why spec 3 is `isolated`

It is nominally M, which the size heuristic maps to `checkpoint`. The census is the reason to override: **68 harness blocks across 22 skill files**, each needing an individual D9 verdict (does this block's text stay true when omp reads it?). That is a long, judgment-dense pass whose accumulated reasoning would crowd a shared context — and a wrong verdict ships a silently broken skill rather than a failing test. Fresh context, one spec.

Block census driving spec 3 (from `src/skills/*.md`):

| Block selector | Count | D9 disposition |
|---|---|---|
| `claude` | 38 | untouched — claude-only, omp never matches |
| `pi` | 10 | **each needs a verdict** — Pi invocation syntax is right for omp, but any block naming `joycraft-implement-loop` or a `.pi/` path is false for omp |
| `codex\|pi\|copilot` | 7 | add `omp` — no-runtime semantics are true for omp |
| `codex\|pi` | 4 | evaluate then add `omp` |
| `codex\|copilot` | 4 | evaluate then add `omp` |
| `copilot` | 1 | evaluate |
| `codex` | 1 | evaluate |
| **Total** | **68** | 30 non-claude blocks carry real decisions |

Known false-for-omp sites already located: `joycraft-decompose.md:447,454`; `joycraft-implement.md:117,134,151`; `joycraft-implement-feature.md:14,42,89,136,153`; `joycraft-spec-done.md:16`; `joycraft-optimize.md:117` (MCP path row); `joycraft-tune.md:195,197` (private-profile dir lists).

---

## Execution waves

- **Wave 1** — specs **1** and **4**. Parallel-safe: Affected Files are disjoint (spec 1 owns `src/harness.ts`, `scripts/`, `src/bundled-files.ts`; spec 4 owns `src/telemetry.ts`, `src/telemetry-store.ts`).
- **Wave 2** — specs **2** and **3**. Parallel-safe: spec 2 owns `src/init.ts`, `src/upgrade.ts`, `src/gitignore.ts`; spec 3 owns `src/skills/*.md` and the generated/installed trees. Init and upgrade do not read skill bodies.
- **Wave 3** — spec **5**. Sequential, after everything.

```
1 (core) ──┬──> 2 (init/upgrade) ──┐
           └──> 3 (block audit) ───┼──> 5 (docs)
4 (telemetry) ─────────────────────┘
```

---

## Review questions

**Q1 — Does this breakdown match how you think about the feature?**
Recommendation: **ship as-is.** The five rows are the brief's own Decomposition table; nothing was merged or split. The only judgment added is spec 3's mode override and spec 5's rescoping (below).

**Q2 — Any spec too big or too small?**
Recommendation: **spec 3 is the one to watch.** It is the largest real surface (68 blocks, 22 files) and the only one where a mistake is invisible to the test suite — a block that fails to name `omp` ships an omp skill missing its gate contract, which no assertion catches unless spec 3 also writes the assertion. If you want it split, the natural seam is *gate skills* (decide, design, research, decompose, new-feature, interview) versus *execution skills* (implement, implement-feature, spec-done, optimize, tune, verify, the rest). I did not split it because both halves would touch the same generated trees, making the wave no longer parallel-safe.

**Q3 — Should any run in parallel?**
Recommendation: **yes, waves 1 and 2 as marked.** Both are file-disjoint. Wave 3 is a single spec.

**Q4 — Execution modes.**
Your project has no `**Default execution mode:**` line in CLAUDE.md, so the default is `batch`. Recommended: specs 4, 5 → `batch` (small, low-risk); specs 1, 2 → `checkpoint` (M, want atomic commits); spec 3 → `isolated` (override, reasoning above). OK, or adjust?

---

## Scope note carried into spec 5

Spec 5 is **documentation only** — README, AGENTS.md, CHANGELOG. It is explicitly *not* the owner of `pnpm sync-skills`: specs 1 and 3 each regenerate and sync in their own commit, per the AGENTS.md ALWAYS rule. Spec 5 adds a zero-drift verification gate (run the generators, assert nothing changes), which is a check, not a sync.
