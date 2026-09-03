---
status: active
owner: Maximilian Maksutovic
created: 2026-09-02
feature: 2026-09-02-omp-support
decisions:
  - { id: D1, status: clarified, choice: "Phased: skills-only harness now, headless runtime port later", rationale: "human choice 2026-09-02; Pi's runtime spec shipped against a fictional SDK and needed two post-mortem specs, so the runtime port earns its own feature with the porting notes already gathered" }
  - { id: D2, status: clarified, choice: "Write no .omp/AGENTS.md and no .omp/RULES.md; rely on the root AGENTS.md/CLAUDE.md pair", rationale: "human choice 2026-09-02; omp already loads root AGENTS.md and CLAUDE.md with @ imports, so a native copy is a second file to keep in sync for no new behavior" }
  - { id: D3, status: backlogged, choice: "omp deny patterns (bash.patterns in .omp/config.yml) go to docs/backlog with the cross-harness safeguard gap", rationale: "human choice 2026-09-02; safeguard.ts is Claude-only for Codex, Pi, and Copilot too, so fixing omp alone is inconsistent" }
  - { id: D4, status: clarified, choice: "joycraft telemetry scans ~/.omp/agent/sessions/<encoded-cwd>/*.jsonl", rationale: "human choice 2026-09-02; the layout is the Pi JSONL family, so the scanner is one default dir plus parser reuse" }
  - { id: D5, status: clarified, choice: "omp joins the legacy 'all harnesses' fallback, same as Copilot in 0.7.5", rationale: "human choice 2026-09-02; consistent with both prior harness additions, documented in CHANGELOG" }
  - { id: D6, status: clarified, choice: "Tests mirror the Copilot suite: parity test cloned from codex-skill-parity, existing per-harness tests extended", rationale: "human choice 2026-09-02; no live omp smoke in CI because omp is not on the CI PATH" }
  - { id: D7, status: clarified, choice: "Capture both deferred items to docs/backlog/", rationale: "human choice 2026-09-02" }
  - { id: D8, status: clarified, choice: "omp transform vars: skill_prefix /skill:joycraft-, clear /new, skills_dir .omp/skills, boundary_file AGENTS.md", rationale: "agent proposal, grounded in omp v18.1.5 bundled docs: /skill:<name> is the user invocation form and /new is a built-in session boundary; mirrors the Pi row" }
  - { id: D9, status: clarified, choice: "Harness-block rule for omp: Pi invocation syntax plus Codex/Copilot runtime semantics (no headless loop) until D1's runtime port ships", rationale: "agent proposal; omp does not read .pi/ so every Pi block that names joycraft-implement-loop or a .pi/ path is false for omp, while the no-runtime Codex/Copilot text is true" }
---

# omp Support — Feature Brief

> **Date:** 2026-09-02
> **Project:** Joycraft

---

## Vision

Joycraft installs its harness into four tools: Claude Code, Codex, Pi, and GitHub Copilot. omp (Oh My Pi, binary `omp`, npm package `@oh-my-pi/pi-coding-agent`, repo `github.com/can1357/oh-my-pi`, maintained by Can Bölük) is a Bun-based fork of Mario Zechner's Pi with its own config directory, its own discovery rules, and a large headless surface. The local install is v18.1.5 via Homebrew, and every discovery claim below was read from that version's bundled docs (anchor: 100). A developer who runs omp today gets nothing from `npx joycraft init`, because omp does not read the `.pi/` tree at all (anchor: 100).

This feature makes omp the fifth first-class harness. `init` offers it in the harness menu, skills generate into `.omp/skills/<name>/SKILL.md`, `upgrade` manages that tree, the `private` gitignore profile scopes to it, and `joycraft telemetry` reads omp session transcripts. The install surface mirrors the Copilot addition in 0.7.5, which touched the harness enum, the skill transform table, the bundle generator, init, upgrade, gitignore, and the per-harness tests (anchor: 100).

The Pi headless runtime (spec-queue scripts, the pipeline extension, the researcher and verifier agents) does not ship in this feature. omp discovers extensions, agents, and hooks only under `.omp/`, and its extension API is the Pi API under a renamed import scope (anchor: 75). Porting that runtime is a separate backlog item so that this feature stays a one-week install-surface change.

What omp already gives us for free shapes the design. omp discovers `.claude/skills` (priority 80), `.agents/skills` (priority 70), and `.github/skills` (priority 30), and it loads the root `AGENTS.md` and `CLAUDE.md` with `@` imports expanded (anchor: 100). A native `.omp/skills` entry wins any name collision at priority 100 (anchor: 100). So an omp-only install needs only the native skills tree, and a multi-harness install stays correct because the omp-flavored copy shadows the others.

## User Stories

