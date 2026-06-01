# Stateful Next Spec — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-28-pipeline-context-isolation/brief.md`
> **Status:** Ready
> **Date:** 2026-05-28
> **Estimated scope:** 1 session / 2 extension files / ~20 lines

---

## What

Update the `joycraft_next_spec` tool to:
1. **Require** `spec_path` (make it non-optional in the TypeBox schema)
2. **Surface** `mark-done` errors to the agent instead of silently swallowing them

## Why

The context isolation test showed that the queue file was never updated because:
- `spec_path` was optional, so the agent didn't pass it
- Even when it was passed, `mark-done` errors were caught and ignored with a `// Best-effort` comment

This made the queue a decorative file with no connection to actual pipeline state.

## Acceptance Criteria
- [ ] `spec_path` is required in the TypeBox schema (not `Type.Optional`)
- [ ] If `mark-done` fails, the tool returns an error response (isError: true) with the stderr
- [ ] The tool description / promptSnippet tells the agent it MUST pass the spec path
- [ ] Both the installed extension (`.pi/extensions/joycraft-pipeline.ts`) and the template (`src/templates/pi-extensions/joycraft-pipeline.ts`) are updated
- [ ] The pi-extension test verifies `spec_path` is required (or at minimum, not `Type.Optional`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| spec_path required | Read extension code, assert no `Type.Optional` around `spec_path` | unit (content) |
| mark-done errors surfaced | Read extension code, assert catch block returns isError response | unit (content) |
| Both files updated | Assert `.pi/extensions/joycraft-pipeline.ts` and template are identical (or both updated) | unit (sync) |

## Constraints
- MUST: Update both `.pi/extensions/joycraft-pipeline.ts` and `src/templates/pi-extensions/joycraft-pipeline.ts`
- MUST: `spec_path` must be required at the schema level so the tool errors if omitted
- MUST: Mark-done failure must propagate as a tool error response
- MUST NOT: Change the `/joycraft-next-spec` command handler behavior
- MUST NOT: Change `ctx.newSession` invocation — session lifecycle is correct

## Affected Files
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `.pi/extensions/joycraft-pipeline.ts` | `spec_path` required; mark-done errors surfaced |
| Modify | `src/templates/pi-extensions/joycraft-pipeline.ts` | Same changes |
| Modify | `tests/pi-extension.test.ts` | Add test that `Type.Optional` is not used for `spec_path` |

## Approach

### 1. Make spec_path required

Change:
```ts
parameters: Type.Object({
  spec_path: Type.Optional(Type.String({ ... }))
})
```

To:
```ts
parameters: Type.Object({
  spec_path: Type.String({
    description: "Path to the spec file that was just completed (e.g. docs/features/2026-05-27-foo/specs/bar.md). Required.",
  })
})
```

### 2. Surface mark-done errors

Change the catch block from:
```ts
} catch {
  // Best-effort; don't fail the pipeline if mark-done breaks
}
```

To:
```ts
} catch (e: any) {
  return {
    content: [{ type: "text", text: `Mark-done failed: ${e.stderr?.toString() || e.message}` }],
    details: { error: e.message },
    isError: true,
  };
}
```

### 3. Update skill instructions

Also update the `joycraft-implement` skill's Step 6 hand-off to say:
```
Call the `joycraft_next_spec` tool with the current spec's file path to validate, mark this spec complete, and advance to the next spec automatically.
```

## Edge Cases
| Scenario | Expected Behavior |
|----------|------------------|
| Agent calls tool without spec_path | TypeBox validation error — tool is not invoked |
| mark-done script not found | Tool returns isError with "mark-done failed: ..." |
| manifest not found | Tool returns isError telling user no queue was found |
| mark-done succeeds but queue already shows complete | Tool still succeeds (mark-done script handles this) |
