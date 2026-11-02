---
status: todo
owner: Maximilian Maksutovic
created: 2026-10-29
feature: 2026-10-29-joycraft-1-0-release
mode: checkpoint
local_id: 23
phase: 4
execution_model: claude-opus-5-5
reasoning_effort: high
---

# Check for Updates at Session Start — Atomic Spec

> **Parent Brief:** `docs/features/2026-10-29-joycraft-1-0-release/brief.md`
> **Status:** Ready after spec 12, spec 17
> **Date:** 2026-10-29
> **Estimated scope:** Medium; checker, hooks per host, AGENTS.md block, tests
> **Phase:** 4 — Release vehicle
> **Where:** this repo, branch `release/1.0` (payload runtime + CLI)

## What

At the start of every session, on every host, Joycraft checks whether a newer release exists, tells the user in one line, and on a yes performs the update for them, start to finish. The 0.7 SessionStart version-check hook is retired by the field build, and nothing replaced it.

The flow:
1. **Check.** A SessionStart hook (Claude, Codex, Copilot `sessionStart`, the Pi/OMP extensions, and the OpenCode plugin from spec 9) runs `.joycraft/runtime/update-check.mjs`. It reads npm's `latest` dist-tag, at most once per 24 hours (cached in `.joycraft/local/`), with a 2-second timeout, and stays silent when offline. Hosts without a session hook follow a managed instruction block in `AGENTS.md` that tells the agent to run the same check as its first action.
2. **Tell.** If a newer version exists, the agent says one line: the current and new versions, a 1–2 sentence plain-language summary of what changed (from the release descriptor shipped with each release), and whether it is a safe patch update or a migration. It asks once per session: update now, not now (snooze 7 days), or turn off.
3. **Do it.** On a yes, the agent runs `npx joycraft@<version> update --plan --json`, shows the plan (files changed, files backed up), applies it with `--yes`, runs `doctor`, and reports in plain words what is different now. The user never types a command.

The policies are kept from 0.7: `notify` (default), `auto-safe` (patch and minor releases marked eligible apply on their own and are reported afterwards, unless a customized file would be replaced), and `off`. A major version is never applied automatically; it always goes through the migration flow (specs 13–14).

## Why

Max, 2026-10-29: as automated and easy as possible, which is the mission of 1.0. Colleagues on 1.0 need fixes from the feedback period to reach them without anyone remembering to update.

## Acceptance Criteria

- [ ] **AC1:** With a newer `latest` on the registry, a new session on each of the six hosts shows the update line once, and a second session within 24 hours makes no network call (it uses the cache).
- [ ] **AC2:** Offline, a registry error, or a slow registry (over 2 s): the session starts normally with no message and no error.
- [ ] **AC3:** Prereleases and other dist-tags are ignored (the 0.7 rule in `src/update-check.ts`).
- [ ] **AC4:** The line names both versions, the plain summary from the release descriptor, and "patch" or "migration". "Not now" suppresses that version for 7 days; "turn off" sets the policy to `off` in `.joycraft/local/preferences.json`.
- [ ] **AC5:** On a yes, the agent runs the plan, shows it, applies it, runs `doctor` and reports, with no command typed by the user. A failed apply recovers through the existing transaction and says so.
- [ ] **AC6:** `auto-safe` applies an eligible non-major release without asking, then reports what changed in the same session. It falls back to asking when a customized file is involved or the release is not marked eligible.
- [ ] **AC7:** Hosts with no session hook get the managed `AGENTS.md` block (inside Joycraft's managed markers, so user text is untouched), and the live smoke harness (spec 6) shows the agent running the check first.
- [ ] **AC8:** The check adds under 50 ms to session start when cached, and never blocks the session for more than 2 s.

## Test Plan

| Acceptance Criterion | Test | Type |
|---|---|---|
| AC1 | Stub the registry; two sessions; assert one fetch. | Integration |
| AC2 | Offline, a 500 and a 3-second delay → silent, start time under 2.1 s. | Integration |
| AC3 | Registry with a newer `beta` tag only → no message. | Unit |
| AC4 | Snapshot of the line; snooze and off paths. | Unit |
| AC5 | End-to-end in a fixture: yes → plan → apply → doctor → report. | Integration |
| AC6 | Eligible patch with auto-safe; then the same with a customized file → asks. | Integration |
| AC7 | Live smoke on each host with an older installed version. | Live |
| AC8 | Timing test, cached and cold. | Unit |

**Execution order:** Write the tests first, confirm that they fail for the missing behavior, then implement until green. Live tests run last and record their evidence.

## Constraints

- MUST stub `fetch` in every test (the live-registry lesson from 2026-06-11).
- MUST NOT send any project data to the registry; the request is the package metadata only.
- MUST NOT apply a major version automatically under any policy.
- MUST NOT update while another Joycraft skill is in the middle of work; it finishes or parks that work first (the 0.7 rule).

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Add | `payload runtime: update-check.mjs` | Checker (port of `src/update-check.ts` policy, cache, snooze) |
| Modify | `payload hooks (all hosts)` | SessionStart registration |
| Modify | `src/agents-md.ts` | Managed update-check block for hosts without a session hook |
| Add | `release descriptor: summary field` | Plain summary of each release, written at release time |
| Add | `tests/session-update-check.test.ts` | AC1–AC8 |

## Approach

Port the tested 0.7 logic (policy, cache, acknowledge, postpone, auto-safe eligibility) into the payload runtime instead of writing it again. The release process writes the plain summary into the descriptor from the CHANGELOG entry.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Several sessions start at once | One fetch; the others read the cache (use a lock file and do not wait on it). |
| Project pinned to a version on purpose | A `pin` field in the preferences turns the message into a one-line note with no question. |
| Update available while offline later | The next online session shows it. |
