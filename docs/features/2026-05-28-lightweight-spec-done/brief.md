# Autonomous Spec Execution — Feature Brief

> **Date:** 2026-05-28
> **Project:** joycraft
> **Status:** Implemented 2026-05-30 — all 9 specs `done`, awaiting PR review (verify-in-loop deferred to next sprint)
> **North star:** `docs/vision/headless-joycraft.md` (the "why" — read first)
> **Absorbs:** the Pi implement-loop (was `docs/features/2026-05-28-pi-process-loop/`) — "isolated mode" IS that loop
> **Closes:** the unbuilt `lightweight-spec-done` thread + status-vocabulary question from `docs/features/2026-05-27-pipeline-hardening/brief.md`

---

## TL;DR

This is **Phase 1 of Headless Joycraft** (see the north star). It makes spec execution **mode-driven** and splits the heavy `joycraft-session-end` into two tiers, so the per-spec loop keeps momentum and each harness does the right thing.

- **Execution modes** (`batch` / `checkpoint` / `isolated`) chosen per-spec, informed by a project default + a decompose recommendation.
- **`joycraft-spec-done`** (NEW, lightweight) — per spec, before context clears: status bump + terse discovery-if-surprised + commit. No validation re-run, no push.
- **`joycraft-session-end`** (RE-SCOPED) — once per feature: full validation, consolidate discoveries + context sweep, push, PR.
- **Status unified** to `todo → in-review → done` across queue JSON *and* frontmatter.
- **Isolated mode on Pi** = the single-shot `pi -p` loop (process boundary = free context isolation, verified).

`verify-in-loop` (the `in-review → done` gate) is **designed here, built next sprint**.

## Problem

1. **Momentum:** full session-end after every spec (discoveries + 4-doc context sweep + full `pnpm test && build` + push/PR) is overhead an automatable interview→ship flow should amortize, not repeat.
2. **Specs aren't uniform:** tiny specs want to batch in one go; heavy specs need fresh context between each. One fixed wrap-up behavior is wrong — execution should be a **mode** chosen per run/spec.
3. **No "done-but-unverified" state:** today a spec goes `active → terminal`. There's nowhere to say "agent finished + committed, nothing has checked it yet" — the seam the dark-factory model needs for a quality gate.
4. **Two unreconciled status systems** (see [[project-spec-status-two-systems]]): queue JSON `active→complete` vs frontmatter mixed (`active/backlog/complete/shipped`). Changing one desyncs them.

## Execution Modes (the core of this feature)

| Mode | Per-spec behavior | Context between specs | Who drives it | For |
|---|---|---|---|---|
| **batch** | implement all, wrap once at end | shared (one conversation) | session-end at end | clusters of tiny specs |
| **checkpoint** | spec-done after each (commit + status), keep going | shared | the agent calls spec-done | medium specs; atomic commits, no fresh context |
| **isolated** | spec-done, then FRESH context, then next | fresh per spec | **Pi:** `pi -p` loop. **CC/Codex interactive:** skill instructs human to `/clear` + re-invoke. **CC/Codex headless:** `claude -p`/`codex exec` loop (opt-in, ToS/cost caveat — see north star) | heavy specs that pollute context |

**Mode selection = hybrid (decided):** a project **default** mode exists; `joycraft-decompose` infers per-spec from size/complexity and **surfaces a recommendation the human approves** ("Your project defaults to batch, but specs 1, 2, 7 are large — recommend checkpoint for those. OK?"). Mode lands in each spec's frontmatter, informed by the default, reviewable — not silent.

**Per-harness behavior is what the mode changes** (the A-vs-B the user raised): the chosen mode determines what Claude/Codex **display** after each spec (e.g. "run `/clear`, then `/joycraft-implement <next>`") vs. what Pi **automates** (the loop runs the next `pi -p`).

## Two-Tier Wrap-Up

