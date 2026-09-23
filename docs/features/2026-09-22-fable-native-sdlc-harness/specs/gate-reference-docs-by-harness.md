---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Gate Reference Docs By Harness — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 4 files / ~120 lines

---

## What

Today every key of the bundled `TEMPLATES` record becomes one unconditional
inventory entry in `src/bundle-inventory.ts`:

```ts
...Object.entries(TEMPLATES).map(([path, content]) => vendor(`docs/templates/${path}`, 'shared', content)),
```

`'shared'` means "install regardless of selection". Per-harness gating exists
only for skill and hook trees, through the `if (wants('claude'))` /
`if (wants('pi'))` blocks further down the same function. There is no way for a
single template file to say "install me only for these harnesses".

This spec adds that ability with the smallest possible change: a path-keyed
gate table inside `src/bundle-inventory.ts` mapping a `TEMPLATES` key to the
harness list that receives it. Keys absent from the table keep today's
unconditional `'shared'` behavior byte-for-byte. The table's first and only
entry is `reference/model-profile-claude-fable-5-1.md` gated to
`['claude', 'pi', 'omp']`.

The profile doc itself is added by spec 1 (`write-model-profile-doc`), which
creates `src/templates/reference/model-profile-claude-fable-5-1.md`. The
generator `scripts/generate-bundled-files.mjs` walks `src/templates/` via
`readTreeDir(TEMPLATES_DIR, ['pi-extensions', 'pi-scripts', 'pi-agents'])`, so
that file enters `TEMPLATES` under the key
`reference/model-profile-claude-fable-5-1.md` automatically and installs at
`docs/templates/reference/model-profile-claude-fable-5-1.md`.

**Ordering decision (stated, not left open):** this spec lands the gating
mechanism with the entry keyed by that path **before** the file necessarily
exists. That is safe and verified: the entries list is built by mapping over
`Object.entries(TEMPLATES)`, so a gate-table key with no matching `TEMPLATES`
key contributes nothing — no entry, no error, no manifest row. The gate table
is a filter over what the record already contains, never a source of paths. The
spec's own tests therefore cover both states: a synthetic-key test proves an
unmatched gate key is inert, and the enumeration test asserts the real file
once spec 1 has landed it.

Also added: an enumeration guard for `src/templates/reference/`, modeled on
`tests/reference-templates.test.ts` (which today hard-codes an exhaustive list
for `src/templates/context/reference/` only).

## Why

D6 keys the profile doc to the model, not the harness: Pi and omp users run
Claude models and must receive it; Codex users never run a Claude model and
must not. Without a gating mechanism the doc would install into every Codex
project as dead weight and would appear in the Codex install manifest, making
a later removal a user-visible delete. The brief marks this a Hard Constraint
and states plainly that D6 needs an installer change, not a config line.

## Acceptance Criteria

