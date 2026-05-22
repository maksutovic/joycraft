---
status: active
owner: Maximilian Maksutovic
created: 2026-05-21
feature: context-layer
---

# Feature Brief: Context Layer + Onboarding + Bugfix Rename

> **Status:** Shipped — all 9 specs implemented 2026-05-21 (branch `feat/bugfix-clarity`)
> **Date:** 2026-05-21
> **Owner:** Maximilian Maksutovic
> **Design:** `docs/features/2026-05-21-context-layer/design.md` (all open questions resolved)

---

## Why

Four related improvements to how Joycraft organizes project knowledge and onboards a first-time user, landing together because they all touch the same surfaces (the shipped skills, `docs/context/`, and CLAUDE.md as a light pointer index).

The connective thesis: **a first-time user should land in an obvious entry point that reads their existing docs, helps them gather the context that makes the harness useful, and points CLAUDE.md at that context — all without much teaching.** Context docs proved "infinitely useful" in practice; the gap is that nothing helps a newcomer create them safely.

1. **Bugfix rename.** Bugfixes currently live at `docs/specs/<area>/`, a legacy path left over from before features got their own `docs/features/<slug>/specs/` folder. The `docs/specs/` label is confusing because "specs" also exist inside features. Rename to `docs/bugfixes/<area>/` — a pure relabel of an already-correct separation. (Partially done already; see Scope.)

2. **Context layer for long-form reference docs.** Joycraft's philosophy is to keep `CLAUDE.md` light (target: under ~200 lines) and point to deeper context on demand. Today `docs/context/` exists but only holds five short, append-only *operational fact-docs* (production-map, dangerous-assumptions, decision-log, institutional-knowledge, troubleshooting) routed by `/joycraft-add-fact`. There is no home for **long-form reference docs** — a design system, frontend methodology, API conventions, domain glossary — that are too long to inline in CLAUDE.md but need to be discoverable. This feature adds that home and the pointer mechanism that keeps CLAUDE.md light.

3. **First-run onboarding + context gathering.** A first-time user doesn't know which slash command starts things, and `/joycraft-tune`'s existing interview (Step 5) is narrow — it covers risk/safety only, is gated behind an existing harness, and *skips entirely if `docs/context/` already has content*. It never reads the docs a project already has, and never gathers reference context (design system, methodologies). We want a first-timer to land in an obvious entry point that **reads existing docs first, then offers an optional interview for the gaps**, producing real context docs wired into CLAUDE.md.

