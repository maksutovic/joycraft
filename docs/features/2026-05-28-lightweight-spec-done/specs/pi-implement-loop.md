---
status: in-review
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-28-lightweight-spec-done
mode: isolated
---

# Pi Implement Loop — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-lightweight-spec-done/brief.md`
> **Absorbs:** `docs/features/2026-05-28-pi-process-loop/` (tombstoned) — this IS isolated mode on Pi
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / 1 new loop script + 1 test (+ retire vestigial extension tool)

---

## What
Build the `pi -p` **isolated-mode driver** — a bash script that runs a whole feature's spec queue headlessly, one fresh OS process per spec. Loop body per iteration:
1. `joycraft-next-spec <specs-dir>` → next `todo` spec path (or `Pipeline complete` → exit 0).
2. `pi -p "/skill:joycraft-implement <spec>"` → fresh process implements that one spec.
3. `pi -p "/skill:joycraft-spec-done <spec>"` (or run the spec-done logic) → bump `todo→in-review` + commit, in a fresh process.
4. Loop. When `next-spec` reports complete, run `joycraft-session-end` once (validation + graduate `in-review→done` + push + PR), then exit.

The process boundary gives free context isolation (verified — the 2-process secret test and the context-isolation-test feature). Also fix the `next-spec` invocation bug surfaced in pipeline-hardening (explicit `SPECS_DIR`, no reliance on alphabetical manifest pick) and **retire the now-vestigial `joycraft_next_spec` TOOL** from `.pi/extensions/joycraft-pipeline.ts` (the loop supersedes the interactive-only tool path).

## Why
This is the headless autonomous loop — Phase 1's payoff. The in-process Pi extension can't isolate context (proven failure); the single-shot process loop can (proven). Without this script, "isolated mode" has no automated driver on Pi and the whole headless thesis stays manual.

## External API Contract

**Tool:** `pi` CLI (`@earendil-works/pi-coding-agent`)

**Canonical sources:**
- `docs/features/2026-05-26-pi-support/research.md` (the grounding research — verified live against the installed `pi`)
- `pi --help` (installed binary)

**Key API facts (validated live, 2026-05-26):**
- `pi -p "<prompt>"` (`--print`) runs non-interactive and exits. Verified: `pi -p "say hi in one word"` → `Hi.`
- Each `pi -p` invocation is a NEW OS process with its own context. Two sequential `pi -p` calls cannot share memory unless you pass `--continue`/`--resume`/`--session`. This is the isolation guarantee.
- `--no-session` skips session persistence; `--no-context-files` skips AGENTS.md/CLAUDE.md loading; `--mode json` emits a parseable event stream (useful for capturing per-spec transcripts).
- **RESOLVED (verified live 2026-05-30):** `pi -p "/skill:<name> ..."` DOES trigger the slash-skill from the prompt string. Confirmed with `pi -p '/skill:joycraft-spec-done — do NOT take action; describe this skill'` → the reply accurately summarized all four steps of the skill body, proving the skill was resolved and loaded into context. The loop's prompt form (`/skill:joycraft-implement <spec>` / `/skill:joycraft-spec-done <spec>`) is therefore correct; no description-match fallback needed. (Was research.md "Open items" #2.)

