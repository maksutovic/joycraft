---
status: complete
owner: unknown
created: 2026-05-27
feature: 2026-05-26-pi-support
---

# Fix Pi Extension — Real API Rewrite — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Bug Brief:** `docs/features/2026-05-26-pi-support/pi-extension-invalid-factory-brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 4 files changed + 2 deleted / ~150 lines

---

## What

The Pi extension shipped in v0.6.3 (`joycraft-pipeline.ts`) was written against a fictional SDK (`pi-extension-sdk`) with an invented API shape. Pi rejects it at load time with "Extension does not export a valid factory function." This spec rewrites the extension to the real `@earendil-works/pi-coding-agent` API using the decided two-hop autonomous pattern (Approach B from the bug brief), deletes the fictional type stub, adds the real SDK as a devDependency, adds a guard test, and regenerates the bundled files.

## Why

Without this fix, any project that runs `npx joycraft init`/`upgrade` gets a broken extension that prevents Pi from starting. The user is fully locked out of Pi. This is the single blocking bug that makes the entire Pi support feature unusable.

## External API Contract

**Package:** `@earendil-works/pi-coding-agent` (installed at `…/lib/node_modules/@earendil-works/pi-coding-agent`)

**Canonical sources:**
- Extension guide: `docs/extensions.md` (in the npm package)
- Type definitions: `dist/core/extensions/types.d.ts`
- Example: `examples/extensions/handoff.ts` (command + newSession)
- Example: `examples/extensions/send-user-message.ts` (autonomous message injection)

**Key API facts (validated against v0.75.5):**
- Default export: `(pi: ExtensionAPI) => void | Promise<void>` — a factory function, NOT an object
- Tools registered via `pi.registerTool({...})` — not an array on the export
- Tool `execute` signature: `(toolCallId, params, signal, onUpdate, ctx)` — 5 params
- Tool return: `{ content: ToolContent[], details: T, terminate?: boolean }`
- `newSession` only available on `ExtensionCommandContext` (command handlers), NOT on tool context
- Project root: `ctx.cwd` (NOT `ctx.projectDir`)
- `sendUserMessage` available on `ExtensionAPI` and `ExtensionCommandContext`

## Acceptance Criteria

- [ ] Pi starts successfully in a project after `npx joycraft init` (no "valid factory function" error)
- [ ] Extension default-exports a function `(pi: ExtensionAPI) => void`
- [ ] Extension registers a `/joycraft-next-spec` command whose handler uses `ctx.newSession({ withSession })` to start a fresh session seeded with the next spec
- [ ] `pnpm typecheck` passes against the real `@earendil-works/pi-coding-agent` types
- [ ] The fictional type stub `src/types/pi-extension-sdk.d.ts` is deleted
- [ ] `@earendil-works/pi-coding-agent` is added as a `devDependency` in `package.json`
- [ ] A guard test asserts `typeof (await import(templatePath)).default === "function"`
- [ ] `src/bundled-files.ts` is regenerated and contains the rewritten extension code
- [ ] No reference to `pi-extension-sdk` exists anywhere in the codebase
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Extension exports a function | `import(template) → typeof .default === 'function'` | unit |
| No `pi-extension-sdk` references | `rg 'pi-extension-sdk' src/` returns empty | unit |
| Typecheck passes with real SDK | `pnpm typecheck` succeeds | unit |
| Fake stub deleted | `assert !existsSync('src/types/pi-extension-sdk.d.ts')` | unit |
| Bundled file contains real API imports | `grep '@earendil-works/pi-coding-agent' src/bundled-files.ts` matches | unit |
| Extension registers a command | Parse extension, assert `pi.registerCommand` called with `joycraft-next-spec` | unit |
| DevDependency present | `package.json` has `@earendil-works/pi-coding-agent` in devDeps | unit |

**Execution order:**
1. Write guard tests (export shape, no pi-extension-sdk references, typecheck)
2. Run tests — they must FAIL (extension still broken)
3. Delete fake stub, add devDependency
4. Rewrite extension template
5. Regenerate bundled-files.ts
6. Run tests — all green

**Smoke test:** `typeof (await import(extensionTemplate)).default === 'function'` — instant pass/fail.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Import types from `@earendil-works/pi-coding-agent` (the real package)
- MUST: Default export is a function `(pi: ExtensionAPI) => void` — NOT an object
- MUST: Use `pi.registerCommand()` for `/joycraft-next-spec` (command context gives access to `ctx.newSession`)
- MUST: Use `ctx.exec()` to run bash scripts (NOT `child_process.execSync` directly — `ctx.exec` is the Pi-idiomatic way)
- MUST: Script paths are relative to `ctx.cwd` (project root)
- MUST: On validation failure, notify and STOP — do NOT call `newSession`
- MUST: Delete `src/types/pi-extension-sdk.d.ts` entirely
- MUST: Add `@earendil-works/pi-coding-agent` as devDependency with exact version matching the installed runtime
- MUST NOT: Call `newSession` from a tool handler — it's only available on `ExtensionCommandContext` (command handlers)
- MUST NOT: Import from `pi-extension-sdk` (this package does not exist)

