# Pipit — what it is, where it stopped, and how it sits against the panel rulings

> **Date:** 2026-09-24. **Source:** local repo at the maintainer's machine, 102 commits from 2026-03-19 to 2026-04-15, read by nine workers. **Written for:** the maintainer. **Status:** digest only. No decision. No recommendation.

## Read this first

Pipit began in March 2026 as meetcode, a tool that pipes meeting transcripts into Claude Code. By April the definition that stuck was context concierge, a capture layer that never loses an idea and routes each one into Joycraft. The demo goalpost, in the maintainer's own words: "The holy shit moment is you yapped something and then in 10-20 seconds your terminal is working for you." Three framings competed on 2026-04-03. They were a tool-calling middleware from Praful, a command-center dashboard, and a context-capture layer. The maintainer chose the capture layer as the substance and the dashboard as its visible surface, and pushed the middleware idea to a later phase. Work stopped on 2026-04-15, mid-way through the iOS companion app, on a branch eight commits ahead of `main` that never merged. Two facts matter most for the panel mapping below. The Pipit classifier sets the control level and the session mode for every launch, and it overrides any explicit flag the caller passes. The same classifier infers whether a capture is ready for an interview, a brief, or a decompose, instead of asking the human to say so. Pipit has a hard dependency on Joycraft. A launch with no `.claude/skills/` directory in the target project fails outright, with no fallback path.

## What Pipit is

Pipit's original planning document names the project meetcode. It describes a local daemon that watches finished meeting transcripts and feeds them into Claude Code for task extraction and implementation. On 2026-03-24 the first reframe dropped the daemon and the meeting-only framing. It cast Pipit as the fastest way to turn any context into a Claude Code session. On 2026-03-25 the mission changed again to a Claude Code command center. This Mac dashboard was meant to manage, monitor, and orchestrate many autonomous Claude Code agents at once. On 2026-04-04 a third reframe named the product a context concierge. Its stated job is never to lose context, and to put unclear captures somewhere visible for the user to handle later.

On 2026-04-03 the maintainer chose the context-concierge framing as the product's substance, with the command-center dashboard as its visible surface. A fourth idea from Praful, a tool-calling middleware that strips tools from Claude and routes everything through a deterministic layer, went to a later phase. It was never built. Pipit's audience narrowed over time. It started as a tool for freelance developers and consultants juggling client meetings, and settled into a three-person dogfood group: the maintainer, a Tolan iOS engineer working on a side project called Lufthaven, and Praful.

The core loop runs from capture to a pull request.

```text
capture (voice, text, photo, or URL)
  -> classify (incoming / needs_interview / ready_for_brief / ready_for_decompose)
  -> route into Joycraft (/interview, /new-feature, /decompose)
  -> Claude Code session (interactive or fire-and-forget) in a cmux workspace
  -> commit and open a pull request
```

## Timeline and state

| Phase | Dates | Commits | What was built | Specs |
|---|---|---|---|---|
| 0. Founding day | 2026-03-19 | 5 | Initial scaffold and the rename from meetcode to Pipit. | None yet. |
| 1. Phase 1 and CI debugging | 2026-03-24 | 27 | Any-context capture, dogfood fixes, Level 5 holdout infrastructure. | 015. |
| 2. CLI ship and terminal rework | 2026-03-25 | 29 | npm publish and the switch from AppleScript to cmux. | 015-016, 017-023. |
| 3. cmux hardening and Command Center | 2026-03-26 | 23 | Command Center planning and the Mac dashboard. | 026, 027, 031, 032-036. |
| 4. Context concierge and classifier | 2026-04-07 | 4 | The Phase 0 brief and the level classifier. | 037-040. |
| 5. Phase 0 concierge build | 2026-04-08 | 6 | Thread data model, HTTP server, launch bridge, dashboard UI specs. | 041-046, 047-056, 057-065. |
| 6. iOS companion app | 2026-04-14 | 3 | The native iOS app, minus Mac-side pairing. | 066-076. |
| 7. iOS pairing and speech fix | 2026-04-15 | 5 | QR pairing, a crash fix, and one shared workspace file. | 069, bugfix-speech-capture-locale-and-format. |

