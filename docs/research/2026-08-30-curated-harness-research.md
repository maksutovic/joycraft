---
status: active
owner: Maximilian Maksutovic
created: 2026-08-30
feature: 2026-08-30-curated-harness
---

# Codebase Research — curated-harness (read-telemetry feasibility + skill architecture)

**Date:** 2026-08-30
**Questions answered:** 10/10
**Brief:** docs/research/2026-08-30-curated-harness-brief.md

## Prior knowledge reused

- `docs/context/decision-log.md` 2026-07-21 living-harness D3 — skill taxonomy (`entry: human|agent|situational`), human-door budget ≤9, description budget; new doors are the scarce resource.
- `docs/context/decision-log.md` 2026-07-21 living-harness D1/D6 — Reaper deletes shipped folders only post-merge; undead folders archive-move to `docs/archive/features/`.
- `docs/context/decision-log.md` 2026-05-30 — two-tier wrap-up: `spec-done` (light) vs `session-end` (heavy, once per feature).
- `docs/context/decision-log.md` 2026-07-27 output-style D5 — ONE_HOME: single home per idea, local rules cite the doc.
- `docs/context/shipped.md` 2026-07-21 living-harness row — optimize v2 six-disposition audit + Reaper already shipped (PR #55).
(Grep terms: transcript, telemetry, memory, reaper, optimize, harden, session-end, knowledge layer. Decision-log hits truncated to newest relevant rows within the 5-row cap.)

---

## Q1: Claude Code transcript location, format, and path extractability

**Location:** `~/.claude/projects/-Users-compiler-Developer-joycraft/` — one `<session-uuid>.jsonl` per session (6 files here, 420KB–1.97MB each, 12MB total for the project dir), plus per-session dirs (`tool-results/`), a `memory/` dir. Sibling projects follow the same cwd-dash-encoded naming (`/` → `-`).

**Format:** JSON Lines. Line types: `mode`, `file-history-snapshot`, `user`, `assistant`. Envelope keys: `parentUuid`, `isSidechain`, `type`, `message`, `uuid`, `timestamp`, `sessionId`, `cwd`, `gitBranch`, `version`, `userType`, `entrypoint`; assistant lines add `requestId`, `effort`, sometimes `attributionSkill`. `message` is the Anthropic-API-shaped message (`role`, `content` array).

**Tool-call paths are machine-extractable** — structured `input.file_path` inside `tool_use` content blocks:

```json
{"type":"assistant","timestamp":"2026-08-11T19:38:31.837Z","cwd":"/Users/compiler/Developer/joycraft","gitBranch":"feature/ste-human-output",
 "message":{"content":[{"type":"tool_use","name":"Read",
   "input":{"file_path":"/Users/compiler/Developer/joycraft/src/upgrade.ts","offset":395,"limit":60}}]}}
```

Write and Edit have the same shape (`input.file_path` + `content` / `old_string`/`new_string`/`replace_all`). A read/write counter per doc is a jq/JSONL scan over `tool_use` blocks filtered by `name` ∈ {Read, Write, Edit} and `file_path` prefix.

## Q2: Codex and Pi local session storage

**Codex — yes.** `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<uuid>.jsonl` (1,534 files, 6.2GB on this machine). Lines: `{"timestamp","type","payload"}`; types `session_meta` (has `cwd`), `response_item` (`function_call`, `function_call_output`, `message`, `reasoning`), `event_msg`, `token_count`. **File operations appear as `exec_command` shell calls with stringified `arguments`** — no dedicated Read/Write tools, so extracting doc reads requires parsing shell command strings (grep/cat/sed targets), not a structured field. Also `~/.codex/history.jsonl`, `session_index.jsonl`, large sqlite logs.

**Pi — yes.** `~/.pi/agent/sessions/--<cwd-dash-encoded>--/<ISO-timestamp>_<uuid>.jsonl` (31 joycraft session files; 147MB across all projects). First lines: `{"type":"session","version":3,"id",...,"cwd"}` then typed event lines. Plus `~/.pi/agent/run-history.jsonl` (`{"agent","task","ts","status","duration"}` per run).

## Q3: optimize's current evidence machinery

`src/skills/joycraft-optimize.md`. Dispositions (exactly six, bare word only): `KEEP`, `ONE_HOME`, `LOAD_LATER`, `MAKE_A_CHECK`, `PROBATION`, `RETIRE`. Evidence labels (exactly five): `VERIFIED` (only for things this run mechanically checked), `USER_REPORTED`, `INFERRED`, `INACCESSIBLE`, `NOT_APPLICABLE`.

Evidence-gathering steps: platform detect → control inventory (boundaries, skills, hooks, deny entries, `docs/context/*.md`, template pointers; per control: Home, Disposition, Evidence, Reason) → cross-file duplication scan (→ ONE_HOME with canonical-home precedence) → deterministic budget checks (`wc -l` ≤200 on shipped.md/decision-log.md, boundary file, each skill) → skill taxonomy check (entry declared; ≤9 human doors; description totals PASS ≤6,000 / WARN >6,000 / FAIL >8,000 chars) → plugins/MCP audit (reads `~/.claude/settings.json`, `~/.codex/config.toml`, `~/.pi/config.json`, `~/.config/github-copilot/mcp.json` at runtime) → hooks audit → slot-templated report → Reaper pass (shipped-delete requires `reap: eligible` + shipped.md row + `gh pr view` MERGED; undead → archive-move only).

## Q4: Knowledge-layer writers and routing order

Fifteen skills reference `docs/context/`/`docs/discoveries/`; the routing owners are:

- **`joycraft-add-fact`** — Step 2 classifies into one of five context docs by content signals (production-map / dangerous-assumptions / decision-log / institutional-knowledge / troubleshooting); Step 2b overlap-grep (update-in-place per `docs/reference/knowledge-lifecycle.md`, conflicts → human); Steps 3–5 lazy-create + append (prepend for time-ordered tables, never modify rows, 200-line rotation); Step 5b frontmatter bump; **Step 6 (last, optional): add a boundary rule to `{{boundary_file}}` only if ALWAYS/NEVER-shaped and damage-preventing**. Doc-classification runs first; boundary/check consideration runs last; no step considers a deny-pattern or CI check.
- **`joycraft-session-end`** — Step 1 consolidates spec-done stubs into `docs/discoveries/YYYY-MM-DD-topic.md` (4-field personal frontmatter: `status/owner/created/feature`); Step 1b routes by category to four context docs; Step 2b (feature done) prepends the shipped.md ledger row, verifies D-ids, sets `reap: eligible`.
- **`joycraft-spec-done`** — 2-line discovery stub only if something contradicted the spec; no context routing.

## Q5: Skill build pipeline

`src/skills/*.md` (22 canonical) → `scripts/generate-bundled-files.mjs` runs `applyTemplate(source, harness, file)` (`scripts/lib/skill-template.mjs`) per harness → `src/{claude,codex,pi,copilot}-skills/` → embedded into `src/bundled-files.ts` (`SKILLS`, `CODEX_SKILLS`, `PI_SKILLS`, `COPILOT_SKILLS`, plus `TEMPLATES`, `PI_SCRIPTS`, `PI_EXTENSIONS`, `PI_AGENTS`) → `scripts/sync-skills.mjs` copies byte-for-byte into installed trees (`.claude/skills`, `.agents/skills`, `.pi/skills`, `.github/skills`) and pushes `src/local-skills/` (never bundled) through the same transform. `pnpm build` and `pnpm sync-skills` chain generate→sync.

`applyTemplate` primitives: (1) `{{var}}` substitution over four per-harness vars — `skill_prefix`, `clear`, `skills_dir`, `boundary_file` (CLAUDE.md for claude, AGENTS.md for the rest); unknown var throws. (2) `<!-- harness:NAME -->…<!-- /harness -->` conditional blocks (pipe-lists allowed, works in frontmatter). (3) `instructions:` frontmatter stripped for codex/pi/copilot.

## Q6: Skill frontmatter and enforcing tests

Frontmatter: `name:`, `entry:` (claude-only via harness block; `human|agent|situational`), `description:`, optional `instructions: <n>`. 79 test files (12,351 lines) include: `upgrade-optimize-v2.test.ts` (entry taxonomy, ≤9 human doors, budget text), `skill-frontmatter.test.ts` (8 artifact-emitting skills instruct frontmatter emission), `codex-skill-parity.test.ts` / `pi-skill-content.test.ts` (per-harness correctness), `generated-skills-fresh` / `installed-skills-sync` / `bundled-files-sync` (three-way freshness), `gate-contract.test.ts` (seven gate skills carry inline slot template + cap sentence; render steps cite `REVIEW_GATE_TEMPLATE.html`, degrade headlessly), `output-style-pointer` + `style-pointer-placement` (exactly eleven D7 skills cite output-style.md at output moments), `skill-handoff.test.ts`, `canonical-boundary-forms`, `stale-skill-paths`, `skill-template.test.ts` (the engine itself).

## Q7: Generated CLAUDE.md/AGENTS.md sections and merge logic

Sources: `src/improve-claude-md.ts` (generators + merge), `src/agents-md.ts`, `src/execution-profile.ts`, orchestrated by `src/init.ts`; docs-layer templates in `src/templates/context/`.

`generateCLAUDEMd` emits: title + Component/Stack line, `## Behavioral Boundaries` (ALWAYS / ASK FIRST / NEVER), optional `### External API Safety`, `## Development Workflow`, `## Architecture`, `## Key Files`, `## Common Gotchas`, `## Context Map`, `## Getting Started with Joycraft`, optional `## Execution Profile`, private note, `## Project Tools`, `## Areas`. `generateAgentsMd`: title, boundaries + API safety, `## Architecture` (TODO stub), `## Key Files` (TODO table), `## Development` (StackInfo commands), optional Execution Profile. **No section for product identity/values, glossary, or taste exists in either generator.**

Merge (`improveCLAUDEMd`/`improveAgentsMd`): parse `## `-delimited sections; append a generated section only if no existing header matches its case-insensitive regex (e.g. `/behavioral\s*boundar/i`); existing content never modified; appends at end. Exceptions: `## Areas` re-evaluated each run; private note matched on marker phrase; `## Execution Profile` sentinel-delimited and byte-preserved.

## Q8: External-path reads and boundaries

One `src/` site: `src/frontmatter.ts:115-122` — `defaultMemoryDir()` = `$HOME/.claude/projects/<cwd-dash-encoded>/memory`, used by `resolveOwner()` to read/write `joycraft-owner.txt` (fallback after `git config user.name`). No other HOME use in `src/`/`scripts/` (matches in `bundled-files.ts` are skill prose — optimize reads harness configs at runtime). AGENTS.md forbids absolute paths **in templates and skills** (they get copied into user projects); it does not forbid runtime reads of external files generally. Scenarios-repo access is the only hard external prohibition.

## Q9: The knowledge layer today

`docs/discoveries/`: 32 flat files, `YYYY-MM-DD-topic.md`, 4-field personal frontmatter (`status/owner/created/feature`) + Expected/Actual/Impact entries. `docs/context/`: 6 files, 223 lines total (decision-log 82, institutional-knowledge 41, production-map 30, dangerous-assumptions 28, anchors 26, shipped 16); all but production-map carry `last_updated`/`last_updated_by`. Schemas: decision-log `| Date | Decision | Why | Alternatives Rejected | Revisit When |`; shipped `| Date | Feature | What shipped | Where | PR | Owner |` (200-line budget, shard rotation); dangerous-assumptions `| Agent Might Assume | But Actually | Impact If Wrong |`. Lifecycle rules live in `docs/reference/knowledge-lifecycle.md` (200-line live head, numbered shards, pointer-only manifest). Discoveries carry `status:` + `created:` but no expiry/graduation field.

## Q10: Skill-content quality infrastructure

`scripts/ste-lint.py` — vendored ASD-STE100 regex linter (SimpleEnglish v1.2.0, MIT): sentence length (20/25 words), contractions, banned modals, perfect tense, -ing clauses, semicolons, latin abbrevs, slop words, synonym rotation; JSON output; maintainer-only (`scripts/` not in package `files`). `tests/ste-lint.test.ts` shells to it: five fix-to-zero classes asserted on output-style.md governed prose and the gate template's SLOT guidance; advisory classes reported only; skips legibly without python3. All other content gates are vitest suites (Q6); holdout evals live in the off-limits scenarios repo.

---

## Brief updates (reconciliation)

Checked `docs/research/2026-08-30-curated-harness-brief.md` against findings; edits made in place (mechanical, consistent with brief intent):

1. **Workstream 1 feasibility confirmed and graded** — Claude Code: trivially feasible (structured `input.file_path`, jq-scannable JSONL, per-project dir). Pi: feasible (typed JSONL sessions per cwd). **Codex: harder** — file ops are `exec_command` shell strings, so doc-read detection needs command-string parsing (lower fidelity). Brief updated to note per-harness feasibility grades.
2. **Precedent exists for reading outside the project** — `src/frontmatter.ts` already reads `~/.claude/projects/<slug>/memory/`; the boundary only forbids absolute paths *inside shipped templates/skills*. Telemetry code in `src/` is boundary-compatible; a shipped *skill* doing the scan must express the path via a variable/lookup, not a literal.
3. **Workstream 3 confirmed precisely** — add-fact's boundary consideration is Step 6 (last, optional, prose-only); no step considers deny-patterns or CI checks. "Harden-first" is a reorder of an existing rubric, not new machinery.
4. **Workstream 4 confirmed** — neither generator emits identity/glossary/taste sections; merge logic appends by header-regex, so new sections slot in without touching existing content (low-risk addition path).
5. **Workstream 6 interaction noted** — `resolveOwner()` persists `joycraft-owner.txt` in the auto-memory dir; disabling auto-memory leaves the dir dormant (still readable/writable), so owner resolution survives, but deleting the dir would drop the cached owner (git config fallback covers it).
