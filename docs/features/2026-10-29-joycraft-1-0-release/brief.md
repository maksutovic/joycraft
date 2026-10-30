---
status: todo
owner: Maximilian Maksutovic
created: '2026-10-29'
feature: 2026-10-29-joycraft-1-0-release
artifact_role: implementation-brief
design_status: not-required
decomposition_status: proposed
decisions:
- id: D1
  status: clarified
  choice: Publish the field build as joycraft@1.0.0 on the npm latest dist-tag, not a beta tag.
  rationale: Max, 2026-10-29. Condition attached by Max — the upgrade from 0.7 is built, tested and documented first.
- id: D2
  status: clarified
  choice: Support all six hosts (Codex, Claude Code, Pi, OMP, GitHub Copilot CLI, OpenCode), each backed by a live run.
  rationale: Max, 2026-10-29 — "all six, but we'll need to implement the work for them".
- id: D3
  status: clarified
  choice: Rename the installed bundle directory from .joycraft-prototype/ to .joycraft/.
  rationale: Max, 2026-10-29. The two field projects migrate once.
- id: D4
  status: clarified
  choice: Fix the failing field gates before release.
  rationale: Max, 2026-10-29 — "Fix first". G4 harness failures, G5 any-long-wait, G2/G8 missing labels and escapes.
- id: D5
  status: clarified
  choice: Jev is not shipped.
  rationale: Max, 2026-10-16 ("omit"). G11 checks the payload.
- id: D6
  status: clarified
  choice: By-design runtime refusals ("Dispatch stopped: Evidence rejected", "Changed path is outside verification inputs") are not G4 harness failures. They are reported on their own line.
  rationale: Max, 2026-10-29 — "they were doing their job". GATES.md amendment fd12948 in joycraft-field.
- id: D7
  status: clarified
  choice: Setting up the review loop's verification tools (Playwright, simulators, emulators, depending on the project) is Joycraft's job. Install and upgrade tell the user what the review loop needs and ask before installing anything.
  rationale: Max, 2026-10-29. Spec 21.
- id: D8
  status: clarified
  choice: A bare project gets an offered kickoff on first entry that captures the user's context (verbatim notes, follow-up rounds) into AGENTS.md, CLAUDE.md, docs/context/ and a first brief. No scaffold and no stack choice during the kickoff.
  rationale: Max, 2026-10-29 — he will trial 1.0 on a new project whose context is in his head. Spec 22.
- id: D9
  status: clarified
  choice: Installation is prompt-first. The README leads with a paste-into-your-agent prompt, and the agent runs npx itself; the CLI must be drivable with no TTY.
  rationale: Max, 2026-10-29 — "the user shouldn't need to be running npm commands themselves". Specs 12 and 18.
---

# Joycraft 1.0 release — Brief

## Goal

Ship the Joycraft build that is in field use (`joycraft-prototype` `field/1.0`) as `joycraft@1.0.0` on npm `latest`. A 0.7 user upgrades with one documented command, can see the plan before anything changes, keeps their own edits and project knowledge, and can roll back. Colleagues install it from the README in minutes on any of the six hosts.

## Current state (2026-10-29)

- Field build: `field/1.0` tip `c50f35c`, last tag `field-3` (`330e0ce`). Installed in agent-markets and private-schools with harness `claude`. The repo `maksutovic/joycraft-prototype` is private.
- Stable: `maksutovic/joycraft`, npm `latest` = `0.7.17`. A merge to `main` publishes automatically (`docs/guides/releasing.md`).
- The vehicle from the field plan (`release/1.0`, `vendor-payload.mjs`, 0.7 guard, `--migrate`, tarball hashes) was never built.
- Upgrade machinery that exists in the prototype: `scripts/stable-inventory.json` (SHA-256 of every stable file v0.7.0 → `b74fc60`, from git history) and `scripts/retire-stable.mjs` (archive-only retire into `.joycraft-backups/`).
- `.joycraft/` already exists in field projects for runtime state (`.joycraft/local/`, `state.json`, `preferences.json`). 0.7 keeps its manifest in `docs/.joycraft/`.

## Field evidence behind the gate-fix specs (since `field-1`, from `~/.joycraft-field/ledger.sqlite`)

- 140 specs done; first-pass review 87%; runner hangs 3/151 implementer runs.
- G4: 25 hook errors, all `.claude/hooks/joycraft/block-dangerous.sh` with exit code 127 (command not found — the hook path does not resolve). 45 runtime-command failures: `joycraft:scope-bound` 17, `dispatch-start` 7, `dispatch-preflight check-report` 11 (6 are by-design "Dispatch stopped" refusals), `accept` 1, `snapshot` 1. 12 reviewer-start failures, most from `dispatch-start`. Most records hold only "error" or "exit N", with no command output.
- G5: 27/151 implementer runs (18%) have a long wait; the limit is 15%. Of 130 long waits, 98 are cause "other" and 22 "poll". Most are foreground `timeout N bash -c "until grep …"` loops on project batch logs, which the field-1 rule "never wait in a foreground loop" was meant to stop.

## Phases and specs

See [specs/README.md](specs/README.md). Five phases:

1. **Gate fixes** in `joycraft-prototype` `field/1.0` and `joycraft-field`, then a field re-run.
2. **Host support**: a live smoke harness, one spec per host family, review-loop tool setup (spec 21), and the new-project kickoff (spec 22).
3. **Rename** `.joycraft-prototype/` → `.joycraft/`.
4. **Release vehicle** in this repo on `release/1.0`: vendored payload, CLI wiring, 0.7 detection, `--migrate`, rollback, G10 tests, final 0.7 nudge.
5. **Docs**: README, install and migration guides, paste prompts, CHANGELOG, feedback channel.

## Out of scope

- Jev, judge and evals in the payload.
- A full TypeScript port of the prototype runtime. The payload is vendored as-is.
- Changing GATES.md thresholds. The D6 definition amendment is the only change.
- Org transfer (Ginga Labs) and Blacksmith, parked by Max until after launch.

## Boundaries

- Merging `release/1.0` to `main` publishes to npm. Only Max merges it.
- Publishing 0.7.18 is also a merge to `main`. It needs Max's approval.
- Never read or reference `joycraft-scenarios`.
