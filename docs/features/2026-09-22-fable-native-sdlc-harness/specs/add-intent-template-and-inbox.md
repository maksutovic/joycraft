---
status: done
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: batch
---

# Add Intent Template and Inbox — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 6 files / ~200 lines

---

## What

The front door for work that does not begin with a developer running the interview skill. Three pieces land together:

1. **`src/templates/INTENT_TEMPLATE.md`** — the intent file shape, carrying exactly these sections: Author, Status, `source`, Problem, Proposed outcome, Affected users and systems, Constraints, Open questions. `source:` is a free-text field that accepts `human`, `interview`, `linear:<id>`, `alert:<name>`, and any future `<system>:<id>`. There is no schema and no validator — `src/frontmatter.ts` accepts arbitrary keys and has no production consumers, so an open `source:` needs zero code.
2. **`src/templates/intent/README.md`** — the inbox README. It states what an intent is, where intents go, and maps the AI-native-SDLC playbook's vocabulary onto Joycraft's existing artifact names: playbook **intent** → Joycraft **intent** (adopted, canonical), playbook **spec** → Joycraft **brief** (`docs/features/<slug>/brief.md`), playbook **plan** → Joycraft **design + atomic specs** (`docs/features/<slug>/design.md` plus `docs/features/<slug>/specs/`). No renaming of brief, design, or specs happens anywhere.
3. **Installer wiring** — a fresh install creates `docs/intent/` as a directory and lands the README inside it, and nothing else. This follows the existing `docs/backlog/README.md` pattern exactly: `freshBacklogEntry()` in `src/update-inventory.ts:230` emits a `create-once` / `managed` inventory entry guarded on `input.freshInstall` and on the path not already existing, and `materializeFreshInstallInventory()` at `src/update-inventory.ts:496` lists `'docs/context'` and `'docs/backlog'` in the `directories` array that `src/update.ts:883` later `mkdirSync`s after a successful apply.

`src/folder-map.ts` also gains one `KNOWN_DESCRIPTIONS` row for `'docs/intent/'` so the generated architecture map names the folder instead of emitting `FOLDER_MAP_PLACEHOLDER` for it.

Note the two-path delivery, which is easy to conflate: the **template** reaches users at `docs/templates/INTENT_TEMPLATE.md` through the generated `TEMPLATES` record (every file under `src/templates/` becomes a bundle key whose install path is `docs/templates/<key>`), while the **inbox README** is a separate installer-authored entry at `docs/intent/README.md`. The README's content therefore lives in `src/templates/intent/README.md` as the editable source and is referenced by the installer, mirroring how `BACKLOG_README` is an exported constant in `src/update-inventory.ts`. Implementer's choice between an exported constant and an import from the bundled record; the constant form is the established idiom and is preferred.

## Why

Today only a developer running `joycraft-interview` can start the pipeline, and it creates a feature folder on the spot. A customer bug, a PM idea, a Linear ticket, or an alert-driven agent has nowhere to land before a human commits to a slug. Specs 6, 7, and 8 all write to, list, or read from `docs/intent/`, so the folder, its README, and the file shape must exist before any of them can run.

## Acceptance Criteria

