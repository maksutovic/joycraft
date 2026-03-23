# [Feature Name] — Design Spec

> **Status:** Draft | Ready for Implementation | In Progress | Complete
> **Date:** YYYY-MM-DD
> **Project:** [project name]

---

## 1. Problem Statement (REQUIRED)

What is broken, missing, or needed? Write this so someone with no context understands the problem in 30 seconds. Include the trigger — what made this work necessary now?

_Example from your best work (Foodtrails unknown-format-handler):_
> "The current import pipeline rejects any file that doesn't match one of three hardcoded formats. Real-world client files arrive in dozens of variations. Every rejection means a manual support ticket."

## 2. Constraints (REQUIRED)

What are the hard boundaries? Business rules, technical limitations, things that MUST or MUST NOT happen. Use RFC 2119 language (MUST, SHOULD, MAY, MUST NOT).

- [ ] List each constraint as a checkbox (they become verification items later)

_Example (Foodtrails):_
> - [ ] Multiple columns representing the same information = NOT eligible for automated import (Jesse's constraint)
> - [ ] MUST NOT modify existing working import paths
> - [ ] MUST degrade gracefully — partial imports are better than total rejection

## 3. Approach (REQUIRED)

How will this be solved? Not pseudo-code — describe the architecture, the data flow, the key decisions. Include:

- **Architecture**: What components are involved? How do they interact?
- **Data flow**: What goes in, what comes out, what transformations happen?
- **Key decisions**: Why this approach over alternatives? (Name at least one rejected alternative and why)

_Scale this section to complexity: 3-5 sentences for a bug fix, 1-2 pages for a new feature._

## 4. Affected Files (REQUIRED)

| Action | File Path | What Changes |
|--------|-----------|-------------|
| Create | `path/to/new-file.ts` | Brief description |
| Modify | `path/to/existing-file.ts` | What specifically changes |
| Delete | `path/to/dead-file.ts` | Why it's being removed |

_This is the file manifest Claude uses to scope its work. Be explicit._

## 5. Data Shapes (SCALE WITH COMPLEXITY)

Define interfaces, schemas, API request/response shapes, database changes. Use the project's actual type system.

```typescript
// Example: TypeScript interface
interface ImportResult {
  status: 'success' | 'partial' | 'failed';
  rowsProcessed: number;
  errors: ImportError[];
}
```

_Skip this section for pure UI changes or refactors that don't touch data._

## 6. Edge Cases & Error Handling (SCALE WITH COMPLEXITY)

| Scenario | Expected Behavior |
|----------|------------------|
| [edge case 1] | [what should happen] |
| [edge case 2] | [what should happen] |
| [error condition] | [how to handle gracefully] |

_At minimum, answer: "What happens when this fails?" If you can't answer that, the spec isn't ready._

## 7. Out of Scope (REQUIRED)

What this spec explicitly does NOT cover. Prevents scope creep during implementation.

- NOT: [thing that's tempting but deferred]
- NOT: [related feature that's a separate spec]

## 8. Verification (REQUIRED)

How do we know this works? These become the acceptance criteria.

- [ ] [Observable behavior 1 — what a user/tester would see]
- [ ] [Observable behavior 2]
- [ ] [Regression check — existing behavior that must not break]
- [ ] Build passes (`pnpm build` / `npx tsc --noEmit` / equivalent)
- [ ] Lint passes

_These checkboxes are what you check when Claude says "done." If you can't write them, the spec isn't ready._

---

## Template Usage Notes

**When to use this template:**
- Any feature touching 3+ files
- Any change to data models, APIs, or auth flows
- Any work that will take Claude more than one session
- Any work where getting it wrong has consequences (production data, user-facing, billing)

**When to skip (or use a lightweight version):**
- Single-file bug fixes with obvious solutions
- Copy/text changes
- Dependency updates

**Lightweight version (for small changes):**
Just fill sections 1, 4, 7, and 8. Problem, files, not-in-scope, verification. That's the minimum.

**After this spec is approved → create an Implementation Plan using the plan template.**
