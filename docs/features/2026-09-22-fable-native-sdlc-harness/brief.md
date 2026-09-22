---
status: active
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
decisions:
  - id: D1
    question: Where does Fable 5.1 guidance live?
    status: clarified
    choice: One model-profile reference doc. CLAUDE.md points at it, skills cite it.
    rationale: One home per fact. Duplicating prompt blocks into every skill body is the drift the living-harness work removed.
  - id: D2
    question: What is the front door for work that is not a developer running interview?
    status: clarified
    choice: A docs/intent/ inbox. Interview emits an intent. new-feature and bugfix consume by path and pointer-link. Brief, design, and specs keep their names.
    rationale: Anthropic's playbook makes intent canonical; Joycraft's later artifacts already exist under stable names.
  - id: D3
    question: Who routes an intent?
    status: clarified
    choice: Human triage. The agent proposes tags and priority, the human routes to interview, bugfix, backlog, or discard.
    rationale: Commit is acceptance in the playbook; a human owns the accept or reject.
  - id: D4
    question: Which governance pieces ship now?
    status: clarified
    choice: Hook recipes plus an evals-in-CI recipe triggered by harness-file changes. Incidents seed evals. PR-review agent and self-generated intent go to backlog.
    rationale: Hooks and evals fit the existing harden and check machinery; the other two need readers that do not exist yet.
  - id: D5
    question: What does optimize do with legacy rules?
    status: clarified
    choice: An advisory Fable-era RETIRE disposition source. No auto-edits of user CLAUDE.md.
    rationale: Optimize is advisory by contract.
  - id: D6
    question: Which harnesses get the model-profile doc?
    status: clarified
    choice: Keyed by model, not harness. Installs for Claude, Pi, and omp. Codex never gets it.
    rationale: Pi and omp users run Claude models; Codex does not.
  - id: D7
    question: Do Linear and automation triggers ship now?
    status: backlogged
    choice: Backlogged at docs/backlog/2026-09-22-intent-external-triggers.md. The intent source field is the hook they will use.
    rationale: Whether the source field is enough is unknown until one real writer exists.
  - id: D8
    question: Does REVIEW.md ship?
    status: backlogged
    choice: Backlogged at docs/backlog/2026-09-22-pr-review-agent-review-md.md with the PR-review agent.
    rationale: A review contract has value only when a reader exists.
  - id: D9
    question: Where does the inbox live?
    status: clarified
    choice: docs/intent/
    rationale: The playbook's simplest home is an intent folder in the product repo, next to the code derived from it.
  - id: D10
    question: What form does triage take?
    status: clarified
    choice: A mode of joycraft-interview. When docs/intent/ holds untriaged files, interview offers triage before a fresh brainstorm.
    rationale: The user chose this at the new-feature gate on 2026-09-22. One fewer skill to install and discover.
  - id: D11
    question: How far does the evals-in-CI recipe go?
    status: clarified
    choice: Inert template files only, under docs/templates/, copied in by hand. No CLI activation command.
    rationale: The user chose this at the new-feature gate on 2026-09-22. Matches the existing autofix scaffold pattern and adds no code.
  - id: D12
    question: Does this feature dogfood on the Joycraft repo?
    status: clarified
    choice: Yes. The final spec runs the updater on this repo so the profile doc, inbox, and pointer land here.
    rationale: The user chose this at the new-feature gate on 2026-09-22. Proves install end to end.
  - id: D13
    question: Lockdown mode for implementation sessions?
    status: clarified
    choice: No lockdown.
    rationale: The user chose this at the new-feature gate on 2026-09-22. Most specs edit skills and templates, which are ask-first already.
  - id: D14
    question: How far does legacy-rule cleanup go for existing installs?
    status: clarified
    choice: Users stay advisory. update inserts the profile pointer into existing CLAUDE.md or AGENTS.md through the merge logic, and tune's roadmap tells users to run optimize. This repo's AGENTS.md is cleaned by hand in the dogfood spec after an optimize pass.
    rationale: The user chose this at the new-feature gate on 2026-09-22. D5 stands; the repo dogfoods the advisory path end to end.
  - id: D15
    question: Approval of the brief and twelve-spec decomposition
    status: clarified
    choice: Approve the brief and proceed to decomposition.
    rationale: The user replied "approve" at the brief review gate on 2026-09-22 (artifact rev 4).
