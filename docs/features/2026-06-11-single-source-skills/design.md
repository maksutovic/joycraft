---
status: active
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
---

# Single-Source Skill Generation — Design Discussion

> **Inputs:** brief.md, research.md
> **Date:** 2026-06-14
> **Goal:** resolve the 6 open questions blocking decomposition

---

## Section 1: Current State

`scripts/generate-bundled-files.mjs` is a 84-line script with **no transforms today**:

1. `readFlatDir('src/claude-skills/')` → `skills` record
2. `readFlatDir('src/codex-skills/')` → `codexSkills` record
3. `readFlatDir('src/pi-skills/')` → `piSkills` record
4. `readTreeDir('src/templates/')` and pi-subdirs → tree records
5. `formatRecord()` writes them all into `src/bundled-files.ts` (JSON.stringify-encoded values, no template literals)
6. CI sync: `pnpm build` runs the generator + tsup (`package.json:15`); `tests/bundled-files-sync.test.ts:45-90` and `tests/generate-bundled-files.test.ts:26-97` assert byte-for-byte equality

20 skills × 3 dirs = 60 hand-synced files. Every edit costs 3 file writes; drift is mechanical (research Q3 enumerates 9 out-of-category deltas).

## Section 2: Desired End State

- `src/skills/` exists, contains 20 canonical `.md` files (one per skill) with templating + harness blocks.
- `scripts/generate-bundled-files.mjs` orchestrates: for each canonical → emit claude/codex/pi variants → write the three existing `src/*-skills/` dirs → write `src/bundled-files.ts` exactly as today.
- The three `src/*-skills/` dirs remain committed (so PR diffs show canonical + 3 outputs).
- All existing sync tests stay green unchanged; new tests cover the substitution engine and assert no template residue.
- `docs/guides/agent-compatibility.md` describes the canonical format for contributors.
- `CONTRIBUTING.md:91-128` outdated regen snippet removed/fixed.

## Section 3: Patterns to Follow

**Pattern 1 — Pure functions over flat records (`scripts/generate-bundled-files.mjs:30-37`):**
```js
function readFlatDir(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const record = {};
  for (const file of files.sort()) {
    record[file] = readFileSync(join(dir, file), 'utf-8');
  }
  return record;
}
```
The generator already uses `Record<filename, content>` as its working type. The substitution engine should slot in cleanly as `transform(canonical, harness) → variant`.

**Pattern 2 — JSON.stringify encoding (`scripts/generate-bundled-files.mjs:53`):**
Avoids template-literal hazards. Generator test `tests/generate-bundled-files.test.ts:84-96` asserts no backticks survive. The new "no `{{` survives" test follows the same shape.

**Pattern 3 — Sync test helpers (`tests/bundled-files-sync.test.ts:23-43`):**
`buildExpectedRecord(dir, mode)` reads disk + asserts equality. Spec 5 reuses this directly against the three regenerated dirs.

## Section 4: Resolved Design Decisions

> **Decision:** Substitution lives in `scripts/lib/skill-template.mjs` (new file), called from `scripts/generate-bundled-files.mjs`. Pure function — no I/O. Exports `applyTemplate(source, harness)`.
> **Rationale:** Testable in isolation. The .mjs orchestrator stays thin (I/O + glue). Matches the existing `readFlatDir`/`formatRecord` separation.
> **Alternative rejected:** One big .mjs. Workable but couples I/O to logic; fixture tests would need fs mocking.

> **Decision:** Canonical format uses three primitives:
> 1. **Variable substitution:** `{{var}}` — replaced from a per-harness lookup table.
> 2. **Conditional blocks:** `<!-- harness:NAME -->...<!-- /harness -->` where NAME is one of `claude`, `codex`, `pi`, or a pipe-list `claude|codex`. Kept iff current harness ∈ NAME, otherwise stripped including delimiters.
> 3. **Frontmatter stripping:** generator parses YAML frontmatter, drops harness-specific fields per a per-harness allowlist, re-serializes.
> **Rationale:** Three primitives cover all 5 known categories AND all 9 out-of-category deltas (research Q3). Hand-rolled regex stays under 50 lines.
> **Alternative rejected:** Custom DSL with else-branches. Out-of-category deltas are always "claude has X, codex/pi don't" — no symmetric branching needed.

