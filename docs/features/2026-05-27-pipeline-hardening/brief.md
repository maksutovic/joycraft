# Pipeline Hardening — Draft Brief

> **Date:** 2026-05-27
> **Project:** joycraft
> **Status:** Draft — awaiting experimental results
> **Purpose:** Fix gaps discovered during the pi-automation-stress-test run

---

## Background

The `2026-05-27-pi-automation-stress-test` feature completed all 10 specs successfully (667 tests passing). However, the run surfaced several pipeline mechanics that need attention before the automation loop can be trusted for real features.

## Discovered Gaps

### 1. Spec Status Tracking Is Broken

**What happened:** `joycraft_next_spec` reported "Validation passed. Advancing to next spec..." but the `.joycraft-spec-queue.json` still showed all specs as `"status": "active"`. The `joycraft-mark-done` script exists but may not be invoked correctly, or the extension's `findManifest` logic may pick the wrong manifest.

**Open question:** What status words should we use?

| Candidate | Meaning |
|-----------|---------|
| `active` | Not yet started — next up for an agent |
| `implemented` | Agent wrote code + tests, all green, awaiting human review |
| `verified` | Human (or verifier subagent) signed off |
| `complete` / `shipped` | Merged / done |

The current scripts use `"complete"` but that may be too final. We need a state for "agent done, human not yet checked."

### 2. End-of-Queue Handling Is Unclean

**What happened:** After spec 10, `/joycraft-next-spec` kept hunting. The agent checked file lists, read the queue JSON, and grepped other feature directories before concluding "no more specs." A clean pipeline should detect the empty queue immediately and present a definitive summary.

### 3. Context Clearing Is Unverified

**What happened:** The agent's context grew to ~26% over the 10-spec run. We don't know if that was cumulative (bad — context leaked) or just the last spec's bloat (fine). 

**Experiment created:** `2026-05-27-context-isolation-test` — two specs (secret-embed → secret-recall) designed to prove whether `/joycraft-next-spec` starts a fresh session. Run this to get the answer.

### 4. Session-End Overhead vs. Commit Hygiene

**What happened:** We never invoked `/skill:joycraft-session-end` between specs. The skill is powerful (captures discoveries, validates, stages, commits, pushes) but adds significant execution time. 

**Trade-off matrix:**

| Approach | Pros | Cons |
|----------|------|------|
| Run session-end every spec | Clean commits per spec, discoveries captured, context naturally cleared | Slows the loop significantly |
| Skip session-end, batch at end | Fast loop, minimal overhead | No per-spec commits, discoveries may be lost, context may not clear |
| Lightweight "spec-done" marker | Fast, marks status, optionally commits | Still need session-end eventually |

**Open question:** Should there be a `/joycraft-spec-done` command — lighter than full session-end, just commits the spec and updates status? Or should session-end be redesigned to have a `--fast` mode?

### 5. No Per-Spec Commit Opportunity

**What happened:** All 10 specs were implemented in one long conversation with no commits. For a real feature, we'd want each spec committed so the PR has atomic, reviewable changes. The current pipeline doesn't enforce or even encourage this.

## Proposed Work

| # | Spec | Description | Priority |
|---|------|-------------|----------|
| 1 | fix-status-tracking | Make `joycraft_next_spec` reliably update queue JSON status; define status vocabulary | High |
| 2 | clean-end-of-queue | Detect exhausted queue, report cleanly, suggest next actions | High |
| 3 | verify-context-isolation | Run the context-isolation-test experiment; fix pipeline if context leaks | High |
| 4 | lightweight-spec-done | Design a fast spec-completion handshake (commit + status update without full session-end) | Medium |
| 5 | pipeline-workbench | Create a test harness that runs specs in isolated subprocesses and measures context/token usage | Medium |

## Open Decisions

1. **Status vocabulary:** `implemented` vs `pending-review` vs `done` — need to document in skill files
2. **Session-end frequency:** Every spec? Every N specs? Only at feature end?
3. **Commit autonomy:** Should the agent auto-commit per spec, or batch?
4. **Context clearing mechanism:** Is `/new` equivalent to `ctx.newSession()` in the extension? Are they actually clearing?

## Success Criteria

- [ ] Context isolation experiment yields a clear yes/no answer
- [ ] Queue status updates are reliable and observable
- [ ] End-of-queue produces a clean, actionable report
- [ ] Pipeline can run 10+ specs without manual intervention