---

# Fable-native SDLC harness — Feature Brief

> **Date:** 2026-09-22
> **Project:** Joycraft
> **Origin:** /joycraft-interview draft, formalized by /joycraft-new-feature

---

## Vision

Three inputs arrived the same week and point the same way. Anthropic's
"Prompting Claude Fable 5.1" guide says the model behaves differently from
Fable 5 in ways a harness should account for: it goes quiet during long tool
chains unless asked for updates, it sometimes ends a turn by describing the
next step instead of doing it, it over-extends scope and commits extra tests
on open-ended asks, and its prose runs dense. Each has a tested prompt block
(anchor: 75). Theo Browne's video on the same guide adds the operator's view:
most of the behavioral rules people carry in their CLAUDE.md files were
written for older models and now hurt, so reset to defaults and add back only
what fixes a real problem. And Anthropic's AI-native SDLC playbook formalizes
an artifact chain around Claude: intent.md, spec.md, plan.md, diff plus
tests, PR with review findings, incident record, new intent.md.

Joycraft already runs most of that chain under different names: interview
draft brief, feature brief, design, atomic specs, verify, session-end. The
gaps are at the two ends. There is no front door for anyone but a developer
running the interview skill, and there is nothing after the PR.

This feature makes Joycraft's Claude Code harness Fable-5.1-native through one
model-profile reference doc, adds a `docs/intent/` inbox that outside
triggers can later write into, and ships the playbook's governance pieces
that fit the existing hooks and check machinery: hook recipes, an evals-in-CI
recipe, and an advisory optimize source that flags legacy rules.

## Problem

- A Joycraft-installed CLAUDE.md gives Fable 5.1 no model-specific steering,
  so users get the silent-agent, stop-short, and scope-creep behaviors the
  guide documents fixes for.
- Users who carry legacy anti-formatting or hand-holding rules get worse
  output from Fable 5.1 than from defaults, and nothing in tune or optimize
  tells them.
- Only the interview skill can start the pipeline, and it creates a feature
  folder on the spot. A customer bug, a PM idea, a Linear ticket, or an
  alert-driven agent has no place to land before a human commits to a slug.
- After a PR merges, the harness has no loop: no evals that run when the
  harness itself changes, no path from incident to intent.

## User Stories

- As a developer on Fable 5.1, I want the installed harness to carry the
  model's tested prompt blocks so that the agent finishes tasks, keeps scope,
  and reports progress without me re-discovering the guide.
- As a Pi or omp user running a Claude model, I want the same profile doc so
  that my harness is not second-class.
- As a PM or on-call engineer, I want to write an intent file in a fixed shape
  so that my idea or incident lands in the pipeline without a developer
  session.
- As a developer, I want interview to show me untriaged intents and let me
  route each one so that the inbox never becomes a graveyard.
- As a platform engineer, I want hook recipes and an evals workflow I can copy
  in so that harness changes get the regression testing code gets.
- As a user with a years-old CLAUDE.md, I want optimize to flag rules that
  now hurt on Fable so that I can retire them myself.

## Hard Constraints

- MUST: keep one home per fact. Fable guidance lives in the profile doc,
  never duplicated into every skill body. Skills cite by path and block name.
- MUST: adopt Anthropic's vocabulary where it is canonical (intent) and map
  the rest (spec, plan) in the intent README. No rename of brief, design, or
  specs.
- MUST: gate the profile doc by harness. Today every entry under
  `src/templates/` installs unconditionally as `harness: 'shared'` at
  `src/bundle-inventory.ts:121`; per-harness gating exists only for skill and
  hook trees (anchor: 75). D6 therefore needs an installer change, not a
  config line.