> **Decision:** Variable set is **fixed and explicit**:
> - `{{skill_prefix}}` → `/joycraft-` | `$joycraft-` | `/skill:joycraft-`
> - `{{clear}}` → `/clear` | `run /clear in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app` | `/new`
> - `{{skills_dir}}` → `.claude/skills` | `.agents/skills` | `.pi/skills`
> - `{{boundary_file}}` → `CLAUDE.md` | `AGENTS.md` | `CLAUDE.md and/or AGENTS.md`
> **Rationale:** 4 variables cover invocation, clear verb, install path, and the boundary-file category (research surfaced this as a 6th implicit category in `add-context`, `add-fact`, etc.). Generator throws on unknown `{{x}}` to catch typos.
> **Codex `{{clear}}` is a multi-surface sentence, not a single token.** Web research 2026-06-14 (per agent inventory of [Codex CLI](https://developers.openai.com/codex/cli/slash-commands), [Codex app](https://developers.openai.com/codex/app/commands), [Codex IDE](https://developers.openai.com/codex/ide/commands)) confirmed: `/clear` works in the Codex CLI but **does not exist in the Codex desktop app or IDE extension** (most-used surface). The only documented way to hard-clear context in desktop is `Cmd+N` / `Cmd+Shift+O` / `chatgpt.newChat`. A single short token would silently fail the majority of Codex users. The expansion gives both surfaces' instructions in one sentence — verbose but honest. Authoring guidance: write canonical sentences like `When you're done, {{clear}} before starting the next spec.` and let the variable carry the surface-specific instructions.
> **Alternative rejected:** Templating per-skill (variables defined inline). Centralized = one place to audit harness behavior.
> **Alternative rejected:** Short surface-agnostic Codex expansion like `start a new Codex thread`. Loses the "how" — desktop users without keyboard-shortcut knowledge wouldn't know what to do. We optimize for first-time correctness over brevity.
> **Alternative rejected:** Adding a 5th variable `{{clear_short}}` for inline use. Two-form variables invite drift; one verbose form is good enough for the ~2–3 occurrences per skill.

> **Decision:** Frontmatter rules — strip these fields by harness:
> - **codex:** strip `instructions:`
> - **pi:** strip `instructions:`
> - **claude:** keep everything
> Other fields (`name:`, `description:`) preserved as-is. Re-serializer must preserve key order.
> **Rationale:** Research confirmed `instructions:` is the only claude-only frontmatter field across all 20 skills.
> **Alternative rejected:** Generic field allowlist. Overkill for one field; codify when a 2nd appears.

> **Decision:** Default rule for the 9 out-of-category skills — **unify on the claude variant (fullest)**, treat codex/pi gaps as drift. Use conditional blocks ONLY where the content is genuinely harness-specific (cannot run on the other harness).
> **Rationale:** Codex condensation answer (Q1 in finalization): drift, not feature. Most out-of-category deltas are missing sections that codex/pi will benefit from having.
> **Exceptions requiring conditional blocks:**
> 1. `joycraft-research` — Agent invocation differs by mechanism (Claude Code Agent tool vs Pi `subagent` tool with agent name).
> 2. `joycraft-verify` — same as research.
> 3. `joycraft-lockdown` — config target (`settings.json` vs Codex sandbox) is genuinely different machinery, not condensation.
> 4. `joycraft-implement-feature` — Pi has 3 steps vs Claude/Codex 4 because the Pi process-loop model collapses two phases. Block off the Pi-specific Loop section.
>
> All others (`add-fact` Step 5b, `decompose` execution waves + README step, `design` qualifier, `implement` sibling-README + dependency-warning, `new-feature` Phase 0 scope) → fold into the canonical at full claude fullness. Codex/Pi inherit the longer content.

> **Decision:** Generator pipeline shape:
> ```
> readFlatDir('src/skills/')             // canonical records
>   ↓ for each harness in [claude, codex, pi]:
> applyTemplate(canonical, harness)      // pure transform per file
>   ↓ writeFileSync to src/<harness>-skills/<name>.md   (replaces hand-maintained dirs)
> ↓
> readFlatDir('src/<harness>-skills/')   // re-read (proves disk == in-memory)
>   ↓ formatRecord + write to src/bundled-files.ts      (unchanged)
> ```
> **Rationale:** Re-read from disk after writing keeps `bundled-files.ts` generation logic IDENTICAL to today. Existing sync tests work unchanged. No risk of "in-memory matches but disk drifted."
> **Alternative rejected:** Generate `bundled-files.ts` directly from the in-memory transform output. Smaller, but breaks the "disk is source of truth for bundled-files" invariant the sync tests assume.

> **Decision:** Migration order — **`joycraft-add-context` first** as proof-of-concept (zero out-of-category deltas, only mechanical differences), then the other 10 "clean" skills in alphabetical order, then the 9 out-of-category skills last in dependency order.
> **Rationale:** Clean skills validate the substitution engine end-to-end with zero policy decisions. Once green, the harder migrations get reviewed individually.
> **Verification per skill:** generated variants must `diff` cleanly against existing committed variants (for clean skills) OR diff against documented drift-resolution notes (for the 9 dirty skills).
> **Alternative rejected:** All 20 in one PR. Too large to review; first dirty skill could block the engine landing.

> **Decision:** Test surface — three layers:
> 1. **Unit tests for `applyTemplate`** in `tests/skill-template.test.ts` (new file): variable substitution, conditional blocks (including pipe-lists), frontmatter stripping. Fixture-based.
> 2. **Generator residue assertions** in `tests/generate-bundled-files.test.ts` (extend existing file): no `{{` in any emitted file under `src/*-skills/`; no unclosed `<!-- harness:` block.
> 3. **Existing sync tests unchanged** (`tests/bundled-files-sync.test.ts`, `tests/generate-bundled-files.test.ts`, `tests/codex-skill-parity.test.ts`, `tests/pi-skill-content.test.ts`) — they continue to enforce disk-vs-bundle parity, which is now a consequence of regenerating before commit.
> **Rationale:** Pure-function tests catch logic bugs; residue tests catch typos in canonical sources; sync tests catch missing regen.

> **Decision:** Fold the `CONTRIBUTING.md:91-128` snippet fix into spec 6 (update-contributor-docs).
> **Rationale:** Same file, same audience, same logical change ("how contributors edit skills"). Separating it adds ceremony for a 30-line diff.

> **Decision:** Drift-resolution audit trail = **PR descriptions only**. No discovery doc, no inline canonical comments.
> **Rationale:** Drift theory in agentic engineering is an open research area with no settled answers; joycraft's job is to be useful, not to author a drift theory. If "why is codex now verbose?" becomes a real product concern later, it gets treated as its own feature. Until then, `git log -S` is sufficient archaeology.
> **Alternative rejected:** Single discovery doc. Earns its keep only if we'd actually re-read it; we wouldn't.

> **Decision:** Canonical filenames keep the `joycraft-` prefix — `src/skills/joycraft-add-context.md`.
> **Rationale:** Zero mental translation; grep-friendly; matches what every contributor already types when referring to skills.
> **Alternative rejected:** Strip prefix. Tidier paths but every contributor has to remember the rename.

> **Decision:** Generator FAILS on unknown `{{x}}` variables — throws `Error("unknown template variable: {{x}} in <file>")`.
> **Rationale:** Catches typos at build time, not CI time. The residue test (no `{{` survives) becomes a backstop, not the primary defense. Faster feedback loop.
> **Alternative rejected:** Pass-through with test-time catch. Fails on CI, not locally — slower iteration.

## Section 5: Open Questions

*(All resolved 2026-06-14 — see additions to Section 4 above. No outstanding questions.)*

---

## Summary of what this design resolves

- **Format scope:** default = unify on claude-fullness; 4 named exceptions need conditional blocks (research/verify/lockdown/implement-feature).
- **Syntax spec:** 3 primitives — `{{var}}` from fixed 4-variable lookup, `<!-- harness:NAME -->` blocks with pipe-list NAME, per-harness frontmatter strip. Generator fails fast on unknown variables.
- **Pipeline shape:** `src/skills/` → in-memory transform → write three `src/*-skills/` dirs → re-read → `bundled-files.ts`. Substitution extracted to `scripts/lib/skill-template.mjs` for testability.
- **Migration:** `add-context` first as POC, then 10 clean skills alphabetically, then 9 dirty skills last in dependency order. Per-PR review.
- **Test surface:** 3 layers — unit tests on `applyTemplate`, residue assertions in generator tests, existing sync tests unchanged.
- **CONTRIBUTING fix:** fold into spec 6.
- **Drift audit trail:** PR descriptions only; no discovery doc.
- **Canonical filenames:** keep `joycraft-` prefix.
