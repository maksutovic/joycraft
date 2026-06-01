---
status: active
owner: Maximilian Maksutovic
created: 2026-05-28
feature: 2026-05-26-pi-support
---

# Codebase Research — Pi Support (Programmatic Context Control & Custom Tools)

**Date:** 2026-05-28
**Questions answered:** 4/4 (verified against the installed package `@earendil-works/pi-coding-agent@0.75.5` and official docs on `github.com/earendil-works/pi`)

> **Supersedes the 2026-05-26 version of this file.** The earlier research answered a different set of integration questions and never established the run modes. This rewrite was prompted by a wrong premise in a prior pass (that the package "404s on npm"). It does not — see Q1. The CLI is installed locally at `~/.nvm/.../bin/pi` (v0.76.0 on PATH; v0.75.5 pinned as a devDependency in this repo). The original 10-question research is preserved in git history (commit before this change).

---

## TL;DR (the four facts that change the architecture)

1. **Pi is real and installed.** `@earendil-works/pi-coding-agent`, `bin: pi`. The repo pins `0.75.5`; `pi` on PATH is `0.76.0`.
2. **Pi has a first-class non-interactive mode: `pi -p "<prompt>"` (`--print`).** Verified live: `pi -p "say hi in one word"` → `Hi.` then exits. There is also `--mode json` (structured event stream) and `--mode rpc` (JSONL over stdin/stdout). **This is the lever the whole Joycraft pipeline has been missing.**
3. **`newSession` / `fork` / `switchSession` exist but are command-context-only** and "can deadlock if called from event handlers." Inside a single `pi` process, true fresh-context-per-spec requires the two-hop pattern the bug brief already identified. But across processes, `-p` gives isolation for free.
4. **`ctx.compact()` exists in all contexts** (shrinks context in place, ≠ clears it). It is not the same as a fresh session.

The strategic consequence: **the autonomous pipeline does not need the in-process TypeScript extension at all.** A shell `for` loop calling `pi -p "/skill:joycraft-implement <spec>"` once per spec gives perfect per-spec context isolation via the OS process boundary — exactly the property the context-isolation experiment proved the extension does *not* currently deliver. See Q2/Q4.

---

## Q1: Is there a real, installable npm package/CLI for Pi, and what is its exact name and entry point?

**VERIFIED TRUE.** The prior "404" was a false alarm (likely a transient/dist-tag fluke).

- Package: **`@earendil-works/pi-coding-agent`**. `npm view` → `@earendil-works/pi-coding-agent@0.76.0 | MIT | deps: 17 | versions: 10`, `bin: pi`, published by `mitsuhiko` (Armin Ronacher); maintainers include `badlogic` (Mario Zechner, the original author). Repo `github.com/earendil-works/pi-mono`, website `pi.dev`.
- **Entry point:** `package.json` `bin` = `{ "pi": "dist/cli.js" }` (read from the installed package). The SDK entry is `@earendil-works/pi-coding-agent` → `dist/index.js`.
- **Installed here:** `node_modules/@earendil-works/pi-coding-agent` → pnpm symlink to `@earendil-works+pi-coding-agent@0.75.5`. `package.json:42` lists it as a **devDependency** at `0.75.5`. The global `pi` on PATH is `0.76.0`.
- The `@earendil-works` scope is registered and publishes a family: `pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui`, `pi-web-ui`, plus `gondolin` (sandbox) and others.

**Install (from official docs):** `npm i -g --ignore-scripts @earendil-works/pi-coding-agent` (or `pnpm`/`bun`), or `curl -fsSL https://pi.dev/install.sh | sh`.

**Note (version drift):** repo pins `0.75.5`, latest is `0.76.0`+. Minor, but worth aligning so typecheck runs against the version users actually run.

---

## Q2: Can Pi clear/reset conversation context programmatically from inside an extension/tool, or does it require a new session/process?

Three distinct mechanisms, verified from the installed `dist/core/extensions/types.d.ts`:

### (a) `ctx.compact(options?)` — shrink, don't clear. **All contexts.**
`types.d.ts:232-233`: `/** Trigger compaction without awaiting completion. */ compact(options?: CompactOptions): void;`
Summarizes the conversation in place. This is *reduction*, not *isolation* — prior content survives as a summary. Not sufficient for the secret-recall isolation test.