## Affected Files

| Action | File | What Changes |
|---|---|---|
| REWRITE | `src/templates/pi-extensions/joycraft-pipeline.ts` | Source-of-truth template → real `ExtensionFactory` with `/joycraft-next-spec` command |
| REGENERATE | `src/bundled-files.ts` | Embedded string copies must reflect the rewrite |
| DELETE | `src/types/pi-extension-sdk.d.ts` | Remove fictional type stub |
| EDIT | `package.json` | Add `@earendil-works/pi-coding-agent` devDep (ASK FIRST per CLAUDE.md) |
| SYNC | `.pi/extensions/joycraft-pipeline.ts` | Update this repo's installed copy |
| SYNC | `docs/templates/pi-extensions/joycraft-pipeline.ts` | Mirror of template |
| ADD | `tests/pi-extension.test.ts` | Guard tests (export shape, no fake imports) |

## Approach

### Extension rewrite (Approach B — two-hop autonomy)

The extension uses the documented two-hop pattern to achieve autonomous spec advancement:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("joycraft-next-spec", {
    description: "Advance the Joycraft pipeline to the next spec with fresh context.",
    handler: async (_args, ctx) => {
      const SCRIPTS_DIR = ".pi/scripts/joycraft";

      // 1. Session-end: validate and stage
      const sessionEnd = await ctx.exec(`${SCRIPTS_DIR}/joycraft-session-end`, ["pipeline"]);
      if (sessionEnd.code !== 0) {
        ctx.ui.notify(`Validation failed — fix before advancing.\n${sessionEnd.stderr || sessionEnd.stdout}`, "error");
        return;
      }

      // 2. Find next spec
      const nextSpec = await ctx.exec(`${SCRIPTS_DIR}/joycraft-next-spec`, []);
      const next = nextSpec.stdout.trim();
      if (nextSpec.code !== 0 || !next || next === "Pipeline complete") {
        ctx.ui.notify(next === "Pipeline complete" ? "🎉 Pipeline complete!" : "Could not determine next spec.", "info");
        return;
      }

      // 3. Start fresh session with next spec
      await ctx.newSession({
        withSession: async (session) => {
          session.sendUserMessage(`/joycraft-implement ${next}`);
        },
      });
    },
  });
}
```

**Autonomous trigger (Hop 1) is deferred** until the trigger-gating design (how to detect "spec completed" vs "mid-spec turn") is settled. The command alone restores manual pipeline functionality. Autonomy can be added in a follow-up spec once gating is designed.

**Rejected alternative:** Registering a tool instead of a command. Tools don't have access to `ctx.newSession` — it deadlocks if called from event handlers and isn't on `ExtensionContext` at all. The docs explicitly say `newSession` is command-only.

### DevDependency approach

Check the installed Pi version and pin:
```bash
pi --version  # → 0.75.5
```
Add to `package.json`:
```json
"devDependencies": {
  "@earendil-works/pi-coding-agent": "0.75.5"
}
```

### Guard test approach

```typescript
// tests/pi-extension.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Pi extension template', () => {
  const templatePath = join(__dirname, '..', 'src', 'templates', 'pi-extensions', 'joycraft-pipeline.ts');

  it('exists', () => {
    expect(existsSync(templatePath)).toBe(true);
  });

  it('does not import from pi-extension-sdk', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).not.toContain('pi-extension-sdk');
  });

  it('imports from the real pi-coding-agent package', () => {
    const content = readFileSync(templatePath, 'utf-8');
    expect(content).toContain('@earendil-works/pi-coding-agent');
  });

  it('default export is a function, not an object', async () => {
    // Dynamic import of the TypeScript template (jiti-compiled)
    const mod = await import(templatePath);
    expect(typeof mod.default).toBe('function');
  });
});
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Session-end validation fails (tests/build red) | Command notifies error, does NOT call newSession, pipeline stops |
| No specs remain or all complete | "Pipeline complete" notification, no session switch |
| `joycraft-next-spec` script fails | Error notified, pipeline stops |
| Scripts directory doesn't exist | `ctx.exec` returns non-zero; error notified |
| User runs command manually (not via pipeline) | Same behavior — validates, finds next, switches |
| Extension re-loaded via `/reload` | Works identically — factory function re-executes |