- MUST: keep the intent file shape open to external sources now. `source:`
  accepts `human`, `interview`, `linear:<id>`, `alert:<name>`, and any
  future `<system>:<id>` without a schema change.
- MUST: regenerate bundled variants and sync installed skill copies in the
  same commit as any skill edit (`pnpm sync-skills`).
- MUST: include the dogfood update step in any spec that adds a reference
  doc. `pnpm build` alone leaves a new template in `src/bundled-files.ts`
  but absent from `docs/templates/` and the manifest; only the updater at
  `src/update.ts` copies it here (anchor: 75).
- MUST NOT: add runtime dependencies. Hooks and evals are shell plus
  `claude -p` plus `jq`.
- MUST NOT: write to `.github/workflows/` during install or update. The
  evals recipe is inert template files the user copies (D11).
- MUST NOT: touch the holdout scenarios repo or its dispatch workflow. User
  project evals are unrelated to it.
- MUST NOT: auto-edit a user's CLAUDE.md from optimize (D5).
- MUST NOT: add a Pi- or omp-scoped memory file. Both harnesses read the root
  CLAUDE.md and AGENTS.md pair by recorded decision
  (`docs/features/2026-09-02-omp-support/brief.md`) (anchor: 75).

## Out of Scope

- NOT: a separate Claude Code PR-review instance that reads REVIEW.md
  (backlogged, D8).
- NOT: the maintenance loop that has Claude diagnose an alert and write its
  own intent (backlogged at
  `docs/backlog/2026-09-22-maintenance-loop-self-intent.md`).
- NOT: Linear and automation triggers that create intents (backlogged, D7).
- NOT: a `joycraft init-evals` or `joycraft intent` CLI command (D10, D11).
- NOT: a standalone triage skill (D10).
- NOT: renaming brief, design, or specs to the playbook's spec and plan.
- NOT: a Codex variant of the profile doc (D6).
- NOT: a frontmatter validator. `src/frontmatter.ts` has no production
  consumers and accepts arbitrary keys, so `intent:` and `source:` need no
  code (anchor: 75).

## Test Strategy

- **Existing setup:** vitest via `pnpm test` (runs once and exits), plus
  `pnpm typecheck`. Install tests write into temp dirs and assert with
  `existsSync`.
- **User expertise:** comfortable.
- **Test types:** unit (bundle inventory, optimize label counts), integration
  (updater into a temp project per harness selection), enumeration guards
  (`tests/reference-templates.test.ts` pattern extended to
  `src/templates/reference/`), skill-body assertions (grep-style checks that
  citations and the triage mode exist in generated variants).