### (b) `ctx.newSession(...)` / `fork(...)` / `switchSession(...)` — true fresh context. **Command context ONLY.**
`types.d.ts:241-276`, on `ExtensionCommandContext` (which `extends ExtensionContext`):
```ts
/** Includes session control methods only safe in user-initiated commands. */
export interface ExtensionCommandContext extends ExtensionContext {
  newSession(options?: {
    parentSession?: string;
    setup?: (sessionManager: SessionManager) => Promise<void>;
    withSession?: (ctx: ReplacedSessionContext) => Promise<void>;
  }): Promise<{ cancelled: boolean }>;
  fork(entryId, options?): Promise<{ cancelled: boolean }>;
  switchSession(sessionPath, options?): Promise<{ cancelled: boolean }>;
  ...
}
```
The docs state plainly: these "are only available in commands because they can deadlock if called from event handlers." A **tool's `execute()`** receives the narrower `ExtensionContext` — **no `newSession`**. This is exactly the API mismatch the v0.6.3 extension tripped on.

A new session starts **empty** unless you populate it: the `setup` callback "mutate[s] the new session's `SessionManager` before `withSession` runs." `withSession` receives a `ReplacedSessionContext` bound to the *new* session (its `sendUserMessage`/`sendMessage` target the replacement). So `newSession({ withSession: s => s.sendUserMessage("/skill:joycraft-implement <next>") })` = fresh context seeded with the next spec. This is the in-process route to isolation.

### (c) The process boundary — the simplest reset of all.
Every `pi -p "<prompt>"` invocation is a new OS process with its own context. Two sequential `pi -p` calls cannot share conversation memory unless you explicitly `--continue`/`--resume`/`--session`. **This is the cleanest "clear context" available and needs no extension code.** (Empirical 2-process secret test: drafted but not finished this session — a 30-second confirm is in "Open items," though the per-process model makes the outcome a near-certainty.)

**Answer:** Yes, programmatically — but **not from a tool's `execute()`**. From a *command handler* via `newSession` (in-process), or trivially via separate `pi -p` processes (cross-process). `compact()` shrinks but does not isolate.

---

## Q3: What is the correct, verified shape of a Pi extension (tools, hooks, commands), and how are extensions registered/loaded?

Verified from installed types + official `extensions.md`.

### Factory (default export is a FUNCTION, not an object)
```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export default function (pi: ExtensionAPI) { /* register here */ }   // may be async
```
The loader requires `typeof default === "function"`; an object literal → "Extension does not export a valid factory function" (the exact v0.6.3 crash). The current repo extension (`.pi/extensions/joycraft-pipeline.ts`) is now correct on this.

### Tools — `pi.registerTool({...})`
```ts
pi.registerTool({
  name: "my_tool",
  label: "My Tool",                                  // present in all examples
  description: "...",
  parameters: Type.Object({ ... }),                  // typebox
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    return { content: [{ type: "text", text: "..." }], details: {} };  // AgentToolResult
  },
});
```
Signature is `(toolCallId, params, signal, onUpdate, ctx)` — **not** `(args, ctx)`. Return must be `{ content, details, terminate? }`. `ctx` here is `ExtensionContext` (has `ui`, `cwd`, `sessionManager`, `compact`, `getContextUsage`, `shutdown`; **no** `newSession`, **no** `projectDir` — use `ctx.cwd`).

### Commands — `pi.registerCommand(name, { description, handler })`
```ts
pi.registerCommand("hello", {
  description: "Say hello",
  handler: async (args, ctx /* ExtensionCommandContext */) => { ctx.ui.notify(`Hi ${args}`, "info"); },
});
```
Command handlers get `ExtensionCommandContext` → the session-control methods live here.

### Lifecycle hooks — `pi.on(event, handler)`
Verified event names: `agent_end` ("Fired once per user prompt"), `before_agent_start`, `turn_start`/`turn_end`, `tool_call`, `tool_result`, `session_start`, `session_shutdown`, `session_before_compact` (cancellable), `session_before_switch`, `session_before_fork`. `pi.sendUserMessage(...)` / `pi.sendMessage(..., { triggerTurn: true })` are on `ExtensionAPI` and can fire a turn from a handler.

### Discovery / loading
- Auto: `.pi/extensions/*.ts` (project) and `~/.pi/agent/extensions/` (global). Hot-reload with `/reload`.
- Explicit: `pi -e <path>` (repeatable); `--no-extensions` disables discovery.
- Packages: installable via `pi install <source>`; resources enabled via `pi config`.

---

## Q4: Can a Pi extension spawn child sessions with isolated context to run specs back-to-back without human typing?

**Two viable routes; one is far simpler than what the repo is attempting.**