Five working days carry the whole project, split by three gaps of 5, 12, and 6 days. The 12-day gap, from 2026-03-26 to 2026-04-07, is the longest. The busiest day, 2026-03-25, carries 29 commits. The last commit fixed a hard crash in the iOS speech capture and added an in-app `Settings` screen for QR re-pairing.

Three branches carry unmerged work. `dev/spec-implementation` sits eight commits ahead of `main` and holds the whole iOS app. `pipit/dashboard-ui` and `pipit/launch-bridge` each hold one orphaned commit of implementation work outside any merged pull request. One worktree, `claude/eloquent-mendeleev`, sits 23 commits behind `main` and carries uncommitted local edits to five Joycraft skill files. Across 78 spec files, the repo's own status words count 36 Ready, 34 Complete, 5 Draft, and 3 Superseded.

The TypeScript suite passes 237 of 237 tests across 21 files, with a clean type check. The two Swift apps add roughly 180 more unit tests, 14 files on macOS and 10 on iOS. Both apps also ship an unmodified Xcode UI test target, and one of the two is disabled. On npm, `pipit-cli` sits at version 0.1.0. The checked-out source claims 0.1.1, one release ahead. No record explains the timing of that bump, or why it was never published.

## Architecture as built

Pipit has three components. The CLI, written in TypeScript, is the single source of truth for business logic and ships to npm as `pipit-cli`. The Mac app, written in Swift and SwiftUI, is a menu-bar and dashboard client. It stores configuration, watches for input, and calls the CLI, with no business logic of its own. The iOS app, also Swift and SwiftUI, captures voice, classifies the target project on the device, and delivers each capture to the Mac over HTTP.

| Command | What it does |
|---|---|
| `pipit go <input> <project>` | Resolves the input, builds a prompt, and launches it in a new cmux workspace. |
| `pipit process <transcript>` | Extracts tasks through a headless `claude -p` call, then launches one task. |
| `pipit status` | Lists tracked sessions with live cmux status. |
| `pipit dashboard` | Adds the git branch to the status list. |
| `pipit monitor` | Polls sessions for stalls, input waits, and pull-request links. |
| `pnpm eval:classifier` | Scores the classifier against fixed test captures and exits on a threshold. |

Each command's own flags:

- `pipit go` takes `--project-dir`, `--input-type`, `--control-level`, `--context`, `--dry-run`, `--json`, and `--mode`.
- `pipit process` takes `--project-dir`, `--dry-run`, and `--task-index`.
- `pipit status` takes `--json` and `--watch`.
- `pipit dashboard` takes `--json`.
- `pipit monitor` takes `--interval`, `--stall-threshold`, and `--once`.
- `pnpm eval:classifier` takes `--model`, `--verbose`, and `--threshold`.

Only the `auto` value of `--control-level` changes runtime behavior, by adding `--dangerously-skip-permissions` to the launched command. The `plan_first` and `extract_only` values are accepted and run the identical path.

The exact spawn commands, all through `execa`:

- `git worktree add <path> -b <branch>` creates an isolated workspace for one task.
- `command -v cmux` checks that the cmux binary sits on the path.
- When cmux is not already running, `open -a cmux` starts it.
- `<cmux> new-workspace --cwd <dir> --command <command>` opens the workspace that runs `claude`.
- `<cmux> list-workspaces` tells the CLI which tracked sessions are still alive.
- `<cmux> read-screen --workspace <id> --lines <n>` feeds the stall and input-wait check.
- `<cmux> notify --title <t> --body <b>` sends the desktop notification.
- `claude --dangerously-skip-permissions '<prompt>'` is the command cmux runs, built from a temp prompt file.

The Mac app runs an in-process HTTP server on port 7749, built on `Network.framework` with no TLS, relying on the Tailscale tunnel for encryption. A Bearer token in the Keychain guards every route except `/api/health`. The other routes are `/api/projects`, `/api/captures`, `/api/captures/:id/status`, and `/api/status`. The phone pairs by scanning a QR code that carries the IP address, the token, and the port as JSON. Apple's App Transport Security blocks plain HTTP over Tailscale's address range. The iOS app carries a blanket `NSAllowsArbitraryLoads` exception as a stopgap, flagged in its own commit as a pre-launch risk.

