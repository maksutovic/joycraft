# Cleanup does not see AGENTS.md drift

**Date:** 2026-11-02
**Found while:** trimming this repo's AGENTS.md after 1.1.1

`cleanup.mjs` reported no doc findings on an AGENTS.md that had grown to 1,600
words with stale content:

- The context map pointed at `docs/context/reference/`, which does not exist. Cleanup
  checks only real Markdown links for existence. A backticked path counts toward
  `orphan` and `working-link` but is never checked for existence.
- The header still said "Claude Code plugin" and was dated 2026-09-06.
- "Key Files" listed the 0.7 updater (`init.ts`, `update*.ts`) as the main path,
  but `src/cli.ts` no longer imports any of it.
- Two context pages (`shipped.md`, `anchors.md`) had no map row. Cleanup did not
  flag them as `orphan` because `decision-log.md` mentions them, and a mention from
  any context page counts. An agent starting from AGENTS.md would not find them.

**What we did:** moved Key Files, the data flow, the folder map and the gotchas to
`docs/context/architecture.md`, checked against `src/cli.ts`, and linked it from the
map. AGENTS.md is now boundaries, release rules, commands and the map.

**Possible cleanup checks for later:** a backticked path in AGENTS.md that does not
exist; an AGENTS.md word budget; a context page with no map row, even when another
page mentions it.
