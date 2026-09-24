---
status: active
owner: Maximilian Maksutovic
created: 2026-09-23
feature: 2026-09-23-opus-5-5-prompting
decisions:
  - id: D1
    question: How should the model profile hold guidance for more than one Claude model?
    status: clarified
    choice: One Claude profile doc with a model-neutral name. Each block says which models it applies to.
    rationale: "Human, checkpoint 2026-09-23: keep a small footprint and prevent drift. This approves one change to D14 of the fable-native feature: the updater may replace the old Fable 5.1 Context Map row with the new row."
  - id: D2
    question: Which unattended surfaces get the Opus 5.5 early-stop fixes?
    status: clarified
    choice: Standing instruction only. Append it in the autofix workflow and the Pi implement-loop. No continuation logic and no Stop-hook recipe.
    rationale: "Human, checkpoint 2026-09-23: later models already follow the spec queue well with no extra tools, so test whether the standing instruction is enough first. Testing is the human's follow-up, not part of this feature."
  - id: D3
    question: Does implement-feature's queue loop use the Opus 5.5 four-stop instruction?
    status: clarified
    choice: Yes, from the queue loops only. Gate skills never cite it.
    rationale: "Human, checkpoint 2026-09-23: the human must not have to type continue while the queue runs; the queue is autonomous."
  - id: D4
    question: Should optimize flag think-harder and write-out-your-reasoning rules in a user's memory file?
    status: clarified
    choice: Yes. A third rule class beside anti-formatting and hand-holding.
    rationale: "Human, checkpoint 2026-09-23: other models can still need these instructions, so the flag must be model-aware to avoid confusion. Applied as: RETIRE only when every harness that reads the file runs a model the block covers; otherwise PROBATION with advice to scope the rule to the model that needs it."
  - id: D5
    question: How should Joycraft mark text that a third party wrote?
    status: clarified
    choice: Autofix reads the CI log from a file. The intent README gains the pasted_content tag rule for external writers.
    rationale: "Human, checkpoint 2026-09-23: anything that follows the prompting guide is correct."
  - id: D6
    question: Where does Opus 5.5 effort guidance live?
    status: clarified
    choice: A profile block only. Tune's effort question stays recommendation-free.
    rationale: "Human, checkpoint 2026-09-23: effort still needs human judgment for the task."
  - id: D7
    question: What should this repo's claude Execution Profile effort say?
    status: clarified
    choice: Change it from high to medium in the dogfood spec.
    rationale: "Human, checkpoint 2026-09-23: good for testing."
  - id: D8
    question: Should implement-feature's parallel waves get the guide's time signal?
    status: clarified
    choice: Not in this feature.
    rationale: "Human, checkpoint 2026-09-23: users can add it themselves; out of scope for Joycraft."
  - id: D9
    question: Approval of the brief and nine-spec decomposition
    status: clarified
    choice: Approve the brief and proceed to specs.
    rationale: The user replied "approve" at the brief review gate on 2026-09-24 (artifact rev 1).
---

# Opus 5.5 prompting fit — Feature Brief