The classifier assigns one of four labels to every capture: `incoming`, `needs_interview`, `ready_for_brief`, and `ready_for_decompose`. The TypeScript version defaults to `claude-sonnet-4-6`, with a `claude-haiku-4-5-20251001` option and a Gemini fallback. The Swift port on the Mac hardcodes `claude-haiku-4-5-20251001`, the model the design brief picked for production. Nineteen fixtures across five real projects back six stored eval runs. Sonnet-4-6 scores 94.7 percent on three of those runs and 57.9 percent on one outlier run, with no written account of the gap. Haiku-4-5 scores 94.7 percent, and Gemini-2.5-Flash scores 84.2 percent.

Stubbed or dead code found in this pass:

- The dashboard's non-JSON view is a placeholder table. The planned full-screen view was never built.
- The fire-and-forget `implementTask` path returns as soon as the workspace opens, and never checks for a commit or a pull request afterward.
- `claudeFlags`, a field every input handler declares, stays empty in every code path.
- The classifier's context gatherer reads a flat `docs/briefs/` and `docs/specs/` layout, a shape Joycraft has since replaced with a per-feature folder.
- The README documents a `--terminal` flag and Ghostty, iTerm2, and Warp support absent from the current source.
- On iOS, the background delivery task is a stub. It reports success without delivering anything.
- Two files, `ContentView.swift` on iOS and `TranscriptPasteView.swift` on the Mac, are dead code left over from an earlier screen.

The Mac app never spawns a terminal itself. It shells out to the `pipit` CLI for every launch, and its one direct cmux action just brings an already-running cmux window to the front.

## The four decisions and where the code drifted

**Decision 001, raw transcript over structured extraction**. Pipit committed to piping a raw transcript straight into an interactive Claude Code session, and kept the older extract-then-implement path only as a legacy command. The code still lists `pipit process` as a first-class command in `CLAUDE.md`. Its `extractTasks` function carries no test coverage at all, so the demotion never reached the documentation or the test suite.

**Decision 002, Ghostty first**. Pipit chose Ghostty as the default terminal, with iTerm2 and Terminal.app as fallbacks, all driven by AppleScript. Spec 017 later deleted every one of those AppleScript functions and made cmux the only launch path, with no decision record marking the change. The published README still documents a `--terminal` flag and a `PIPIT_TERMINAL` variable absent from the current source.

**Decision 003, interactive over headless**. Pipit committed to a visible, interactive session for every implementation step, and reserved headless calls for the legacy extraction path alone. The classifier and the iOS capture pipeline, built two months later, never appear in this decision or in any prose document. They now auto-launch a fire-and-forget session with `--dangerously-skip-permissions` on their own authority, unattended, against the decision's own stated reason for preferring an interactive, watched session.

**Decision 004, Swift for the Mac app**. Pipit chose native Swift over Electron or Tauri, with the Mac app calling the CLI as a subprocess. That subprocess boundary is the entire CLI contract. The one document that names it, `docs/contracts/cli-contract.md`, was last updated on 2026-03-23 and still describes the old AppleScript terminal flags. None of the flags the launch-bridge specs rely on later, `--json`, `--control-level`, `--thread-context`, appear in that contract.

## Pipit and Joycraft

Pipit's launch-bridge specs require Joycraft outright. A launch with no `.claude/skills/` directory exits with an error instead of starting a session. No non-Joycraft path exists for a thread-based launch.

The classifier checks for three Joycraft skill files by name to set a plain yes-or-no flag. It then builds its own hand-written, condensed description of what each Joycraft stage needs. It does not read the skill files' actual content into the prompt, though the spec that describes it states that it does. This is the one clear conflict between the reader reports gathered for this digest, resolved here in favor of the source code. The same context gatherer reads the single most recent file in a flat `docs/briefs/` and `docs/specs/` folder. Joycraft has since replaced that layout with a per-feature folder.

