# Pi Extension Fails to Load — "Invalid Factory Function" — Bug Brief

> **Date:** 2026-05-27
> **Project:** Joycraft
> **Status:** Draft — for review
> **Severity:** Critical — Pi will not start at all once the extension is installed
> **Shipped in:** v0.6.3 (the Pi support feature, PR #39 / commit `e8050a5`)
> **Branch:** `bugfix/pi-extension-invalid-factory`
> **Author of original feature:** the agent who built `docs/features/2026-05-26-pi-support`

---

## TL;DR

The Pi extension Joycraft installs (`.pi/extensions/joycraft-pipeline.ts`) was written against a **non-existent SDK** (`pi-extension-sdk`) with an **invented API shape**. The real Pi runtime (`@earendil-works/pi-coding-agent`) expects a completely different contract. As a result, **any project that runs `npx joycraft upgrade`/`init` on v0.6.3 cannot start Pi** — Pi aborts at load time with:

```
Error: Failed to load extension "…/.pi/extensions/joycraft-pipeline.ts":
Extension does not export a valid factory function: …/.pi/extensions/joycraft-pipeline.ts
```

This is not a typo or a single bad line. The extension needs a **structural rewrite** because the real API differs in: export shape, tool definition fields, `execute()` signature, return type, available context methods, and the import/package name. It also surfaces a **process gap**: a hand-written type stub (`src/types/pi-extension-sdk.d.ts`) made TypeScript accept the fictional API, so `pnpm typecheck` passed and CI never caught that the code targets a package that does not exist.

**Good news on the design goal:** fully autonomous spec-to-spec advancement (the dark-factory model — fresh context per spec, no human in the loop) **is achievable** with the real API. The original code reached for the right outcome with the wrong mechanism (a tool calling `newSession` directly, which Pi forbids). The supported, documented pattern is two-hop: an `agent_end` event handler auto-injects a `/joycraft-next-spec` command, and that command (running in command context) calls `newSession`. This is the **decided design (Approach B)** — see section 4 below. So nothing about the vision is blocked; only the implementation shape changes.

---

## The Symptom

User upgraded to v0.6.3 to try the new Pi pipeline feature. `npx joycraft upgrade` ran cleanly and installed the Pi files (`.pi/extensions/`, `.pi/skills/`, `.pi/scripts/`, `.pi/agents/`). Then:

```
➜  joycraft git:(main) ✗ pi
Error: Failed to load extension "/Users/compiler/Developer/joycraft/.pi/extensions/joycraft-pipeline.ts":
Extension does not export a valid factory function: /Users/compiler/Developer/joycraft/.pi/extensions/joycraft-pipeline.ts
```

Pi never reaches a prompt. Because Pi loads project extensions at startup, a single bad extension is fatal — the user is fully locked out of Pi.

---

## Root Cause

### What Joycraft ships

`.pi/extensions/joycraft-pipeline.ts` (identical in all four locations — see "Affected Files") **default-exports a plain object literal**:

```typescript
import { Type } from '@sinclair/typebox';
import type { PiExtension, ToolContext } from 'pi-extension-sdk';   // ← package does not exist

export default {
  name: 'joycraft-pipeline',
  tools: [
    {
      name: 'joycraft_next_spec',
      description: '…',
      parameters: JoycraftNextSpecSchema,
      async execute(args: { specId: number }, ctx: ToolContext) {   // ← wrong signature
        const scriptsDir = join(ctx.projectDir, '.pi', 'scripts', 'joycraft');  // ← no projectDir
        …
        await ctx.sendUserMessage(…);   // ← not on a tool's ctx
        …
        ctx.newSession(kickoffMessage); // ← not on a tool's ctx; wrong arg type
        return { success: false, error: e.message };  // ← wrong return shape
      },
    },
  ],
} satisfies PiExtension;   // ← type only exists in our fake stub
```

### Why Pi rejects it

Pi's extension loader (`@earendil-works/pi-coding-agent` v0.75.5, `dist/core/extensions/loader.js:272-274`) requires the default export to be a **function**:

```javascript
const module = await jiti.import(extensionPath, { default: true });
const factory = module;
return typeof factory !== "function" ? undefined : factory;   // object literal → undefined
```

When `factory` is `undefined`, the loader returns the exact error the user saw (`loader.js:300-301`). It then calls `await factory(api)` (`loader.js:305`) — i.e. Pi **passes an `ExtensionAPI` object to a factory function**, and the extension is expected to register tools/commands *through that API*, not to export a declarative object.

### Why our build never caught it

- `tsconfig.json` has `"include": ["src"]` and there is a **hand-written stub** at `src/types/pi-extension-sdk.d.ts` that `declare module 'pi-extension-sdk'` with the invented `PiExtension`/`ToolContext` types (`projectDir`, `newSession(message)`, `sendUserMessage`). TypeScript resolved the import against this stub and typechecked clean.
- The fictional API was **guessed**, never validated against the real package. `pi-extension-sdk` is not a real npm package; the real one is `@earendil-works/pi-coding-agent`.
- The extension is `.ts` shipped as source (Pi compiles it at load via jiti), so there is no compile step in our pipeline that would exercise the real types.

---

## The Real Pi Extension API (authoritative sources)

Verified two ways and they agree exactly:
1. The **installed runtime** at `…/@earendil-works/pi-coding-agent@0.75.5` (the version the user actually runs) — `dist/core/extensions/types.d.ts`, `dist/core/extensions/loader.js`, and `node_modules/@earendil-works/pi-agent-core/dist/types.d.ts`.
2. The **published docs and examples** on GitHub `main`.

### Sources

- Extensions guide: <https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md>
- SDK guide: <https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md>
- Example extensions index: <https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions>
- `handoff.ts` example (closest analogue — context transfer + `newSession`): <https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/handoff.ts>
- `send-user-message.ts` example: <https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/send-user-message.ts>
- npm package: <https://www.npmjs.com/package/@earendil-works/pi-coding-agent>

### 1. The default export is an `ExtensionFactory`, not an object

From the docs and from `types.d.ts:1003` (`export type ExtensionFactory = (pi: ExtensionAPI) => void | Promise<void>;`):

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // register tools, commands, event handlers via `pi`
}
// (may be async; Pi awaits async factories before startup)
```

### 2. Tools are registered with `pi.registerTool({...})` — and need a `label`

From `types.d.ts:328-359` (`ToolDefinition`) and the docs:

```typescript
pi.registerTool({
  name: "my_tool",
  label: "My Tool",                 // ← REQUIRED; our object omits it
  description: "What this tool does",
  parameters: Type.Object({ … }),
  // signature is (toolCallId, params, signal, onUpdate, ctx) — NOT (args, ctx)
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    return {
      content: [{ type: "text", text: "Result" }],   // ← AgentToolResult
      details: { … },
      // terminate?: boolean
    };
  },
});
```

`AgentToolResult` (`pi-agent-core/dist/types.d.ts:305-315`) is `{ content: (TextContent | ImageContent)[]; details: T; terminate?: boolean }`. Our `{ success, error, nextSpec }` return is not a valid result.

### 3. `newSession` and `sendUserMessage` are NOT available to a tool

A tool's `execute` receives `ExtensionContext` (`types.d.ts:207-236`). It exposes `ui`, `cwd`, `sessionManager`, `isIdle()`, `signal`, `abort()`, `shutdown()` — **but no `projectDir`, no `sendUserMessage`, and no `newSession`.** (`cwd` is the project root substitute.)

`newSession` exists only on **`ExtensionCommandContext`** (`types.d.ts:241-276`), which is what a **command handler** receives:

```typescript
const result = await ctx.newSession({
  parentSession: currentSessionFile,
  withSession: async (replacementCtx) => { … },
});
```

The docs state plainly: *"This method is only available in command handlers, not in event handlers or tool `execute()`."*

### 4. Autonomous advancement IS possible — via a documented two-hop pattern

This is the part my first draft got wrong. The original design's *goal* — advance to the next spec with no human in the loop — is fully achievable. What's illegal is only the *mechanism* the original code used: calling `newSession` directly from a tool's `execute`. The docs forbid that explicitly because session-control methods "can deadlock if called from event handlers" (and aren't on a tool's context at all).

Two facts unlock autonomy, both verified on `ExtensionAPI` (`types.d.ts:783-842`):

- **`pi.on("agent_end", handler)`** (`types.d.ts:798`) fires automatically when the agent finishes a turn — no user input, no slash command. The handler receives `ExtensionContext`.
- **`pi.sendMessage(msg, { triggerTurn: true })`** and **`pi.sendUserMessage(content)`** (`types.d.ts:833-842`) are on the `ExtensionAPI` itself — callable from inside an event handler — and inject a message that triggers a fresh agent turn. (The bundled `file-trigger.ts` example does exactly this: a `session_start` watcher injects `pi.sendMessage(..., { triggerTurn: true })` with no human involvement.)

`newSession` is still command-only (`ExtensionCommandContext`, `types.d.ts:241-276`), so to get *fresh context per spec* we use the **documented bridge**: an event handler / tool injects a slash command, and the registered command performs the session switch. The docs spell this out: *"a tool could … queue a command via `pi.sendUserMessage("/my-command", { deliverAs: "followUp" })`… The command must handle [the session replacement] afterward through the proper `ExtensionCommandContext` API."*

**Chosen design (Approach B — fresh context per spec, fully autonomous):**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // Hop 1: when a spec's turn finishes, auto-inject the advance command.
  pi.on("agent_end", async (event, ctx) => {
    if (/* this turn just completed a spec — gate on session state */) {
      pi.sendUserMessage("/joycraft-next-spec", { deliverAs: "followUp" });
    }
  });

  // Hop 2: the command runs in ExtensionCommandContext, so it CAN newSession().
  pi.registerCommand("joycraft-next-spec", {
    description: "Advance the autonomous spec pipeline to the next spec.",
    handler: async (args, ctx /* ExtensionCommandContext */) => {
      // run .pi/scripts/joycraft/* via ctx.exec / child_process (cwd-relative)
      const nextSpec = /* joycraft-next-spec output */;
      if (!nextSpec || nextSpec === "Pipeline complete") {
        ctx.ui.notify("🎉 Pipeline complete.", "info");
        return;
      }
      await ctx.newSession({
        parentSession: /* current session file */,
        withSession: async (s) => {
          s.sendUserMessage(`/joycraft-implement ${nextSpec}`);
        },
      });
    },
  });
}
```

