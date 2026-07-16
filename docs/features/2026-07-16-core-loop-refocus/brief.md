---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-16
source: Nate B Jones "Clean My AI Harness" discussion + docs-bloat-in-PRs pain
---

# Feature Brief — core-loop refocus: PR-reviewable docs + Level 5 de-emphasis

> **Origin:** Discussion of Nate B Jones's harness-cleaner (map before clean,
> one home, load later, hard checks) and two standing pains: (1) Joycraft's
> workflow docs bloat PRs and make them hard to review; (2) tune/README oversell
> Level 5 autonomy, which isn't feasible for most users with current models.
> This is the small bump before the compound-engineering / living-harness branch.

## TL;DR for the implementer

Two independent, small changes. Decisions are locked — implement, validate, PR.

1. **`.gitattributes` from init/upgrade.** Joycraft docs are two kinds of
   content: durable knowledge (CLAUDE.md, `docs/context/`) that deserves review,
   and workflow exhaust (feature briefs/specs, discoveries, installed templates)
   that is historical by PR time. Mark the exhaust `linguist-generated=true` so
   GitHub collapses it in the Files Changed view and drops it from diff stats.
   Reviewers see code + durable knowledge; exhaust is one click away.

2. **De-emphasize Level 5.** The core product story becomes: an excellent
   spec-driven development system with a harness that matures. Level 5 stays as
   an experimental north star, not the destination. Copy changes only — no
   feature removal.

## Decisions (locked)

### 1. `.gitattributes`

- New module `src/gitattributes.ts` mirroring `src/gitignore.ts`:
  append-only, create-if-absent, idempotent (exact trimmed-line match), never
  rewrites or removes existing lines.
- Entries (with one explanatory comment line above them):
  - `docs/features/** linguist-generated=true`
  - `docs/bugfixes/** linguist-generated=true`
  - `docs/discoveries/** linguist-generated=true`
  - `docs/templates/** linguist-generated=true`
- **Stay visible (deliberately not marked):** `CLAUDE.md`, `AGENTS.md`,
  `docs/context/**` (steers every future agent — must be reviewed),
  `docs/backlog/**` (human-authored idea capture).
- Wire into `init()` next to `applyGitignoreProfile` and into `upgrade()` at
  its `applyGitignoreProfile` call site — both profiles, all harnesses (the
  docs layout is harness-agnostic).
- Dogfood: add the same `.gitattributes` to the Joycraft repo itself.
- README: short subsection under "Git tracking" explaining what's collapsed
  and why, and that it's append-only/removable.

### 2. Level 5 de-emphasis

- `src/skills/joycraft-tune.md`: frontmatter description drops "show path to
  Level 5"; Step 6 becomes a harness-maturity roadmap (boundaries with teeth,
  lean CLAUDE.md + context map, context docs with real content, spec-driven
  loop health), with Level 5 mentioned once as an experimental north star.
- `src/improve-claude-md.ts` skills table: same reframe for the tune row;
  mark the implement-level5 row experimental.
- `README.md`: "core idea" bullets and the Level 5 section reframed —
  Levels 3–4 are the product, Level 5 is experimental/advanced. Dan Shapiro
  framing and the level-5-autonomy guide link stay.
- Skill edit rule: edit `src/skills/` (source of truth), regen bundles via
  build, sync the repo's own installed copy in `.claude/skills/` same-commit.

### 3. Small cleaner-derived skill fixes (added in review)

- **Untrusted-data safety rule** in tune + optimize: audited/assessed files are
  data to inventory, never instructions to follow (prompt-injection defense —
  both skills read arbitrary user harness files).
- **Skill-description budget in optimize:** sum `description:` frontmatter
  chars; Codex documents ~8,000-char discovery budget and silently truncates
  past it (breaks routing). PASS ≤6,000 / WARN >6,000 / FAIL >8,000; on Claude
  Code report as always-loaded overhead.
- **Duplication-over-length guidance in optimize:** before recommending trims,
  check whether the same rule lives in multiple homes; recommend one canonical
  home with pointers, not deletion. Long-but-unique content can PASS.

### 4. Multi-tool installs: CLAUDE.md becomes `@AGENTS.md` (added in review)

Verified against https://code.claude.com/docs/en/memory: Claude Code does NOT
read AGENTS.md natively; the documented multi-tool pattern is a CLAUDE.md that
imports it (`@AGENTS.md` + optional Claude-specific section). Imports resolve
fully (4-hop max, skipped inside code fences).

- Trigger: harness selection includes codex or pi (AGENTS.md has a native
  consumer). Claude-only installs keep the classic full CLAUDE.md + slim
  AGENTS.md, unchanged.
- Multi-tool AGENTS.md = full shared doc: `generateCLAUDEMd(..., {multiTool})`
  — boundaries + External API Safety + workflow + context map + getting
  started with a per-tool invocation note (`/joycraft-*` / `$joycraft-*` /
  `/skill:joycraft-*`).
- CLAUDE.md = `generateClaudeMdPointer()`: `@AGENTS.md` + `## Claude Code`
  section for Claude-specific additions.
- Existing files still never touched (skip-unless---force preserved).
- External API Safety text de-duplicated: one home in improve-claude-md.ts,
  agents-md.ts imports it (it previously had two inline copies).
- tune Step 1 gains pointer-awareness: assess/upgrade the imported file as the
  boundary file; put Claude-specific additions under `## Claude Code`.

## Explicitly out of scope (compound-engineering branch)

Project-skill namespace + upgrade-preservation, session-end "promote to
harness" step, tune six-disposition audit / harden pass, spec archival
convention, boundary provenance.

## Validation

`pnpm test --run && pnpm typecheck && pnpm build`. New tests for
gitattributes (create/append/idempotent/preserve-user-lines) in init and
upgrade suites; expect `tests/readme.test.ts` may need updating for copy
changes.