Pipit's own harness is a stock Joycraft 0.1.0 install, 14 unmodified skills mirrored into both `.claude/skills/` and `.agents/skills/`, plus the Level 5 holdout scaffold. That scaffold ran its full auto-fix loop once, on 2026-03-25, catching an intentional break and fixing it with no human step in the loop.

Pipit still carries a leftover from a predecessor tool named Joysmith. Five thinly named skills were installed once and never removed. A session-start hook still checks the old `joysmith` package name on the npm registry instead of `joycraft`.

Two self-assessments track Pipit's own harness over time. On 2026-03-23, a Joysmith-era assessment scored the project Level 4, and called out missing specs and an empty CI folder. On 2026-03-25, one day after Joycraft's own Level 5 infrastructure went in, a Joycraft assessment scored the same project Level 5 at a 4.9 average. It cites atomic specs, six skills in active use, and a working auto-fix loop.

## Pipit against the panel rulings

Silent means Pipit carries no comparable mechanism to judge against that ruling.

| Ruling | What the panels concluded | What Pipit does today | Agrees, conflicts, or silent |
|---|---|---|---|
| P0. A reimagining is warranted. | Repair and consolidate Joycraft, and measure the slop before building a gate. | Pipit is a separate codebase, not an attempt to rebuild Joycraft. | Silent. |
| P1. Hub plus few doors. | Only a router block in `AGENTS.md` has data behind it. A hub skill stays a trial. | Pipit does not touch Joycraft's own skill list or routing. | Silent. |
| P2. CLI as state oracle. | Compute state in a local, versioned script, never over `npx` at runtime. | Pipit's own CLI computes session and dashboard state through a local `SessionStore` and `DashboardService`. | Agrees. |
| P3. Gates over advice. | Move the non-overridable guarantee to graduation and to merge, not to a hook. | Pipit's classifier is a soft, advisory gate that falls back to manual triage on any error, not a required check at graduation or merge. | Conflicts. |
| P4. Gated generation. | Curate process prose by default. Generate only machine-checkable artifacts behind an accepted check. | Pipit generates prompts and thread-context files from fixed templates, and never generates a Joycraft skill. | Silent. |
| P5. Fetch-and-subtract profiles. | Keep curated, dated model profiles, and fetch vendor guidance only as input to a reviewed change. | Pipit keeps no model-guidance profile of any kind. | Silent. |
| P6. Jev on the hot path as core. | Jev is never core. Hot-path routing needs a shadow run or a narrow trial first. | Pipit's own classifier is a hot-path model call that sets the autonomy level for every launch, with no shadow run and no baseline comparison. | Conflicts. |
| P7. Hybrid distribution. | The CLI stays the one install and update authority. A plugin ships only as an in-place manifest. | Pipit ships its own separate CLI and apps, and never touches Joycraft's install or update path. | Silent. |
| P8. Which skills die. | No skill dies whole. Cut ceremony first, and protocol only behind an eval. | Pipit never edits or retires a Joycraft skill. It only checks that three skill files exist. | Silent. |
| P9. Front-loaded quality. | The human declares an idea clear, and a real explore state exists before that point. | Pipit's classifier infers readiness for an interview, a brief, or a decompose from one model call, with no explore state and no human declaration. | Conflicts. |
| P10. Architecture defense. | An opt-in mode of design and decide, where corrections become checks or owner-stamped rows. | No equivalent step exists anywhere in Pipit. | Silent. |
| P11. Background profile forks gates. | A user's expertise label must never change which gates run, only the explanation depth. | Pipit has no per-user expertise label of any kind. | Silent. |
| Human declares clarity. | The human says an idea is clear. The agent never infers it. | The classifier infers clarity from the capture text alone, choosing an interview, a brief, or a direct decompose on its own. | Conflicts. |
| No label changes gates. | An expertise label changes explanation depth only, never which gates run. | Pipit has no expertise label to compare. Its classifier label is a different kind of thing, and it does change what runs next. | Silent. |
| CLI is the single authority. | One CLI is the sole install and update authority for the harness. | `pipit-cli` is a wholly separate package, and it never claims authority over Joycraft's own install. | Agrees. |
| Multi-harness. | Joycraft supports Claude Code, Codex, and Pi. | Every brief, spec, and line of Pipit's code targets Claude Code alone, with no mention of Codex or Pi. | Conflicts. |
| Generated prose. | Curate skill and process prose. Do not auto-generate it. | Pipit's own prompt templates are hand-written, and a separate proposal to auto-generate Joycraft few-shot examples was never built. | Silent. |
| Measure the slop first. | Write a failure analysis of bad sessions before building a gate against them. | Pipit's fire-and-forget path already ships, with no failure analysis of its own autonomous runs on record. | Conflicts. |
| `Verify before done`. | Wire an independent check into the move from in-review to done, and require its evidence. | Pipit's fire-and-forget launch returns as soon as the workspace opens, and nothing checks the outcome afterward. | Conflicts. |