- **Smoke test budget:** one vitest file under 5 seconds per spec.
- **Lockdown mode:** no (D13).

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | write-model-profile-doc | Add `src/templates/reference/model-profile-claude-fable-5-1.md` carrying the guide's blocks by name: finish the whole task, scope and tests, progress updates, mannered prose (long and short), compaction retention, targeted edits, batched tool calls, when-appropriate formatting, and Theo's end-state and choose-between-paths rules. | None | M |
| 2 | gate-reference-docs-by-harness | Extend `src/bundle-inventory.ts` so a template entry can declare which harnesses receive it; the profile doc installs for claude, pi, omp and never codex; add an enumeration test for `src/templates/reference/`. | None | M |
| 3 | point-memory-file-at-profile | When claude, pi, or omp is selected, `src/improve-claude-md.ts` and `src/agents-md.ts` emit one Context Map row pointing at the profile doc on fresh install, and `npx joycraft update` inserts the same row into an existing CLAUDE.md or AGENTS.md through the merge logic without touching other content; idempotent on re-run. | 1, 2 | M |
| 4 | cite-profile-in-skills | implement, implement-feature, session-end, new-feature, and interview cite the profile doc's block names where the behavior matters; no block text copied; regenerate and sync in the same commit. | 1 | M |
| 5 | add-intent-template-and-inbox | Add `src/templates/INTENT_TEMPLATE.md` (Author, Status, source, Problem, Proposed outcome, Affected users and systems, Constraints, Open questions) and an inbox README that maps intent, spec, and plan to Joycraft names; installer creates `docs/intent/` with the README; `src/folder-map.ts` gains a description row. | None | S |
| 6 | emit-intent-from-interview | Interview's first written artifact is `docs/intent/<slug>.md` with `source: interview`; the draft brief becomes optional and links back with `intent:`. | 5 | M |
| 7 | add-triage-mode-to-interview | Interview lists untriaged intents at entry, proposes tags and priority per file, and routes each to interview, bugfix, backlog, or discard on the human's word; stamps `Status:` in the intent header. | 5, 6 | M |
| 8 | consume-intent-in-new-feature-and-bugfix | new-feature and bugfix accept an intent path, pre-fill from it, stamp `intent:` in the brief or bugfix frontmatter, and leave the intent file in place with status updated. | 5 | S |
| 9 | ship-governance-hook-recipes | Add to the Claude kit four documented, unregistered hook recipes: plan-sync on completion, protected-path guard, test-file lock during a bugfix, and the allow/ask/block exit-code gate shape, with a README on wiring them into settings. | None | M |
| 10 | ship-evals-in-ci-recipe | Add `docs/templates/evals/` with a recorded-task JSON shape, `check.sh`, `agent-evals.yml` triggered on schedule and on changes to CLAUDE.md, `.claude/**`, skills, and hooks, plus the rule that every bugfix seeds an eval; bugfix skill gains a one-line reminder. | None | M |
| 11 | add-fable-era-retire-source-to-optimize | Optimize gains a model-profile evidence step and label that flags legacy anti-formatting and hand-holding rules for RETIRE or PROBATION, advisory only; hard-coded label counts updated; tune's roadmap adds one line telling users with a pre-Fable memory file to run optimize. | 1 | M |
| 12 | dogfood-update-and-cleanup-on-joycraft | Run the built updater on this repo, commit the installed profile doc, inbox, hook recipes, evals scaffold, and AGENTS.md pointer; run optimize on this repo's AGENTS.md and apply its RETIRE rows by hand in the same PR; update CHANGELOG. | 1–11 | M |

## Execution Strategy

- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees (specs are independent)
- [x] Mixed

Wave 1 in parallel: 1, 2, 5, 9, 10. Wave 2 in parallel: 3, 4, 6, 8, 11.
Wave 3: 7. Wave 4: 12. Specs 4, 6, 7, 8 edit skill content and specs 1, 5,
9, 10 add template content; both are ask-first boundaries, so each of those
specs pauses for approval before its first write.

## Success Criteria

- [ ] A fresh `npx joycraft update` with claude selected installs
      `docs/templates/reference/model-profile-claude-fable-5-1.md` and one
      Context Map row pointing at it; the same with codex only installs
      neither.
- [ ] `npx joycraft update` on a project with an existing customized
      CLAUDE.md or AGENTS.md adds the Context Map row and changes nothing
      else in that file; a second run is a no-op.
- [ ] Pi-only and omp-only installs receive the profile doc.
- [ ] `docs/intent/` exists after install with a README and no other files.
- [ ] Running interview with an empty inbox writes an intent file before any
      brief; with two untriaged intents it offers triage first.
- [ ] new-feature and bugfix given an intent path produce a brief or bugfix
      spec whose frontmatter carries `intent:`, and the intent file remains.
- [ ] Four hook recipe files ship in the Claude kit, none registered in
      settings by the installer.
- [ ] The evals scaffold ships under `docs/templates/evals/` and nothing is
      written to `.github/workflows/`.
- [ ] Optimize's report gains a model-profile row; a CLAUDE.md containing
      "never use markdown" yields an advisory RETIRE candidate.
- [ ] Joycraft's own repo shows all of the above after the dogfood spec, and
      its AGENTS.md carries no rule that optimize's model-profile step flags.