> **Date:** 2026-09-23
> **Project:** Joycraft
> **Builds on:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md` (PR #78)
> **Checkpoint:** `docs/features/2026-09-23-opus-5-5-prompting/checkpoint-new-feature.html` (answers D1–D8)

---

## Vision

Anthropic published "Prompting Claude Opus 5.5". It lists what changed from
Opus 5 and the prompt and harness patterns that fix each change. We compared
all eleven sections of the guide against Joycraft's skills, templates, and
scripts. Four call for work. Two are already handled by Claude Code. Five do
not apply, because Joycraft makes no direct API calls and works inside one
repo.

The largest gap is unattended runs. Opus 5.5 sometimes ends a turn with a
progress note instead of a tool call (anchor: 75). In a one-shot run that ends
the job. The autofix workflow and the Pi implement-loop both run one-shot
agents, and the Pi loop commits the result through spec-done with no
completion check (anchor: 100). The guide's tested fix is a standing
instruction that names the four early stops to avoid. D2 ships that
instruction alone, with no continuation logic, so the human can test whether
it is enough.

The second gap is structural. Joycraft installs one model profile, written for
Fable 5.1, into every Claude, Pi, and omp project (anchor: 100). This repo runs
Opus 5.5 and still points at the Fable doc (anchor: 100). Six of the ten Fable
blocks are not specific to Fable. This feature turns the Fable doc into one
Claude profile. Each block states which models it applies to, and the doc
gains four Opus 5.5 blocks: effort calibration, unattended runs, dropping
thinking instructions, and marking untrusted text.

The last two changes are smaller. Optimize learns to flag think-harder and
write-out-your-reasoning rules in a user's memory file. On Opus 5.5 thinking
is always on, and a rule that pushes reasoning into the reply can be declined
as a `reasoning_extraction` refusal (anchor: 75). The autofix workflow stops
pasting the raw CI log, which a PR author can influence, into its prompt.

## Guide sections against Joycraft

| Guide section | Where it lands in Joycraft | Verdict |
|---|---|---|
| Unattended agentic runs | `autofix.yml` (`claude -p`), `joycraft-implement-loop` (`pi -p`), implement-feature and implement queue loops | Act: specs 2, 4, 5, 6 |
| Calibrate effort | Execution Profile rows are free text; this repo runs `opus 5.5 · effort high` | Act: spec 2 block, spec 9 row (D6, D7) |
| Mark pasted text | `autofix.yml` pastes the CI log into the prompt; the intent inbox will take third-party text | Act: specs 6, 7 (D5) |
| Thinking instructions in chat | No skill says think carefully (grep checked); user memory files often do | Act: spec 8 (D4) |
| Safeguard refusals | No skill asks the model to write out its reasoning (grep checked) | Clean; spec 8 flags it in user files |
| Progress updates | Claude Code renders updates and sends silence reminders (observed in this session) | Handled; retag the block (spec 1) |
| Time signals for agent teams | implement-feature parallel waves | Out of scope (D8) |
| Thinking disabled, `max_tokens` | Joycraft sets no thinking level and makes no API calls | Not applicable |
| Multi-app exploration | Joycraft works inside one repo | Not applicable |
| Complex visual inputs | No image-reading workflow | Not applicable |
| Frontend design defaults | Gate pages come from fixed templates | Not applicable |

## Block tags for the Claude profile

| Block | Applies to | Reason |
|---|---|---|
| Finish the Whole Task | Fable 5.1, Opus 5.5 | Both guides document early stops |
| Keep Changes and Tests to What the Task Asks | Fable 5.1 | Not in the Opus 5.5 guide |
| Give User-Facing Progress Updates | Fable 5.1, Opus 5.5 | Opus 5.5 guide: a one-line intent and a recap still help with a human watching |
| Mannered Prose | Fable 5.1 | Not in the Opus 5.5 guide |
| Compaction Retention, Targeted Edits Over Whole-File Rewrites, Batch Independent Tool Calls, Formatting When Appropriate | All Claude models | Not model-specific |
| End State of Every Prompt, Paths to Choose Between | All Claude models | Operator rules |
| Calibrate Effort (new) | Opus 5.5 | D6 |
| Keep Working in Unattended Runs (new) | Opus 5.5 | D2, D3 |
| Drop Thinking Instructions (new) | Opus 5.5 | D4 |
| Mark Untrusted Text (new) | Opus 5.5 | D5 |

## User Stories

- As a developer on Opus 5.5, I want the installed profile to carry Opus 5.5's
  tested prompt blocks so that my agent gets steering for the model it runs.
- As a developer who runs implement-feature, I want the queue to keep going
  between specs so that I never type "continue" to an autonomous run.
- As a team with the autofix workflow, I want the CI agent to finish the fix
  instead of stopping on a progress note, and to treat the CI log as data.
- As a user with an old CLAUDE.md, I want optimize to tell me which
  think-harder rules now hurt, and on which models, so that I can retire or
  scope them myself.
- As a future writer of external intents, I want a stated rule for how to mark
  third-party text so that consuming skills treat it as data.

## Hard Constraints

- MUST: keep one home per fact. The Claude profile doc is the only home of
  block prose. Skills and optimize cite by path and heading. The two scripts
  extract the unattended instruction from the installed doc at run time; they
  never carry a copy.
- MUST: give every block an `Applies to:` line directly under its heading, and
  a rule in Scope for a reader that cannot tell which model it runs: apply
  every block that is tagged for any current Claude model. Claude Code's
  system prompt names the running model (anchor: 100). Pi's system prompt
  builder does not (anchor: 75), and omp's was not checked, so the fallback
  is what Pi and omp users get.
- MUST: carry the guide's four-stop instruction text as published. Adapt only
  the framing sentence around it.
- MUST: keep the updater's row change narrow. It replaces only a line that is
  exactly the old Fable 5.1 Context Map row. It never removes any other row
  (D14 still holds for everything else), and a second run is a no-op.
- MUST: keep checkpoint-mode pauses, ask-first boundaries, and implement-feature
  fail-fast as wanted stops wherever the unattended block is cited.
- MUST: keep optimize advisory. It flags; it never edits a memory file.
- MUST: regenerate bundled variants and sync installed skill copies in the
  same commit as any skill edit (`pnpm sync-skills`).
- MUST: copy the source profile to
  `docs/templates/reference/model-profile-claude.md` in each spec that
  changes it (specs 1 and 2), because
  `tests/model-profile-template.test.ts` requires the installed copy to be
  byte-identical (anchor: 100). Run the built updater on this repo only in
  spec 9, after spec 3 lands. An earlier run inserts the new row beside the
  old one, because the row swap does not exist yet (anchor: 100).
- MUST NOT: add continuation logic, a Stop-hook recipe, or completion checks
  to any loop (D2).
- MUST NOT: add effort recommendations to tune (D6).
- MUST NOT: add a time signal to implement-feature (D8).
- MUST NOT: let the autofix commit step pick up the CI log file. The log stays
  outside the checkout, because the commit step runs `git add -A`
  (anchor: 100).
- MUST NOT: touch the holdout scenarios repo or its dispatch workflow.
- MUST NOT: add runtime dependencies.

## Out of Scope

- NOT: bounded continuation, a completion checker, or a Stop-hook recipe
  (D2). The human tests the standing instruction first. Backlogged at
  `docs/backlog/2026-09-24-unattended-continuation.md`.
- NOT: effort hints in tune's execution-profile questions (D6).
- NOT: time signals for parallel waves (D8).
- NOT: a Codex variant of the profile. Codex runs no Claude model (fable-native D6).
- NOT: thinking-disabled, `max_tokens`, visual-input, multi-app, or frontend
  guidance. Joycraft has no surface these apply to.
- NOT: editing users' Execution Profile rows. Only this repo's row changes (D7).

## Test Strategy

- **Existing setup:** vitest through `pnpm test` (runs once and exits), plus
  `pnpm typecheck`. Update tests write into temp dirs.
- **User expertise:** comfortable.
- **Test types:** unit (model-profile constants, row swap), integration
  (updater into a temp project with an old Fable doc and row), script tests
  with the `PI_BIN` stub (`tests/pi-scripts-queue.test.ts`), template text
  assertions (`autofix.yml`, intent README), skill-body assertions on source
  and generated variants.
- **Smoke test budget:** one vitest file under 5 seconds per spec.
- **Lockdown mode:** no.

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | retarget-profile-to-claude-doc | Rename the profile to `src/templates/reference/model-profile-claude.md`, add an `Applies to:` line per block per the tag table, add the fallback rule to Scope, and move every path reference (`src/model-profile.ts`, 7 skills, 8 test files) to the new path in one green commit. | None | L |
| 2 | add-opus-5-5-blocks | Add four blocks tagged Opus 5.5: Calibrate Effort, Keep Working in Unattended Runs (the four-stop instruction in one fenced block), Drop Thinking Instructions, and Mark Untrusted Text. | 1 | M |
| 3 | swap-profile-row-on-update | `npx joycraft update` replaces an exact old Fable 5.1 Context Map row with the new row in CLAUDE.md or AGENTS.md, in place and idempotent; tests confirm an unmodified Fable doc is deleted and an edited one is kept. | 1 | M |
| 4 | cite-unattended-block-in-queue-loops | implement-feature's queue loop and implement's continue-the-queue step cite Keep Working in Unattended Runs next to Finish the Whole Task; gate skills never cite it. | 2 | S |
| 5 | append-instruction-in-pi-loop | `joycraft-implement-loop` extracts the unattended block's fenced instruction from the installed profile and passes it with `--append-system-prompt` on the implement call; a missing doc prints one warning and the loop runs without it. | 2 | S |
| 6 | harden-autofix-prompt | `autofix.yml` appends the same instruction, points the agent at a CI log file outside the checkout instead of pasting the log, and states the end state. | 2 | M |
| 7 | add-untrusted-text-rule-to-intent-readme | The intent inbox README tells external writers to wrap third-party text in `pasted_content` tags with a random id; the external-triggers backlog item gains the same line. | 2 | S |
| 8 | flag-thinking-rules-in-optimize | Optimize Step 2c gains a thinking-instructions rule class checked against Drop Thinking Instructions; RETIRE only when every harness that reads the file runs a covered model, else PROBATION with scoping advice. | 1, 2 | M |
| 9 | dogfood-on-joycraft | Run the built updater on this repo, confirm the renamed doc and swapped row, set this repo's claude Execution Profile effort to medium, run optimize's Step 2c on AGENTS.md, and update CHANGELOG. | 1–8 | M |

## Execution Strategy

- [ ] Sequential (specs have chain dependencies)
- [ ] Parallel worktrees (specs are independent)
- [x] Mixed

Specs 1 and 2 run first, in order, because both edit the profile doc. Specs 3
to 8 depend only on those two, but every skill or template edit regenerates
`src/bundled-files.ts` (anchor: 75). Decompose must treat that file as shared
when it marks any wave parallel-safe. Spec 9 runs last.

## Success Criteria

- [ ] A fresh `npx joycraft update` with claude selected installs
      `docs/templates/reference/model-profile-claude.md` and one Context Map
      row that points at it. No Fable-named file is installed.
- [ ] `npx joycraft update` on a project with the unmodified Fable doc and the
      Fable row deletes the doc and replaces the row in place. Every other
      byte of the memory file is unchanged. A second run changes nothing.
- [ ] An edited Fable doc is kept, as the updater's orphan rule already does.
- [ ] Every `## ` block in the profile has an `Applies to:` line, and the four
      Opus 5.5 blocks exist with the guide's instruction text.
