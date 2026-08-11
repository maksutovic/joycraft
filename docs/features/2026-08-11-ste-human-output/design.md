---
status: active
owner: Maximilian Maksutovic
created: 2026-08-11
feature: 2026-08-11-ste-human-output
---

# Design: STE Human Output — writing contract + linter for gate artifacts

> **Amended 2026-08-11 at the decompose gate:** D1 and D4 were amended by the
> human after this design was written. STE is now the primary house style —
> `output-style.md` is rewritten as one integrated STE rule set (not extended
> with a section), and the governed surfaces include interview playback and
> gate chat/dialogue. §2.1 and §2.6 below describe the superseded append-a-
> section shape; trust the brief's Hard Constraints and decisions frontmatter.

## 1. Current State

**Prior knowledge reused:**

- `docs/context/decision-log.md` 2026-07-27 Output-style D1/B2 — the house-style doc ships as bundled template content at `src/templates/reference/output-style.md`, landing in user projects at `docs/templates/reference/output-style.md`. ONE canonical home.
- `docs/context/decision-log.md` 2026-07-27 Output-style D2 — style ships as a SHORT positively-framed rule set, NOT a banned-phrase list, with an explicit escalation clause: "If observed report output shows the short rule set doesn't change behavior — then reach for the versioned tell list." This feature is that escalation, triggered by observed jargon/slop at gates (the user's report, 2026-08-11).
- `docs/context/decision-log.md` 2026-07-27 Output-style D5 + D3 — 11 skills carry placement-tested pointers to the style doc at their output moments (`tests/output-style-pointer.test.ts` asserts presence AND placement under report/present headings).
- `docs/context/shipped.md` 2026-07-29 succinct-gates (#65) and 2026-07-31 team-ready-gates (#67) — slot-capped gate messages, one generic `REVIEW_GATE_TEMPLATE.html`, gate-contract tests. Structure is solved; sentences are not.
- `docs/context/decision-log.md` 2026-07-27 B1 — skill-body edits for style pointers are an approved pattern, with bundle regen + installed-copy sync in the same commit.

**Relevant code:**

- `src/templates/reference/output-style.md` — 8 rules + worked example. Scope section already partitions human-facing (governed) from agent-facing (exempt, dense). STE slots into this partition unchanged.
- `src/init.ts:221-226` — everything under `src/templates/` is copied verbatim into user projects at `docs/templates/`. A new file under `src/templates/reference/` ships with zero new plumbing.
- `src/skills/joycraft-harden.md:19-22` — harden's ONLY two enforcement surfaces are `permissions.deny` and `deny-patterns.txt`. A prose linter fits neither; wiring it as a hook is a harden-contract expansion.
- Tests: `tests/output-style-template.test.ts` (doc content), `tests/output-style-pointer.test.ts` (citation placement), `tests/gate-contract.test.ts`.

**Upstream source:** github.com/AminBlg/SimpleEnglish v1.2.0, MIT. Two artifacts matter: the SKILL.md rule distillation (53 ASD-STE100 rules, pragmatic mode keeps domain words legal) and `evals/ste_lint.py` — 132 lines, stdlib-only, `--self-test`, counts 10 mechanical violation classes, self-describes as comparative not compliance.

## 2. Desired End State

1. `src/templates/reference/output-style.md` gains a **Section: "Sentence mechanics (STE)"** — roughly 30 lines distilling the pragmatic-mode rules that a regex can hold an agent to: 20/25-word sentence limits by passage type, the modal ladder (should→must, may/might/could→can), condition-before-command, one word per concept, no semicolons/contractions/Latin abbreviations, and the slop-to-simple table. The existing 8 rules stay untouched; the new section extends the same doc, so the 11 existing skill pointers deliver it with **zero skill-body edits** (anchor: 75 — pointer test asserts citation placement, not section coverage; verified the pointers cite the doc path, not a section).
2. **(Amended by D2, 2026-08-11.)** The linter is vendored at `scripts/ste-lint.py` in this repo only — it does NOT ship in templates and users never run it. Attribution: SPDX + upstream URL/version header + CHANGELOG line (D5). MIT verified upstream 2026-08-11 (anchor: 100).
3. The output-style doc's new section carries a **manual** self-check (no script obligation): the two-tier rule from D3 — fix-to-zero on contractions, semicolons, banned modals, Latin abbreviations, slop words; advisory on sentence length and synonym rotation.
4. A CI test (`tests/ste-lint.test.ts` or similar) shells to `python3 scripts/ste-lint.py` to (a) run `--self-test` and (b) lint the repo's own shipped human-facing template prose (`src/templates/reference/output-style.md` descriptive sections, gate template slot guidance), skipping when `python3` is absent (anchor: 75 — CI python availability unverified).
5. Agent-facing docs (specs, queue JSON, knowledge rows) remain exempt — the doc's existing Scope partition already states this; no change.
6. Governed surfaces per D4: gate artifacts, PR bodies, session-end summaries — the doc's full human-facing Scope.
7. Harden integration is out of v1 entirely per D2 (not backlogged as a pending intent — revisit only if manual self-check proves insufficient in user projects).

## 3. Patterns to Follow

- **One home + pointers** — `src/skills/joycraft-design.md:193`: `Write this presentation to the style contract in docs/templates/reference/output-style.md`. The STE section rides behind the same pointers. Precedent: Output-style D5.
- **Rules with motivation, positively framed** — `src/templates/reference/output-style.md:24-31`: each rule is a header + norm + *Why:*. The STE section keeps this voice; the slop table is the one tabular exception, matching the doc's Worked Example precedent of concrete before/after.
- **Bundle regen + sync same-commit** — AGENTS.md ALWAYS: `pnpm sync-skills` after `src/skills/` or template edits; the 0.7.3 incident is the cautionary tale. Template edits here trigger the same flow (`scripts/generate-bundled-files.mjs` consumes `src/templates/` for bundled output) (anchor: 75 — generate script consumption of templates dir inferred from repo docs, not read line-by-line).
- **Vendored file with license header** — no existing vendored-code precedent in the repo (checked `src/`, none found), so propose: SPDX line + upstream URL + version + retrieval date at the top of `ste-lint.py`, plus a CHANGELOG line (per D5 — README ack dropped, the file is repo-internal). No precedent exists; this sets it.

## 4. Resolved Design Decisions

> **Decision:** Extend `output-style.md` rather than ship a second reference doc.
> **Rationale:** ONE_HOME (Output-style D1); the pointer network and its placement tests already deliver this doc to every output moment. A second doc would need 11 new pointers and a second test family.
> **Alternative rejected:** `src/templates/reference/ste.md` cited from output-style.md — indirection with no gain; agents partially read referenced docs (Anthropic guidance cited in gate skills).

> **Decision:** Pragmatic mode only; no ASD dictionary; domain words stay legal.
> **Rationale:** The dictionary is ASD-copyrighted; strict compliance is explicitly a non-goal in the brief. SimpleEnglish's own pragmatic mode (rules 1.5/1.8/1.12) is the template.
> **Alternative rejected:** Strict STE — deletes necessary technical vocabulary and imposes aerospace idioms ("make sure that" everywhere) that read as stilted in dev docs.

> **Decision:** The slop table enters despite D2's rejection of banned-phrase lists.
> **Rationale:** D2's own escalation clause fires: observed output shows the short rule set alone didn't stop gate jargon. The maintenance-obligation concern is weakened because the table derives from a 50-year external standard + a versioned upstream (SimpleEnglish 1.2.0), not invented tells.
> **Alternative rejected:** Staying with the 8 rules and tuning wording — already tried; that was the 2026-07-27 ship.

> **Decision:** Linter is vendored (copied), not depended on.
> **Rationale:** NEVER-boundary: no runtime dependencies that aren't strictly necessary; 132 stdlib-only lines are cheaper to own than to fetch. MIT permits it with attribution.
> **Alternative rejected:** Instructing users to install the SimpleEnglish plugin — puts a third-party install step inside Joycraft's default path and couples gate behavior to an external repo's evolution.

## 5. Open Questions

None — all questions terminated 2026-08-11 via /joycraft-decide (D1–D5, stamped in the brief frontmatter and docs/context/decision-log.md). The original framings are preserved below for the record; D2's framing was **rejected by the human** — every offered option assumed the linter touches the user path, and the human's answer ("we can do it in our joycraft repo for thorough testing but it's overkill for the user") became the decision.

> **Q1 → D2 (clarified, framing rejected): Where does the lint run in v1?**
> - **Option A (recommended):** Agent-side self-check only — the output-style doc instructs gate skills to run the vendored linter on artifact prose before presenting; advisory. Pro: zero new enforcement surface, works headless, ships now. Con: the model can skip it; no hard guarantee.
> - **Option B:** Also wire a harden hook that lints `docs/features/*/design.md` prose on write. Pro: deterministic, the true "ontology at the ledger." Con: expands harden's two-surface contract (`joycraft-harden.md:19-22`) — needs its own design; python3 availability becomes a hard dependency.
> - **Option C:** Defer the linter entirely; ship contract prose only. Pro: smallest diff. Con: gives up the deterministic half of the feature; the escalation clause fired precisely because prose alone under-delivers.

> **Q2 → D3 (clarified): Violation threshold semantics for the self-check?**
> - **Option A (recommended):** Fix-to-zero on mechanical classes (contractions, semicolons, banned modals, Latin abbreviations, slop words), advisory on the count-based ones (sentence length, synonym rotation). Pro: unambiguous where regex is reliable, tolerant where it miscounts. Con: two-tier rule is more to hold.
> - **Option B:** Single budget: violations_per_100w ≤ 1. Pro: one number. Con: lets individual hard violations ("should" in an instruction) survive under the average.
> - **Option C:** Report-only, no fix obligation. Pro: zero friction. Con: advisory reports get ignored; observed with optimize's advisory dispositions.

> **Q3 → D4 (clarified): Do PR bodies and session-end summaries join the governed set in v1?**
> - **Option A (recommended):** Yes — they're already inside the output-style doc's Scope ("anything a person reads to make a decision") and session-end/implement carry pointers. Pro: the video's complaint was precisely review-time prose. Con: slightly larger blast radius for tests.
> - **Option B:** Gate artifacts only; PR bodies later. Pro: tighter v1. Con: creates a scope split inside one doc that D5 worked to eliminate.

> **Q4 → D5 (clarified): Where does upstream attribution live?**
> - **Option A (recommended):** File header in `ste-lint.py` (SPDX + URL + version + date) + one line in README acknowledgments + CHANGELOG entry. Pro: covers legal + discoverability. Con: none material.
> - **Option B:** File header only. Pro: minimal. Con: invisible provenance for a shipped user-facing file.

## Brief updates

Reconciliation: the brief's "What ships" §1 said the contract needs "a generated include, not a file import" for self-contained skills. Retrieval showed the shipped pointer network (Output-style D1/D5) already solves delivery — skills cite the doc path that exists in user projects; no include mechanism is needed. Brief edited in place to reference the pointer network. Also added the Design back-reference line. No scope change; spec-count expectations unchanged.
