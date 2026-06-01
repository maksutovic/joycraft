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

- [x] Context isolation experiment yields a clear yes/no answer — **CONTEXT LEAKS** (see 2026-05-28 run below)
- [x] Queue status updates are reliable and observable — **FIXED** (see 2026-05-28 run below)
- [ ] End-of-queue produces a clean, actionable report
- [ ] Pipeline can run 10+ specs without manual intervention

---

## 2026-05-28 — Context-Isolation Retest & Root-Cause Analysis

### What We Ran
Re-ran the `2026-05-27-context-isolation-test` feature with the full pipeline:
- `secret-embed.md` → agent implemented, called `joycraft_next_spec`
- `secret-recall.md` → agent received it in the **same conversation**, remembered `KIWI`

### Results
| Test | Result |
|------|--------|
| Context isolation | **FAILED** — same session, memory persisted |
| Queue status update | **FAILED initially, then FIXED** — see root cause |
| Spec markdown status | **FIXED** — manually updated to "Complete" |
| Tests & build | **PASSING** — 681/681 tests green |

### Root Causes Found

#### Bug 1: `findManifest` picked the wrong manifest
`findManifest` used `ls ... | head -1`, which alphabetically returned `2026-05-26-pi-support` instead of `2026-05-27-context-isolation-test`. The spec file (`secret-embed.md`) wasn't in that manifest, so the lookup returned `undefined`.

**Fix:** `findManifest` now:
1. Accepts an optional `specPath` parameter
2. Searches all manifests for the one containing the target spec
3. Falls back to most-recently-modified manifest

#### Bug 2: Silent skip on missing entry
```typescript
// BEFORE — silently did nothing
if (entry?.id) { execSync(`mark-done ${entry.id}`); }
```
When `entry` was `undefined`, the `if` block was skipped. The tool returned "Validation passed. Advancing..." with zero file changes.

**Fix:** Now returns hard errors:
- `Spec "X" not found in manifest Y` — when entry is missing
- `Spec "X" has no id in manifest` — when id is missing

#### Bug 3: No new session created
`pi.sendUserMessage("/joycraft-next-spec", { deliverAs: "followUp" })` at the end of the tool didn't trigger `ctx.newSession()`. In this harness, the extension command handlers don't run from tool follow-ups the way they would in a real Pi TUI session.

**Fix applied to code:** The extension now passes the correct specs-dir to `joycraft-mark-done` so it updates the right manifest. The session-start behavior still depends on Pi's extension runtime being active.

### Files Changed
| File | Action |
|------|--------|
| `.pi/extensions/joycraft-pipeline.ts` | Fixed `findManifest`, added error handling, pass specs-dir to mark-done |
| `docs/templates/pi-extensions/joycraft-pipeline.ts` | Synced template to fixed version |
| `docs/features/2026-05-27-context-isolation-test/specs/.joycraft-spec-queue.json` | Both specs marked `complete` |
| `docs/features/2026-05-27-context-isolation-test/specs/secret-embed.md` | Status → Complete |
| `docs/features/2026-05-27-context-isolation-test/specs/secret-recall.md` | Status → Complete |

### Remaining Open Questions
1. **Session switching in Pi harness:** Does `pi.sendUserMessage("/joycraft-next-spec", { deliverAs: "followUp" })` actually trigger the command handler? It works in the Pi TUI but may not in the coding-agent harness.
2. **Context clearing:** We need to verify `ctx.newSession()` is called. The command handler already has it; the question is whether the tool's follow-up message reaches it.
3. **Status vocabulary:** Still undecided between `active` → `implemented` → `verified` → `complete` or simpler variants.
4. **Auto-commit per spec:** Still not implemented. Should `joycraft_next_spec` also commit?
