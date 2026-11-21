---
feature: code-mode
status: draft
decisions: [
  {
  "id": "code-mode-posture",
  "status": "clarified",
  "question": "What does Joycraft do about Claude Code's Code Mode now?",
  "answer": "compatible",
  "context": "Code Mode gives Claude two tools, REPL and Poll. Claude writes JavaScript that makes many tool calls in one step, and only the returned value enters the context. It is experimental and off by default. It works only in an interactive terminal session: not `claude -p`, the Agent SDK, the Desktop app, VS Code or cloud. A project cannot turn it on: Claude Code ignores the variable in a project's settings files, so `joycraft init` cannot set it the way it sets agent teams.",
  "why": "The video reports about half the input tokens and 71% of the cost in the speaker's own runs (8:47). No Anthropic number exists. The docs say it \"may change or be removed in any release\".",
  "options": [
    {
      "value": "compatible",
      "label": "Make Joycraft work with it; do not depend on it",
      "recommended": true,
      "description": "Check that hooks, gates and the review loop behave the same in a Code Mode session. Fix what breaks. Joycraft does not enable it, require it or change skills for it.",
      "example": "A Claude Code user who turns Code Mode on in their own settings runs a Joycraft spec queue and sees the same gates and blocks as before.",
      "tradeoff": "One terminal run that you or a terminal session must do. No cost saving is promised to users."
    },
    {
      "value": "promote",
      "label": "Compatible, and recommend it in the docs",
      "description": "The same check, plus a prompt-first docs note that tells Claude Code users how to turn it on for long spec queues.",
      "example": "The Claude Code page gains a short section: what to add to ~/.claude/settings.json and what stops working (Remote Control, Desktop resume).",
      "tradeoff": "Joycraft recommends a feature that can be removed in any release, and that blocks Remote Control and session moves."
    },
    {
      "value": "wait",
      "label": "Do nothing until it is released as stable",
      "description": "Keep the digest. No check, no change.",
      "example": "Joycraft 1.5.x is unchanged. The topic is reopened when Code Mode leaves experimental.",
      "tradeoff": "A user who turns it on today can meet refused tool calls from a stale hook, and Joycraft has not looked."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "Code Mode is Claude-only, terminal-only and experimental, and it is outside the headless path. Joycraft is stack-agnostic across six harnesses. Being safe with it costs little; building on it does not fit.",
  "affected": [
    "docs/research/2026-11-17-claude-code-code-mode-digest.md"
  ]
},
  {
  "id": "compat-scope",
  "status": "clarified",
  "question": "If Joycraft is made compatible, how much goes into that work?",
  "answer": "run-and-fix",
  "context": "Reading the docs and the Joycraft files found three gaps. (1) In Code Mode a PreToolUse hook that cannot start refuses the tool call; outside it the call proceeds. Joycraft registers hooks with no check that the file exists and is executable. (2) The lockdown skill says the auto-mode classifier \"reviews each action\"; in Code Mode it reviews the code, not each call. (3) No hook recipe matches the REPL tool, which is the documented way to check the code itself. The safeguard hook and the PR docs gate should already work: their patterns match compound commands such as `cd 'app' && git push`. None of this was run.",
  "why": "Official docs, \"Tool call refused by a hook\": a hook that fails or times out \"refuses the call even when onFailure is unset\".",
  "options": [
    {
      "value": "run-and-fix",
      "label": "Field run, hook-file check, lockdown sentence",
      "recommended": true,
      "description": "One Code Mode run of a small spec queue with token and cost numbers recorded. Setup and upgrade report a registered hook whose file is missing or not executable. One sentence in the lockdown skill is corrected.",
      "example": "`joycraft upgrade` prints: hook .claude/hooks/joycraft/block-dangerous.sh is registered but not executable.",
      "tradeoff": "A small spec set. The hook-file check is useful on every harness, so it is not Code Mode-only work."
    },
    {
      "value": "plus-recipe",
      "label": "The same, plus a REPL hook recipe",
      "description": "Adds a fifth recipe in src/templates/hooks that matches REPL and scans tool_input.code against the deny patterns.",
      "example": "A team copies repl-code-guard.sh and blocks code that contains a force push before it starts.",
      "tradeoff": "A recipe for an experimental tool whose input shape can change. The per-call hooks already catch the same commands."
    },
    {
      "value": "run-only",
      "label": "Field run only",
      "description": "Run it, write down what happens, decide after.",
      "example": "A field note records: hooks fired, gates stopped, cost with and without.",
      "tradeoff": "The stale-hook gap stays open until a second round."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "The hook-file check and the lockdown sentence are correct with or without Code Mode. The REPL recipe ties Joycraft to an input shape that is not stable yet.",
  "affected": [
    "src/update-inventory.ts",
    "src/safeguard.ts",
    "src/claude-skills/joycraft-lockdown.md"
  ]
}
]
---
# Feature intent

Decide what Joycraft does about Claude Code's experimental Code Mode. Max asked
on 2026-11-17: watch Ray Amjad's video, research Code Mode, and say how Joycraft
can use it. The analysis, the sources and the file-by-file check are in
[the digest](../../research/2026-11-17-claude-code-code-mode-digest.md).

## Context and authorization

- Sources: the video (transcript read in full, 8 stills), the official Code
  Mode docs, one third-party test.
- Run: two paired trials on 2026-11-17, after this brief was first written
  (see "Agent work and pending choices").
- Authorized: the research and this brief. Not authorized: any change to the
  payload, skills, hooks or docs. Each answer becomes specs only after Max
  answers.
- Earlier decisions kept: Joycraft is stack-agnostic (no per-stack
  validation); no telemetry; docs give prompts, not commands.

## Goals

- **Answer the two choices.** **Done when:** both decisions above are
  `clarified`, and specs exist for the chosen scope or the brief records that
  nothing is to be done.

## Agent work and pending choices

Max answered both on 2026-11-17 with the recommended options: `compatible` and
`run-and-fix`.

**Correction to `compat-scope`, 2026-11-17.** Its context was wrong. The
hook registration and the lockdown skill it names are in the 0.7 updater, which
1.x does not ship. A 1.5.3 test install has no `settings.json` and no
`PreToolUse` hook. What remains of `run-and-fix` is the field run; fixes follow
from what the run shows. See the corrected table in the digest.

Field run, done 2026-11-17: two paired trials in
`~/Developer/joycraft-code-mode-trial`, one pair each. Joycraft 1.5.3 ran
clean in Code Mode in both; nothing in Joycraft needs a change for it.

| Trial | Cost, control → Code Mode | Wall time | Outcome |
|---|---|---|---|
| Three-spec code queue | $5.07 → $3.99 (−21%) | 11.6 → 10.8 min | Same: 3 specs done, tests pass |
| One spec, 100+ MCP calls | $7.78 → $2.55 (−67%) | 11.4 → 6.8 min | Same: report fully correct |

One pair per trial; not a rate. Tables, limits and three Joycraft findings
that are not about Code Mode (archive slug, receipts carrying source data into
the archive, reviewer agent ID) are in the digest under "Field trial results".

Open after the run: more pairs; whether the docs mention Code Mode (the
`compatible` answer excludes recommending it); the receipt question.
