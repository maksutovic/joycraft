# Review follow-ups to settle before the 1.9.0 PR

Collected from independent reviews; none blocked its spec. A final polish spec takes the ones marked **fix**.

## Gate matching (specs 4, 6, 8) — fix
- Prose with more words is missed: "run pnpm verify before merging", "pnpm verify — then" (queue-check.mjs namesCommand). This is Max's core case.
- Fenced code inside a bullet is missed (queue-check.mjs:215).
- Wrapper forms pass check-report: `bash -lc`, `sh -c ... sh`, `zsh -c`, `/usr/bin/env bash -c`, `env CI=1 <gate>` (completion.mjs:122).
- A broken joycraft.yaml makes the report-gate check pass silently; fail closed (completion.mjs:129).
- gate-in-spec's next-step text says "ask the user"; it should say "use the spec's own test command" (queue-check.mjs:14).

## Evidence (spec 3, 7)
- delivery.mjs keeps its own footer parser; import evidence.mjs readFooter (delivery.mjs:110). **fix**
- Tail read is capped at 256 KiB and can start mid-line (evidence.mjs:222). **fix**

## Load line (spec 10)
- "(0 cores)" for a footer without cores; mixed core counts name the largest.

## Drift-tidy carry-overs
- `GIT_DIFF_OPTS` in the environment makes tidy --verify refuse a valid fix; unset it for rawDiff. **fix**
- checks seam: accept `file:line rule` (markdownlint-cli2), make absolute paths relative, docs tell users to pick a line output format. **fix**
- start advice: wrap the entry-check import in try; fix "this branch removed" wording on main. **fix**
- age-out: names with tab/quote get the wrong skip reason; Docs/docs case mismatch message.
- Config should refuse a hidden or root-level docs root (Max, 2026-11-21). **fix**
- archive ignore: symlinked .ignore, `docs/archive/*` equivalence, run from a subfolder. **fix**
