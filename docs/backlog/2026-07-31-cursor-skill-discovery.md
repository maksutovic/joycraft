---
status: backlog
owner: Maximilian Maksutovic
created: 2026-07-31
source: docs/features/2026-07-31-team-ready-gates/brief.md
---

# Cursor skill discovery — /joycraft absent from the slash menu

Praful installed the Joycraft skills in Cursor; Cursor can find the skill files,
but typing `/` does not surface any joycraft commands. Asking Cursor to fix it
itself did not work, so he fell back to Claude Code — which he'd rather not do
for cost reasons (Cursor runs Kimi 2.6 internally).

Needs research: where Cursor actually loads slash commands / skills from, and
whether sync-skills should emit a Cursor-shaped tree the way it does for
`.claude` / `.agents` / `.pi` / `.github`. Flagged as an enterprise-relevant
gap: "if you have any Cursor customers… they won't be able to use it right now."
