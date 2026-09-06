# omp Support — Feature Specs

> **Parent Brief:** `docs/features/2026-09-02-omp-support/brief.md`
> **Decomposition:** `docs/features/2026-09-02-omp-support/decompose.md` (render: `decompose.html`)
> **Status:** Decomposed 2026-09-03, ready for implementation

## What this feature does

Makes omp (Oh My Pi — binary `omp`, npm `@oh-my-pi/pi-coding-agent`, a Bun-based fork of Pi with its own config dir) Joycraft's fifth first-class harness. `init` offers it in the harness menu, skills generate into `.omp/skills/<name>/SKILL.md` in omp's own invocation form (`/skill:joycraft-*`), `upgrade` manages that tree, the `private` gitignore profile scopes to it, and `joycraft telemetry` reads omp session transcripts. The install surface mirrors the 0.7.5 Copilot addition.

The Pi headless runtime (spec-queue scripts, pipeline extension, researcher/verifier agents) is **not** in this feature — see `docs/backlog/2026-09-02-omp-headless-runtime.md`. omp deny patterns are also deferred: `docs/backlog/2026-09-02-cross-harness-deny-patterns.md`.

## Specs

| # | Spec | Depends On | Mode | Notes |
|---|------|-----------|------|-------|
| 1 | [add-omp-harness-core.md](add-omp-harness-core.md) | — | checkpoint | Harness enum, labels, transform table (D8 values), generator, sync target; `src/omp-skills/` + `OMP_SKILLS` exist |
| 2 | [wire-omp-init-upgrade.md](wire-omp-init-upgrade.md) | 1 | checkpoint | Install `.omp/skills` at init with hash recording, omp in `multiTool`, upgrade manages the tree, `.omp/` in the private gitignore profile, summary line |
| 3 | [audit-harness-blocks-for-omp.md](audit-harness-blocks-for-omp.md) | 1 | isolated | D9 rule applied to all 68 harness blocks across 22 skills, optimize MCP path row, omp parity test, two gate-contract tests |
| 4 | [add-omp-telemetry-scanner.md](add-omp-telemetry-scanner.md) | — | batch | omp transcript dir default, Pi parser reuse, threading through `telemetry-store.ts` |
| 5 | [document-omp-support.md](document-omp-support.md) | 1, 2, 3, 4 | batch | README, AGENTS.md rows, CHANGELOG with the D5 side effect; zero-drift verification gate |

## Execution waves

- **Wave 1: specs 1, 4** — parallel-safe (Affected Files disjoint: spec 1 owns `src/harness.ts` + `scripts/` + `src/bundled-files.ts`; spec 4 owns `src/telemetry.ts` + `src/telemetry-store.ts`)
- **Wave 2 (after wave 1): specs 2, 3** — parallel-safe (spec 2 owns `src/init.ts`, `src/upgrade.ts`, `src/gitignore.ts`; spec 3 owns `src/skills/*.md` and the generated trees; init and upgrade never read skill bodies)
- **Wave 3 (after wave 2): spec 5** — sequential, single spec

Parallel-safe = the wave's specs touch disjoint Affected Files, so they may run as
concurrent subagents/worktrees. Waves without the marker run sequentially.

```
1 (core) ──┬──> 2 (init/upgrade) ──┐
           └──> 3 (block audit) ───┼──> 5 (docs)
4 (telemetry) ─────────────────────┘
```

**Mode mix is intentional.** Specs 4 and 5 are `batch` (small, low-risk); 1 and 2 are `checkpoint` (M, atomic commits); 3 is `isolated` — an override of the size heuristic, because 68 harness-block verdicts across 22 files is judgment-dense work whose accumulated reasoning would crowd a shared context, and a wrong verdict ships a silently broken skill rather than a failing test.

## Hazards

- **Harness blocks are allow-lists.** Adding `omp` to `HARNESSES` (spec 1) without the spec 3 audit ships omp skills with no output-style pointer, no gate contract, and no subagent guidance — silently, with a green suite. Spec 3 is not optional polish.
- **omp does not read `.pi/`.** Every Pi block naming `joycraft-implement-loop` or a `.pi/` path is false for omp (D9). Pre-located sites are tabulated in spec 3.
- **Derived-artifact sync is per-spec.** Specs 1 and 3 each regenerate and `pnpm sync-skills` in their own commit (AGENTS.md ALWAYS rule). Spec 5 verifies zero drift; it does not own the sync.
- **`.omp/` becomes non-empty once skills land**, which activates omp's project settings layer. No settings file is written, so the layer is empty — but do not assume `.omp/` is inert.
- **Position-sensitive tests.** `gate-slot-contract-placement` and `confidence-scoring-skill` slice fixed regions from installed copies; adding a block shifts offsets. Run the full suite, not just the parity test.

## How to use this file

Run the whole queue with `/joycraft-implement-feature docs/features/2026-09-02-omp-support/` — it executes the specs in wave order (parallel-safe waves may run as concurrent subagents; everything else runs sequentially in the driving conversation) and finishes with session-end. Or run one spec at a time with `/joycraft-implement <spec-path>`; the implement skill reads this README first so it understands the spec's position in the wave plan, and continues through the queue itself. Each spec is self-contained for the actual implementation; this README provides ordering context only.
