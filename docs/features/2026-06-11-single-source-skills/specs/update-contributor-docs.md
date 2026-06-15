---
status: done
owner: Maximilian Maksutovic
created: 2026-06-14
feature: 2026-06-11-single-source-skills
mode: batch
---

# Update Contributor Docs — Atomic Spec

> **Parent Brief:** `docs/features/2026-06-11-single-source-skills/brief.md`
> **Status:** Ready
> **Date:** 2026-06-14
> **Estimated scope:** <1 session / 2 docs files / ~100 lines added, ~40 removed

---

## What

Update `docs/guides/agent-compatibility.md` and `CONTRIBUTING.md` to reflect the single-source skills pipeline so contributors edit canonical sources, not per-harness dirs.

Specifically:

1. **`docs/guides/agent-compatibility.md`** — add a "Canonical skills format" section explaining:
   - All skills live in `src/skills/joycraft-<name>.md` as single-source canonical files.
   - Build-time transform in `scripts/generate-bundled-files.mjs` (orchestrator) + `scripts/lib/skill-template.mjs` (`applyTemplate` engine) generates the three per-harness variants in `src/{claude,codex,pi}-skills/` on `pnpm build`.
   - The three primitives: 4-variable substitution, `<!-- harness:NAME -->` conditional blocks (pipe-list NAMEs allowed), per-harness frontmatter field stripping.
   - The 4 variable expansions table (from design.md Section 4 verbatim, including the multi-surface codex `{{clear}}` expansion).
   - The canonical Cat D form policy (claude: `CLAUDE.md`; codex/pi: `AGENTS.md`; substitute via `{{boundary_file}}`).
   - **"Edit canonical, not per-harness dirs"** — explicit instruction with rationale.
2. **`CONTRIBUTING.md:91-128`** — replace the outdated `node -e "..."` manual-regen snippet with the simple instruction "run `pnpm build`". The current snippet uses backtick escaping that doesn't match the actual generator (per research.md Q2).

## Why

