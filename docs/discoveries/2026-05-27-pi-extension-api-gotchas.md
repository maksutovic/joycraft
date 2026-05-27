---
status: active
owner: compiler
---

# Discoveries — Pi Extension API Gotchas

**Date:** 2026-05-27
**Spec:** `docs/features/2026-05-26-pi-support/specs/fix-pi-extension-api.md`

## ctx.exec() does not exist on ExtensionCommandContext
**Expected:** The spec said to use `ctx.exec()` to run bash scripts — "MUST: Use `ctx.exec()` to run bash scripts (NOT `child_process.execSync` directly — `ctx.exec` is the Pi-idiomatic way)"
**Actual:** `ExtensionCommandContext` (types.d.ts:241-276) has `waitForIdle()`, `newSession()`, `fork()`, `navigateTree()`, `switchSession()`, `reload()` — but no `exec()`. There is no `exec` method anywhere on the extension context hierarchy.
**Impact:** Used `child_process.execSync` with `cwd: ctx.cwd` instead. Future specs referencing `ctx.exec` should verify against real types first.

## sendUserMessage only on ReplacedSessionContext, not ExtensionCommandContext
**Expected:** Could call `ctx.sendUserMessage()` from the command handler to send messages to the user.
**Actual:** `sendUserMessage()` is only on `ReplacedSessionContext` (the context passed to `withSession()` callbacks inside `newSession()`, `fork()`, `switchSession()`). The command handler's `ctx` is `ExtensionCommandContext` which only has `ui.notify()` for user-facing messages.
**Impact:** Used `ctx.ui.notify(message, "error"|"info")` for status messages from the command handler. `session.sendUserMessage()` is used inside the `withSession` callback to inject `/joycraft-implement <next-spec>` into the new session.

## Claude implement skill has different structure than Pi version
**Expected:** All three implement skill variants (Pi, Claude, Codex) have identical structure — just different invocation syntax.
**Actual:** The Claude variant has an extra "Step 2: Read the Sibling README.md FIRST" that shifts all subsequent step numbers. The TDD cycle is "Step 4" instead of "Step 3". The Codex and Pi variants have identical structure.
**Impact:** Batch sed commands targeting `## Step 3: Execute the TDD Cycle` missed the Claude variant. Required a second pass targeting the correct header.

## parseSections in improveAgentsMd only recognizes ## headers
**Expected:** Adding an `### External API Safety` H3 section would be detected as an existing section.
**Actual:** `parseSections()` splits only on `## ` (H2 headers). H3 headers are treated as body content of the parent H2 section. The `hasSection()` check against `/external\s*api\s*safety/i` never matched.
**Impact:** Switched from `hasSection(sections, pattern)` to searching the full existing content with `pattern.test(existing)` so H3 sections are detected.

## newSession takes an options object, not a string
**Expected:** The original code called `ctx.newSession(kickoffMessage)` with a string.
**Actual:** `newSession(options?: { parentSession?: string; setup?: ...; withSession?: ... })` — takes an options object with optional `parentSession`, `setup`, and `withSession` fields. No string overload exists.
**Impact:** Confirmed the Approach B design is correct: `ctx.newSession({ withSession: async (session) => { session.sendUserMessage(...) } })`.
