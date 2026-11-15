---
feature: enforced-gates
status: specified
decisions: [
  {
  "id": "activation",
  "status": "clarified",
  "question": "How do the gate hooks get turned on in a project?",
  "answer": "on-request",
  "context": "Joycraft 1.3.0 installs no hooks. Its rule \"only a PASS completes a spec\" holds only when the agent follows the skill text. On 2026-09-22 (Fable-native harness D4) you chose to ship hooks as inert recipes and rejected registering them by default; the revisit condition was users asking for one-command activation. Hooks live in `.claude/settings.json`, a file the user owns.",
  "options": [
    {
      "value": "on-request",
      "label": "On request, by prompt",
      "recommended": true,
      "description": "The user says \"Turn on Joycraft's gates\". The agent shows the settings change on a page and writes it on yes. Setup offers it once.",
      "example": "Install stays as it is. One prompt later, `.claude/settings.json` gains a Stop hook that runs the gate check.",
      "tradeoff": "A user who never asks keeps prompt-level gates."
    },
    {
      "value": "default-on",
      "label": "On at install",
      "description": "`init` registers the gate hooks unless the user declines.",
      "example": "A fresh install already blocks a session that ends with an unaccepted done spec.",
      "tradeoff": "Reverses D4 and writes to a user-owned settings file at install."
    },
    {
      "value": "recipes",
      "label": "Recipes only",
      "description": "Ship the hook snippets as documents. The user wires them.",
      "example": "A new guide page shows the Stop hook JSON to copy.",
      "tradeoff": "Against 1.3.0's rule that the user never copies config by hand; few will do it."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "On request matches 1.3.0 (\"ask, don't run\") and is the one-command activation D4 named as its revisit condition.",
  "affected": [
    "gate-hooks"
  ],
  "note": "make sure this is clearly documented in the github README with a prompt/instructions, why you would want this etc..."
},
  {
  "id": "hook-set",
  "status": "clarified",
  "question": "Which checks become hooks on Claude Code?",
  "answer": "stop-only",
  "context": "A hook sends Claude back to work only when its command exits 2 and prints the reason to stderr. Joycraft's checks already exit 2, but they print to stdout. A spec can stay `in-review` for a good reason (a tool break, a decision you owe), so a hook must not block on `in-review`; it can block on a `done` spec with no accepted report, owner acceptance or waiver.",
  "options": [
    {
      "value": "stop-only",
      "label": "Session end only",
      "recommended": true,
      "description": "One Stop hook runs the gate check: every `done` spec has an acceptance, and queue and spec text agree.",
      "example": "The agent edits the queue to `done` by hand and tries to finish. The hook answers: spec 3 is done with no accepted report. The agent runs the review.",
      "tradeoff": "A bad state is caught at the end of the session, not at the moment it is written."
    },
    {
      "value": "stop-and-task",
      "label": "Session end and each finished task",
      "description": "Adds a TaskCompleted hook that runs the `[AC:id]` trace for the spec in hand.",
      "example": "A worker marks its task complete with one criterion untested. The hook sends it back to write that test.",
      "tradeoff": "Tasks do not map one-to-one to specs on every host, so the hook must find the spec; more to keep working."
    },
    {
      "value": "all-three",
      "label": "Those two, and a guard on queue edits",
      "description": "Adds a PreToolUse guard that refuses a direct edit setting a queue status to `done`.",
      "example": "An Edit to `.joycraft-spec-queue.json` that sets `done` is refused; `completion.mjs` is the only way through.",
      "tradeoff": "Runs on every edit. A shell command can still write the file, so it is not a full guarantee."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "Start with the one hook that closes the named gap. Add the others when a field report shows the need.",
  "affected": [
    "gate-check",
    "gate-hooks"
  ]
},
  {
  "id": "ci",
  "status": "clarified",
  "question": "How does the same check reach CI?",
  "answer": "none",
  "context": "Hooks hold only on the host that has them. CI runs the same check on every pull request, whichever agent or session made it. The 0.7 line had a rule that install never writes to `.github/workflows/`.",
  "options": [
    {
      "value": "workflow-on-request",
      "label": "A workflow file, on request",
      "recommended": true,
      "description": "The user says \"Check Joycraft's gates in CI\". The agent shows a small GitHub Actions workflow on a page and writes it on yes.",
      "example": "A pull request with a hand-set `done` spec fails the Joycraft gates check.",
      "tradeoff": "GitHub Actions only. Other CI systems get the command and no file."
    },
    {
      "value": "command-only",
      "label": "The command, documented",
      "description": "The check is one command. The user's agent adds it to whatever CI the project has.",
      "example": "\"Add Joycraft's gate check to our CI\" and the agent edits the project's existing pipeline.",
      "tradeoff": "Each project gets a slightly different wiring; harder to test from here."
    },
    {
      "value": "none",
      "label": "No CI in this feature",
      "description": "Hooks only for now.",
      "example": "Nothing changes in CI.",
      "tradeoff": "Codex, Pi, Copilot and OpenCode users keep prompt-level gates."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "CI is the only gate that covers all six harnesses. On request keeps the old rule that install never writes a workflow.",
  "affected": [
    "gate-ci"
  ]
},
  {
  "id": "harnesses",
  "status": "clarified",
  "question": "Which coding agents get hooks in this feature?",
  "answer": "claude-first",
  "context": "The exit-2 hook contract is checked for Claude Code only (talk and docs, 2026-11-12). The payload's installer names hook files for Codex and Copilot too, but I have not checked what those hosts do with exit codes.",
  "options": [
    {
      "value": "claude-first",
      "label": "Claude Code now, others later",
      "recommended": true,
      "description": "Hooks ship for Claude Code. The other harnesses get the CI check. Codex and Copilot hooks become a later feature, after a check of their hook contracts.",
      "example": "A Codex user says \"Turn on Joycraft's gates\" and is told: hooks are Claude Code only for now; here is the CI check.",
      "tradeoff": "Uneven across harnesses until the later feature."
    },
    {
      "value": "all-with-hooks",
      "label": "Every harness that has hooks",
      "description": "Research Codex and Copilot hook contracts first, then ship all three together.",
      "example": "One prompt works on Claude Code, Codex and Copilot.",
      "tradeoff": "A research step before any spec; a larger feature."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "Ship the part that is verified. CI covers the rest in the same release.",
  "affected": [
    "gate-hooks"
  ]
}
]
---
# Feature intent

Make Joycraft's review gate hold when nobody is watching. Today "only a PASS
completes a spec" is a sentence in a skill. This feature adds one check command
and lets the harness and CI run it, so the rule no longer depends on the agent
choosing to follow it.

Source: Lydia Hallie's talk "Rethinking Claude Code Best Practices"
(2026-11-12 review) and the Claude Code best-practices page. Her point:
prompting is not a guarantee; a guarantee lives in a hook, a deny rule or CI.

## Context and authorization

- Max asked for this brief on 2026-11-12 ("Gates brief"). The brief is
  authorized; the specs wait for the four decisions above.
- Verified on `origin/main` (1.3.0, payload `field-18`):
  - The payload has no Stop, TaskCompleted or PostToolUse hook and no CI check.
  - `status.mjs` reports drift between queue and spec text. It knows which
    `done` specs are accepted (`acceptedReport`, `ownerAcceptance` or `waiver`),
    but it does not report a `done` spec that has none of them. A hand-edited
    `done` passes.
  - `status.mjs`, `trace.mjs` and `dispatch-start.mjs` exit 2 on a finding and
    print the result to stdout. A Claude Code hook needs exit 2 with the reason
    on stderr.
  - `joycraft-entry/SKILL.md` (lines 143–151) and `references/setup.md`
    (line 324) point to `hooks-runtime.md`, `hooks-install.md`,
    `hooks-claude.md` and `routing.md`. None of them is in the repository.
    `scripts/export.mjs` imports `./install-hooks.mjs`, which is also absent.
- Earlier decision: Fable-native harness D4 (2026-09-22), hooks as inert
  recipes. This feature reaches its revisit condition.
- The payload is vendored from joycraft-prototype. Payload changes are made
  there and arrive here with a new `PIN`. The tag is `field-20` (see the
  note below on `field-19`).
- Not checked: whether the prototype still has a hook installer to reuse. That
  is a discovery step for decompose, not a decision for Max.

## Goals

- **gate-check.** One command answers "does every finished spec have an
  acceptance?"
  **Done when:** in a project where the queue has spec 3 `done` with no
  `acceptedReport`, `ownerAcceptance` or `waiver`, the command exits 2 and
  names spec 3 on stderr. With spec 3 `in-review` and held, it exits 0. With
  every `done` spec accepted and no drift, it exits 0 and prints nothing to
  stderr.
- **gate-hooks.** The harness runs the check without being asked.
  **Done when:** in a Claude Code session with the gates on, an agent that sets
  a spec to `done` by hand cannot end the session; it is sent back with the
  spec named. With the gates off, nothing changes from 1.3.0. Turning the gates
  off again removes only Joycraft's hook lines.
- **dead-references.** No shipped skill or reference points to a file that is
  not shipped, or describes a part that is not shipped.
  **Done when:** a test over the payload finds every relative link and every
  named reference or runtime path present, at any depth. It fails on today's
  `field-18` payload, lists seven files, and passes after the change. A second
  test finds no text about the unshipped hook and ranker parts, and the payload
  text is shorter than `field-18`.
- **review-cap.** The limit of three reviews for one spec is a runtime check.
  **Done when:** a reviewer startup for a spec with three reviews of three
  different code revisions exits 2 and names the spec. A repeat review of the
  same revision is not counted.
- **docs.** The README has its own section on the gates: what they do, why
  you would want them, the prompt that turns them on and the prompt that turns
  them off (Max's note on `activation`). `docs/prompts.md` and the CHANGELOG
  carry the same prompts.

## Agent work and pending choices

All four decisions were answered on 2026-11-12: `activation` on request,
`hook-set` Stop only, `ci` none, `harnesses` Claude Code first. Nothing is
pending. The specs are in `specs/`.

Three more rulings came from the review of two talks on 2026-11-15. They are
recorded in `docs/features/2026-11-15-talk-review-tan-holmes/brief.md`, which
owns their decision state: `dead-reference-scope` "seven-and-text" (spec 2),
`review-cap` "enforce" (new spec 5), `gate-on-all-harnesses`
"session-end-runs-gate" (spec 3). They do not change the four answers above.

Specs 1, 2, 3, 5, 6, 7 and 8 were implemented in joycraft-prototype on
2026-11-15, each accepted on an independent PASS review, and tagged
`field-19`. Then `field-20` repaired uninstall: removing Joycraft turns the
gate hook off first, so no Stop hook is left that runs a deleted `gate.mjs`.
This repository vendors `field-20`. Specs 6, 7 and 8 were added there from review findings: a review
round is one distinct set of reviewed inputs (6), each gate message names its
next step (7), and a pending-journal message stops at a failed recovery (8).
The prototype's archive holds the reports. Spec 4 is the only spec left.

## gate-check

Extend the status check, or add a small sibling command, so that a `done` spec
without an acceptance is a problem. The reason goes to stderr and the exit code
is 2, so the same command serves a hook, CI and a person. A held `in-review`
spec is never a failure.

## gate-hooks

Per `activation`, `hook-set` and `harnesses`. The hook command calls
`gate-check` and nothing else. Joycraft's lines in the user's settings file are
marked so they can be removed without touching the user's own hooks.

Per `gate-on-all-harnesses`, the session-end skill also runs the check, so it
runs on every harness. Without a hook that step is prompt-level.

## review-cap

Per `review-cap`. Reviewer startup counts the earlier reports for the spec by
code revision and refuses a fourth review. The message tells the agent to
record `## Decision needed`. The gate check itself does not change.

## Scope and limits

- No CI check in this feature (`ci`: none). Backlogged. Consequence, with
  `harnesses` Claude Code first: Codex, Pi, Oh My Pi, Copilot and OpenCode keep
  prompt-level gates until a later feature, with two exceptions that reach
  every harness: the session-end skill runs the check, and reviewer startup
  refuses a fourth review.
- No auto-mode trust settings: Claude Code ignores `autoMode` in project
  settings, so Joycraft cannot ship them.
- No deny rules, sandbox or cloud-session work here. Cloud sessions (the
  git-ignored `.joycraft/local/` state does not travel) are a separate feature.
- No model split for the implementer and reviewer agents here.
- No new runtime dependency.
- A hook is not a sandbox. A shell command can still write the queue file; the
  check catches the result at session end and in CI.