### The conflicts in plain words

**The classifier overrides explicit flags**. A thread's classified action decides whether `--dangerously-skip-permissions` gets passed, and whether the session runs interactive or fire-and-forget. It wins over any control-level or mode flag the caller sets by hand. The panels ruled that a non-overridable guarantee belongs at graduation and at merge, decided by a human or by a required check. It never gets inferred mid-flight by one model call with no check on its own answer.

**The classifier infers readiness instead of the human declaring it**. Pipit's four-way label decides whether a capture needs an interview, a brief, or goes straight to a decompose, from the capture text alone. The panels ruled the opposite direction. The human states that an idea is clear, and the agent never infers that state for itself.

**Interactive-over-headless collides with the graduation and computed-state rulings**. Pipit's founding decision keeps every implementation step visible and interactive, for transparency and for trust. The classifier's fire-and-forget path breaks that promise on its own authority. It launches an unattended, permission-skipping session with no computed, checked state to show the launch was safe. This is the same gap the panels' graduation and state-oracle rulings target.

**Claude-Code-only collides with Joycraft's three harnesses**. Every Pipit brief, spec, and source file assumes a single target, Claude Code, and `.claude/skills/`. Joycraft's own multi-harness conclusion treats Codex and Pi as equal citizens, a shape Pipit's code has no path to support today.

**The fire-and-forget path never checks its own outcome**. `implementTask` and the thread-launch path both return success the moment a cmux workspace opens. Neither one checks for a commit, a test, or a pull request afterward. The panels ruled that nothing moves from in-review to done without a passing, independent check, exactly what this path skips.

**Nineteen fixtures and one outlier fall short of a held-out eval**. The classifier's own eval runs on the same nineteen fixtures its own author wrote. One of six stored runs scores 57.9 percent, against 94.7 percent for the other five. No written account explains the gap. The panels treat a held-out, independently written eval as the standard a routing model needs before it earns a place on the hot path.

### Where Pipit already does what the panels asked

- A local `SessionStore` and `DashboardService` compute session and dashboard state from disk and from live cmux calls, never from a runtime `npx` fetch.
- The fire-and-forget and interactive prompt templates are hand-written TypeScript functions, not model output, matching a curated-prose default.
- Every classifier eval call writes a timestamped JSON result to `tests/classifier/results/`, a plain, checkable log.
- `pnpm eval:classifier` gates on an accuracy threshold, 80 percent by default, and exits with a failing code below it.

## Three readings of the maintainer's statement

**Reading one, Pipit as Joycraft's capture front door**. What exists today: a classifier that infers Joycraft-stage readiness, and a launch path that requires `.claude/skills/` with no fallback. Rulings that apply: multi-harness, since this reading ties two products together and inherits Joycraft's Claude-Code-only gap. Human-declares-clarity, since the front door decides readiness on its own. Gates-over-advice, since the classifier is advisory today, not a graduation gate. Unknown: whether this front door replaces Joycraft's own interview skill or sits beside it, and whether Codex or Pi support is on any plan.

**Reading two, Pipit as a separate product that depends on Joycraft**. What exists today: this is the literal, documented relationship. When Joycraft is absent, Pipit falls back to generic plan-implement-commit instructions. When Joycraft is present, it hands off to Joycraft's own stages. Rulings that apply: none bind Pipit directly, since it is a separate codebase. The multi-harness conclusion and the done-only-after-a-check conclusion apply only as general practice on a different repository. Unknown: whether the maintainer plans to keep two codebases with two classifiers, one in TypeScript and one ported to Swift, or unify them.

