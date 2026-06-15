---
status: backlog
owner: unknown
created: 2026-06-15
source: docs/discoveries/2026-06-15-harness-selection-state-move.md
---

# Codex / Pi version-check hook equivalents

> **Discovered during:** harness-selection work (PR #52, v0.6.15).
> **Why deferred:** Update-notification is a modest convenience; Claude users
> already have it. Codex/Pi support has a research dependency (their startup-hook
> surfaces are unverified) so it's its own feature, not a bolt-on.

## Background

`init` installs a Claude Code **SessionStart** hook
(`.claude/hooks/joycraft-version-check.mjs`, registered in `.claude/settings.json`)
that pings the npm registry and prints "Joycraft X available" when the installed
version is stale. See `src/init.ts` step 7 + the settings merge block.

Codex and Pi installs today get **only skill files** — no hooks, no settings/config
write. So there is no equivalent update notification for codex-only or pi-only users.

## Items

### 1. Research spike — verify the hook surfaces (DO THIS FIRST)

Confirm whether each platform even supports a **project-scoped startup hook**:

- **Codex:** Does `~/.codex/config.toml` (user-level) or any project-level file
  support a session-start command hook? May turn out there is no project-scoped
  equivalent → scope shrinks or drops. Use `/joycraft-research`.
- **Pi:** Most plausible via the extension system (we already ship
  `.pi/extensions/joycraft-pipeline.ts`). Verify the real extension startup API
  before writing logic — see [[project_pi_extension_fake_sdk]] (a Pi extension was
  once built against a non-existent SDK). Confirm against actual Pi docs/types.

**Output:** a short research doc stating, per platform, whether a hook surface
exists and how to register it. This gates the estimate for items 2–3.

### 2. Codex version-check (only if item 1 confirms a surface)

Mirror the Claude hook for Codex: generate a check script, register it in
whatever Codex's startup mechanism is, gate on `wants('codex')`, idempotent merge
that never clobbers user config.

### 3. Pi version-check (only if item 1 confirms a surface)

Same for Pi, likely via an extension's startup path. Gate on `wants('pi')`.

## Notes

- The check itself is trivial and shared: read the version from
  `docs/.joycraft/state.json` (`STATE_PATH`), fetch
  `https://registry.npmjs.org/joycraft/latest`, compare, print. The CLI `check`
  command (`src/cli.ts`) already does exactly this and is harness-agnostic.
- If a platform has **no** project-level startup hook, the honest outcome is
  "not supported by design" — document it and close, don't fabricate a mechanism.

**Scope:** item 1 is a half-day research spike; items 2–3 are ~half a day *each*
**if** a clean surface exists, else N/A.
