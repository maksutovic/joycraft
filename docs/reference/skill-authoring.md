# Skill Authoring

> How to write or change a shipped Joycraft skill. This page is for contributors to
> this repo and ships nowhere.

## Where skills live

`payload/` is the only source of what users get. Edit there; never route a change
through another repository.

| Path in this repo | What it is | Where it lands in a user project |
|---|---|---|
| `payload/.agents/skills/<name>/SKILL.md` | One skill, with optional `scripts/` beside it | `.agents/skills/<name>/` for Codex, Pi, Oh My Pi, Copilot CLI and OpenCode; `.claude/skills/<name>/` for Claude Code |
| `payload/.claude/agents/*.md` | Claude Code subagents (implementer, reviewer) | `.claude/agents/` |
| `payload/.joycraft/references/*.md` | The detail a skill links to | `.joycraft/references/` |
| `payload/.joycraft/runtime/` | The Node scripts a skill runs | `.joycraft/runtime/` |
| `payload/.joycraft/templates/` | Brief, spec, queue and page templates | `.joycraft/templates/` |
| `payload/.joycraft/contracts/types.d.ts` | The record shapes (queue, report, receipt) | `.joycraft/contracts/` |

For Claude Code, `src/payload.ts` copies each skill to `.claude/skills/` and rewrites
`.agents/skills/` to `.claude/skills/` in its text. Write `.agents/skills/` in the
source.

After any change under `payload/`, run `node scripts/pin-payload.mjs` and commit the
new `payload/PIN` with it. `tests/payload.test.ts` fails when the files and the PIN
differ.

## A skill file

```markdown
---
name: joycraft-<name>
description: What it does, then "Use when ..." with the words a user actually says.
compatibility: What it needs (Node.js 22+, the installed .joycraft runtime, Git), and what works without it.
---

The steps, short. Link to a reference for detail.
```

- **The description decides when the agent uses the skill.** Users do not call
  skills by name. Put the plain phrases a user types ("clean up my AGENTS.md",
  "remember that ...") in the description.
- **Keep the body short; put detail in a reference.** A skill body loads when the
  skill is used. A reference loads only when the step that links it applies.
- **Set `disable-model-invocation: true`** only for a skill that must run only on an
  explicit request (`joycraft-retro`).

## The path rule

A skill runs in the user's project, so every path in its text must resolve there.

- Link a reference from a skill with a relative link:
  `[setup](../../../.joycraft/references/setup.md)`.
- Name a runtime command with its installed path:
  `node .joycraft/runtime/gate.mjs check`.
- Never write `payload/`, `docs/reference/`, `src/` or an absolute path in shipped
  text. Those paths exist only in this repo.

`tests/payload-guard.test.ts` checks that every relative link and every named
reference or runtime path in the payload is shipped. A skill that cites a
repo-only path passes every test you run here by hand and is a dead pointer in
every user project; the guard is how you see it.

## The word budget

The payload must not grow. `tests/payload-guard.test.ts` compares the word count of
the skills, agent files and references with earlier released payloads and fails
when it goes up. Pay for new text by cutting old text. Prefer a runtime check (a
script that exits 2 and names the next step) over more prose.

## PROTOCOL and JUDGMENT

Each step in a skill is one of two kinds:

- **PROTOCOL**: one correct way, and a script or a grep could check it. Deviation is
  a bug in the skill or the agent. Example: "Run
  `node .joycraft/runtime/completion.mjs submit` to move the spec to `in-review`."
- **JUDGMENT**: two competent agents could reasonably differ. Deviation is
  calibration, not error. Example: "Choose the smallest boundary that can establish
  each claim."

When a PROTOCOL step matters, move it into the runtime, so a command enforces it
and the skill only names the command. Treating a JUDGMENT step as PROTOCOL makes
false bugs; treating a PROTOCOL step as JUDGMENT hides real ones.

## Before you open the PR

1. `node scripts/pin-payload.mjs`
2. `pnpm test && pnpm typecheck`
3. Try the skill in a real project: `pnpm build && node dist/cli.js init /tmp/test-project --harness claude,codex --yes`,
   then ask the agent to do the task the skill covers, in your own words.
4. Add a CHANGELOG entry. A PR that touches `payload/` needs one, or a
   `Docs: none — <reason>` line in its body.
