# Upgrade Nudge in Entry-Point Skills — Draft Brief

> **Date:** 2026-04-06
> **Status:** DRAFT
> **Origin:** /joycraft-interview session

---

## The Idea

Joycraft ships daily updates, but users only get them if they remember to run `npx joycraft upgrade`. There's already a SessionStart hook that checks the npm registry and prints a version nudge, but it's easy to miss among other session output and doesn't offer to act on it.

The idea: entry-point skills (interview, new-feature, bugfix, decompose, tune) should detect when the SessionStart hook reported a newer version, and before doing their main work, surface the nudge prominently and offer to run the upgrade for the user.

## Problem

Users running stale versions of Joycraft get outdated skills, templates, and workflows. The current SessionStart nudge is passive — it prints a line that gets buried. There's no actionable prompt, so users have to remember the command and run it themselves.

## What "Done" Looks Like

1. User starts a Claude Code session → SessionStart hook checks npm registry (already works)
2. User invokes `/joycraft-new-feature` → skill notices a newer version is available → displays a clear message: "Joycraft X.Y.Z is available (you have A.B.C). Want me to upgrade now?"
3. If user says yes → skill runs `npx joycraft upgrade --yes` → reports what changed → advises whether a new session is needed (only if hooks/CLAUDE.md changed, not for skill-only updates)
4. If user says no → skill continues with current version, no further nagging in that session
5. Works for both Claude Code and Codex skill invocations

## Constraints

- **Small surface area:** Only entry-point skills check — interview, new-feature, bugfix, decompose, tune. Quick-action skills (add-fact, verify, session-end, lockdown, optimize, research, design) do NOT check.
- **One check per session:** The SessionStart hook does the registry lookup. Skills just read the hook's output/signal — no duplicate network calls.
- **Smart restart advice:** After upgrade, detect whether hooks or CLAUDE.md changed (not just skills). If only skill files changed, say "changes take effect immediately." If hooks/CLAUDE.md changed, say "start a new session to pick up all changes."
- **Non-blocking:** User can always decline and continue. No forced upgrades.
- **Codex parity:** Codex skills should have equivalent behavior (Codex doesn't have SessionStart hooks, so may need a different trigger mechanism — open question).

## Design Decisions

- **Signal file approach:** The SessionStart hook writes `.joycraft-update-available` (containing the latest version string) when a newer version exists, and deletes it when versions match. Entry-point skills check for this file — no duplicate network calls, no fragile session context parsing.
- **Codex parity via inline check:** Codex entry-point skills do their own npm registry fetch (short timeout) since Codex has no session hooks. They write the same `.joycraft-update-available` file so subsequent skill invocations in the same session don't re-fetch.
- **Auto-accept with `--yes`:** The skill-triggered upgrade runs `npx joycraft upgrade --yes`. The user already consented by saying "yes" to the prompt — per-file prompts would be friction on friction. Users who want fine-grained control can run `npx joycraft upgrade` manually.

## Open Questions

- Should `.joycraft-update-available` be gitignored? (Probably yes — it's ephemeral session state.)

## Out of Scope (for now)

- Auto-upgrading without user consent
- Checking for updates on every skill invocation (only entry-point skills)
- In-place hot-reloading of hooks/CLAUDE.md mid-session
- Version pinning or "skip this version" functionality

## Raw Notes

- SessionStart hook already exists at `.claude/hooks/joycraft-version-check.mjs` — fetches npm registry with 3s timeout, compares to `.joycraft-version`
- `upgrade.ts` already handles both Claude Code (`.claude/skills/`) and Codex (`.agents/skills/`) via `CODEX_SKILLS` bundle
- Skill files are loaded when invoked, not at session start — so upgraded skills take effect immediately without a new session
- Hooks and CLAUDE.md are loaded at session start — changes to those require a new session
- The upgrade command has a `--yes` flag for non-interactive mode (skips per-file prompts for customized files)
