---
feature: legacy-guard-retire
status: specified
---
# 1.6.1 asks what to do with the old 0.7 shell guard

## Problem

On 2026-11-19 a field project ran Sentry's agent handoff. Sentry documents
one command: `curl -fsSL https://cli.sentry.dev/install | SENTRY_HANDOFF=<code> bash`.
A Joycraft guard blocked it (deny pattern `curl.*\|.*sh`, exit 2). The owner
had asked for the install. The agent got around the guard, and the one-time
code expired while it asked for permission.

The guard is not part of 1.x. 0.7 `harden` wrote it. Many vendors now hand
off to agents with a link, a short-lived code and a `curl | sh` installer.
A guard that nothing maintains must not stop them.

## What is true today

- A fresh 1.x install has no shell guard. Its only PreToolUse check is Jev.
- 0.7 `harden` wrote `.claude/hooks/joycraft/block-dangerous.sh`,
  `.claude/hooks/joycraft/deny-patterns.txt` and one `PreToolUse` entry in
  `.claude/settings.json`. 0.7 wrote them for Claude Code only.
- The 1.x migration keeps them (`KEPT` in `src/legacy-07.ts`) and only
  fixes the script path. After that, no 1.x step reads, updates or names
  them. They are not in `.joycraft/installation.json`.
- The script says "Edit deny-patterns.txt". Project docs say never edit the
  guard. The agent cannot tell that the guard is old and safe to remove.
  The owner can remove it by hand today, but nothing tells anyone that.

## Decision

- When `init --migrate` or `update` finds the old guard, it asks one
  question: remove the guard, or keep it.
  - **Remove:** the script, the list and the settings entry go to the
    update backup. Rollback restores them byte for byte.
  - **Keep:** nothing changes. The guard stays the owner's file. Update
    does not ask again.
- The question says what the guard is: a 0.7 text-match guard that 1.x does
  not maintain, that stops accidents but is not a security boundary, and
  that blocks vendor installs that pipe a script to a shell.
- A guard with the owner's changes (changed script or extra list lines) gets
  the same question. The question says it has changes; the backup keeps them.
- No guess without a person. A run with no terminal prints the question and
  the flag that answers it, and changes nothing. `--yes` alone keeps the
  guard for that run and asks again next time.
- No replacement guard. 1.x does not take ownership of a deny list (owner
  rule "design for the 99%": the agent judges, the person says yes or no).

## Not in scope

- A 1.x shell guard for new installs.
- Guards on other hosts. 0.7 never wrote one.
- The local allow list in the field project that hit this. Removing the
  guard removes the reason for it.
