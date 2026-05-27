# Wire Pi Upgrade — Atomic Spec

> **Parent Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Status:** Complete
> **Date:** 2026-05-27
> **Estimated scope:** 1 session / 1 file modified / ~15 lines

---

## What

The `upgrade.ts` `getManagedFiles()` function is extended to include Pi skill files, pipeline scripts, the extension, and subagent definitions. This makes `npx joycraft upgrade` track, hash-compare, and update Pi managed files using the exact same mechanism already in place for Claude and Codex skills.

## Why

Without upgrade wiring, Pi skills and pipeline assets become stale — users on older Joycraft versions never get updated Pi skills, bugfixes to the pipeline extension, or improvements to the bash scripts. The upgrade infrastructure already exists; this spec just adds Pi files to the managed set.

## Acceptance Criteria

- [ ] `getManagedFiles()` returns Pi skill entries (`.pi/skills/<name>/SKILL.md`) alongside Claude and Codex entries
- [ ] `getManagedFiles()` returns Pi pipeline script entries (`.pi/scripts/joycraft/*`)
- [ ] `getManagedFiles()` returns Pi extension entry (`.pi/extensions/joycraft-pipeline.ts`)
- [ ] `getManagedFiles()` returns Pi subagent definition entries (`.pi/agents/joycraft-*.md`)
- [ ] Pi managed files are hash-compared during upgrade (auto-update unmodified, prompt for customized)
- [ ] Pi managed files are written to `.joycraft-version` during both init and upgrade
- [ ] Upgrade summary includes Pi file counts (updated/skipped/added)
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Pi skills in managed files | Call `getManagedFiles()`, assert keys include `.pi/skills/joycraft-tune/SKILL.md` | unit |
| Pi scripts in managed files | Assert keys include `.pi/scripts/joycraft/joycraft-next-spec` | unit |
| Pi extension in managed files | Assert keys include `.pi/extensions/joycraft-pipeline.ts` | unit |
| Pi agents in managed files | Assert keys include `.pi/agents/joycraft-researcher.md` and `joycraft-verifier.md` | unit |
| Upgrade updates unmodified Pi files | Init project, run upgrade with updated skill content — assert Pi file updated | integration |
| Upgrade prompts for customized Pi files | Init project, modify a Pi skill, run upgrade (no --yes) — assert prompt | integration |
| Upgrade --yes overwrites customized | Same as above with --yes — assert file overwritten without prompt | integration |
| Version hashing includes Pi | Read `.joycraft-version` after upgrade, assert Pi paths present with correct hashes | integration |

**Execution order:**
1. Write unit test for `getManagedFiles()` — assert Pi entries exist
2. Run test to confirm it fails (red) — no Pi entries yet
3. Add PI_SKILLS, PI_SCRIPTS, PI_EXTENSION, PI_AGENTS imports to upgrade.ts
4. Add Pi entries to `getManagedFiles()` return value
5. Write integration tests for upgrade flow
6. Run all tests until green

**Smoke test:** `getManagedFiles()` unit test — pure function, instant, no file I/O.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: Follow the existing pattern — Pi entries are added to the same `Record<string, string>` returned by `getManagedFiles()`
- MUST: Relative paths use forward slashes (cross-platform) — consistent with existing entries
- MUST: Pi skills use the `PI_SKILLS` export (already available after spec 1)
- MUST: Pi scripts, extension, and agent defs must also be exported from bundled-files or a similar template mechanism (added in spec 3)
- MUST: The hash comparison logic (`upgrade.ts` lines ~120-160) requires no changes — it operates on `managedFiles` generically
- MUST NOT: Add Pi-specific upgrade logic branches — the existing generic `kind: 'new' | 'updated' | 'customized'` flow handles Pi files automatically
- MUST NOT: Create a separate Pi upgrade command

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| MODIFY | `src/upgrade.ts` | Import `PI_SKILLS` (and pipeline runtime exports from spec 3), add Pi entries to `getManagedFiles()` |

## Approach

The change is purely additive to `getManagedFiles()`:

```typescript
function getManagedFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  // ... existing SKILLS, TEMPLATES, CODEX_SKILLS loops ...

  // Pi skills
  for (const [name, content] of Object.entries(PI_SKILLS)) {
    const skillName = name.replace(/\.md$/, '');
    files[join('.pi', 'skills', skillName, 'SKILL.md')] = content;
  }

  // Pi pipeline runtime (scripts, extension, agents)
  for (const [name, content] of Object.entries(PI_SCRIPTS)) {
    files[join('.pi', 'scripts', 'joycraft', name)] = content;
  }
  for (const [name, content] of Object.entries(PI_EXTENSIONS)) {
    files[join('.pi', 'extensions', name)] = content;
  }
  for (const [name, content] of Object.entries(PI_AGENTS)) {
    files[join('.pi', 'agents', name)] = content;
  }

  return files;
}
```

The existing upgrade logic (hash comparison, auto-update for unmodified, prompt for customized) handles all of these identically to Claude and Codex skills — no new logic required.

**Rejected alternative:** Separate `getPiManagedFiles()`. Unnecessary fragmentation — Pi files are just another category of managed files with the same lifecycle.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User never ran init for Pi (no `.pi/` dir) | `upgrade` creates Pi files as `kind: 'new'` — same as any new managed file |
| User deleted `.pi/skills/` manually | `upgrade` creates them as `kind: 'new'` — hash comparison sees missing file |
| User customized a Pi skill | `upgrade` detects hash mismatch vs. installed hash, prompts (or auto-accepts with --yes) |
| `PI_SKILLS` not yet exported (spec 1 not merged) | Build fails — this is expected and resolved by executing specs in dependency order |
| Pipeline runtime exports not yet available (spec 3 not merged) | Build fails — resolved by dependency ordering |