- [ ] No file under `src/` except the generated bundle history names
      `model-profile-claude-fable-5-1.md`.
- [ ] implement-feature and implement cite Keep Working in Unattended Runs in
      their queue steps. interview, new-feature, decide, design, and decompose
      do not.
- [ ] The Pi loop's implement call carries `--append-system-prompt` with the
      extracted text (stub test), and runs with one warning when the doc is
      missing.
- [ ] `autofix.yml` never interpolates the CI log into the prompt, passes the
      instruction with `--append-system-prompt`, and keeps the log outside the
      checkout.
- [ ] Optimize on a CLAUDE.md that says "think step by step" yields an
      advisory row. It is RETIRE for a Claude-only project and PROBATION for a
      project whose AGENTS.md also serves Codex.
- [ ] This repo's AGENTS.md Execution Profile reads `effort medium` for claude.
- [ ] `pnpm test` and `pnpm typecheck` pass with no regressions.

## Raw Notes

Decisions D1 to D8 were answered on the checkpoint page on 2026-09-23.
The D4 rationale asked for model awareness. The brief applies it through the
`Applies to:` tags and the RETIRE-or-PROBATION rule in spec 8.

Codebase facts from the 2026-09-23 survey:

- `src/model-profile.ts:14` holds the one template key; the Context Map row
  text is at `:23` and says "Working with Claude Fable 5.1".