- As a developer on omp, I want `npx joycraft init` to offer omp so that I get skills in omp's own invocation form (`/skill:joycraft-*`) without a `.claude/` or `.pi/` footprint.
- As a maintainer, I want omp wired through the same enum, transform table, generator, and sync script as the other harnesses so that one skill edit still regenerates every harness copy.
- As a developer with an existing Joycraft project, I want `npx joycraft upgrade` to add and then manage `.omp/skills` so that the tree never drifts from the bundled version.
- As a maintainer measuring skill usage, I want `joycraft telemetry` to read omp transcripts so that omp sessions count alongside Claude, Pi, and Codex sessions.

## Hard Constraints

- MUST: add `omp` to `HARNESSES` in `src/harness.ts` and to every per-harness gate in `src/init.ts`, `src/upgrade.ts`, and `src/gitignore.ts` (anchor: 100).
- MUST: add an `omp` row to `LOOKUP` in `scripts/lib/skill-template.mjs` with the D8 values, and an `omp` entry in `STRIP_INSTRUCTIONS` (anchor: 100).
- MUST: generate `src/omp-skills/` from `src/skills/` and export an `OMP_SKILLS` record from `src/bundled-files.ts`, wired through `scripts/generate-bundled-files.mjs` and `scripts/sync-skills.mjs` with an `.omp/skills` target in this repo (anchor: 100).
- MUST: include `omp` in the `multiTool` expression at `src/init.ts:246` so that an omp-only install writes the `@AGENTS.md` pointer CLAUDE.md and a full AGENTS.md (anchor: 100).
- MUST: every generated omp skill carries a non-empty `description` in frontmatter, because omp's native provider rejects skills without one (anchor: 100).
- MUST: keep every generated omp skill flat at `.omp/skills/<name>/SKILL.md`, because omp discovery is non-recursive (anchor: 100).
- MUST: run `pnpm sync-skills` and commit the regenerated `src/omp-skills/` and the installed `.omp/skills/` tree in the same commit as any skill edit.
- MUST: extend `tests/harness-selection.test.ts`, `tests/init.test.ts`, `tests/upgrade.test.ts`, `tests/skill-template.test.ts`, `tests/gitignore-profiles.test.ts`, and the generation-invariant tests to cover omp, and add `tests/omp-skill-parity.test.ts` cloned from `tests/codex-skill-parity.test.ts`.
- MUST: update `tests/gate-contract.test.ts` and `tests/gate-slot-contract-placement.test.ts`, which assert the current three-block harness structure (anchor: 75).
- MUST: touch `CHANGELOG.md` in the PR and note the D5 side effect: projects with pre-selection state gain `.omp/skills` on the next upgrade.
- MUST NOT: write `.omp/AGENTS.md`, `.omp/RULES.md`, `.omp/config.yml`, `.omp/extensions/`, `.omp/agents/`, or `.omp/scripts/` (D1, D2).
- MUST NOT: add a runtime dependency. omp discovery is file-based and needs no SDK at install time.
- MUST NOT: reference absolute paths in any generated omp skill.
- MUST NOT: edit `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, or the new `src/omp-skills/` by hand.

## Out of Scope

- NOT: the headless runtime port to `.omp/` (scripts, `joycraft-pipeline.ts` with the `@oh-my-pi/pi-coding-agent` import scope, researcher and verifier agents). Backlog: `docs/backlog/2026-09-02-omp-headless-runtime.md`.
- NOT: omp deny patterns from harden and lockdown. Backlog: `docs/backlog/2026-09-02-cross-harness-deny-patterns.md`.
- NOT: `.omp/RULES.md` sticky rules generated from the ALWAYS and NEVER boundaries (D2).
- NOT: omp's `ask` tool as an AskUserQuestion equivalent in gate skills. omp keeps the structured-chat fallback that Codex, Pi, and Copilot use.
- NOT: an `.omp/mcp.json` or an optimize audit of omp MCP servers beyond the path fix in the harness-block audit.
- NOT: a live `omp -p` smoke test in CI (D6).

## Test Strategy

- **Existing setup:** vitest through `pnpm test`, `pnpm typecheck` for types. The generator and sync scripts have invariant tests that fail when a generated tree is stale.
- **User expertise:** comfortable.
- **Test types:** unit (harness parsing, transform table, generator records), integration (init and upgrade against a temp dir), parity (omp skill bodies versus the canonical source), snapshot invariants (generated and installed trees fresh).
- **Smoke test budget:** `pnpm test tests/skill-template.test.ts` runs in seconds and covers the transform row that every other spec depends on.
- **Lockdown mode:** no.

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | add-omp-harness-core | Add `omp` to the harness enum, labels, transform table, and generator so that `src/omp-skills/` and `OMP_SKILLS` exist and `sync-skills` fills `.omp/skills` in this repo. | None | M |
| 2 | wire-omp-init-upgrade | Install `.omp/skills` at init with hash recording, include omp in `multiTool`, manage the tree in upgrade, add `.omp/` to the private gitignore profile, print omp in the summary. | 1 | M |
| 3 | audit-harness-blocks-for-omp | Apply the D9 rule to every `<!-- harness:... -->` block across the 22 skills, fix the optimize MCP path row for omp, add the omp parity test, update the two gate-contract tests. | 1 | M |
| 4 | add-omp-telemetry-scanner | Add the omp transcript dir default, reuse the Pi line parser, thread the dir through `telemetry-store.ts`, cover with tests. | None | S |
| 5 | document-omp-support | README harness list, AGENTS.md architecture rows for `src/omp-skills/`, CHANGELOG entry with the D5 side effect. | 1, 2, 3, 4 | S |

## Execution Strategy

- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees (specs are independent)
- [x] Mixed

Wave 1 runs specs 1 and 4 in parallel because they touch disjoint files. Wave 2 runs specs 2 and 3 in parallel because init and upgrade do not read skill bodies. Wave 3 runs spec 5.

**Wave plan (decomposed 2026-09-03 — see `specs/README.md`):**

| Wave | Specs | Parallel-safe | Files each wave owns |
|---|---|---|---|
| 1 | 1 `add-omp-harness-core`, 4 `add-omp-telemetry-scanner` | Yes | 1: `src/harness.ts`, `scripts/`, `src/bundled-files.ts` · 4: `src/telemetry.ts`, `src/telemetry-store.ts` |
| 2 | 2 `wire-omp-init-upgrade`, 3 `audit-harness-blocks-for-omp` | Yes | 2: `src/init.ts`, `src/upgrade.ts`, `src/gitignore.ts` · 3: `src/skills/*.md` + generated trees |
| 3 | 5 `document-omp-support` | n/a (single) | `README.md`, `AGENTS.md`, `CHANGELOG.md` |

Execution modes (human-approved 2026-09-03): specs 4, 5 → `batch`; specs 1, 2 → `checkpoint`; spec 3 → `isolated`. Spec 3 overrides the size heuristic because 68 harness-block verdicts across 22 skill files is judgment-dense work, and a wrong verdict ships a silently broken skill rather than a failing test.

Specs 1 and 3 each regenerate and `pnpm sync-skills` in their own commit (AGENTS.md ALWAYS rule). Spec 5 verifies zero drift; it does not own the sync.

## Success Criteria

- [ ] `node dist/cli.js init /tmp/p --harnesses omp` writes `.omp/skills/<name>/SKILL.md` for every product skill, a pointer CLAUDE.md, a full AGENTS.md, and no `.claude/`, `.pi/`, `.agents/`, or `.github/skills/` tree.
- [ ] Every generated omp skill uses `/skill:joycraft-` as its invocation prefix, `/new` as its clear command, and `.omp/skills` as its skills dir, and none names `joycraft-implement-loop` or a `.pi/` path.
- [ ] `npx joycraft upgrade` on a project whose state lists `omp` rewrites a hand-edited `.omp/skills` file and leaves user files alone.
- [ ] `joycraft telemetry` counts a session written to `~/.omp/agent/sessions/<encoded-cwd>/`.
- [ ] `pnpm test` and `pnpm typecheck` pass, and the generated-tree and installed-tree freshness tests pass for `src/omp-skills/` and `.omp/skills/`.
- [ ] No regressions in existing features. Baseline on main at 2026-09-02: 2565 tests pass, 1 skipped.

## Hazards carried into the specs

- omp's project settings layer activates when `.omp/` is non-empty. Installing skills alone makes it non-empty. No settings file is written, so the layer is empty, but the specs must not assume `.omp/` is inert (anchor: 100).
- When Claude and omp are both selected, omp sees `joycraft-*` twice, once native and once under `.claude/skills`. Native wins by priority. omp can print a collision warning at startup; this is cosmetic and unverified (anchor: 50, not load-bearing).
- At depth 0 the root `CLAUDE.md` and `AGENTS.md` share priority 10 in omp, so one shadows the other. In multi-harness mode CLAUDE.md is an `@AGENTS.md` pointer, so either winner loads the same body (anchor: 75, not load-bearing).
- Harness blocks are allow-lists. Adding `omp` to `HARNESSES` without the spec 3 audit ships omp skills with no output-style pointer, no gate contract, and no subagent guidance (anchor: 100).

## Prompt for the implementing agent

```
You are picking up docs/features/2026-09-02-omp-support/brief.md, written 2026-09-02.
Decisions D1-D9 are stamped in the brief — do not reopen them.
Start: read docs/features/2026-05-26-pi-support/specs/README.md and the 0.7.5 Copilot entry in CHANGELOG.md, then implement spec 1 (add-omp-harness-core) by mirroring every place Copilot appears in src/harness.ts, scripts/lib/skill-template.mjs, scripts/generate-bundled-files.mjs, and scripts/sync-skills.mjs.
Hazard: harness blocks in src/skills/*.md are allow-lists, so omp inherits nothing until spec 3 names it in each block; and omp does not read .pi/, so no Pi block that mentions joycraft-implement-loop or a .pi/ path is true for omp.
Done when: pnpm test and pnpm typecheck pass, src/omp-skills/ and .omp/skills/ are committed fresh, and a temp-dir init with only omp selected produces .omp/skills plus a pointer CLAUDE.md and no other harness tree.
```
