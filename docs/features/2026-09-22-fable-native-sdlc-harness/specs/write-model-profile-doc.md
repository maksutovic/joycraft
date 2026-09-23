---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-22
feature: 2026-09-22-fable-native-sdlc-harness
mode: checkpoint
---

# Write Model Profile Doc — Atomic Spec

> **Parent Brief:** `docs/features/2026-09-22-fable-native-sdlc-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-09-22
> **Estimated scope:** 1 session / 4 files / ~220 lines

---

## What

Add one reference document at `src/templates/reference/model-profile-claude-fable-5-1.md` carrying Anthropic's "Prompting Claude Fable 5.1" guidance as **named, greppable `##` block headings**, plus Theo Browne's two operator rules. This is the single home for Fable-5.1 model steering (D1); no other file duplicates its prose. Later specs cite it by path **and block name**: spec 4 wires citations into five skills, spec 11 gives optimize a model-profile evidence step.

The doc ships as an ordinary shared template entry. `src/templates/` is the bundle source; `scripts/generate-bundled-files.mjs` walks it with `readTreeDir(TEMPLATES_DIR, ['pi-extensions','pi-scripts','pi-agents'])` and emits the `TEMPLATES` record in `src/bundled-files.ts`; `src/bundle-inventory.ts` then vendors every `TEMPLATES` entry to `docs/templates/<path>` with `harness: 'shared'`. Nothing about this spec is harness-gated — spec 2 (a different cluster) adds per-harness gating and the `src/templates/reference/` enumeration test on top of a doc that already exists. This spec must not block on spec 2.

**The blocks to carry, by name** (the guide's blocks first, Theo's two last):

1. Finish the whole task — the autonomous-operation block plus the delivering-work block. Do not end a turn by describing the next step; do it.
2. Keep changes and tests to what the task asks — no extra tests, no unrequested refactors, no scope widening on open-ended asks.
3. Ask for user-facing progress updates — the model goes quiet through long tool chains unless told to narrate.
4. Mannered prose — long form and short form. Fable 5.1 prose runs dense.
5. Compaction retention — what must survive a context compaction.
6. Targeted edits over whole-file rewrites.
7. Batch independent tool calls.
8. Formatting when appropriate — replaces anti-formatting language with a when-appropriate rule.
9. End state of every prompt (Theo) — say where the work stops ("babysit until green then merge", "file the PR and tell me").
10. Paths to choose between (Theo) — give the model options rather than choosing for it.

Because `src/templates/` files reach **this repo's** `docs/templates/` only when the built updater runs (`pnpm build` alone leaves the new key in `src/bundled-files.ts` but absent from `docs/templates/` and `docs/.joycraft/manifest.json`), this spec includes the dogfood step: build, then run the built updater against this repo, and commit `docs/templates/reference/model-profile-claude-fable-5-1.md` in the same commit.

## Why

A Joycraft-installed CLAUDE.md gives Fable 5.1 no model-specific steering, so users get the silent-agent, stop-short, and scope-creep behaviors the guide documents tested fixes for. Duplicating those prompt blocks into every skill body is the exact drift the living-harness work removed, so one doc with stable block names is the only shape that lets five skills and optimize point at the same prose without copying it.

## Acceptance Criteria

- [ ] `src/templates/reference/model-profile-claude-fable-5-1.md` exists [src: D1]
- [ ] The doc contains a `## ` heading for each of the ten named blocks: finish the whole task, keep changes and tests to what the task asks, progress updates, mannered prose (covering both long and short forms), compaction retention, targeted edits, batched tool calls, formatting when appropriate, end state, choose between paths [src: brief "Raw Notes"]
- [ ] Every block heading is a stable, greppable `## ` heading that a later spec can cite verbatim as "path + block name" [src: D1]
- [ ] The formatting block states a when-appropriate rule and contains no blanket anti-formatting instruction such as "never use markdown" [src: brief "Raw Notes"]
- [ ] The doc names the model as Claude Fable 5.1 and says plainly that its guidance is model-specific, not universal [src: D1]
- [ ] The doc uses project-relative paths only — no `/Users/` and no `joycraft/src` string [src: brief "Hard Constraints"]
- [ ] `getBundleInventory()` yields an entry whose path is `docs/templates/reference/model-profile-claude-fable-5-1.md` [src: brief "Hard Constraints"]
- [ ] `docs/templates/reference/model-profile-claude-fable-5-1.md` exists in this repo and is byte-identical to the source template, landed by running the built updater on this repo in this spec's own commit [src: brief "Hard Constraints"]
- [ ] A new vitest file `tests/model-profile-template.test.ts` asserts the block-name roster, the reference-doc shape, the path hygiene, the bundle-key shape, and the installed-copy parity [src: brief "Test Strategy"]
- [ ] Build passes [src: brief "Test Strategy"]
- [ ] Tests pass [src: brief "Test Strategy"]

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| File exists | `existsSync(src/templates/reference/model-profile-claude-fable-5-1.md)` | unit |
| Reference-doc shape | content has an H1, a `> ` blockquote, and at least one `## ` section | unit |
| Ten named blocks | for each of the ten block names, a `## ` heading matching its regex is present | unit |
| Greppable headings | every block name resolves to exactly one `## ` heading (no duplicate or nested-only match) | unit |
| Formatting rule | the formatting block matches a when-appropriate phrasing and the whole doc does not match `/never use (markdown\|formatting)/i` outside a quoted anti-pattern sample | unit |
| Model named | content matches `/Fable 5\.1/` | unit |
| Path hygiene | content does not match `/\/Users\//` nor `/joycraft\/src/` | unit |
| Bundle key shape | `relative(TEMPLATES_DIR, doc)` normalizes to `reference/model-profile-claude-fable-5-1.md` | unit |
| Bundle inventory entry | `getBundleInventory(['claude'])` contains path `docs/templates/reference/model-profile-claude-fable-5-1.md` | unit |
| Installed-copy parity | `docs/templates/reference/model-profile-claude-fable-5-1.md` exists and its bytes equal the source template's | unit |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the ten-named-blocks test (`pnpm test tests/model-profile-template.test.ts`).

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test calls your actual function/endpoint — not a reimplementation or the underlying library
3. Identify your smoke test — it must run in seconds, not minutes, so you get fast feedback on each change

