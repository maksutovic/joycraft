---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-27
feature: 2026-07-27-human-readable-output-style
mode: checkpoint
---

# Write Output Style Reference Doc — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md`
> **Status:** Ready
> **Date:** 2026-07-27
> **Estimated scope:** 1 session / 1 new file / ~80 lines

---

## What

Author a new bundled reference document at `src/templates/reference/output-style.md`
containing Joycraft's house style contract for human-facing output. The doc holds
between 6 and 10 rules, each stated positively (what to do, not a banned-phrase
list) and each accompanied by the motivation behind it. It closes with at least
one worked before/after example showing a real Joycraft output moment rewritten
under the rules.

The doc lives in `src/templates/reference/` so it serializes into the `TEMPLATES`
record and lands in scaffolded user projects at
`docs/templates/reference/output-style.md`. This spec creates the file only — it
does not regenerate the bundle, does not add tests, and does not edit any skill.

## Why

Without a single written contract, Joycraft's human-facing output moments have no
shared style. What exists today is four scattered near-duplicate directives
("report tersely", "End with a terse summary", "factual and thin", "1-2 pages
max") living in four different skill bodies, with no stated motivation and no
common home.

## Acceptance Criteria

- [ ] `src/templates/reference/output-style.md` exists. [src: D1]
- [ ] The doc contains between 6 and 10 rules inclusive. [src: D2]
- [ ] Every rule is framed positively — it states what to do rather than listing banned phrases or words. [src: D2]
- [ ] Every rule states the motivation behind it. [src: D2]
- [ ] The doc contains at least one worked before/after example. [src: D6]
- [ ] The doc scopes the contract to human-facing output moments and explicitly exempts agent-facing artifacts (specs, queue JSON, frontmatter, knowledge-layer rows, deny patterns). [src: design §4 "Scope the contract to human-facing output moments only"]
- [ ] The doc contains no rubric, no numeric self-scoring scale, and no instruction for the model to grade its own output. [src: design §4 "Do not add a rubric self-scoring loop"]
- [ ] The doc uses project-relative paths only — no `/Users/` and no `joycraft/src` references. [src: brief "Hard Constraints"]
- [ ] The doc contains no guidance specific to the Joycraft repo's own `docs/reference/` vs `docs/templates/reference/` path asymmetry. [src: D1]
- [ ] The doc follows the established reference-doc shape: an H1, a blockquote purpose line, and at least one `##` section. [src: design §3 "Pattern 4"]
- [ ] `pnpm test --run` passes. [src: brief "Success Criteria"]
- [ ] `pnpm typecheck` passes. [src: brief "Success Criteria"]

## Test Plan

This spec authors a content file; spec 2 (`test-output-style-template`) owns the
assertions against it. The work here is verified by the existing suite staying
green plus manual review of the doc against the criteria above.

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| File exists | `existsSync(src/templates/reference/output-style.md)` — asserted in spec 2 | unit |
| 6–10 rules | Rule-count assertion — asserted in spec 2 | unit |
| Worked example present | Before/after marker assertion — asserted in spec 2 | unit |
| Reference-doc shape | H1 + blockquote + `##` assertion — asserted in spec 2 | unit |
| Project-relative paths | `not.toMatch(/\/Users\//)` — asserted in spec 2 | unit |
| Existing suite unaffected | `pnpm test --run` | integration |
| Types unaffected | `pnpm typecheck` | unit |

**Execution order:**

1. This spec adds a content file with no code path, so there is no red-to-green
   cycle of its own. Run `pnpm test --run` first to confirm a green baseline.
2. Write the doc.
3. Run `pnpm test --run && pnpm typecheck` again — still green. A new content
   file under `src/templates/` must not break the existing suite; if it does,
   that failure is the real signal and must be understood before proceeding.

**Smoke test:** `pnpm test --run templates` — the templates suite is the one that
walks `src/templates/`, and it runs in seconds.

**Before implementing, verify your test harness:**

1. Run all tests — establish they pass BEFORE the change, so any post-change
   failure is attributable.
2. Confirm the templates test actually walks `src/templates/` recursively rather
   than reading a hardcoded file list, so it sees the new file.
3. Identify your smoke test — `pnpm test --run templates` gives feedback in
   seconds, not minutes.

## Constraints

- MUST place the file at exactly `src/templates/reference/output-style.md`. [src: D1]
- MUST hold between 6 and 10 rules. [src: D2]
- MUST state the motivation for each rule. [src: D2]
- MUST frame rules positively rather than as a banned-phrase list. [src: D2]
- MUST include at least one worked before/after example. [src: D6]
- MUST use project-relative paths only. [src: brief "Hard Constraints"]
- MUST NOT include a long categorized banned-phrase or banned-word list. [src: D2]
- MUST NOT include a rubric, a 1-10 scale, or any self-scoring loop. [src: design §4 "Do not add a rubric self-scoring loop"]
- MUST NOT contain guidance about the Joycraft repo's own path asymmetry — that belongs in `docs/reference/skill-authoring.md` (spec 5). [src: D1]
- MUST NOT edit any file under `src/skills/`. [src: brief "Hard Constraints"]
- MUST NOT hand-edit `src/bundled-files.ts` or any `src/*-skills/` tree — spec 6 owns regeneration. [src: brief "Hard Constraints"]
- MUST NOT add any runtime dependency. [src: brief "Hard Constraints"]

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/reference/output-style.md` | The style contract: H1, blockquote purpose line, 6–10 positively-framed rules each with motivation, a scope section exempting agent artifacts, and a worked before/after example. |

## Approach

Model the doc on `docs/reference/skill-authoring.md` — roughly 2KB across a
handful of headings, structured as the rule, why it matters, and worked examples.
That file is the house precedent for reference-doc voice, and matching it means
the new doc reads as native rather than imported.

Structure:

1. **H1 + blockquote purpose line** — one sentence on what the doc governs.
2. **Scope section** — what counts as a human-facing output moment, and the
   explicit exemption for agent-read artifacts. This section is what prevents
   the rules bleeding into specs and queue JSON.
3. **The rules** — 6 to 10 of them, each a short heading or bolded lead followed
   by its motivation. The motivation is not decoration: D2's rationale is that
   stating the *why* lets the model generalize to cases the rule didn't
   enumerate, which is the entire reason this is a short positive rule set
   instead of a long list of forbidden strings.
4. **Worked example** — one real Joycraft output moment shown before and after.
   Draw it from an actual report shape (a decomposition table preamble, a
   handoff, a tune summary) rather than inventing a generic one.

Content for the rules should draw on the two research docs
(`docs/research/2026-07-27-human-readable-output-style.md` for structure — what
to say first, what the human decides;
`docs/research/2026-07-27-prose-style-techniques.md` for sentence-level prose).
Read both before writing.

**Rejected alternative:** a categorized banned-phrase list, which is the dominant
published pattern (stop-slop, ~14.6k stars). Rejected by D2 — it contradicts
Anthropic's first-party guidance for recent models and ships no eval against
human judgment. Adoption is not efficacy. The decision log records the reversal
condition: if the short rule set demonstrably fails to change output, reach for a
versioned tell list.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| A rule is hard to motivate in one line | Keep the rule and write the longer motivation. There is no line cap; D2 constrains rule *count*, not prose length. A rule you cannot motivate at all is a rule to cut. |
| The natural rule set lands at 11+ | Merge overlapping rules until it fits 6–10. Exceeding the bound requires a new decision, not a judgment call at authoring time. |
| The natural rule set lands at 5 | Below the bound. Either split a compound rule or reconsider whether a genuine rule was missed — do not pad with filler to reach 6. |
| A rule reads naturally as a prohibition | Restate it as its positive counterpart. "Don't open with a summary of the request" becomes "Open with what changed or what you need from the reader." |
| A rule seems to apply to specs or queue JSON | It does not. The scope section governs; agent artifacts are exempt. If a rule only makes sense for agent artifacts, it does not belong in this doc. |
| The worked example needs a Joycraft-specific path | Use a project-relative path that resolves in a user project (`docs/templates/reference/…`), never `src/…` or an absolute path. |