- [ ] `getBundleInventory` accepts a per-template harness gate so a single `TEMPLATES` key can declare which harnesses receive it [src: brief "Hard Constraints"]
- [ ] `docs/templates/reference/model-profile-claude-fable-5-1.md` is present in `getBundleInventory(['claude'])`, `getBundleInventory(['pi'])`, and `getBundleInventory(['omp'])` [src: D6]
- [ ] That path is absent from `getBundleInventory(['codex'])` and from `getBundleInventory(['copilot'])` [src: D6]
- [ ] That path is present in `getBundleInventory(['claude','codex'])` — a mixed selection that includes an eligible harness still receives it [src: D6]
- [ ] Every other `TEMPLATES` key keeps `harness: 'shared'` and installs for every selection exactly as before this change [src: brief "Hard Constraints"]
- [ ] `tests/bundle-inventory.test.ts`'s existing assertion `entries.every((entry) => entry.harness === 'shared' || entry.harness === harness)` still passes — gated template entries carry a single harness value that satisfies it [src: brief "Test Strategy"]
- [ ] A new enumeration test asserts the exact file list of `src/templates/reference/`, modeled on `tests/reference-templates.test.ts` [src: brief "Decomposition"]
- [ ] An integration test drives the updater into a temp dir with `harnesses: ['codex']` and asserts with `existsSync` that `docs/templates/reference/model-profile-claude-fable-5-1.md` was not written [src: brief "Test Strategy"]
- [ ] An integration test drives the updater into a temp dir with `harnesses: ['pi']` and asserts with `existsSync` that the same path was written [src: brief "Test Strategy"]
- [ ] `pnpm build` passes [src: brief "Test Strategy"]
- [ ] `pnpm test` and `pnpm typecheck` pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Eligible harnesses receive it | `getBundleInventory(['claude'])`, `(['pi'])`, `(['omp'])` each contain `docs/templates/reference/model-profile-claude-fable-5-1.md` — `tests/bundle-inventory.test.ts` | unit |
| Codex/copilot excluded | `getBundleInventory(['codex'])` and `(['copilot'])` do not contain that path — `tests/bundle-inventory.test.ts` | unit |
| Mixed selection | `getBundleInventory(['claude','codex'])` contains it — `tests/bundle-inventory.test.ts` | unit |
| Ungated templates unchanged | every other `TEMPLATES` key still yields `harness: 'shared'`; `docs/templates/output/README.md` present for all five single-harness selections — `tests/bundle-inventory.test.ts` | unit |
| Unmatched gate key is inert | a gate entry for a synthetic key not in `TEMPLATES` adds no entry and throws nothing — `tests/bundle-inventory.test.ts` | unit |
| Existing single-harness invariant | the existing `harness === 'shared' \|\| harness === harness` loop still passes — `tests/bundle-inventory.test.ts` | unit |
| Enumeration guard | `src/templates/reference/` contains exactly the expected `.md` files; each maps to a `reference/<name>.md` bundle key — new `tests/model-profile-template.test.ts` | unit |
| Codex-only install omits the file | `update(dir, { nonInteractive: true, harnesses: ['codex'] })` into a temp dir; `existsSync(join(dir,'docs/templates/reference/model-profile-claude-fable-5-1.md'))` is `false` — new `tests/model-profile-template.test.ts` | integration |
| Pi-only install writes the file | same with `harnesses: ['pi']`; `existsSync` is `true` — new `tests/model-profile-template.test.ts` | integration |
| Adding a harness installs it | codex-only install, then `update(dir, { nonInteractive: true, harnesses: ['codex','claude'] })`; `existsSync` flips to `true` — new `tests/model-profile-template.test.ts` | integration |
| Removing eligible harnesses deletes it | pi-only install, then update with `harnesses: ['codex']`; the file is gone and the manifest carries no row for it — new `tests/model-profile-template.test.ts` | integration |
| Manifest records ownership | after a claude install, `readInstallationManifest(dir).files['docs/templates/reference/model-profile-claude-fable-5-1.md'].ownership === 'verified'` — new `tests/model-profile-template.test.ts` | integration |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the eligible/excluded unit pair (`pnpm test tests/bundle-inventory.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep the gate table inside `src/bundle-inventory.ts`, keyed by `TEMPLATES` key (the path relative to `src/templates/`), so the mechanism has one home [src: brief "Hard Constraints"]
- MUST: leave every un-gated template entry byte-identical to today — same path, same `harness: 'shared'`, same `kind: 'vendor'`, same content [src: brief "Success Criteria"]
- MUST: emit one entry per gated template per eligible selection with a single harness value, never an array on the `harness` field, so `tests/bundle-inventory.test.ts`'s single-harness invariant holds [src: brief "Test Strategy"]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]
- MUST NOT: reference an absolute path in the gate table or in the new template file [src: brief "Hard Constraints"]
- MUST NOT: gate skill, hook, or script trees — those already have their own `wants(...)` blocks and are out of scope here [src: brief "Decomposition"]
- MUST NOT: create a Codex variant of the profile doc [src: D6]
- MUST NOT: touch the holdout scenarios repo or its dispatch workflow [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/bundle-inventory.ts` | Add a `TEMPLATE_HARNESS_GATES: Record<string, readonly Harness[]>` table and replace the unconditional `Object.entries(TEMPLATES).map(...)` line with a gate-aware `flatMap` that emits one entry per eligible selected harness and keeps `'shared'` for ungated keys |
| Modify | `tests/bundle-inventory.test.ts` | Cases for eligible/excluded/mixed selections, ungated-template invariance, and the inert unmatched-gate-key case |
| Create | `tests/model-profile-template.test.ts` | Enumeration guard for `src/templates/reference/` plus the temp-dir updater integration cases (codex omits, pi writes, add-harness installs, remove-harness deletes, manifest ownership) |
| Modify | `docs/features/2026-09-22-fable-native-sdlc-harness/specs/gate-reference-docs-by-harness.md` | Status bump to `in-review` at wrap-up |

## Approach

Add a module-level constant beside the existing `vendor` / `createOnce` /
`patch` helpers:

```ts
const TEMPLATE_HARNESS_GATES: Record<string, readonly Harness[]> = {
  'reference/model-profile-claude-fable-5-1.md': ['claude', 'pi', 'omp'],
};
```

Then replace the template line in `getBundleInventory` with a `flatMap`: for a
key absent from the table, emit today's single `vendor(..., 'shared', ...)`
entry unchanged; for a gated key, emit one `vendor(..., harness, ...)` entry
for each gate harness that is also in `selected`, and nothing when the
intersection is empty. Because a gated path can produce several entries when
several eligible harnesses are selected, they land in the planner's existing
duplicate-payload group: identical content normalizes to one target, which the
planner already handles via its `payloads.some(value => normalized(value) !==
normalized(payloads[0]))` check. To sidestep that path entirely and keep the
plan one-entry-per-path, deduplicate at emit time: pick the first eligible
harness in canonical `HARNESSES` order as the entry's `harness` value and emit
exactly one entry. That keeps the single-harness invariant, keeps ownership
attribution meaningful, and leaves the planner untouched.

An unmatched gate key is inert by construction: the entries list is built by
mapping over `Object.entries(TEMPLATES)`, so the table only ever filters keys
the record already contains. A key with no matching template contributes no
entry and raises nothing, which is what lets this spec land before spec 1.

Harness-removal cleanup needs no new code. When a path leaves the inventory,
the loop over `input.manifest.files` in `src/update-plan.ts` already emits a
selected `delete` for a file whose hash still matches its verified vendor
hash, and an unselected `orphan` for one the user edited; either way the
manifest row is dropped. Manifest recording likewise falls out of the existing
`addFile` path: an eligible selection records the doc with
`ownership: 'verified'`, and a codex-only selection never creates a row at
all, so there is nothing to delete later.

Keep `recognizedHarnesses` (`src/update.ts:275`) correct while implementing:
it filters `getBundleInventory(HARNESSES)` by `entry.harness === harness` to
detect a legacy install, so a gated template must not become the only
detection signal for a harness. Emitting the gated entry under the first
eligible harness in canonical order keeps every harness's skill tree ahead of
it in that scan.

**Rejected alternative:** widening `BundleEntryHarness` to accept an array
(`Harness[] | 'shared'`). It reads cleaner but breaks the existing
`entry.harness === harness` comparisons in `tests/bundle-inventory.test.ts`,
`recognizedHarnesses` (`src/update.ts:275`), and
`selectedHarnessIgnoreWarning` (`src/update.ts:542`), turning a contained
change into a type migration across the updater.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Gate table key not present in `TEMPLATES` (spec 1 not yet landed) | No entry emitted, no error; every other template installs normally |
| Selection is `['codex']` only | Path absent from the inventory, from the plan, and from the manifest — nothing to delete because nothing was ever recorded |
| Selection is `['claude','pi','omp']` | Exactly one entry for the path, `harness: 'claude'` (first in canonical order), one manifest row |
| Existing codex-only install adds `claude` | Path enters the inventory as a `create` action; file written; manifest row added |
| Existing pi install drops to codex-only, file unmodified | Planner's verified-hash branch emits a selected `delete`; file removed; manifest row dropped |
| Existing pi install drops to codex-only, file locally edited | Planner emits an unselected `orphan`; user's bytes preserved; manifest row dropped |
| No harness selection recorded at all (`getBundleInventory()` default) | Defaults to every harness, so the gated path is included — matches today's compatibility default |
| Gate list contains a harness not in `HARNESSES` | Type error at compile time; `Harness` typing prevents it reaching runtime |
| A second gated template is added later | Only the table grows; `getBundleInventory` needs no further change |
| Gate table key not present in `TEMPLATES` while spec 1 is still in flight | The mechanism lands green: no entry, no error, every other template unaffected |
| Codex-only install later adds an eligible harness | The path enters the inventory and installs on that update, with a fresh manifest row |
| Eligible harnesses all removed from a selection | Unmodified file deleted and its manifest row dropped; locally edited file preserved as an orphan |