## Constraints

- MUST: keep one home per fact — this doc is the only home for Fable 5.1 guidance, and no skill body copies its prose [src: brief "Hard Constraints"]
- MUST: give every block a stable `## ` heading name, because spec 4 and spec 11 cite by path plus block name and a renamed heading breaks both [src: D1]
- MUST: land the installed copy at `docs/templates/reference/model-profile-claude-fable-5-1.md` in this same commit by running the built updater on this repo — `pnpm build` alone leaves the file out of `docs/templates/` and the manifest [src: brief "Hard Constraints"]
- MUST: use project-relative paths only, because the doc is copied verbatim into user projects where repo paths do not exist [src: brief "Hard Constraints"]
- MUST NOT: add a runtime dependency [src: brief "Hard Constraints"]
- MUST NOT: add harness gating, a `harness:` field, or a `src/templates/reference/` enumeration test — spec 2 owns both and this spec ships the doc as an ordinary shared template [src: brief "Decomposition"]
- MUST NOT: edit any file under `src/skills/` — spec 4 owns skill citations, so this spec triggers no bundle-variant regeneration or skill sync [src: brief "Decomposition"]
- MUST NOT: write a Codex variant of the doc [src: D6]
- MUST NOT: edit a user's CLAUDE.md or this repo's AGENTS.md — the pointer row is spec 3's and the hand cleanup is spec 12's [src: D5]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/reference/model-profile-claude-fable-5-1.md` | The profile doc — ten named `## ` blocks, reference-doc shape |
| Create | `tests/model-profile-template.test.ts` | Block roster, shape, path hygiene, bundle key, inventory entry, installed-copy parity |
| Modify | `src/bundled-files.ts` | Generated — gains the `reference/model-profile-claude-fable-5-1.md` key in `TEMPLATES` |
| Create | `docs/templates/reference/model-profile-claude-fable-5-1.md` | The dogfooded installed copy, byte-identical to the source |
| Modify | `docs/.joycraft/manifest.json` | Generated by the updater — records the new vendored file |

## Approach

Mirror the shape `src/templates/reference/output-style.md` already established: one `# ` H1, a `> ` purpose blockquote, then one `## ` section per block. Each block gets a one-paragraph statement of the behavior the model exhibits and the instruction that fixes it — stated as guidance the reading agent applies, not as a report about the guide. Keep the whole doc under roughly 200 lines so it stays inside optimize's own file budget.

No generator change is needed. `scripts/generate-bundled-files.mjs` calls `readTreeDir(TEMPLATES_DIR, ['pi-extensions','pi-scripts','pi-agents'])`, which walks `src/templates/` recursively, so the new file lands in `src/bundled-files.ts`'s `TEMPLATES` record as the key `reference/model-profile-claude-fable-5-1.md` with no edit to the script. Do not modify the generator.

Test file mirrors `tests/output-style-template.test.ts` closely, including its `section()` slicer idiom and its final installed-copy parity assertion, which is the one existing precedent for asserting `docs/templates/` parity in this repo.

Dogfood sequence at the end: `pnpm build`, then run the built updater against the repo root (`node dist/cli.js update . --yes`, confirming the flag set from `src/cli.ts` before running), then `git add` the new `docs/templates/` file and the manifest change alongside the source and test.

**Rejected alternative:** carrying each block inline in the five consuming skills and skipping the doc entirely. It removes one indirection but reintroduces exactly the multi-home drift the living-harness work removed, and it makes spec 11's optimize evidence step impossible to write, since there would be no single artifact to compare a user's legacy rules against.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A block name appears both as a `## ` heading and inside body prose | The test counts `## ` heading lines only, so the prose mention is harmless |
| Mannered prose has two forms (long and short) | One `## ` block covering both, with the two forms as sub-points — the roster test looks for the single heading |
| The doc quotes an anti-pattern such as "never use markdown" as a bad example | Allowed only inside a quoted or fenced sample; the normative-prose check strips fenced and quoted spans before asserting |
| The built updater reports no changes because the manifest already lists the file | Re-running is a no-op; verify the `docs/templates/` copy exists and matches, then continue |
| `pnpm build` is run but the updater is not | The installed-copy parity test fails — this is the intended guard against a half-done dogfood |
| Spec 2 lands first and adds harness gating | The doc still installs for claude, pi, and omp; this spec's inventory assertion is written against `['claude']`, which both orderings satisfy |
