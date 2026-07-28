---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-27
feature: 2026-07-27-human-readable-output-style
mode: batch
---

# Document Repo-Local Style Guidance — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md`
> **Status:** Ready
> **Date:** 2026-07-27
> **Estimated scope:** 1 session / 1 file edited / ~20 lines added

---

## What

Add a short section to `docs/reference/skill-authoring.md` covering the
Joycraft-repo-only concern that the shipped style doc must not carry: the path
asymmetry between this repo and a user project. Joycraft reads reference docs at
`docs/reference/`, while a scaffolded user project receives the same content at
`docs/templates/reference/`. A skill author editing `src/skills/` must cite the
path that resolves in the *user's* project, not the one that resolves here.

This is the repo-local half of D1. `docs/reference/skill-authoring.md` is not in
`src/templates/` and is not a `TEMPLATES` key, so it never ships to users — which
is exactly why this guidance belongs there.

## Why

Without it, the single most likely authoring mistake has no written home: a skill
that cites `docs/reference/output-style.md` works when tested inside this repo
and is a dead pointer in every project Joycraft scaffolds.

## Acceptance Criteria

- [ ] `docs/reference/skill-authoring.md` gains a section covering the `docs/reference/` vs `docs/templates/reference/` path asymmetry. [src: D1]
- [ ] The section states that skills must cite the user-project path `docs/templates/reference/<name>.md`. [src: D1]
- [ ] The section states the motivation — a repo-local path is a dead pointer in a scaffolded project. [src: D1]
- [ ] The addition matches the existing file's shape: the rule, why it matters, and a worked example. [src: design §3 "Pattern 4"]
- [ ] `docs/reference/skill-authoring.md` remains outside `src/templates/` and is not added to `TEMPLATES`. [src: D1]
- [ ] No content is removed from the existing file. [src: design §3 "Pattern 4"]
- [ ] `pnpm test --run` passes. [src: brief "Success Criteria"]
- [ ] `pnpm typecheck` passes. [src: brief "Success Criteria"]

## Test Plan

This spec edits a repo-internal doc with no code path and no shipped surface. It
carries no new assertions; the existing suite must stay green.

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| File still not bundled | `pnpm test --run bundled-files` — the bundle key set must be unchanged | unit |
| Templates suite unaffected | `pnpm test --run templates` | unit |
| Whole suite green | `pnpm test --run` | integration |
| Types green | `pnpm typecheck` | unit |

**Execution order:**

1. Run `pnpm test --run` and record a green baseline.
2. Make the edit.
3. Run `pnpm test --run && pnpm typecheck` — still green. A repo-internal doc
   edit must not move the bundle; if a bundle test moves, the file was added to
   `src/templates/` by mistake and that is the real finding.

**Smoke test:** `pnpm test --run bundled-files` — directly catches the one way
this spec can go wrong (the doc leaking into the shipped bundle).

**Before implementing, verify your test harness:**

1. Run the suite BEFORE the edit and confirm green, so any change is
   attributable.
2. Confirm the bundle test actually enumerates bundle keys rather than only
   checking the file parses — otherwise it cannot catch an accidental addition.
3. Identify your smoke test — the bundled-files suite, seconds not minutes.

## Constraints

- MUST edit `docs/reference/skill-authoring.md`. [src: D1]
- MUST state the rule, its motivation, and a worked example, matching the file's existing shape. [src: design §3 "Pattern 4"]
- MUST keep this guidance repo-local. [src: D1]
- MUST NOT add `docs/reference/skill-authoring.md` to `src/templates/` or to the `TEMPLATES` record. [src: D1]
- MUST NOT put this path-asymmetry guidance into `src/templates/reference/output-style.md` — that file ships to users, who do not have this problem. [src: D1]
- MUST NOT remove or rewrite the existing PROTOCOL-vs-JUDGMENT content, which `tests/retrieval-pass-skill.test.ts` depends on indirectly. [src: brief "Hard Constraints"]
- MUST NOT edit any file under `src/skills/`. [src: brief "Hard Constraints"]
- MUST NOT add any runtime dependency. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `docs/reference/skill-authoring.md` | Append a section on the reference-doc path asymmetry: cite `docs/templates/reference/<name>.md` in skills, with motivation and a worked wrong-vs-right example. |

## Approach

Append rather than restructure. The file is ~26 lines across four headings and
its current scope is the PROTOCOL-vs-JUDGMENT step-labeling rule; this adds a
second authoring rule alongside it without touching the first.

Match the established shape — the rule, "Why This Matters," and a worked example.
The worked example is the highest-value part here, because the mistake is a
one-character-class difference that reads as correct:

- Wrong: a skill citing `docs/reference/output-style.md` — resolves in this repo,
  dead in every scaffolded project.
- Right: a skill citing `docs/templates/reference/output-style.md` — resolves in
  a user project, which is where shipped skills actually run.

Worth noting in the section itself: this file is the live cautionary precedent
for its own subject. No skill links to `skill-authoring.md`, so its guidance only
reaches an author who already knows to look. That is an argument for keeping the
addition short and concrete rather than expansive — a long section here is a long
section nobody reads.

**Rejected alternative:** putting the path-asymmetry guidance in the shipped
`output-style.md`. Rejected by D1 — the consumer of the library should not absorb
Joycraft's own self-hosting quirk. A user project has exactly one reference path
and no asymmetry to reason about.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| The guidance seems useful to users too | It is not. A user project has one reference path. Shipping it adds confusion about a problem they do not have. |
| A bundle test moves after the edit | The file was added to `src/templates/` by mistake. Revert that; the doc stays repo-local. |
| The existing PROTOCOL content seems worth rewriting | Out of scope. `retrieval-pass-skill.test.ts` greps for `PROTOCOL` in a windowed section; leave it alone. |
| The section starts growing past ~20 lines | Cut it back. A doc no skill cites earns its keep by being short and findable, not thorough. |
| The worked example needs a real skill name | Use one of the eleven pointer-carrying skills; they are the concrete case this rule governs. |