This preserves the dark-factory model (clean context per spec, zero human input). The only difference from the original fantasy is that it's a **two-hop pattern (handler → command → newSession)** rather than a tool calling `newSession` inline.

> **Alternative (Approach A — same session):** skip the command and `newSession`; have the `agent_end` handler run the scripts and `pi.sendUserMessage("/joycraft-implement <next>")` in the *same* session. Simpler, fully autonomous, but context accumulates across all specs (no fresh-context benefit). Documented here as the fallback; **the decided approach is B.**

The bundled `handoff.ts` example is the canonical reference for the command + `newSession({ withSession })` half; `file-trigger.ts` is the reference for autonomous turn-triggering from a handler.

### Side-by-side

| Aspect | What Joycraft ships (invented) | Real `@earendil-works/pi-coding-agent` 0.75.5 |
|---|---|---|
| Package / import | `pi-extension-sdk` (does not exist) | `@earendil-works/pi-coding-agent` |
| Default export | object literal `{ name, tools }` | `ExtensionFactory`: `(pi: ExtensionAPI) => void \| Promise<void>` |
| How tools register | array on the object | `pi.registerTool({...})` |
| Tool `label` | omitted | **required** |
| `execute` signature | `(args, ctx)` | `(toolCallId, params, signal, onUpdate, ctx)` |
| `execute` return | `{ success, error, … }` | `AgentToolResult` = `{ content, details, terminate? }` |
| Context for project root | `ctx.projectDir` | `ctx.cwd` |
| `sendUserMessage` | on tool `ctx`, string only | on `ExtensionAPI` (`pi.*`) **and** `ExtensionCommandContext`; NOT on a tool's `ctx` |
| `newSession(message)` | on tool `ctx`, takes a string | on `ExtensionCommandContext` only, takes an options object |
| Autonomous turn trigger | (assumed via tool) | `pi.on("agent_end")` + `pi.sendMessage(..,{triggerTurn})` / `pi.sendUserMessage(..)` |
| Spec handoff mechanism | a **tool** calling `newSession` | **`agent_end` handler → injects `/joycraft-next-spec` command → command calls `newSession`** (two-hop) |

