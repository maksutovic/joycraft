# Create Codex Skill Source Files — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-04-06-codex-skills-support.md`
> **Status:** Complete
> **Date:** 2026-04-06
> **Estimated scope:** 1 session / 12 new files / ~3000 lines

---

## What

Create `src/codex-skills/` containing 12 Codex-adapted skill files — one for each existing Claude skill in `src/skills/`. Each Codex skill is a manually authored markdown file with YAML frontmatter (`name`, `description`) that adapts the Claude version's workflow for Codex's tool and invocation model. The `name` in each Codex skill's frontmatter MUST match the corresponding Claude skill's `name` exactly.

## Why

Without Codex-specific skill source files, there is nothing to bundle, install, or upgrade for Codex users. This is the foundation all other specs depend on.

## Acceptance Criteria

- [ ] `src/codex-skills/` directory exists with exactly 12 `.md` files
- [ ] Each file has valid YAML frontmatter with `name` and `description` fields
- [ ] Each `name` matches the corresponding Claude skill's `name` exactly (e.g., `joycraft-tune`)
- [ ] No references to Claude-specific tools (`Grep`, `Glob`, `Read`, `Edit`, `Write`, `Agent`, `Skill`, `TodoWrite`, `LSP`, `EnterWorktree`)
- [ ] Skill cross-references use `$joycraft-*` syntax (not `/joycraft-*`)
- [ ] No references to Claude Code `Skill` tool invocation — use prose descriptions instead
- [ ] Each skill preserves the same workflow steps and structure as its Claude counterpart
- [ ] Build passes
- [ ] Tests pass (existing tests — no new tests in this spec)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| 12 files exist | Count files in `src/codex-skills/` | unit (Spec 5) |
| Valid frontmatter | Parse YAML frontmatter of each file | unit (Spec 5) |
| Name parity | Compare `name` fields across `src/skills/` and `src/codex-skills/` | unit (Spec 5) |
| No Claude tool refs | Grep each file for banned tool names | unit (Spec 5) |
| `$` invocation syntax | Grep for `/joycraft-` (should find zero matches) | unit (Spec 5) |

**Note:** Automated tests for this spec are covered by Spec 5 (codex-skill-parity-test). Manual verification during authoring: read each file and confirm the workflow is coherent.

**Smoke test:** `grep -r '/joycraft-' src/codex-skills/` should return zero results.

## Constraints

- MUST: Keep the same skill names across both platforms
- MUST: Author each file manually — no automated transforms from Claude skills
- MUST: Each file is self-contained markdown (no imports, no script references)
- MUST NOT: Add `scripts/`, `references/`, `assets/`, or `agents/openai.yaml`
- MUST NOT: Modify any existing Claude skill files in `src/skills/`

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/codex-skills/joycraft-tune.md` | Codex-adapted tune skill |
| Create | `src/codex-skills/joycraft-interview.md` | Codex-adapted interview skill |
| Create | `src/codex-skills/joycraft-new-feature.md` | Codex-adapted new-feature skill |
| Create | `src/codex-skills/joycraft-decompose.md` | Codex-adapted decompose skill |
| Create | `src/codex-skills/joycraft-session-end.md` | Codex-adapted session-end skill |
| Create | `src/codex-skills/joycraft-verify.md` | Codex-adapted verify skill |
| Create | `src/codex-skills/joycraft-lockdown.md` | Codex-adapted lockdown skill |
| Create | `src/codex-skills/joycraft-implement-level5.md` | Codex-adapted implement-level5 skill |
| Create | `src/codex-skills/joycraft-add-fact.md` | Codex-adapted add-fact skill |
| Create | `src/codex-skills/joycraft-bugfix.md` | Codex-adapted bugfix skill |
| Create | `src/codex-skills/joycraft-design.md` | Codex-adapted design skill |
| Create | `src/codex-skills/joycraft-research.md` | Codex-adapted research skill |

## Approach

For each of the 12 Claude skills in `src/skills/`, create a corresponding file in `src/codex-skills/` by:

1. **Copy the workflow structure** — same headings, same steps, same logic flow
2. **Replace tool references** — Claude-specific tool names become generic descriptions:
   - `Grep` / `Glob` → "search the codebase for"
   - `Read` → "read the file"
   - `Edit` / `Write` → "edit the file" / "create the file"
   - `Agent` tool → "spawn a subagent" (Codex supports concurrent subagent threads)
   - `TodoWrite` → remove or describe as optional progress tracking
   - `Skill` tool → remove (Codex has no programmatic skill invocation)
   - `LSP` → remove (Codex has no LSP tool)
   - `EnterWorktree` → remove (Codex has no worktree management)
3. **Replace invocation syntax** — `/joycraft-*` becomes `$joycraft-*`
4. **Simplify multi-agent patterns** — `joycraft-verify` (spawns read-only subagent) and `joycraft-implement-level5` (multi-agent orchestration) need the most adaptation. Simplify to basic subagent patterns.
5. **Preserve frontmatter** — `name` must match exactly; `description` should match or be a close paraphrase

**Rejected alternative:** Auto-transforming Claude skills with sed/regex. Rejected because skills are natural language — automated transforms produce awkward phrasing and miss context-dependent references. Manual authoring is more reliable and the maintenance burden is low (skills change infrequently).

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Claude skill uses `TodoWrite` for progress tracking | Remove the reference; describe progress tracking as implicit/optional |
| Claude skill chains to another skill via `Skill` tool | Replace with prose: "run `$joycraft-verify`" — Codex will match implicitly or user invokes explicitly |
| Claude skill spawns a read-only subagent (verify) | Simplify to a basic subagent spawn — Codex subagents don't have named teammate semantics |
| Claude skill references `EnterWorktree` for isolation | Remove worktree references; Codex doesn't support this |
| Claude skill has `instructions: N` in frontmatter | Drop this field — Codex doesn't use it |