- Skills that name the Fable path: implement, implement-feature,
  session-end, new-feature, interview, tune, optimize. Tests that name it:
  bundle-inventory, model-profile-pointer, dogfood-update,
  upgrade-optimize-v2, context-map-section, agents-md,
  model-profile-citations, model-profile-template.
- `insertModelProfilePointer` (`src/improve-claude-md.ts:314`) returns early
  when the file already names the profile path, and never removes a row.
  `contextMapPointerPatch` (`src/update-inventory.ts:567`) calls it.
- `src/update-plan.ts:417-433` deletes an owned file the bundle no longer
  declares when its bytes are verified, and keeps customized content as an
  orphan.
- `autofix.yml:130` runs `claude -p --dangerously-skip-permissions
  --max-turns 20` with `${FAILURE_LOG}` inside the prompt; an earlier step
  already writes the log to `/tmp/ci-failure.log`. The commit step runs
  `git add -A`.
- `joycraft-implement-loop` runs `pi -p "/skill:joycraft-implement <spec>"`
  then `pi -p "/skill:joycraft-spec-done <spec>"` with no check between them.
- Local CLI check: `pi --append-system-prompt <text>` accepts text or file
  contents; `claude` has `--append-system-prompt`, the `-file` variant, and
  `--add-dir` (help text, not run).
- Grep of `src/skills/` and `src/templates/`: no think-harder,
  ultrathink, or show-your-reasoning lines.
- Optimize Step 2c (`src/skills/joycraft-optimize.md:72`) checks two rule
  classes and already defines PROBATION as "unverified under the current
  model".

Guide facts that shaped the profile blocks: effort defaults to medium on Opus
5.5, and Opus 5.5 at medium matches Opus 5 at high on coding; reserve xhigh
and max for measured gains; lower effort before you prompt for less thinking.
The four-stop standing instruction belongs at the end of the system prompt
from the first request, and never in human-in-the-loop work. Removing
think-carefully lines made chat replies start sooner with no clear quality
loss. Tool results are the channel Opus 5.5 resists injection through best.

## Prompt for the implementing agent

```
You are picking up docs/features/2026-09-23-opus-5-5-prompting/brief.md, written 2026-09-23.
Decisions D1-D9 are stamped in the brief — do not reopen them.
Start: implement spec 1 (retarget-profile-to-claude-doc), then spec 2 (add-opus-5-5-blocks), before any other spec; run pnpm sync-skills in the same commit as each skill edit.
Hazard: renaming the profile breaks 8 test files and 7 skill citations at once, so spec 1 must land every path change in one commit to stay green; copy the source profile to docs/templates/reference/ by hand in specs 1 and 2, and run the built updater on this repo only in spec 9.
Done when: every row of the Decomposition table has a spec marked done, every Success Criterion is checked, and pnpm test and pnpm typecheck pass.
```
