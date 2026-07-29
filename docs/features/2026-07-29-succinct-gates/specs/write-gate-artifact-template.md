---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-29
feature: 2026-07-29-succinct-gates
mode: checkpoint
---

# Write Gate Artifact Template — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-29-succinct-gates/brief.md`
> **Status:** Ready
> **Date:** 2026-07-29
> **Estimated scope:** 1 session / 2 files created / ~300 lines

---

## What

Author `src/templates/REVIEW_GATE_TEMPLATE.html` — a single generic,
locked-skeleton HTML template (decision D1) that any Joycraft gate skill fills
to render its review artifact. It reuses the design language of
`src/templates/DECISION_DOSSIER_TEMPLATE.html` byte-for-byte where possible:
the same design tokens (light + dark, `prefers-color-scheme` +
`data-theme` override), the same type stack (Charter serif body, Avenir Next
sans headings, monospace for code), the same contract-comment structure, and
the same sole-permitted inline theme script.

Register it in the `TEMPLATES` map so `npx joycraft init`/`upgrade` installs
it at `docs/templates/REVIEW_GATE_TEMPLATE.html` in user projects.

Slot regions (all delimited `<!-- SLOT:name — guidance -->`, dossier-style):

- `title`, `eyebrow`, `title-h1`, `dek` — header identity.
- `context-strip` — required container; `.lock-chip` spans (grounded facts,
  `.open` variant for open items).
- `sections` — repeatable content section: `.sec-head` (eyebrow + h2),
  optional `.sub` standfirst, then any of the pre-defined blocks: `.pillars`
  card grid, `.tablebox > table` (spec/decomposition tables with `.spec-name`,
  `.size`, `.wave` classes), `.cols` must/must-not columns, `.criteria`
  checklist.
- `questions` — repeatable `.q` card (amber left border): numbered question,
  `Recommend:` line, one-paragraph why. Used when open questions accompany the
  artifact (they will already have gone through decide per spec 4; cards show
  the stamped answers or the forced choices).
- `howto` — the how-to-answer box; MUST name the reject-this-framing escape.
- `footer` — provenance line.

The template's contract comment mirrors the dossier's: fill ONLY slot regions,
no invented classes, zero external requests, system font stacks, the inline
theme handler is the only JS. It must NOT nest a literal slot-delimiter
example inside the contract comment (the 2026-07-20 discovery: an inner `-->`
terminates the comment early and dumps prose into the page). First line is
`<meta charset="utf-8">` (mojibake over `file://` otherwise).

## Why

Only `joycraft-decide` has a designed review artifact today; every other gate
presents raw chat or a default-rendered markdown file — observed 2026-07-29
when a decompose review arrived as an unreadable wall. Without one shared
template, each gate would hand-roll HTML, exactly what the dossier's locked
skeleton exists to prevent.

## Acceptance Criteria

- [ ] `src/templates/REVIEW_GATE_TEMPLATE.html` exists with all slot regions
  listed above and the dossier token set (both themes, `data-theme` override
  wins in both directions).
- [ ] The template is registered in the bundled `TEMPLATES` map and installs
  to `docs/templates/REVIEW_GATE_TEMPLATE.html`.
- [ ] `<meta charset="utf-8">` is the first line; no external requests of any
  kind; the only `<script>` is the theme handler.
- [ ] The contract comment contains no nested comment terminator.
- [ ] Mechanical render check passes: headless Chrome `--dump-dom` shows the
  contract comment absent from rendered text, and a computed-style probe
  confirms token CSS applied (body background equals `--ground` in both
  themes).
- [ ] Build passes.
- [ ] Tests pass.

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Template exists with slots + tokens | new assertions in `tests/` (template file readable; contains each `SLOT:` name; contains `--ground` in `:root`, `@media (prefers-color-scheme: dark)`, `:root[data-theme="dark"]`, `:root[data-theme="light"]`) | unit |
| Registered in TEMPLATES | init fixture run installs `docs/templates/REVIEW_GATE_TEMPLATE.html` | integration |
| charset first / no external refs / single script | string assertions: first line, zero `http(s)://` in `src=`/`href=`/`@import`/`url(`, exactly one `<script>` | unit |
| No nested comment terminator | assert the contract comment block (first `<!--` … first `-->`) contains no `SLOT:` literal | unit |
| Render check | manual/scripted headless Chrome run documented in the spec commit message (not a CI test — Chrome not guaranteed in CI) | manual |

**Execution order:**
1. Write all tests above — they should fail against current/stubbed code
2. Run tests to confirm they fail (red)
3. Implement until all tests pass (green)

**Smoke test:** the template string assertions — single vitest file, sub-second.

**Before implementing, verify your test harness:**
1. Run all tests — they must FAIL (if they pass, you're testing the wrong thing)
2. Each test reads the actual template file from `src/templates/` — not a copy
3. Identify your smoke test — it must run in seconds

## Constraints

- MUST: reuse the dossier's exact design tokens and class idioms — this is an
  extension of one design system, not a second one.
- MUST: keep the document fully self-contained (CSP-safe, `file://`-safe).
- MUST NOT: add runtime dependencies.
- MUST NOT: edit `DECISION_DOSSIER_TEMPLATE.html` — the dossier keeps its own
  skeleton; decide is out of scope here.
- MUST NOT: regenerate bundles or sync installed copies — spec 6 owns both.

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/templates/REVIEW_GATE_TEMPLATE.html` | the locked template |
| Edit | template registry (where `TEMPLATES` lists bundled templates — locate the map that installs `DECISION_DOSSIER_TEMPLATE.html` and add one entry) | register the new template |
| Create | `tests/review-gate-template.test.ts` | static-shape assertions above |

## Approach

Copy the dossier's head (charset, contract comment shape, full token block,
base type rules) and replace the dossier-specific sections with the generic
section/question/howto slots. A working visual reference already exists: the
2026-07-29 brief-review render produced during this feature's own interview
used exactly these blocks (pillars, tablebox, q-cards, cols, criteria) on the
dossier tokens and read well in both themes.

Rejected alternative: per-gate templates (one each for brief, design,
decompose, research, tune, optimize) — rejected by D1 because the section
blocks cover all six shapes and per-gate skeletons multiply the render-check
and drift surface.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Gate has zero open questions | `questions` slot region deleted entirely; layout copes |
| Very wide table (9-spec decompose) | `.tablebox` scrolls horizontally; body never does |
| Viewer toggles theme against OS preference | `data-theme` override beats the media query both directions |
| Opened over `file://` | charset present; no external fetches; renders identically |