---

## Scope of the Fix (proposed — for review, not yet implemented)

1. **Rewrite the extension** as a real `ExtensionFactory` implementing **Approach B** (decided): a `pi.on("agent_end", ...)` handler that auto-injects `pi.sendUserMessage("/joycraft-next-spec", { deliverAs: "followUp" })`, plus a `pi.registerCommand("joycraft-next-spec", ...)` whose handler (in `ExtensionCommandContext`) runs the scripts via `ctx.exec`/`child_process` (cwd-relative) and calls `ctx.newSession({ withSession })` to seed a clean session with `/joycraft-implement <next-spec>`. Import types from `@earendil-works/pi-coding-agent`. Reference: bundled `handoff.ts` (command + `newSession`) and `file-trigger.ts` (autonomous turn trigger). **Gating the `agent_end` trigger** (so it fires only after a spec completes, not on every turn) is the main design subtlety — see open questions.
2. **Delete the fictional stub** `src/types/pi-extension-sdk.d.ts`. Add `@earendil-works/pi-coding-agent` as a `devDependency` (types only — Pi provides the runtime), or a documented peer, so typecheck runs against the real API.
3. **Regenerate `src/bundled-files.ts`.** The broken extension is embedded as a string literal there (two entries: `"pi-extensions/joycraft-pipeline.ts"` and `"joycraft-pipeline.ts"`). Editing only the `.ts` template files will NOT fix what `init`/`upgrade` install — the bundled-files generator must be re-run.
4. **Propagate** the corrected content to all copies: `src/templates/pi-extensions/`, `docs/templates/pi-extensions/`, `.pi/extensions/`, and the version hashes in `.joycraft-version`.
5. **Add a guard** so a bogus-SDK extension can't ship green again — e.g. typecheck the template against the real package, or a smoke test that loads the extension through Pi's loader (or asserts `typeof (await import(...)).default === "function"`).
6. **Verify reproduction → fix** by actually running `pi` in a project after install.

