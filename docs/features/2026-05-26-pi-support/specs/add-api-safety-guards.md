---
status: complete
owner: unknown
created: 2026-05-27
feature: 2026-05-26-pi-support
---

# Add External API Safety Guards to Joycraft — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Ready
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 5 files changed / ~80 lines

---

## What

Encode the six preventive layers identified during the Pi extension post-mortem into Joycraft's templates, skills, and conventions so every Joycraft project inherits protection against hallucinated external APIs. These layers prevent the class of bug where an implementation targets a fictional API that typechecks against a self-authored stub.

## Why

The `pi-extension-invalid-factory` bug was not just a one-off mistake — it was a process failure that Joycraft's infrastructure did not guard against. The agent invented an API, wrote a type stub to make it typecheck, and shipped code that broke at runtime. These six layers make that class of failure impossible or immediately detectable for any Joycraft project, not just this one.

## Acceptance Criteria

- [ ] AGENTS.md template includes instructions to read external API docs/types before implementation
- [ ] AGENTS.md template includes convention to add third-party SDKs as devDependencies
- [ ] AGENTS.md template includes convention for integration smoke tests on critical paths
- [ ] `joycraft-implement` skill warns against self-authoring type stubs for real packages
- [ ] `joycraft-decompose` skill's spec template includes an optional `## External API Contract` section
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| AGENTS.md has "read docs first" instruction | grep generated AGENTS.md for "external API" | unit |
| AGENTS.md has devDependency convention | grep generated AGENTS.md for "devDependency" and "SDK" | unit |
| Implement skill warns about type stubs | grep implement skill for "declare module" warning | unit |
| Decompose skill has API contract section | grep decompose skill for "External API Contract" | unit |
| Generated spec template includes external API section | grep decompose skill output for "External API Contract" heading | integration |

**Execution order:**
1. Update `src/templates/` AGENTS.md generator to add the 3 conventions
2. Update `src/pi-skills/joycraft-implement.md` to add type-stub warning
3. Update `src/pi-skills/joycraft-decompose.md` to add API contract section to spec template
4. Propagate to Claude/Codex skill variants
5. Regenerate bundled-files.ts
6. Run tests

**Smoke test:** Run `generateAgentsMd()` and grep for "devDependency" — instant pass/fail.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Changes are additive — do not break existing AGENTS.md generation behavior
- MUST: The "External API Contract" section in specs is OPTIONAL (only present when a spec touches a third-party API)
- MUST: Propagate changes to Pi, Claude, AND Codex skill variants
- MUST: The type-stub warning in implement skill is brief — 2-3 lines, not a paragraph
- MUST NOT: Make AGENTS.md significantly longer (target: < 10 lines added)

## Affected Files

| Action | File | What Changes |
|---|---|---|
| EDIT | `src/init.ts` → `generateAgentsMd()` | Add 3 conventions to AGENTS.md output |
| EDIT | `src/pi-skills/joycraft-implement.md` | Add type-stub warning |
| EDIT | `src/claude-skills/joycraft-implement.md` | Mirror type-stub warning |
| EDIT | `src/codex-skills/joycraft-implement.md` | Mirror type-stub warning |
| EDIT | `src/pi-skills/joycraft-decompose.md` | Add `## External API Contract` to spec template |
| EDIT | `src/claude-skills/joycraft-decompose.md` | Mirror API contract section |
| EDIT | `src/codex-skills/joycraft-decompose.md` | Mirror API contract section |
| REGENERATE | `src/bundled-files.ts` | Updated skill content |

## Approach

### AGENTS.md additions (3 conventions)

Add to the Behavioral Boundaries section of the generated AGENTS.md:

```markdown
### External API Safety
- Read official docs and type definitions before writing code against a third-party SDK
- Add third-party SDKs as devDependencies so typecheck runs against real types, not stubs
- Critical integration paths should have a smoke test that validates against the real runtime
```

### Implement skill addition (type-stub warning)

Add to `joycraft-implement.md` Step 2 area (before the TDD loop):

```markdown
### Before writing code against an external API:

⚠️ If the spec references a third-party SDK or package, read its official documentation and type definitions FIRST. Never write a `declare module` stub for a package that actually exists — use the real package as a devDependency instead. The stub will make typecheck pass but the code will fail at runtime.
```

### Decompose skill addition (API contract section)

Add to the spec template in Step 5, after `## Why` and before `## Acceptance Criteria`:

```markdown
## External API Contract

_Include this section ONLY when the spec touches a third-party SDK, package, or service API._

**Package:** `<npm-package-name>`

**Canonical sources:**
- <link to docs>
- <link to types>

**Key API facts (validated against vX.Y.Z):**
- <fact 1>
- <fact 2>
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Spec has no external API dependency | "External API Contract" section is omitted entirely |
| AGENTS.md already has custom user content | New conventions are appended, not overwritten |
| Pi-only project (no Claude or Codex) | Pi skill variants get the changes; others are irrelevant |
| User has customized their implement skill | Upgrade prompt shows diff; user can accept or reject |