4. **Discoverable entry point.** "Where do I begin?" should be painfully obvious. The honest fix is less about the skill *name* and more about the surfaces a newcomer actually sees first (init's printed next-steps, generated CLAUDE.md, the session-start hook) — plus a first-run-friendly alias name so the door is labeled in newcomer vocabulary.

---

## What

### Part A — Bugfix rename (mostly done)

Rename the bugfix spec location `docs/specs/<area>/` → `docs/bugfixes/<area>/` across the shipped skills, and have `/joycraft-bugfix` maintain a per-area `README.md` index.

**Already implemented in this session** (skills only, this repo):
- `joycraft-bugfix.md` — write path → `docs/bugfixes/<area>/`; frontmatter field `feature:` → `area:`; per-area README index; implement-handoff path.
- `joycraft-session-end.md` — spec-status scan reads `docs/bugfixes/<area>/`.
- `joycraft-decompose.md` — bugfix README path → `docs/bugfixes/<area>/README.md`.

**Deliberately untouched:** generic feature-example paths like `docs/specs/my-feature/add-widget.md` in `verify`, `implement`, `tune`, `implement-level5`, `collaborative-setup` — these use a *feature* slug as a placeholder, not the bugfix convention. (See Open Question 1.)

### Part B — Context layer (new)

A place for long-form reference docs plus a lightweight pointer index in CLAUDE.md.

1. **Layout — `docs/context/reference/`.** Long-form reference docs live in a `reference/` subdirectory of the existing `docs/context/`. The five operational fact-docs stay flat in `docs/context/`. Same home (purpose: "everything CLAUDE.md points to instead of inlining"), separated by shape (short append-tables vs. long prose). Mirrors the features-vs-bugfixes principle: unify by purpose, separate by shape.

2. **Pointer model — `## Context Map` in CLAUDE.md.** A new `## Context Map` section: a table of pointers (`Document | Read it when…`). The agent always reads CLAUDE.md and follows the relevant pointer on demand. This is the mechanism that lets CLAUDE.md stay under ~200 lines while deep context remains reachable. Created-or-updated idempotently (no such section exists today).

3. **Authoring — new `/joycraft-add-context` skill + bundled templates.** A dedicated skill scaffolds a long-form reference doc from a template into `docs/context/reference/<slug>.md` and writes/updates the `## Context Map` pointer in CLAUDE.md. Separate skill (not an extension of `add-fact`) because:
   - Skill invocation depends on distinct vocabulary; `add-fact` is saturated with operational signal-words, and mixing in "design system / methodology" muddies both triggers.
   - Different cognitive task: `add-fact` classifies-and-appends a one-liner into 5 buckets; this scaffolds-and-fills a long structured document (closer to `new-feature` than `add-fact`).
   - Instruction-budget discipline: `add-fact` is already ~38 instructions across 5 categories; a 6th long-form branch would bloat it past reliable invocation.

   Bundled templates to ship (v1): `design-system.md`, `frontend-methodology.md`, `backend.md`, `testing.md`, plus a generic `reference-doc.md` fallback. (More may be added during design if obviously helpful.)

### Part C — First-run context gathering (`/joycraft-gather-context`, invoked by tune)

A new skill that owns the read-existing → interview → write-docs → wire-Context-Map flow. `/joycraft-tune` invokes it on first run; it can also be run standalone.

Behavior (**read-then-offer**, lowest intervention):
1. **Read what exists first.** Scan the repo for context that's already written: README(s), `docs/` (any existing design/architecture/style docs), `docs/context/*`, existing CLAUDE.md content. Summarize for the user what context already exists and what's covered.
2. **Offer, don't force.** Identify gaps (no design system doc? no production map? no decision log?) and offer an *optional* interview targeting only the gaps. The user can decline any or all. Never re-interview for context that already has real content (same skip-if-content guard tune uses today, but per-doc rather than all-or-nothing).
3. **Route by shape.** Operational facts → the five flat `docs/context/*.md` fact-docs (reuse `add-fact`'s routing). Long-form reference → `docs/context/reference/<slug>.md` from a template (reuse `add-context`'s scaffolding).
4. **Wire CLAUDE.md.** Every doc created/discovered gets a pointer row in the `## Context Map`. Keep CLAUDE.md light — pointers, not content.

Rationale for a separate skill (not inlined into tune): keeps tune's instruction budget lean (currently 15 instructions), and makes the gather flow reusable outside first-run. `add-fact` and `add-context` remain the single-doc primitives; `gather-context` is the guided multi-doc onboarding pass that composes them.

### Part D — Discoverable entry point (`/joycraft-setup` alias + surfaces)

**Decision: alias, not rename.** Add `/joycraft-setup` as a thin first-run alias that routes to `/joycraft-tune`; keep `/joycraft-tune` as-is for the recurring re-assessment job.

- **Why alias not rename:** `tune` is a published skill — renaming breaks existing users' muscle memory and every doc/memory/output reference, for zero benefit to *them*. The "where do I begin" problem is a *newcomer* problem; a newcomer benefits from the new word existing, not from the old one disappearing.
- **Why `setup` not `start`:** (a) lifecycle honesty — you "start" once, but this skill is run *repeatedly* to re-tune; `start` falsely implies one-and-done. (b) `start` collides with `npm start` / dev-server mental models (implies "launch something"); `setup` unambiguously means "configure my project."
- **Implementation:** a one-screen `joycraft-setup` skill whose `description` carries newcomer vocabulary (the field that drives auto-invocation) and whose body routes to `/joycraft-tune`. No duplication of tune's logic.

**The real fix is the surfaces, not the name.** A true first-timer won't type any slash command. Update the surfaces a newcomer sees first:
- `init.ts` printed next-steps (currently `init.ts:296` points at `/joycraft-new-feature` — wrong for someone with no harness yet; lead with `/joycraft-setup`).
- Generated CLAUDE.md "Getting Started with Joycraft" table (`improve-claude-md.ts`) — lead with setup.
- Session-start nudge if appropriate.

---

## Scope

**In scope:**
- Bugfix rename in the three shipped Claude skills (done) and their Codex mirrors (`src/codex-skills/`) — see Open Question 3.
- New `/joycraft-add-context` skill (Claude + Codex variants).
- New `/joycraft-gather-context` skill (Claude + Codex variants) — read-then-offer onboarding pass.
- New `/joycraft-setup` alias skill routing to `/joycraft-tune` (Claude + Codex variants).
- New bundled templates for long-form reference docs.
- `## Context Map` section: generated stub in `improve-claude-md.ts`, maintained by `add-context`/`gather-context`.
- `init.ts` already creates `docs/context/`; extend to (or let the skill lazy-create) `docs/context/reference/`.
- Update `/joycraft-tune` to (a) recognize the context layer in its 7-dimension assessment and (b) invoke `/joycraft-gather-context` on first run instead of its current narrow Step-5 risk interview.
- Discoverability surfaces: `init.ts` next-steps lead with `/joycraft-setup`; generated CLAUDE.md "Getting Started" table leads with setup.
- **Upgrade migrator (now in scope, per Q4):** `upgrade.ts` physically moves `docs/specs/<area>/` → `docs/bugfixes/<area>/` via the existing `plan.orphans.specsDirs` path. **Forced, no interactive gate** (design-resolved — see below): orphan spec dirs stop being "left in place" and become planned moves, printed under a "Migrating bugfix areas:" preview, applied like the existing feature migration. Keeps the skip-if-target-exists guard (never clobber an existing `docs/bugfixes/<area>/`) and the >50%-failure abort. Update `printMigrationSummary`/banner output strings.
- Update the generic example paths in `verify`, `implement`, `tune`, `implement-level5`, `collaborative-setup` from `docs/specs/...` to `docs/features/<slug>/specs/...` (per Q1).
- **Codex decompose path drift (parity fix).** `src/codex-skills/joycraft-decompose.md` is stale relative to its Claude twin — it still references the OLD flat layout (`docs/briefs/` for the input brief at line ~12, `docs/specs/<feature-name>/` for spec output at line ~58, and `docs/briefs/...` parent-brief references at lines ~67/~130). Bring it to parity with `src/claude-skills/joycraft-decompose.md`: input brief at `docs/features/<slug>/brief.md`, specs output to `docs/features/<slug>/specs/`, parent-brief references updated, `$` sigil. (Surfaced during design handoff review — the Claude decompose was migrated to per-feature layout but the Codex mirror was missed.)
- Regenerate `src/bundled-files.ts` via `node scripts/generate-bundled-files.mjs` (it's `@generated` — never hand-edit) and rebuild.

**Out of scope (flag separately):**
- Migrating the *client* repo (the user applies that there separately).
- README.md user-facing docs refresh.
- Skill pruning / consolidation — acknowledged we likely have too many skills; deferred to a separate session (per Q7 discussion).
- Inferring context from code (package.json scripts, framework configs, CI) in `gather-context` — future enhancement, not v1 (per Q8).

---

## Resolved Decisions (answered 2026-05-21)

1. **Generic example paths — UPDATE them.** Rewrite the `docs/specs/my-feature/add-widget.md` placeholders in `verify`, `implement`, `tune`, `implement-level5`, `collaborative-setup` to the current `docs/features/<slug>/specs/...` convention. Goal: `docs/specs/` should stop appearing anywhere in shipped skills.

2. **Template set — design-system, frontend-methodology, backend, testing, + generic.** v1 ships: `design-system.md`, `frontend-methodology.md`, `backend.md` (backend conventions/architecture), `testing.md` (testing strategy), and a generic `reference-doc.md` fallback. Add others if obviously helpful during design (e.g., `api-conventions.md`, `domain-glossary.md`).

3. **Codex parity — REQUIRED for v1.** Every skill change (bugfix rename, `add-context`, `gather-context`, `setup`) gets a matching Codex mirror in `src/codex-skills/`.

4. **Upgrade migrator — PHYSICALLY MOVE, FORCED.** `npx joycraft upgrade` moves existing `docs/specs/<area>/` → `docs/bugfixes/<area>/` (not just relabel). Wire into the existing `plan.orphans.specsDirs` path in `migration.ts`/`upgrade.ts`. **Design-resolved: forced like the existing feature migration — NO interactive confirmation gate** (owner has a small, known userbase and will communicate the change). Still preview the moves in `printMigrationSummary`, keep the skip-if-target-exists guard (never clobber an existing target), and keep the >50%-failure abort. Update the `printMigrationSummary`/banner output. **This moves the migrator IN SCOPE.**
   - _Note: this supersedes the original "require the confirmation gate" wording — see design.md Decision (was Q2)._

5. **CLAUDE.md ~200-line target — WARN at threshold, taught in BOTH places.** This is the harness-improver's job: keep top-level context lean, push detail into pointed-at docs. `/joycraft-tune` flags CLAUDE.md when it exceeds ~200 lines and recommends extracting sections into `docs/context/reference/` + Context Map pointers — advisory, never auto-edits. Surfaced in **both** (a) tune's "Documentation" scoring dimension (lean+pointered scores high; a monolith scores low with a specific recommendation) and (b) the generated `## Context Map` section header ("Keep this file lean — link out, don't inline").

6. **"Facts" vs "reference" — split by SHAPE/LENGTH, not topic.** Clarified: facts are NOT only agent-prohibitions (only `dangerous-assumptions` is that). The boundary is shape:
   - **Fact** = short, atomic, fits as one table row; you accumulate many over time (→ the 5 flat `docs/context/*.md`, routed by `add-fact`).
   - **Reference** = long-form prose you author and maintain; takes paragraphs/pages (→ `docs/context/reference/<slug>.md`, scaffolded by `add-context`).
   - **Routing test for `gather-context`:** "Could this be one row in a table?" → fact. "Does explaining it take paragraphs?" → reference doc.
   - **Overlap handling:** `gather-context` duplicates the minimal routing logic inline (skills must be self-contained — CLAUDE.md gotcha #3); `add-fact` stays the standalone single-fact entry.

7. **`gather-context` — independently invocable, NOT in the headline table.** Agreed. It's a real skill users can run directly, but the newcomer "Getting Started" table stays short with `/joycraft-setup` as the one obvious door. (Noted: skill count is getting high; pruning deferred to a separate session.)

8. **Existing-doc scan breadth — README + `docs/` + CLAUDE.md only in v1.** Give the user agency: summarize what exists, offer a gap-only interview. Do NOT auto-run an expensive full code-inference scan — that burns tokens. Offer a deeper "full review" ONLY if the user explicitly asks, with a clear note that it costs more. Code-inference is a future enhancement (out of scope above).

## Design-Resolved Decisions (answered 2026-05-21, during /joycraft-design)

These were open questions in the design discussion; resolved by owner. Full rationale in `design.md` Section 4.

9. **`## Context Map` stub generated in BOTH `init` fresh-generation AND `improve-claude-md.ts` merge path** (was design Q1). Reuse a single `generateContextMapSection()` helper so the two stay in sync. Greets first-timers from minute one. Header carries the lean-CLAUDE.md teaching line (Decision 5). Stub = header + teaching line + empty table skeleton; no fake/dangling pointer rows.

10. **Bugfix migrator is FORCED, no interactive gate** (was design Q2) — see Decision 4 above.

11. **Codex parity = identical content, Codex-idiomatic invocation** (was design Q3). The mechanical differences: command sigil `/joycraft-…` (Claude) → `$joycraft-…` (Codex, confirmed in `src/codex-skills/*`), `.claude/`→`.agents/`, `.claude/settings.json`→"deny patterns configuration", and drop the `instructions:` frontmatter field. Body logic is otherwise identical. So `setup`'s Codex mirror routes to `$joycraft-tune`.

12. **Write timing split by skill** (was design Q4): `add-context` writes immediately per-doc (single-doc primitive). `gather-context` collects all gap answers, then writes everything + the Context Map in ONE batch with a final confirm ("do it in one go" onboarding pass).

13. **`docs/context/reference/` is lazy-created** by `add-context`/`gather-context` on first write (was design Q5). NO extra `ensureDir` in `init.ts` — honors init's "solo-first: no preemptive ceremony" philosophy.

---

## Acceptance Criteria (finalized 2026-05-21 after design)

- [ ] Bugfix specs are written to `docs/bugfixes/<area>/` by `/joycraft-bugfix`, with a maintained per-area `README.md`.
- [ ] No bugfix-context references to `docs/specs/<area>/` remain in shipped skills (Claude + Codex). Generic example paths in `verify`/`implement`/`tune`/`implement-level5`/`collaborative-setup` updated to `docs/features/<slug>/specs/...`.
- [ ] `/joycraft-add-context` scaffolds a long-form doc into `docs/context/reference/` from a template (writing immediately per-doc) and updates the `## Context Map` pointer in CLAUDE.md idempotently. Lazy-creates `docs/context/reference/`.
- [ ] `/joycraft-gather-context` reads existing docs (README + `docs/` + CLAUDE.md), summarizes coverage, offers a gap-only optional interview, never re-interviews docs with real content, and writes all created docs + Context Map rows in one batch with a final confirm.
- [ ] `/joycraft-setup` exists, carries newcomer-vocabulary in its description, and routes to `/joycraft-tune` (Codex mirror routes to `$joycraft-tune`) without duplicating its logic.
- [ ] `/joycraft-tune` invokes `/joycraft-gather-context` on first run (replacing the narrow Step-5 risk interview) and recognizes the context layer in its 7-dimension assessment; Documentation dimension flags CLAUDE.md monoliths >~200 lines with a Context-Map extraction recommendation.
- [ ] Generated CLAUDE.md includes a `## Context Map` section (stub when empty, with lean-docs teaching line) in BOTH fresh `init` generation and the `improve-claude-md.ts` merge path, plus a "Getting Started" table leading with `/joycraft-setup`.
- [ ] `init.ts` next-steps lead with `/joycraft-setup`.
- [ ] `upgrade.ts`/`migration.ts` forcibly move orphan `docs/specs/<area>/` → `docs/bugfixes/<area>/` (no gate), with preview, skip-if-target-exists, and >50%-failure abort intact.
- [ ] Every new/changed Claude skill has a matching Codex mirror in `src/codex-skills/` (`$` sigil, `.agents/`, no `instructions:` field).
- [ ] `src/codex-skills/joycraft-decompose.md` matches its Claude twin's layout: input brief `docs/features/<slug>/brief.md`, specs output `docs/features/<slug>/specs/`, no stale `docs/briefs/` or `docs/specs/<feature>/` references.
- [ ] New reference templates (`design-system`, `frontend-methodology`, `backend`, `testing`, `reference-doc`) bundled under `src/templates/context/reference/`.
- [ ] `src/bundled-files.ts` regenerated via `node scripts/generate-bundled-files.mjs`; `pnpm test --run && pnpm typecheck` pass.

---

## Execution Strategy (decomposed 2026-05-21)

Nine atomic specs in `docs/features/2026-05-21-context-layer/specs/` (see that folder's `README.md` for the implementer-facing spec table).

| # | Spec | Depends On |
|---|------|-----------|
| 1 | `update-stale-skill-paths` | — |
| 2 | `add-reference-templates` | — |
| 3 | `add-context-map-section` | — |
| 4 | `migrate-bugfix-dirs` | — |
| 5 | `add-add-context-skill` | 2 |
| 6 | `add-gather-context-skill` | 5 |
| 7 | `add-setup-alias-skill` | — |
| 8 | `wire-tune-context-layer` | 6 |
| 9 | `regenerate-bundled-files` | 1,2,3,5,6,7,8 |

**Waves:**
- **Wave 1 (parallel, separate worktrees):** 1, 2, 3, 4, 7 — fully independent, disjoint files.
- **Wave 2:** 5 (after 2 — scaffolds from the new templates).
- **Wave 3:** 6 (after 5 — composes `add-context`'s conventions inline).
- **Wave 4:** 8 (after 6 — tune invokes the gather skill; sequence after spec 1's `tune.md` path edits).
- **Wave 5 (last):** 9 — regenerate `@generated` `src/bundled-files.ts`, feature-wide green build. Only spec that writes the generated artifact.

**Critical path:** 2 → 5 → 6 → 8 → 9.

**Decomposition notes:**
- The `regenerate-bundled-files` step is its own final spec (not folded into each content spec) so the `@generated` file isn't churned across parallel waves.
- The three discoverability surfaces (Context Map stub, Getting-Started table, init next-steps) are kept together in spec 3 — they touch the same two files (`improve-claude-md.ts`, `init.ts`) and serve one goal.
- Spec 1 absorbs the Codex-mirror catch-up for `bugfix`/`new-feature` (still on the old layout), not just the `decompose` drift named in Scope — same "stale Codex path" class of work, satisfying Decision 3's "every skill change gets a matching Codex mirror."
