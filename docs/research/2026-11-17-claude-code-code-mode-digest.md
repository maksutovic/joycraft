# Claude Code "Code Mode" against Joycraft 1.5.2

**Date:** 2026-11-17 · **Baseline:** `origin/main` 1.5.2 (`c79c1e8`)
**Decisions for Max:** `docs/features/2026-11-17-code-mode/brief.md`

## Sources and method

| Source | What it is | Trust |
|---|---|---|
| Ray Amjad, "Code Mode Is Claude Code's BIGGEST Harness Change Yet" (14:54), https://www.youtube.com/watch?v=DRNbxPk9Ab8 | Explainer and demo on Claude Code v2.1.325 | Transcript read in full with `vidctx`; 8 of 145 stills read (setup, tool list, REPL code, binary notes). Cost numbers are his own test |
| Official docs, https://code.claude.com/docs/en/code-mode | Requirements, permissions, hooks, troubleshooting | Primary. Fetched 2026-11-17 |
| i10x news item, https://i10x.ai/news/claude-code-code-mode-javascript-tool-calls | Third-party test | Secondary. Says the widely shared "37% fewer tokens" figure is from a 2025 Anthropic API article, not from Code Mode |

The first version of this digest was written before any run. Two paired runs
were done later the same day; see "Field trial results". Statements marked
"should work" or "needs a run" are from reading, and the trial section says
which of them the runs settled.

## What Code Mode is

Without it, Claude calls one tool, reads the result, and decides the next call.
Each result stays in the context window and is re-read on each later call
(video 1:42). With it, Claude gets two tools (video 6:18):

- **REPL**: a JavaScript session that lasts for the whole Claude Code session.
  All other tools are functions inside it: `` $`...` `` for shell, `file()`,
  `write()`, `edit()`, `preview(out, n)`, `searchTools`/`describeTool` for MCP,
  `tools.<name>()` for any tool, including Agent, Skill and Workflow
  (video 6:18, 10:07). Variables stay between calls. Only what the last
  expression returns enters the context.
- **Poll**: waits for code that was moved to the background.

The docs example: find a file, edit it, run its test, return the path and the
test output, all in one call.

Lineage (video 2:13–5:22): Cloudflare's "Code Mode" article (one `execute` tool
in place of thousands of MCP tools) → server-side code mode per MCP server →
client-side code mode over all MCP servers (gateways such as executor.sh) →
code mode over every harness tool, which is what Claude Code now has. The video
says Codex, OpenCode and Pi have their own versions; not checked.

## Facts that matter for Joycraft

From the official docs unless marked.

1. **Experimental, off by default**, "may change or be removed in any release".
   Needs v2.1.323+ (v2.1.326+ with agent teams on).