Contributors currently follow the CONTRIBUTING snippet (which fails — it predates the JSON.stringify rewrite of the generator) and edit per-harness dirs (which won't survive the next `pnpm build` after spec 4–6 land — the generator overwrites them from `src/skills/`). Without this doc update, the first external contributor PR after the migration will edit the wrong file and ship a regression.

## Acceptance Criteria

- [ ] `docs/guides/agent-compatibility.md` has a "Canonical skills format" section with: the file layout (`src/skills/` → `src/{claude,codex,pi}-skills/`), the 3 primitives, the 4-variable expansion table, the Cat D canonical form, and the "edit canonical, not per-harness" guidance.
- [ ] `docs/guides/agent-compatibility.md` references `scripts/generate-bundled-files.mjs` and `scripts/lib/skill-template.mjs` by path.
- [ ] `CONTRIBUTING.md:91-128` (or whatever the current line range is) no longer contains the `node -e "..."` snippet; instead, instructs contributors to run `pnpm build`.
- [ ] `CONTRIBUTING.md` references `src/skills/` (canonical) as the edit target, not `src/claude-skills/` / `src/codex-skills/` / `src/pi-skills/`.
- [ ] `pnpm test --run && pnpm typecheck` pass (doc changes shouldn't break any tests, but verify nothing references the removed snippet).
- [ ] Existing markdown link checks (if any in CI) pass.
- [ ] Generated table content matches the canonical 4-variable lookup in `scripts/lib/skill-template.mjs` — if the lookup changes later, the doc must be regenerated. Document this dependency inline.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| Canonical-format section present | `git grep -n 'Canonical skills format' docs/guides/agent-compatibility.md` matches | scripted grep |
| 4 variable expansions documented | `git grep -nE '(skill_prefix\|clear\|skills_dir\|boundary_file)' docs/guides/agent-compatibility.md` returns 4+ matches | scripted grep |
| Conditional block syntax documented | `git grep -n '<!-- harness:' docs/guides/agent-compatibility.md` matches | scripted grep |
| Cat D canonical form documented | `git grep -nE '(CLAUDE\.md.*claude\|AGENTS\.md.*codex)' docs/guides/agent-compatibility.md` matches | scripted grep |
| Old `node -e` snippet removed | `git grep -n 'node -e' CONTRIBUTING.md` returns 0 matches (or only matches unrelated to skill regen) | scripted grep |
| `pnpm build` instruction present | `git grep -n 'pnpm build' CONTRIBUTING.md` matches in the relevant section | scripted grep |
| `src/skills/` referenced as edit target | `git grep -n 'src/skills/' CONTRIBUTING.md` matches | scripted grep |
| No reference to per-harness dirs as edit target in CONTRIBUTING | Read the surrounding prose around any `src/claude-skills/` mention; if any says "edit this", that's a regression | manual |
| Test suite still green | `pnpm test --run && pnpm typecheck` | integration |

**Execution order:**
1. Read current `docs/guides/agent-compatibility.md` to find the right place for the new section (probably after any "skills" overview or near the end as a contributor-facing reference).
2. Read `CONTRIBUTING.md` to locate the outdated snippet (lines 91-128 per research.md, may have shifted).
3. Draft the "Canonical skills format" section using design.md Section 4 as authoritative content.
4. Replace the CONTRIBUTING snippet with the simple `pnpm build` instruction.
5. Run greps to confirm acceptance criteria.
6. Run test suite; commit.

**Smoke test:** the grep checks above run in <1s — use them as you draft.

**Before implementing, verify your test harness:**
1. Confirm spec 6 has landed (`ls src/skills/ | wc -l` = 20). Doc references to the canonical setup are only correct if the setup exists.
2. Confirm `scripts/lib/skill-template.mjs` exists and exports `applyTemplate`. Doc references to that path will mislead if not.
3. Confirm the current CONTRIBUTING snippet is actually broken (matches research.md Q2) — re-read lines 91-128 to confirm. If it's already been fixed, the spec scope shrinks.

## Constraints

- MUST: pull the 4-variable expansion table content from design.md Section 4 verbatim (single source of truth — don't paraphrase).
- MUST: reference both `scripts/generate-bundled-files.mjs` (orchestrator) and `scripts/lib/skill-template.mjs` (engine) by path so contributors know where to look.
- MUST: document the Cat D canonical form (`CLAUDE.md` for claude, `AGENTS.md` for codex/pi, `{{boundary_file}}` for substitution).
- MUST: explicitly tell contributors to edit `src/skills/`, not the three per-harness dirs.
- MUST NOT: introduce new variable names or syntax not already in design.md Section 4.
- MUST NOT: replicate skill content into the doc (e.g. no "here's an example of the full `joycraft-add-context.md` canonical"). Link to the canonical file or use a tiny illustrative snippet only.
- MUST NOT: leave the outdated `node -e` snippet in CONTRIBUTING. Replace it entirely.

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Modify | `docs/guides/agent-compatibility.md` | Add "Canonical skills format" section (~80 lines): file layout, 3 primitives, 4-variable table, Cat D form, edit guidance. References to `scripts/generate-bundled-files.mjs` and `scripts/lib/skill-template.mjs`. |
| Modify | `CONTRIBUTING.md` | Replace lines ~91-128 (the `node -e "..."` snippet) with a short "run `pnpm build` after editing `src/skills/`" instruction. Update any other references to per-harness dirs as edit targets. |

## Approach

**Section structure for `docs/guides/agent-compatibility.md`:**

```markdown
## Canonical skills format

All skills live in `src/skills/joycraft-<name>.md`. At build time, `scripts/generate-bundled-files.mjs` reads canonical files and emits per-harness variants into `src/claude-skills/`, `src/codex-skills/`, and `src/pi-skills/`. The transform itself lives in `scripts/lib/skill-template.mjs` as the pure function `applyTemplate(source, harness)`.

### Three primitives

1. **Variable substitution** — `{{var}}` is replaced from a per-harness lookup. The fixed 4-variable set (extend only via design discussion):

   | Variable | claude | codex | pi |
   |---|---|---|---|
   | `{{skill_prefix}}` | `/joycraft-` | `$joycraft-` | `/skill:joycraft-` |
   | `{{clear}}` | `/clear` | `run \`/clear\` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app` | `/new` |
   | `{{skills_dir}}` | `.claude/skills` | `.agents/skills` | `.pi/skills` |
   | `{{boundary_file}}` | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |

   The generator throws `Error("unknown template variable: {{x}} in <file>")` on any unrecognized variable — catches typos at build time.

2. **Conditional blocks** — `<!-- harness:NAME -->...<!-- /harness -->` where NAME is `claude`, `codex`, `pi`, or a pipe-list like `claude|codex`. Block is kept iff the current harness is in NAME; otherwise the block is removed (delimiters included). Currently used in 4 skills: `joycraft-research`, `joycraft-verify`, `joycraft-lockdown`, `joycraft-implement-feature`. Don't add new blocks without a design decision.

3. **Per-harness frontmatter stripping** — the generator drops `instructions:` from codex and pi frontmatter (claude keeps it). Other fields preserved as-is.

### Edit canonical, not the per-harness dirs

The three `src/{claude,codex,pi}-skills/` dirs are **generated artifacts**. Editing them directly is a dead-end — the next `pnpm build` will overwrite your changes from `src/skills/`. The generated dirs stay committed so PR diffs show canonical + all three outputs (reviewers see per-harness deltas at merge time), but the source of truth is always `src/skills/`.

After editing any file in `src/skills/`, run `pnpm build` — it regenerates the per-harness dirs *and* `src/bundled-files.ts`. Commit all three together (per the bundle-regen-per-commit discipline in `docs/discoveries/2026-06-11-bundle-regen-per-commit.md`).
```

**CONTRIBUTING.md replacement** (replaces lines 91-128 or current equivalent):

```markdown
After editing any file in `src/skills/`, run:

\`\`\`
pnpm build
\`\`\`

This regenerates `src/{claude,codex,pi}-skills/` and `src/bundled-files.ts`. Commit the canonical file, all three regenerated per-harness files, and `src/bundled-files.ts` together — sync tests in CI enforce this lockstep.

Then verify:

\`\`\`
pnpm test --run && pnpm typecheck
\`\`\`
```

**Rejected alternative:** put the canonical-format section in CONTRIBUTING.md instead of agent-compatibility.md. Agent-compatibility is the contributor's reference for "how does this harness stuff work" — keeping the canonical-format details there matches what contributors will look for. CONTRIBUTING is for "how do I make a contribution" mechanics.

**Rejected alternative:** auto-generate the 4-variable table from `scripts/lib/skill-template.mjs`. Adds a doc-build step for one table; manually keeping the doc in sync is fine for a 4-row table that changes rarely.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `docs/guides/agent-compatibility.md` already has a "skills format" section that contradicts the new content | Replace it entirely — the canonical-format pipeline is the new reality. Note in PR what was removed. |
| `CONTRIBUTING.md` line numbers have shifted (research.md said 91-128 but maybe it's now 95-130) | Find the `node -e` snippet by text search, replace whatever lines it occupies. Don't trust line numbers. |
| The 4-variable expansion table in design.md has been updated post-decomposition | Pull from current design.md, not from this spec's transcription. If the spec's transcription disagrees, design.md wins. Note in PR. |
| A reader of the doc clicks the `scripts/lib/skill-template.mjs` reference and the file doesn't exist | Spec 1 hasn't landed. Block this spec until spec 1 is in. |
| The codex `{{clear}}` expansion in the doc is the long multi-surface sentence; reader thinks it's a docs typo | The sentence is correct (web research 2026-06-14 — `/clear` does not exist in Codex desktop). Inline a one-line footnote pointing at the brief's Hard Constraints section. |