**Reading three, Pipit as the product that absorbs Joycraft**. What exists today: nothing. No file in either repository describes Joycraft's gates, lifecycle, or skills moving into Pipit. Rulings that apply: the full set. This reading turns Pipit into the dynamic harness the panels reviewed. It carries the gates, the lifecycle, Simplified Technical English, and the TDD loop, none of which exist in Pipit's own Swift or TypeScript code today. Unknown: this reading appears nowhere in either project's written record. Only the maintainer's own words outside these files can settle the question.

## Open questions

- Whether Joycraft's requirement, no fallback, limits Pipit's adoption beyond the three-person dogfood group.
- How the classifier splits one multi-project capture into separate captures.
- The autonomy-threshold tuning interface, per-project or global, has no design yet.
- Notification strategy specifics remain undecided.
- Mac dashboard layout at eight or more project tiles is unresolved.
- The cmux sidebar-state polling interval has no chosen value.
- Swift `Codable` and TypeScript `Zod` schema drift has no check beyond a future build-script idea.
- cmux's AGPL-3.0 license and its effect on a commercial product remains unexamined.
- cmux's own API stability, two months old at the time it was chosen, has no tracked answer.
- Whether `pipit process` stays as a permanent legacy path or gets removed has no decision.
- Golden-example format, load count, and storage location, for the never-built Joycraft feedback loop, remain open.
- The real fix for the phone-to-Mac transport, HTTPS with a pinned certificate, waits for a pre-launch pass.
- No decision record explains the move from Ghostty and AppleScript to cmux.
- `docs/harness-example-app`, a large Python reference tree inside the Pipit repository, has no stated purpose beyond one docstring.

## Sources

- `/Users/compiler/Developer/personal-projects/pipit/docs/briefs/2026-04-03-phase0-command-center-interview-draft.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/briefs/2026-04-04-phase0-context-concierge-brief.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/briefs/2026-04-04-level-classifier-prompt-design-draft.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/briefs/2026-04-04-joycraft-golden-examples-draft.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/specs/claude-code-launch-bridge/`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/specs/phase0-context-concierge/`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/specs/mac-dashboard-ui/`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/specs/ios-companion-app/`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/decisions/`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/contracts/cli-contract.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/joycraft-assessment.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/joysmith-assessment.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/joycraft-history.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/discoveries/`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/architecture/PROJECT_OVERVIEW.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/architecture/DATA_FLOW.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/research/original-planning-doc.md`.
- `/Users/compiler/Developer/personal-projects/pipit/docs/research/2026-04-08-ios-companion-app.md`.
- `/Users/compiler/Developer/personal-projects/pipit/src/classifier/prompt.ts`.
- `/Users/compiler/Developer/personal-projects/pipit/src/joycraft/detector.ts`.
- `/Users/compiler/Developer/personal-projects/pipit/src/cli.ts`.
- `/Users/compiler/Developer/personal-projects/pipit/macos/Pipit/Pipit/`.
- `/Users/compiler/Developer/personal-projects/pipit/ios/PipitMobile/PipitMobile/`.
- `/Users/compiler/Developer/personal-projects/pipit/Packages/PipitModels/Sources/`.
- `/Users/compiler/Developer/personal-projects/pipit/README.md`.
- `/Users/compiler/Developer/personal-projects/pipit/CLAUDE.md`.
- `/Users/compiler/Developer/personal-projects/pipit/.joycraft-version`.
- `/Users/compiler/Developer/personal-projects/pipit/.joysmith-version`.
- `/Users/compiler/Developer/joycraft/docs/research/2026-09-24-dynamic-joycraft-panel-comparison.md`.
- `/Users/compiler/Developer/joycraft/docs/intent/2026-09-24-dynamic-joycraft.md`.
- `/Users/compiler/Developer/joycraft/docs/research/2026-09-24-jev-harness-evidence.md`.
- `/Users/compiler/Developer/joycraft/docs/research/2026-09-24-agentic-os-digest.md`.