### Open questions for the feature author

- **Trigger gating (the real design question):** `agent_end` fires after *every* agent turn, not just when a spec is "done." How do we detect that the just-finished turn actually completed the current spec (vs. mid-spec turns, errors, or user chatter)? Options: a sentinel the implement skill emits on completion, checking `joycraft-session-end` exit status, or a state flag in the session. This gating is the crux of making B robust — without it the pipeline would try to advance after every turn.
- **Loop/error safety:** if a spec's tests fail, the handler must NOT advance. Where does the stop condition live — the command checks `joycraft-session-end` result and aborts, or the `agent_end` gate never fires? Confirm the failure path keeps the human informed (`ctx.ui.notify`) rather than silently looping.
- Were the `.pi/agents/*` and `.pi/skills/*` files validated against real Pi, or were they written against the same guessed model? (Out of scope for this bug, but worth a parallel check.)

> **Resolved (was an open question):** "tool vs. command, and is autonomy even possible?" — autonomy IS possible via the two-hop `agent_end` → command → `newSession` pattern; **Approach B** is the decided design. See "4. Autonomous advancement IS possible" above.

---

## Affected Files

| Action | File | What Changes |
|---|---|---|
| Rewrite | `src/templates/pi-extensions/joycraft-pipeline.ts` | Source-of-truth template → real `ExtensionFactory` + command |
| Regenerate | `src/bundled-files.ts` | Embedded string copies (lines ~40 and ~109) must reflect the rewrite |
| Delete | `src/types/pi-extension-sdk.d.ts` | Remove fictional type stub |
| Edit | `package.json` | Add `@earendil-works/pi-coding-agent` devDep (ASK FIRST per CLAUDE.md) |
| Sync | `docs/templates/pi-extensions/joycraft-pipeline.ts` | Mirror of template |
| Sync | `.pi/extensions/joycraft-pipeline.ts` | This repo's installed copy |
| Update | `.joycraft-version` | New content hashes for the changed files |
| Add | a guard test / CI step | Prevent regression |

---

## Acceptance Criteria (for the eventual fix spec)

- [ ] `pi` starts successfully in a project after `npx joycraft init`/`upgrade` (no "valid factory function" error)
- [ ] `/joycraft-next-spec` command runs the scripts, reports status, and starts a **fresh session** seeded with the next spec via `newSession` (Approach B)
- [ ] An `agent_end` handler **auto-triggers** the advance after a spec completes — fully autonomous, no human input (and is correctly **gated** so it does NOT fire after every turn or after a failed spec)
- [ ] On spec failure (tests/build red), the pipeline **stops and notifies** rather than advancing or looping
- [ ] Extension imports `@earendil-works/pi-coding-agent` and contains no reference to `pi-extension-sdk`
- [ ] `pnpm typecheck` passes against the **real** SDK types (stub removed)
- [ ] A guard fails if the extension's default export is not a function
- [ ] No regression in non-Pi behavior (Claude/Codex skills unaffected)

---

## Notes

- This is a **process failure as much as a code bug**: typechecking green against a self-authored stub gave false confidence in an API that was never validated. The most valuable durable fix is the guard in step 5, not just the rewrite.
- CLAUDE.md flags template changes and dependency additions as **ASK FIRST** — both are in scope here, so the fix spec should be reviewed/approved before implementation.
