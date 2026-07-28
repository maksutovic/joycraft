---
status: active
owner: Maximilian Maksutovic
created: 2026-07-27
feature: human-readable-output-style
---

# Design — human-readable output style for Joycraft skills

> **Research:** `docs/research/2026-07-27-human-readable-output-style.md` (structure — what to say first, what the human decides)
> **Research:** `docs/research/2026-07-27-prose-style-techniques.md` (sentence-level prose quality)
> **Brief:** `docs/features/2026-07-27-human-readable-output-style/brief.md` (created at the deposition; carries the `decisions:` block)
> **Dossier:** `docs/features/2026-07-27-human-readable-output-style/dossier.html`

---

## 1. Current State

### Prior knowledge reused

Retrieval ran (terms: output style, reading fatigue, prose, terse, human-facing, `entry:`, skill-authoring). Reused:

- `docs/context/decision-log.md` — **2026-07-21 row (Living-harness D3).** Establishes the skill taxonomy `entry: human | agent | situational`, the finding that "the scarce resource is human doors + the always-loaded description budget, not skill count," the human-door budget of ≤9, and "internals get terse anti-discovery descriptions." This directly constrains whether a style rule may ship as a new user-invocable skill.
- `docs/context/anchors.md` — the 0/25/50/75/100 scale and the Block Rule (load-bearing AND ≤50 blocks propagation), used to score Section 2 below.
- `docs/context/shipped.md` — 2026-07-21 row confirms `docs/reference/` and the skill taxonomy shipped in PR #55, so the reference-doc channel is live rather than proposed.
- `docs/research/2026-07-20-reading-fatigue-panel.md` (via the companion research doc's own retrieval) — core verdict "less text in the human channel, not shorter text"; RF-KILL-1 (compression as endgame), RF-KILL-2 (hard word-caps with silent cutting), RF-KILL-8 (`audience: agent` never-read contracts). These are prior *rejections* this design must not re-propose.

Not found: no knowledge-layer row covers prose style, banned-phrase lists, or output formatting. This is genuinely new ground for the knowledge layer.

### What exists in the codebase today

**The canonical skill source is `src/skills/` — 22 flat `.md` files.** Frontmatter keys in use: `name:` (always), `entry:` (always — 11 `agent`, 9 `human`, 2 `situational`), `description:` (always), `instructions:` (claude-only bare number, stripped for codex/pi).

**The build has exactly three transform primitives** (`scripts/lib/skill-template.mjs`):

- `applyTemplate(source, harness, filename)` at `scripts/lib/skill-template.mjs:42` — splits frontmatter, strips fields, processes harness blocks, substitutes vars, reassembles.
- `substituteVars()` at `:190` — resolves `{{var}}` against a fixed 4-key `LOOKUP` (`:10`): `skill_prefix`, `clear`, `skills_dir`, `boundary_file`. Unknown variables throw a build error.
- `processHarnessBlocks()` at `:127` — `<!-- harness:NAME -->…<!-- /harness -->`.
- `stripFrontmatterFields()` at `:96` — drops `instructions:` for codex/pi.

**There is no include/inject/partial primitive.** The module header at `scripts/lib/skill-template.mjs:5-8` enumerates the complete feature set as exactly those three primitives, and the module is explicitly pure/no-I/O (`:1`) — so it *cannot* read content from another file. Harness blocks only ever *strip* content already inline; they never inject. `substituteVars` is fail-closed: any unknown `{{key}}` throws (`:194-197`).

Shared content today therefore has only three possible routes: duplicate the prose across the files, add a 5th `LOOKUP` key whose value is the entire block as a string literal (identical for all three harnesses — a hack, but it works today), or add a 4th primitive to the engine. `applyTemplate` is the module's only export.

**The reference-doc shipping channel already exists and has two occupants.** `src/templates/reference/` holds `knowledge-lifecycle.md` and `spec-status-lifecycle.md`. These serialize into `TEMPLATES` in `src/bundled-files.ts` (`src/bundled-files.ts:28`) and `src/init.ts:197-203` copies every `TEMPLATES` entry into the user's `docs/templates/`, so they land at **`docs/templates/reference/<name>.md`** in a user project. `src/init.ts:260` hashes them for upgrade tracking.

**Skills cite reference docs by path, as prose pointers.** Seven skills reference `docs/reference/`: `joycraft-add-fact.md:64,65,150`, `joycraft-decompose.md:164`, `joycraft-optimize.md:73`, `joycraft-session-end.md:123`, and others. Example — `joycraft-optimize.md:73`: reason "pointing at `docs/reference/knowledge-lifecycle.md`."

**A repo-internal-only reference exists: `docs/reference/skill-authoring.md`** (26 lines). It is NOT in `src/templates/reference/` and NOT a `TEMPLATES` key, so it never ships to user projects. Its scope is the PROTOCOL-vs-JUDGMENT step-labeling rule — not prose style. Notably **no skill links to it**; its only citations are specs and research (`docs/features/2026-07-21-living-harness/specs/scaffold-knowledge-substrate.md:20,30,44,74`). Its one enforcement is indirect: `retrieval-pass-skill.test.ts:53-55` greps for `PROTOCOL` inside a windowed section.

This makes it the natural home for authoring-time rules binding Joycraft's own skill authors — but also a cautionary precedent: a reference doc that no skill cites is a doc that no agent reads at the moment it matters.

Note the path asymmetry: Joycraft's own repo reads `docs/reference/`, but a user project receives the same files at `docs/templates/reference/`. Any new reference doc must decide which of the two audiences it serves.

**Tests read skills and assert on body content with regex — but from two different source-of-truth dirs.** `tests/skill-handoff.test.ts:7` reads the *generated* `src/claude-skills/`; `:27-30` asserts `toContain('Next:')`, `toMatch(/```bash[\s\S]*?\/joycraft-/)`, `toContain('Run /clear first.')`. The newer `tests/retrieval-pass-skill.test.ts:9-11` and `tests/confidence-scoring-skill.test.ts:9-11` instead read the *installed* `.claude/skills/<name>/SKILL.md` at repo root (Joycraft dogfooding itself). A change to `src/skills/*.md` only reaches either set after the build/bundle step runs.

The dominant idiom in the newer tests is **section-windowing**: locate a heading with `indexOf`, slice a fixed 1500-char window, assert inside it (`retrieval-pass-skill.test.ts:53-55, 87-91, 100-102`). `confidence-scoring-skill.test.ts:82-87` goes further, slicing by counting ``` fences. These are position-dependent — **inserting a block near those headings can silently push content out of the window and cause a false pass or a spurious failure.** Relevant here because a style pointer added to `joycraft-design`/`joycraft-decompose`/`joycraft-research` would land near exactly those windowed sections. `confidence-scoring-skill.test.ts:63` also shows a whole-file negative word ban (`not.toMatch(/percentage/)`) — precedent for banned-word assertions, if Q3 wanted one.

Per the research doc, **no test asserts prose style, output length, or human-vs-agent report formatting** beyond the Handoff block shape.

**Human-facing output moments are concentrated and already enumerated.** The companion research doc maps them per skill (Q1): interview §3/§5/§6, new-feature Phase 0/2/4, tune Steps 4-6, session-end Step 6, design Step 4, decompose Step 4, optimize Step 9-11, verify Step 5, implement-feature's reports. Agent-read artifacts (Q2) — specs, queue JSON, frontmatter, knowledge-layer docs, discovery stubs, `.claude/settings.json` deny patterns — must stay dense.

**No house style guide exists** (research Q9). What exists is scattered de facto directives: "End with a terse summary" (decide), "report tersely" (implement), "Keep the row **factual and thin**" (session-end:114), "1-2 pages max" (interview).

---

## 2. Desired End State

A single **style contract** exists in one home, and the human-facing output moments in Joycraft's skills comply with it. Agent-facing artifacts are explicitly exempt and stay dense.

**Shape of the change:**

1. **One new reference doc holds the style rules** — the one home. Given the two-audience split above, this is most likely `src/templates/reference/output-style.md` (ships to users, lands at `docs/templates/reference/`) if user-project skills must obey it, or `docs/reference/` only if it binds Joycraft's authors alone. (anchor: 75 — the reference-doc channel and its two occupants are verified at `src/templates/reference/` and `src/init.ts:197-203`; which audience this doc serves is Open Question Q1, not yet resolved.)

2. **Skills gain short pointers, not inlined rule lists.** Each human-facing output moment gets a one-line citation to the style doc, matching the existing pointer idiom (`joycraft-optimize.md:73`). The rules themselves are not duplicated into 22 files. (anchor: 100 — verified there is no include primitive in `skill-template.mjs`, so inlining would mean 22-way duplication with no dedupe mechanism.)

3. **The rule set is short and positively framed, with stated motivation** — not a long banned-phrase list. This is the reconciliation the prose research explicitly flags as *inference, not measurement* (its Caveat 2). (anchor: 50→resolved by D2 — the block rule fired as designed; the claim did not propagate on its own confidence but was terminated by human decision on 2026-07-27. Rationale recorded: first-party guidance outranks star counts on skills never tested against frontier Claude. The underlying evidence gap is unchanged — this is a decision under acknowledged uncertainty, to be corrected in a minor release if observed output doesn't improve.)

4. **No new user-invocable skill is created.** The style contract rides existing skills as a reference + pointers. (anchor: 100 — the 2026-07-21 decision-log row caps human doors at ≤9 and there are already 9 `entry: human` skills; a new door would breach the budget.)

5. **A content test enforces the pointer, not the prose.** A new test in `tests/` asserts that the human-facing skills cite the style doc, following the `retrieval-pass-skill.test.ts` presence-and-ordering idiom. Prose quality itself stays unasserted. (anchor: 75 — the test idiom is verified at `tests/retrieval-pass-skill.test.ts:25-45`; that *only* the pointer should be asserted is a design judgment, see Q3.)

6. **Pointer placement avoids the windowed test regions.** Style pointers added to `joycraft-design`, `joycraft-decompose`, and `joycraft-research` must not land inside the 1500-char windows that `retrieval-pass-skill.test.ts` and `confidence-scoring-skill.test.ts` slice from their anchor headings. (anchor: 100 — verified at `tests/retrieval-pass-skill.test.ts:53-55,87-91,100-102` and `tests/confidence-scoring-skill.test.ts:82-87`; these slices are position-dependent and can fail or falsely pass when nearby content shifts.)

7. **Bundle regeneration and installed-copy sync happen in the same commit** — `scripts/generate-bundled-files.mjs` regenerates `src/{claude,codex,pi}-skills/` and `src/bundled-files.ts`, and `.claude/skills/**` installed copies must byte-match. (anchor: 100 — `tests/implement-mode-handoff.test.ts` asserts installed copies byte-match source variants, and this is a known repeated gotcha in the memory layer.)

**What does not change:** the canonical Handoff block shape (test-locked), spec/queue/frontmatter formats, the knowledge-layer doc formats, and every `entry: agent` artifact contract.

---

## 3. Patterns to Follow

**Pattern 1 — reference doc + prose pointer, not inlined rules.** A skill names the doc and defers to it:

```markdown
# src/skills/joycraft-optimize.md:73
- **>200 lines → `MAKE_A_CHECK`**, evidence `VERIFIED`, reason pointing at
  `docs/reference/knowledge-lifecycle.md` for the …
```

Follow this. One line, path-relative, no duplicated content.

**Pattern 2 — reference docs ship via `src/templates/`.** Add the file to `src/templates/reference/`, regenerate, and `src/init.ts:197-203` handles the rest:

```ts
// src/init.ts:197-203
const templatesDir = join(targetDir, 'docs', 'templates');
ensureDir(templatesDir);
for (const [filename, content] of Object.entries(TEMPLATES)) {
  ensureDir(dirname(join(templatesDir, filename)));
  writeFile(join(templatesDir, filename), content, opts.force, result);
}
```

**Pattern 3 — cross-skill content tests read installed copies and assert presence + ordering.**

```ts
// tests/retrieval-pass-skill.test.ts:9, 25, 31-45
const DESIGN_SKILL = join(repoRoot, '.claude', 'skills', 'joycraft-design', 'SKILL.md');
expect(c).toMatch(/Retrieve Before You Reason/);
// …and the heading index must precede the first Step 1/Phase 1 heading
expect(retrievalIdx).toBeLessThan(firstOtherStepIdx);
```

**Pattern 4 — the reference-doc voice is short, sectioned, and gives the *why*.** `docs/reference/skill-authoring.md` is 1,935 bytes across four headings: the rule, "Why This Matters," and two worked examples. Match that length and shape. This also happens to be exactly what the prose research recommends (state motivation so the model generalizes).

**Pattern 5 — the taxonomy already marks the audience.** `entry: human | agent | situational` is the existing doorway field. Use it to select which skills get the pointer rather than inventing a new per-section audience marker — document-level `audience: agent` was already killed as RF-KILL-8.

---

## 4. Resolved Design Decisions

> **Decision:** Do not create a new user-invocable skill for output style.
> **Rationale:** The 2026-07-21 decision-log row caps human doors at ≤9 and there are exactly 9 `entry: human` skills today. A style skill would either breach the budget or force a demotion elsewhere. It would also be the wrong shape — style must apply *during* other skills' output moments, not be invoked separately.
> **Alternative rejected:** Porting `i-have-adhd` or `caveman` as a bundled skill. Both are session-wide persona toggles that a user turns on; Joycraft needs an always-on contract scoped to specific moments. `caveman`'s compression endgame is also already rejected as RF-KILL-1.

> **Decision:** Put the rules in one reference doc and cite it by path from skills.
> **Rationale:** `skill-template.mjs` has no include primitive (verified — only `substituteVars`, `processHarnessBlocks`, `stripFrontmatterFields`), so inlined rules would mean 22-way duplication with no dedupe. The pointer idiom is already established across seven skills.
> **Alternative rejected:** Adding a fourth template primitive (`{{include:…}}`). Real, but it changes the build contract, needs its own tests, and buys nothing over a path pointer that agents already follow.

> **Decision:** Scope the contract to human-facing output moments only; agent artifacts stay dense.
> **Rationale:** This is the central premise of both research docs and matches RF-DIET-1's two-tier contract. The moments are already enumerated per-skill in research Q1, and the agent-read artifacts in Q2.
> **Alternative rejected:** A global prose rule for all skill output. It would degrade specs, queue JSON, and knowledge-layer rows, which exist to be parsed, not read.

> **Decision:** Do not add a rubric self-scoring loop to skills.
> **Rationale:** Pan et al. 2024 measured spontaneous in-context reward hacking when the same model is both writer and rubric judge — judge scores inflate while human-rated quality declines. This is the only controlled measurement in the verified research set, and it is negative.
> **Alternative rejected:** The stop-slop/deslop 1-10 five-dimension rubric. Widely adopted (~14.6k stars) but ships no eval against human judgment; adoption is not efficacy.

> **Decision (B1, deposition 2026-07-27):** Skill-body edits are approved for this feature.
> **Rationale:** The living-harness / compound-engineering posture makes skills evolving over time an expected Joycraft behavior. Note the boundary still applied — AGENTS.md's ASK FIRST list is not repealed by living harness, which changed the *mechanism* of evolution, not who authorizes a change to the shipped product.
> **Alternative rejected:** Reference doc with zero skill edits — smallest diff and no boundary crossing, but ships the appearance of a contract with nothing carrying it to the output moment.

> **Decision (B2 + D1, deposition 2026-07-27):** Ship the style doc as bundled template content at `src/templates/reference/output-style.md`; keep Joycraft-repo-specific guidance about the self-hosting path asymmetry repo-local.
> **Rationale:** The consumer of the library should not absorb Joycraft's own self-hosting quirk. Shipped skills must cite a path that resolves in a user project; this repo can carry extra guidance for itself.
> **Alternative rejected:** Repo-internal `docs/reference/` only (dead pointer for every user — `skill-authoring.md` is the live precedent of a reference doc no skill cites); both homes split by audience (the `ONE_HOME` condition optimize exists to flag).

> **Decision (D2, deposition 2026-07-27):** Short (~6-10 rule) positively-framed rule set with the motivation stated per rule.
> **Rationale:** Anthropic's July 2026 first-party guidance is the only evidence about the models Joycraft actually runs on, so it outranks star counts on skills never tested against frontier Claude. Explicitly a decision under acknowledged uncertainty — ship, observe, correct in a minor release.
> **Alternative rejected:** Full categorized banned-phrase list (dominant published pattern but contradicts first-party guidance for recent models, and ships no eval); short rules plus a versioned tell list (hedges the contradiction but builds a per-model-bump maintenance obligation on unproven content).

> **Decision:** Enforce with a content test on the pointer; do not test prose quality.
> **Rationale:** Prose quality has no mechanical oracle. The existing test suite only ever asserts structural presence and ordering (`retrieval-pass-skill.test.ts`, `skill-handoff.test.ts`); a prose-length or banned-word assertion would be the first of its kind and would re-introduce RF-KILL-2's hard word-caps with silent cutting.
> **Alternative rejected:** Asserting max line counts on report templates. Rejected upstream already as RF-KILL-2.

---

## 5. Open Questions

**Deposition run 2026-07-27** (`/joycraft-decide`) — dossier at
`docs/features/2026-07-27-human-readable-output-style/dossier.html`. Five
questions terminated: two mandatory ASK FIRST boundary questions (B1 skill
content, B2 template content) plus D1 and D2 clarified — all now in Section 4.
Three questions were pre-backlogged by the ≤5 cap and remain genuinely open,
tracked in `docs/backlog/2026-07-27-output-style-deferred-decisions.md`:

> **Q3: How much does the test enforce?**
> - **Option A:** Presence only — each human-facing skill's output moment cites the style doc. — Pro: cheap, mirrors `skill-handoff.test.ts`'s `toContain`; no false positives. Con: a skill can cite the doc and still ignore it; the test proves wiring, not compliance.
> - **Option B:** Presence + ordering — the citation must appear before the skill's report/handoff block, mirroring `retrieval-pass-skill.test.ts:31-45`. — Pro: catches the pointer being buried where it won't be read at the right moment. Con: brittle against skill restructuring; the ordering assertion in the retrieval test is already the most fragile in the suite.
> - **Option C:** Presence + a golden-example assertion — the style doc must contain at least one worked before/after example. — Pro: the prose research's verified finding 7 says concrete examples beat abstract instructions; this tests the doc's own quality. Con: tests the reference doc, not the skills that must obey it.

> **Q4: Which skills get the pointer — all 9 `entry: human`, or only the heaviest output moments?**
> - **Option A:** All 9 `entry: human` skills. — Pro: clean rule keyed to existing taxonomy; no judgment call about which moments "count." Con: `joycraft-setup.md` is an 18-line pure router whose only output is one instruction; a style pointer there is pure overhead.
> - **Option B:** Only the skills with substantial fenced report templates — tune, session-end, decompose, design, new-feature, implement-feature, optimize, verify. — Pro: targets the actual reading-fatigue surface; note this crosses the taxonomy (optimize and verify are `entry: agent` but produce human-read reports). Con: the selection is a judgment call that will drift as skills change.
> - **Option C:** Key the pointer to the *artifact* rather than the skill — every skill that emits a fenced human-read report block. — Pro: precise and mechanically identifiable; survives skill restructuring. Con: requires first establishing what marks a block as human-read, and document-level audience markers were already killed as RF-KILL-8.

> **Q5: Does this feature also normalize the existing scattered directives?**
> - **Option A:** Yes — fold "report tersely," "End with a terse summary," "factual and thin," and "1-2 pages max" into the style doc and replace them with pointers. — Pro: genuine one-home consolidation; removes four near-duplicate rules. Con: touches six skills' bodies, widening the diff and the regression surface well beyond adding a doc.
> - **Option B:** No — add the style doc alongside; leave existing directives in place. — Pro: minimal diff; the existing directives are load-bearing where they sit and already work. Con: leaves two homes for output-style guidance, exactly the condition `joycraft-optimize`'s `ONE_HOME` disposition flags.
> - **Option C:** Defer to a follow-up — ship the doc + pointers now, and file the consolidation as a backlog item for an `optimize` pass to pick up. — Pro: sequences the risky edit behind the cheap one; `optimize` is the skill designed to find `ONE_HOME` violations. Con: knowingly ships a duplicate-home condition.

---


Each of the three above carries a standing recommendation (presence-only test;
heavy-output-moment pointers; defer consolidation to an optimize pass) but none
is decided. They do not block decompose — every question that reached the
deposition terminated.

## Brief updates

No parent brief existed at design time — the feature was described inline via the two research docs. The brief was created during the 2026-07-27 deposition (`/joycraft-decide`) from the terminated decisions, since it is the required home for the `decisions:` block that gates decompose. Its Hard Constraints and Out of Scope sections were written directly from B1/B2/D1/D2 and from Section 4's resolved decisions, so brief and design are in sync as of that write.