- [ ] `pnpm test` and `pnpm typecheck` pass; `tests/status-migration.test.ts`
      still passes because intent files live outside its guarded paths.
- [ ] No regressions in existing install, upgrade, or skill sync tests.

## Raw Notes

Decisions D1 to D15 are stamped in the frontmatter. D10 to D14 were answered
at the new-feature gate on 2026-09-22.

Prompt blocks from the Fable 5.1 guide to carry into the profile doc, by name:
finish the whole task (autonomous-operation block plus delivering-work block),
keep changes and tests to what the task asks for, ask for user-facing
progress updates, mannered prose (long and short forms), compaction retention
list, targeted edits over whole-file rewrites, batch independent tool calls.
Formatting rule: replace anti-formatting language with a when-appropriate rule.

Theo's operator points worth keeping: tell the model the end state of every
prompt ("babysit until green then merge", "file the PR and tell me"); give it
paths to choose between instead of choosing for it; delete behavioral
instructions and add back only what fixes an observed problem; effort high is
the sane default.

Playbook facts that shaped D2 to D4: intent template sections as listed
above; commit is acceptance; spec generation goes hand, then slash command,
then non-interactive on intent merge; CLAUDE.md rule "mistake twice, it goes
in CLAUDE.md" (already covered by add-fact); skills advisory, hooks
deterministic (already the harden model); evals run on harness-file changes
with pass-rate gating; every production incident becomes a permanent eval.
The course is at https://academy.claude.com/courses/ai-native-sdlc-playbook.

Codebase facts from the 2026-09-22 survey that shaped the decomposition:

- The bundle source is `src/templates/`; the repo-root `templates/` folder is
  stale reference material no generator reads. Reference docs install
  unconditionally via one shared vendor line in `src/bundle-inventory.ts`.
- Pi and omp have no scoped memory file; the pointer row goes in the root
  CLAUDE.md or AGENTS.md as selected by `src/update-inventory.ts`.
- Skills are flat files under `src/skills/`; the SKILL.md directory shape is
  created at install. Interview writes the draft brief at line 115; bugfix
  writes `docs/bugfixes/<area>/<name>.md` at line 107.
- Optimize keeps six dispositions and seven evidence labels with hard-coded
  counts; PROBATION already names "a model that has since changed".
- Hooks are generated from TypeScript (`src/safeguard.ts`,
  `src/claude-session-start.ts`) and registered in code. The recipe pattern
  exists once: `templates/claude-kit/hooks-example.json` is valid and
  unregistered.
- Ten workflow and scenario scaffold files already ship inert under
  `docs/templates/workflows/` and `docs/templates/scenarios/`; the evals
  recipe follows that pattern.
- `src/folder-map.ts` walks the filesystem, so `docs/intent/` appears without
  code; a description row is optional. Thirty-row cap.
- `tests/reference-templates.test.ts` hard-codes an exhaustive list for
  `src/templates/context/reference/` only; `src/templates/reference/` has no
  enumeration test.

Max's direction on the inbox: it makes sense because he wants Linear tickets
and automations to kick off Joycraft sessions, and the inbox is where those
would land.

## Prompt for the implementing agent

```
You are picking up docs/features/2026-09-22-fable-native-sdlc-harness/brief.md, written 2026-09-22.
Decisions D1-D15 are stamped in the brief — do not reopen them.
Start: read the brief's Decomposition and Raw Notes, then implement spec 1 (write-model-profile-doc) and spec 2 (gate-reference-docs-by-harness) before touching any skill; pause for approval before the first write to any file under src/templates/ or src/skills/.
Hazard: a new template under src/templates/ reaches docs/templates/ in this repo only when the built updater runs on the repo itself; pnpm build alone leaves it out of the manifest, and every skill edit must regenerate variants and sync installed copies in the same commit.
Done when: every row of the Decomposition table has a spec under docs/features/2026-09-22-fable-native-sdlc-harness/specs/ marked done, all Success Criteria are checked, and pnpm test and pnpm typecheck pass.
```