## Acceptance Criteria
- [ ] A loop script exists at `src/templates/pi-scripts/joycraft-implement-loop` (source-of-truth) and `.pi/scripts/joycraft/joycraft-implement-loop` (installed copy), executable, identical
- [ ] It accepts an explicit specs-dir argument and passes it through to `joycraft-next-spec` (no reliance on glob/alphabetical manifest selection)
- [ ] It loops: next-spec → implement (fresh `pi -p`) → spec-done (fresh process) → repeat
- [ ] On `Pipeline complete` it runs `joycraft-session-end` once, then exits 0
- [ ] It exits non-zero and stops the loop if any spec's implement or spec-done step fails (fail-fast — brief: "verify-fail = stop-and-flag"; dependency-aware-continue is out of scope)
- [ ] The vestigial `joycraft_next_spec` TOOL registration is removed from `.pi/extensions/joycraft-pipeline.ts` and its template `src/templates/pi-extensions/joycraft-pipeline.ts` (the human-typable `/joycraft-next-spec` COMMAND may remain for interactive use, updated to new vocab)
- [ ] Tests pass
- [ ] Build passes (`pnpm build`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Script exists + executable + parity | `tests/pi-implement-loop.test.ts`: assert both copies exist, are executable, byte-identical | unit |
| Passes specs-dir through | Run the loop with `PI_BIN` overridden to a fake `pi` stub (a shell script on PATH that logs its args) against a temp queue with 2 fake specs; assert the stub was called with the spec paths and the specs-dir reached next-spec | integration |
| Loop advances + terminates | With the fake `pi` stub and a temp queue, assert the loop runs once per spec then stops at `Pipeline complete` (assert exit 0, assert N implement calls) | integration |
| Fail-fast | Make the fake `pi` stub exit non-zero on spec 2; assert the loop stops and exits non-zero, and spec 2's spec-done was NOT run | integration |
| Tool removed from extension | Read both extension files; assert they no longer call `pi.registerTool({ name: "joycraft_next_spec" ...})` | unit |

**Execution order:**
1. Write tests (with a fake `pi` stub injected via an env var like `PI_BIN`) — MUST fail (no loop script)
2. Confirm red
3. Implement the loop script (honoring `PI_BIN` override for testability) + remove the extension tool, until green

**Smoke test:** the "loop advances + terminates" test with the fake stub — runs in seconds, no real `pi` needed.

**Before implementing, verify your test harness:**
1. Tests MUST NOT invoke the real `pi` binary (slow, non-deterministic, costs tokens). The loop script MUST read the pi binary from an overridable variable (e.g. `PI_BIN="${PI_BIN:-pi}"`) so tests inject a deterministic stub.
2. The stub is a tiny bash script that records its arguments and exits 0 (or non-zero for the fail-fast test) — it stands in for `pi -p`.
3. Each test uses its own temp specs-dir + queue JSON fixture.
4. The fast "advances + terminates" test is the smoke test.

## Constraints
- MUST: make the pi binary overridable (`PI_BIN`) — otherwise the script is untestable and tests would burn real API tokens (violates the cost discipline in the north star)
- MUST: pass an explicit specs-dir to `joycraft-next-spec` (fixes pipeline-hardening Bug 1: alphabetical manifest mis-pick)
- MUST: fail-fast on any per-spec failure (out of scope: dependency-aware-continue)
- MUST: fresh process per spec for implement AND spec-done (the isolation guarantee lives at the process boundary, not in-conversation)
- MUST: run `joycraft-session-end` exactly once, after the queue is exhausted
- MUST: stay in bash, no jq, consistent with the other pi-scripts
- MUST NOT: route a Claude/ChatGPT *subscription* OAuth through this loop (north star ToS reality) — the script is for Pi with BYO-API-key/open-weights; if documenting usage, surface that this is the Pi-first path
- MUST NOT: remove the interactive `/joycraft-next-spec` COMMAND from the extension (only the LLM-callable TOOL) — keep interactive Pi working
- MUST NOT: regenerate bundled-files here — spec 9 (but DO place the script in `src/templates/pi-scripts/` so spec 9's generator picks it up)

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/pi-scripts/joycraft-implement-loop` | The `pi -p` isolated-mode driver (source-of-truth) |
| Create | `.pi/scripts/joycraft/joycraft-implement-loop` | Installed copy (dogfood), identical |
| Modify | `src/templates/pi-extensions/joycraft-pipeline.ts` | Remove the `joycraft_next_spec` TOOL registration; keep+update the COMMAND |
| Modify | `.pi/extensions/joycraft-pipeline.ts` | Same (installed copy) |
| Create | `tests/pi-implement-loop.test.ts` | Loop tests with a fake `pi` stub |

## Approach
Write the loop as a `while` that calls `joycraft-next-spec "$SPECS_DIR"`, captures stdout; if it equals `Pipeline complete` (or is empty), break to the session-end step; else treat it as a spec path and run two `"$PI_BIN" -p` invocations (implement, then spec-done). Guard each with `||` to fail-fast (exit non-zero, echo which spec failed). After the loop, one `joycraft-session-end` call, then `exit 0`.

For the extension: delete the `pi.registerTool({ name: "joycraft_next_spec", ... })` block (lines ~109–199 in the current file). Keep `pi.registerCommand("joycraft-next-spec", ...)` but update any `complete`/`active` assumptions to the new vocabulary (it shells out to the now-updated scripts, so mostly it just works; verify the `mark-done` call site — note the old TOOL passed a derived manifest dir, the COMMAND doesn't mark-done at all, so removal is clean).

Resolve the research's open question first: a 30-second manual `pi -p "/skill:joycraft-implement <some-trivial-spec>"` to confirm slash-skill triggering; pick the prompt form that works and lock the test to it.

**Rejected alternative:** Keep driving the loop from the in-process extension tool (`newSession`/`sendUserMessage`). Rejected and tombstoned — the context-isolation experiment proved the in-process path leaks context; the research concluded "the autonomous pipeline does not need the in-process TypeScript extension at all." The process boundary is the mechanism.

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Empty queue at start | `next-spec` prints `Pipeline complete` immediately → run session-end (no-op-ish) → exit 0 |
| A spec's implement step fails | Loop stops, non-zero exit, names the failing spec; spec-done for it is NOT run |
| `pi` binary not found | Clear error (the `PI_BIN` resolution fails) — don't silently treat as complete |
| `/skill:` not honored by `pi -p` | Fall back to description-triggering prompt; the test reflects whichever path works |
| Specs-dir omitted | Error out asking for an explicit specs-dir (don't glob-guess — that's the bug we're fixing) |
| Subscription OAuth configured in Pi | Out of the script's control, but usage docs (spec 9) surface the ToS/cost caveat |