2. **A project cannot turn it on.** `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1` works
   from the shell or `~/.claude/settings.json` only. Claude Code ignores it in a
   project's settings files. Joycraft `init` writes
   `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to the project's
   `.claude/settings.json`; the same move does nothing for Code Mode. Managed
   settings can only block it.
3. **Interactive terminal only.** Not `-p`, not the Agent SDK, not the VS Code
   panel, not the Desktop app, not cloud sessions. Not through Bedrock, Vertex,
   Foundry or a gateway. Models: Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.2.
4. **Hooks still run.** Each tool call made from code goes through `deny` and
   `ask` rules and `PreToolUse` hooks under the tool's usual name (`Bash`,
   `Edit`). Three differences:
   - A command can arrive in compound form: `git push` in folder `app` reaches
     the hook as `cd 'app' && git push`.
   - **Hook failure refuses the call.** If a `PreToolUse` hook cannot start,
     is killed, exits 126/127/>128, returns invalid output or times out, the
     call is refused. Outside Code Mode the same failure lets the call proceed.
     Exit 1 still lets the call proceed.
   - The code itself can be checked: a `PreToolUse` hook that matches `REPL`
     reads the JavaScript from `tool_input.code`.
5. **Auto mode reviews the code, not each call.** The classifier does not see
   values computed at run time. The docs say to keep rules or hooks for calls
   that must be controlled.
6. **Blocked by some plugins and mods.** A mod with a JavaScript hook that
   checks tool calls stops Code Mode from starting (video 6:01: his
   transcript-redactor mod). The docs also list "it doesn't yet work with the
   plugin" and name the plugin at start. Shell `command` hooks in
   `settings.json` are not in that list.
7. **Sessions do not move.** A Code Mode session resumes only in the terminal
   with Code Mode on. No Remote Control, Chrome or computer use. No move to
   Desktop or a background session.
8. **Limits.** Code that Claude waits on stops after ten minutes. Background
   code (auto or `bypassPermissions` mode from session start) runs up to two
   hours. With background code, `UserPromptSubmit` hooks also run on code
   output (`source: poll_event`).

## Claimed gains

| Claim | Source | Note |
|---|---|---|
| About half the input tokens, 71% of the cost | Video 8:47 | His own runs on open-source issues. Method not shown |
| Opus 5.5 with one Python REPL: 71% vs 65% on Terminal-Bench | Video 9:21 | Third party, not Claude Code's Code Mode |
| browser-use rewrote to a REPL on raw CDP: up to 50% better, 2–5× cheaper | Video 9:03 | Different product |
| "37% fewer tokens" | Social posts | From a 2025 API article, not Code Mode (i10x) |

No number from Anthropic for Claude Code's Code Mode was found.

## Not released

`spawnContext`, `listContexts`, `releaseContext` are in the binary but not
released (video 10:06–11:12, read from the binary by his agent). Subagents
started from code; a context can fork the main conversation; a subagent can talk
to the coordinator. The speaker links this to recursive language models (REPL +
subagents from the REPL + prompt held in a variable). This is speculation about
a roadmap. Do not plan on it.

## Joycraft, checked by hand

**Correction, 2026-11-17 (same day).** The first version of this section read
`src/safeguard.ts`, `src/update-inventory.ts`, `src/claude-skills/` and the
repository's own `.claude/hooks/`. Those are the 0.7 updater, which the 1.x CLI
no longer reaches (`docs/context/architecture.md`), and this repository's own
dogfood hooks. A test install of 1.5.3 showed what users get: skills, two
agents, the runtime, no `settings.json` and no `PreToolUse` hook. The table
below is for 1.x.

| Joycraft 1.x part | File | In Code Mode |
|---|---|---|
| Hooks installed by `init` | none | Nothing to break. The fail-closed rule for `PreToolUse` hooks touches only hooks the user wrote |
| Stop-hook gate (opt-in) | `payload/.joycraft/runtime/gate.mjs hook --on` | Unknown. `Stop` is not in the docs' list of changed hook events; needs a run |
| Runtime commands | `payload/.joycraft/runtime/*.mjs` | Run through the shell helper. A non-zero exit throws unless `.nothrow()` is used; the agent still sees it |
| Subagents | `.claude/agents/joycraft-implementer.md`, `joycraft-reviewer.md` | Called as a function from code. Whether `dispatch-start.mjs` gets a correct native identity there needs a run |
| Skills and references | `payload/` | No "use the Read tool" wording found (grep). Nothing to reword |
| Lockdown skill, safeguard hook | 0.7 only | Not shipped in 1.x |
| Evals, autofix, headless loop | `claude -p` | Code Mode does not apply |
| This repository's own hooks | `.claude/hooks/joycraft/block-dangerous.sh`, `pr-docs-gate.mjs` | Should work for maintainers: patterns match `cd 'app' && git push` |

## Field trial results

Two paired trials, 2026-11-17. Max ran each arm in a terminal; one pair per
trial. Same project copy, prompt, model (Opus 5.5), permission mode (auto) and
Claude Code version (2.1.326) in both arms; control with
`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=0`, treatment with `1`. Joycraft 1.5.3,
payload `field-23`, installed from a local build of main `c79c1e8`. Numbers are
read from the session transcripts by `collect.mjs`; outcomes are checked by the
script, not taken from the agent's report. Trial files:
`~/Developer/joycraft-code-mode-trial` (outside this repository).

**Trial 1: a three-spec code queue** (small Node library, 30 fixture files, no
MCP).

| | Control | Code Mode | Change |
|---|---|---|---|
| Cost (USD) | 5.07 | 3.99 | −21% |
| Wall time (min) | 11.6 | 10.8 | −7% |
| All tokens | 8.45M | 5.28M | −38% |
| Cache-read tokens | 8.04M | 4.92M | −39% |
| Output tokens | 53,851 | 45,672 | −15% |
| API requests | 92 | 283 | ×3.1 |
| Tests pass / fail | 14 / 0 | 16 / 0 | |
| Specs done, gate exit, commits | 3, 0, 7 | 3, 0, 7 | |

**Trial 2: one spec that needs 100+ MCP calls** (three local MCP servers,
about 375 KB of padded JSON, charges listed per customer five per page; the
report is checked against an answer key the project does not hold).

| | Control | Code Mode | Change |
|---|---|---|---|
| Cost (USD) | 7.78 | 2.55 | −67% |
| Wall time (min) | 11.4 | 6.8 | −40% |
| All tokens | 10.11M | 3.58M | −65% |
| Output tokens | 69,360 | 24,608 | −65% |
| API requests | 104 | 404 | ×3.9 |
| MCP calls that reached the servers | 130 | 256 | ×2.0 |
| MCP bytes returned | 554,630 | 1,010,507 | ×1.8 |
| Top-ten rows, totals, by-source correct | 10/10, yes, yes | 10/10, yes, yes | |
| Subagents launched | 6 | 1 | |
| Feature archived | no (held) | yes | |

What the runs show:

- **Joycraft 1.5.3 runs in Code Mode without a change.** Skills, runtime
  commands, the reviewer subagent launched from code, guarded completion, the
  Stop-hook gate and (trial 2) the archive all worked. No hook error in 770
  logged tool calls. This settles the "needs a run" rows above for the Stop-hook
  gate and subagents.
- **The saving grows with tool output.** Small on the code queue, large on the
  MCP task. That agrees with the mechanism: results stay out of the context.
- **Time moves less than cost.** Code Mode made three to four times as many API
  requests, and nearly every `REPL` call was followed by a `Poll` (62 of 66 in
  trial 1, 43 of 45 in trial 2).
- **In trial 2 the Code Mode reviewer rebuilt the whole report from the
  servers;** the control's reviewer sampled what the spec's checks named. Code
  Mode did twice the MCP work for a third of the cost.
- **Compound commands are real.** 48 Bash commands in the Code Mode arms
  arrived as `cd … && …` (2 in the controls). A user's Bash hook must handle
  that form.

Limits:

- One pair per trial. The run shapes differed between arms (6 subagents against
  1 in trial 2), which is agent variance the trial does not control. Do not
  quote the percentages as a rate.
- Whether Claude Code's cost record includes subagents was not confirmed. Token
  totals include every transcript, and tokens and cost moved together.
- The control ran first in both trials.
- Not compared against the published npm tarball byte for byte.

Joycraft findings that are not about Code Mode:

1. **Archive cannot resolve a dated folder** whose queue `feature` field has no
   date (`archive.mjs:16`, `:370`). Both arms of trial 1 stopped on it. Two of
   this repository's own features have the shape. A fix is in progress in a
   separate session (prototype source, `field-24`, re-vendor PR); not merged at
   the time of writing.
2. **Review receipts can carry source data into the archive.** In trial 2 the
   reviewer's MCP receipt held emails and charge amounts. The trial project
   forbade MCP data in the repository. The control held the archive; the Code
   Mode arm archived and left the receipt untracked, so its archive manifest
   names a file that a fresh clone does not have. Open question: should a
   receipt be redacted or excluded before archive?
3. **A reviewer subagent cannot see its own agent ID** in Claude Code. The
   coordinator passes it in and each report records the limit. Both arms.

## What Joycraft can do

1. **Done: run Joycraft in Code Mode against a control.** Clean in both
   trials. Nothing in Joycraft needs a change for Code Mode.
2. **More pairs** before any number is published: three per trial at least,
   with the arm order alternated.
3. **Docs**, Max's call: one prompt-first note that a Claude Code user can turn
   it on for themselves, that Joycraft cannot, and that it pays most on
   MCP-heavy work. The `compatible` answer in the brief excludes recommending
   it, so this needs a new decision.
4. **Act on the three findings above.** The archive fix is under way; the
   receipt question and the agent-ID limit have no owner yet.

What Joycraft should not do: depend on Code Mode, enable it, or rewrite the
implement driver around `spawnContext`. It is Claude-only, terminal-only,
experimental and outside the headless path.