- [ ] `src/templates/INTENT_TEMPLATE.md` exists and carries, in order, the sections Author, Status, `source`, Problem, Proposed outcome, Affected users and systems, Constraints, Open questions [src: brief "Decomposition"]
- [ ] The template documents `source:` as accepting `human`, `interview`, `linear:<id>`, `alert:<name>`, and any future `<system>:<id>`, and states in prose that no schema or validator exists [src: brief "Hard Constraints"]
- [ ] No frontmatter validator, schema file, or `src/frontmatter.ts` change ships with this spec [src: brief "Out of Scope"]
- [ ] `src/templates/intent/README.md` exists and maps intent to intent, spec to Joycraft's brief at `docs/features/<slug>/brief.md`, and plan to Joycraft's design plus atomic specs at `docs/features/<slug>/design.md` and `docs/features/<slug>/specs/` [src: D2]
- [ ] The README renames nothing: the strings `brief`, `design`, and `specs` keep their current Joycraft meanings and no instruction anywhere tells a reader to rename them [src: brief "Out of Scope"]
- [ ] A fresh install creates `docs/intent/` and writes `docs/intent/README.md` into it, and creates no other file under `docs/intent/` [src: brief "Success Criteria"]
- [ ] `'docs/intent'` appears in `MaterializedInventory.setup.directories` on a fresh install alongside `'docs/context'` and `'docs/backlog'` [src: brief "Success Criteria"]
- [ ] Re-running the updater on a project that already has `docs/intent/README.md` writes nothing to that path and reports no conflict [src: brief "Success Criteria"]
- [ ] `src/folder-map.ts` `KNOWN_DESCRIPTIONS` gains one `'docs/intent/'` row with a one-line description, and the total row output still respects the thirty-row `MAX_ROWS` cap [src: brief "Raw Notes"]
- [ ] The installed copy of the new template lands at this repo's `docs/templates/INTENT_TEMPLATE.md` in the same commit, produced by running the built updater on this repo — not by `pnpm build` alone [src: brief "Hard Constraints"]
- [ ] Intent files live at `docs/intent/*.md`, outside `docs/features/**/specs/` and `docs/bugfixes/`, so `tests/status-migration.test.ts` still passes unchanged [src: brief "Success Criteria"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Template sections | `tests/intent-template.test.ts` asserts `src/templates/INTENT_TEMPLATE.md` contains each of the eight section headings in order | unit |
| Open `source` field | Same file asserts the template text names `human`, `interview`, `linear:<id>`, and `alert:<name>` and contains no JSON-schema block | unit |
| README vocabulary map | Same file asserts `src/templates/intent/README.md` contains `docs/features/`, `brief.md`, `design.md`, and `specs/` | unit |
| Inventory entry shape | `tests/update-inventory.test.ts` — extend the existing `materializeFreshInstallInventory` case to find the `docs/intent/README.md` entry and assert `kind === 'create-once'` and `ownership === 'managed'` | unit |
| Directory setup | Same test asserts `result.setup.directories` contains `'docs/intent'` | unit |
| Idempotent re-run | New case in `tests/update-inventory.test.ts`: pre-create `docs/intent/README.md` in the temp project, assert no entry for that path is materialized | unit |
| Folder-map row | `tests/folder-map.test.ts` — temp tree containing `docs/intent/` renders a described row, not the placeholder | unit |
| Guarded paths untouched | `tests/status-migration.test.ts` passes unchanged (no intent path enters its walk of `docs/features` and `docs/bugfixes`) | regression |
| No absolute paths | `tests/intent-template.test.ts` asserts neither new file matches `/Users/` or `joycraft/src` | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the template-sections test (`pnpm test tests/intent-template.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: pause for human approval before the first write to any file under `src/templates/`, because template content is an ask-first boundary [src: brief "Execution Strategy"]
- MUST: land the installed `docs/templates/INTENT_TEMPLATE.md` copy in the same commit by running the built updater on this repo; `pnpm build` alone leaves the new template present in `src/bundled-files.ts` but absent from `docs/templates/` and from `docs/.joycraft/manifest.json` [src: brief "Hard Constraints"]
- MUST: keep `source:` open-ended — any `<system>:<id>` value is legal without a code change [src: brief "Hard Constraints"]
- MUST NOT: add a frontmatter validator, a schema, or any consumer of `source:` [src: brief "Out of Scope"]
- MUST NOT: add a `joycraft intent` CLI command or any new CLI surface [src: brief "Out of Scope"]
- MUST NOT: rename brief, design, or specs, or add an alias that shadows those names [src: brief "Out of Scope"]
- MUST NOT: add runtime dependencies [src: brief "Hard Constraints"]
- MUST NOT: reference absolute paths in the template or the README — they are copied into user projects where those paths are dead [src: brief "Hard Constraints"]
- MUST NOT: write any file under `docs/intent/` other than `README.md` at install time [src: brief "Success Criteria"]
- MUST NOT: edit any file under `src/skills/` in this spec; skill changes belong to specs 6, 7, and 8 [src: brief "Decomposition"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/INTENT_TEMPLATE.md` | The eight-section intent file shape with the open `source:` field documented |
| Create | `src/templates/intent/README.md` | Inbox README; playbook-to-Joycraft vocabulary map |
| Modify | `src/update-inventory.ts` | `INTENT_README` constant (or bundled-record reference), `freshIntentEntry()` modeled on `freshBacklogEntry()`, `'docs/intent'` added to the fresh-install `directories` list, and the entry pushed in `materializeFreshInstallInventory()` |
| Modify | `src/folder-map.ts` | One `KNOWN_DESCRIPTIONS` row: `'docs/intent/': 'Intent inbox — incoming work before a feature slug exists'` |
| Modify | `src/bundled-files.ts` | Regenerated: `TEMPLATES` gains `INTENT_TEMPLATE.md` and `intent/README.md` (generated file — produced by `scripts/generate-bundled-files.mjs`, never hand-edited) |
| Create | `docs/templates/INTENT_TEMPLATE.md` | Dogfood installed copy, produced by running the built updater on this repo |
| Create | `docs/templates/intent/README.md` | Dogfood installed copy, same run |
| Modify | `docs/.joycraft/manifest.json` | Same updater run records the two new vendor files with their hashes |
| Create | `tests/intent-template.test.ts` | Template and README shape assertions |
| Modify | `tests/update-inventory.test.ts` | Intent entry shape, directories list, and idempotent-re-run cases |
| Modify | `tests/folder-map.test.ts` | Described-row case for `docs/intent/` |

## Approach

Add the two template files under `src/templates/` first (after approval), regenerate with `pnpm sync-skills` so the `TEMPLATES` record picks them up, then mirror `freshBacklogEntry()` for the inbox README and append `'docs/intent'` to the fresh-install `directories` array. Model the installer entry on `freshBacklogEntry()` and on the `directories` list in `materializeFreshInstallInventory()` rather than inventing a second folder-creation mechanism: the entry is `kind: 'create-once'` with `ownership: 'managed'`, suppressed when `docs/intent/README.md` already exists as a regular file or as any other path entry. Keep the README's authored text as an exported constant next to `BACKLOG_README` so the inventory module stays self-contained and the test can compare against the exported value the way `tests/update-inventory.test.ts:90` already compares against `BACKLOG_README`. Finally run the built updater on this repo to land the `docs/templates/` copies and the manifest rows.

Rejected alternative: creating `docs/intent/` lazily from the skills at first use, with no installer change. That would satisfy spec 6 alone but fails the Success Criterion that the folder exists with a README immediately after install, and it would leave an inbox with no explanation of what belongs in it for the PM or on-call engineer who never runs a skill.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `docs/intent/` already exists as a directory with user files | Directory preserved; README written only if absent; no user file touched |
| `docs/intent` exists as a regular file, not a directory | Preserved untouched, with a diagnostic, exactly as `materializeFreshInstallInventory` already handles `docs/context` and `docs/backlog` |
| `docs/intent/README.md` exists and was customized | No write, no conflict — `create-once` semantics |
| Upgrade (not fresh install) of an older project | The `freshInstall` guard suppresses the entry, matching `docs/backlog/README.md`; existing projects gain the inbox on their next fresh-install path only |
| Folder map already at the thirty-row cap | `walkFolders` caps as it does today; the new description row changes wording, never row count |
| `docs/intent/*.md` files accumulate | `tests/status-migration.test.ts` never walks them — its roots are `docs/features` and `docs/bugfixes` only |
| A reader expects `docs/intent/**` collapsed in PR review | Not added to `src/gitattributes.ts`. Intents are human-authored idea capture like `docs/backlog/`, which is deliberately excluded from the generated-file list |