### Route A — in-process, two-hop (the current design, "Approach B")
`agent_end` handler → `pi.sendUserMessage("/joycraft-next-spec", { deliverAs: "followUp" })` → the registered `joycraft-next-spec` **command** (command context) calls `ctx.newSession({ withSession: s => s.sendUserMessage("/skill:joycraft-implement <next>") })`. Fresh context per spec, zero human input. **Constraints:** the trigger must be *gated* (don't advance after every turn or after a failed spec), and `newSession`/`sendUserMessage` interplay only behaves in the interactive runtime — which is precisely why the experiment failed in the harness it was tested in (see below).

### Route B — cross-process shell loop (recommended; not yet tried)
```bash
while spec=$(.pi/scripts/joycraft/joycraft-next-spec docs/features/<slug>/specs); \
      [ -n "$spec" ] && [ "$spec" != "Pipeline complete" ]; do
  pi -p "/skill:joycraft-implement $spec"          # fresh process = fresh context
  .pi/scripts/joycraft/joycraft-session-end pipeline   # validate + stage (+ commit)
  # mark-done is driven by the queue; loop re-queries next-spec
done
```
Each `pi -p` is its own process → **isolation is guaranteed by the OS**, not by extension cleverness. No `newSession` deadlock surface, no event-gating puzzle, runs headless in CI, and `--mode json` gives a parseable transcript for the autofix/Level-5 loop. The bash tool belt (`joycraft-next-spec`, `joycraft-mark-done`, `joycraft-session-end`) already exists and works standalone — Route B is mostly *wiring what's already built*, plus making the queue the source of truth (mark-done must run, which `stateful-next-spec.md` addresses).

### Why the in-process experiment failed (root cause, verified)
`docs/features/2026-05-27-context-isolation-test/experiment-report.md`: specs A→B ran in **one** session; the agent recalled `KIWI`. Three causes, all real:
1. **Directory input** → the implement skill read *all* specs at once (no boundary). Fix: `strict-implement-input.md`.
2. **`joycraft_next_spec` didn't mutate the queue** (optional `spec_path`, silent mark-done catch). Fix: `stateful-next-spec.md`.
3. **The follow-up message never reached the command handler** in the runtime it was driven from → `newSession` never fired. This is the load-bearing one: `pi.sendUserMessage(..., {deliverAs:"followUp"})` triggering a registered command is an **interactive-mode** behavior. In `-p`/SDK contexts, extension *commands* are "only needed for interactive mode where extension commands are invokable" (`types.d.ts:1107`). So the two-hop design is inherently coupled to the interactive TUI.

**Conclusion:** Route A *can* work, but only inside `pi` interactive and only with careful gating — fragile. Route B sidesteps every failure mode by using processes for isolation. The honest recommendation is to make Route B the autonomous path and keep the extension only as an interactive-TUI convenience (a human typing inside `pi` who wants one-key advance).

---

## Cross-cutting verified facts

- **`pi --help` (installed) confirms** all run modes and flags quoted above: `--mode <text|json|rpc>`, `--print, -p`, `--continue/-c`, `--resume/-r`, `--session`, `--fork`, `--no-session`, `--tools/-t`, `--no-tools`, `--extension/-e`, `--skill`, `--no-context-files` (skip AGENTS.md/CLAUDE.md), `--export`. Example from help: `pi --tools read,grep,find,ls -p "Review the code in src/"`.
- **SDK route exists** (`dist/index.d.ts:15`): `createAgentSession(...)` → `{ session }`, `await session.prompt("...")` resolves when the run finishes; stream via `session.subscribe`; custom tools via `customTools: [...]` / `defineTool(...)`; extensions/skills via `DefaultResourceLoader`. This is a third option if a TS driver is ever preferred over bash.
- **No test/CI exercises the extension at runtime.** `tests/pi-extension.test.ts` does *string* assertions on the template (imports the real package name, default export is a function, `spec_path` not optional, etc.). Nothing loads it through Pi's loader or runs `pi`. The guard catches "fictional SDK" regressions but **cannot** catch "works as a real extension."
- **Print mode + extensions:** print mode runs through the same `createAgentSession`/`ResourceLoader` path, so skills and registered *tools* load under `-p`. What does **not** apply under `-p` is interactive *command* invocation (and thus the `followUp`→command→`newSession` hop) — consistent with the `types.d.ts:1107` comment. (Worth a 5-min empirical confirm; see Open items.)

## Open items (quick confirms, non-blocking)
1. **2-process secret test:** `pi -p --no-session "remember PINEAPPLE"` then a *second* `pi -p --no-session "what was the secret?"` → expect `UNKNOWN`. (Drafted this session; finish to close the isolation question empirically.)
2. **Does `pi -p` honor a `/skill:` slash command in the prompt** (vs. needing the skill auto-invoked by description)? Confirm `pi -p "/skill:joycraft-implement <spec>"` actually triggers the skill.
3. **Align the pinned devDep** `0.75.5` with the installed `0.76.0`.