**`joycraft-spec-done`** (NEW; claude + codex variants; Pi gets the logic as a loop script step):
1. Bump status `todo → in-review` in **both** queue JSON and frontmatter
2. Terse discovery **stub** only if something contradicted the spec — else skip
3. Commit (`spec: <name>`)
4. **No** validation re-run (trusts implement's TDD). **No** push/PR.

**`joycraft-session-end`** (RE-SCOPED to feature finisher; runs once):
1. Full `pnpm test && build` — the cross-spec safety net (now the ONLY validation gate → session-end stays mandatory)
2. Consolidate/curate discoveries + the context-doc sweep (the expensive cognition, done once)
3. Graduate `in-review → done`
4. Push + open PR → human reviews

## Status Lifecycle (decided: `todo → in-review → done`)

Three states; the agent never self-certifies. **Researched, not invented** — `implemented`/`verified` are used by no major tool; `todo → in-review → done` is the canonical engineering idiom (GitHub/Jira/Linear/Kanban). See [[project-spec-status-two-systems]].

```
todo ──[spec-done]──> in-review ──[verify, NEXT SPRINT]──> done ──[human PR review]──> (merged = git fact)
```

- `in-review` = agent done + committed, awaiting verify/human.
- `done` = verified. (Until verify-in-loop ships, session-end graduates `in-review → done` directly.)
- "merged/shipped" is a git/PR fact, **not** tracked as spec status.

## The threading (hard constraints — what desyncs if sloppy)

Unify both systems (Option A). Every status consumer:

| Consumer | Today | Must become |
|---|---|---|
| `joycraft-next-spec` (script) | serves `"active"`, skips `"complete"` | serve `"todo"`; skip `in-review`/`done` |
| `joycraft-mark-done` (script) | hard-codes `sed active→complete` | one script, `--to <state>` flag (`todo→in-review` for spec-done; `in-review→done` for session-end) |
| `joycraft-spec-status` (script) | `[✓]` only if `"complete"` | render 3 states (e.g. `[ ]` todo, `[~]` in-review, `[✓]` done) |
| Pi extension `joycraft-pipeline.ts` | mark-done call + "complete" prose | match new transitions (or moot — extension is interactive-only per the process-loop pivot) |
| decompose skill | filter ignores `shipped/deprecated/superseded`; JSON template `"active"`; prose "marks `complete`" | filter must NOT ignore `in-review`; template `"todo"`; update prose; **add per-spec mode field + recommendation logic** |
| session-end skill | sets `shipped` + body `Complete` | graduate `in-review → done` |
| existing on-disk specs | 9 `shipped`, 2 `complete`, 1 `active`, 1 `backlog`; queues `active`/`complete` | one-time migrate: `active→todo`, `backlog→todo`, `complete→done`, `shipped→done`; queues align |

## Constraints

- **All 3 skill variants** (claude/codex/pi) for any skill change + **regenerate `src/bundled-files.ts`** (editing templates alone does nothing — see [[project-pi-extension-fake-sdk]]).
- **ASK FIRST** (CLAUDE.md): skill + template changes. This brief is that conversation; decomposed specs still need the human nod.
- **Single source of truth** after this: queue JSON and frontmatter use the same 3 words.
- **session-end stays mandatory** — it's the only validation gate.
- **Pi-first for the autonomous loop** — generalize to claude/codex headless later, gated on the ToS reality (north star). Interactive-guided works on all 3 now.

## Decided (this conversation)

- New skill, not a `--fast` flag · trust-implement (no validation in spec-done) · terse-discovery-if-surprised · 3 states `todo→in-review→done` · agent never self-certifies · human at the PR (end) · verify-fail = stop-and-flag (dependencies force it) · Option A unify · one `mark-done --to` script · 3 modes batch/checkpoint/isolated · hybrid mode selection (project default + decompose recommendation) · isolated guided-manual on CC/Codex is fine · **Full sprint scope** (spec-done + modes + unification + Pi loop) · earn the general-driver abstraction at verify (sprint 2).

## Reconciles a prior preference

[[feedback_spec_pr_autonomy]] ("full commit/push/PR per spec") is **narrowed**: per-spec = commit-only; push + PR move to session-end. Autonomy unchanged (no asking) — only the cadence. Memory updated.

## Out of Scope (this sprint)

- **verify-in-loop** (`in-review → done` via independent verify) — designed, built next; `done` ships graduated-by-session-end until then.
- **Dependency-aware-continue** on verify-fail — fail-fast only for now.
- **Generalizing the driver to claude/codex headless** — Pi-first; later, with ToS/cost guardrails.
- **Headless research/decompose** — future phases (north star roadmap).

## Decomposition (FINALIZED — decomposed 2026-05-28)

Decomposed into 9 atomic specs at `docs/features/2026-05-28-lightweight-spec-done/specs/` (see that folder's `README.md` for the implementer-facing spec table + the per-spec `mode`). The rough cut below was refined — kept all 9; made the script source-of-truth explicit (scripts live in `src/templates/pi-scripts/` + `.pi/scripts/joycraft/`; skills are FLAT `.md` in `src/{claude,codex,pi}-skills/`, installed as `<dir>/SKILL.md`); confirmed the project-default mode lives as a **CLAUDE.md field** (no new config file); and assigned each spec its own execution mode (dogfooding the feature — spec 8 is `isolated`, the doc/data specs are `batch`).

| # | Spec | Description | Depends | Wave | Mode |
|---|------|-------------|---------|------|------|
| 1 | `define-status-vocabulary` | Canonical `todo→in-review→done` reference doc at `docs/reference/`; every other spec cites it | — | 1 | batch |
| 2 | `migrate-existing-statuses` | One-time migrate ~13 specs + 4 queue files + 1 bugfix to the 3 words | 1 | 1 | batch |
| 3 | `update-status-scripts` | `next-spec` serve `todo`/skip `in-review`+`done`; `mark-done --to <state>`; `spec-status` 3 glyphs (src + `.pi` copies) | 1 | 2 | checkpoint |
| 4 | `execution-modes-in-decompose` | decompose tags each spec with a mode (size→mode heuristic) + surfaces a human-approved recommendation; reads CLAUDE.md default | 1 | 2 | checkpoint |
| 5 | `joycraft-spec-done-skill` | New lightweight skill (3 variants): bump→in-review (both systems), terse discovery-if-surprised, commit | 1, 3 | 2 | checkpoint |
| 6 | `rescope-session-end` | session-end = feature finisher: full validation, consolidate discoveries + context sweep, in-review→done, push, PR | 1, 3 | 2 | checkpoint |
| 7 | `implement-mode-aware-handoff` | `joycraft-implement` reads the spec's mode; Step 6 hand-off differs per mode × harness (CC/Codex display vs Pi automate) | 4, 5 | 3 | checkpoint |
| 8 | `pi-implement-loop` | The `pi -p` isolated-mode driver (absorbed from pi-process-loop): loop, fresh process each, spec-done between, session-end at end; explicit SPECS_DIR; retire vestigial `joycraft_next_spec` tool | 3, 5, 6 | 3 | isolated |
| 9 | `wire-and-bundle` | Regenerate bundled-files; verify init/upgrade install spec-done + loop script; default-mode docs + scripts README | 5, 6, 8 | 4 | checkpoint |

### Execution waves
- **Wave 1** (sequential): 1 → 2 — vocabulary contract, then migrate data to it.
- **Wave 2** (after 1; land 3 first, then parallel): 3, then 4 / 5 / 6 (5 & 6 call the new `mark-done --to`).
- **Wave 3** (after wave 2): 7 (needs 4+5), 8 (needs 3+5+6) — parallel.
- **Wave 4**: 9 (needs 5+6+8).
- Safe fully-sequential order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

## Open Questions (small — leanings noted)

- `spec-status` glyphs for 3 states — lean `[ ]`/`[~]`/`[✓]`. (I'll just pick.)
- Discovery stub format — lean 2-line stub the session-end pass later expands. (I'll just pick.)
- `mark-done` shape — **decided:** one script, `--to <state>` flag.
- `backlog` (1 spec) — lean fold into `todo`.
- Commit-per-spec always vs flag — lean always-commit.
- Size→mode heuristic in decompose — what thresholds? (XS/S → batch-eligible, L/XL → isolated). Refine in spec 4.
