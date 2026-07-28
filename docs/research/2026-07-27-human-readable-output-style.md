---
status: active
owner: Maximilian Maksutovic
created: 2026-07-27
feature: human-readable-output-style
---

# Research — embedding a human-readable output style into Joycraft skills

> **Design:** docs/features/2026-07-27-human-readable-output-style/design.md

Question researched: how could Joycraft embed an "ADHD-style" human-readable
output discipline directly into its skills (no new dependency/skill), applying
it only to human-facing output moments while leaving agent-facing artifacts
dense? Prior art studied: `i-have-adhd` (ayghri) and `caveman` (JuliusBrussee).

## Prior knowledge reused

Retrieval ran (terms: reading fatigue, verbose, output style, human-read, terse, preamble). Reused:

- `docs/research/2026-07-20-reading-fatigue-panel.md` — core verdict ("less
  text in the human channel, not shorter text"; "Compression (caveman) =
  step, not destination"), RF-DIET-1..5 (two-tier human/agent doc contract;
  human channel = decisions not acknowledgments), RF-KILL-1 (compression as
  endgame), RF-KILL-2 (hard word-caps with silent cutting), RF-KILL-8
  (`audience: agent` never-read contracts).
- `docs/context/decision-log.md` 2026-07-21 row — skill taxonomy
  `entry: human | agent | situational`; scarce resource = human doors +
  always-loaded description budget; "internals get terse anti-discovery
  descriptions"; human-door budget ≤9.

---

# Codebase Research

**Date:** 2026-07-27
**Questions answered:** 9/9

## Q1: Which canonical skills in `src/skills/` produce output a human is expected to read, and where is it prescribed?

All paths under `src/skills/`. Line numbers approximate, per canonical files.

**joycraft-interview.md** (entry: human)
- §3 "Play Back Understanding" — verbal reflection to user (~34-39)
- §5 backlog-capture ask (~93-99)
- §6 canonical Handoff block + Recommended Next Steps (~114-125)
- Draft brief written "1-2 pages max" for the user (~132)

**joycraft-new-feature.md** (entry: human)
- Phase 0: fenced menu of found drafts/active features (~28-43)
- Phase 2: "Present the brief to the user… Iterate until approved." (~141-146)
- Phase 4 "Hand Off for Execution": fenced block listing specs, complexity routing, "Ready to start?" (~256-293); Handoff block (~299-311)

**joycraft-tune.md** (entry: human)
- Step 4: write + display assessment (scores table, findings, 5-action upgrade plan) (~45)
- Step 5: consolidated upgrade results table (~67); copy-pasteable `git rm -r --cached` fix shown "once, prominently" (~55)
- Step 6: Harness Maturity Roadmap (~69-80)

**joycraft-session-end.md** (entry: human)
- Step 6 "Report and Hand Off" — fixed fenced report (`Feature complete. - Feature: … - PR: … - Next: …`) (~158-169) + Handoff block (~171-181)
- Step 2b.2: report which D-ids landed/missing (~116); overlap conflicts surfaced to human (~126)

**joycraft-design.md** (entry: human)
- Whole artifact human-read: "~200-line design artifact for human review" (line 6)
- §5 Open Questions: 2-3 options with pros/cons for the human (~98-107)
- Step 4 "Present and STOP — Pre-Approval Hold" fenced message (~140-153); Handoff post-approval only (~155, 185-195)
- Step 3.5 "Diff + stop" on non-trivial brief changes (~134)

**joycraft-decide.md** (entry: agent)
- Step 4: renders display-only `dossier.html` from template, opens browser (~20, 115-131)
- Step 5: forced-choice questions one at a time (~133-172)
- Step 7 "Report": terse summary table + gate status line (~211-220)

**joycraft-decompose.md** (entry: human)
- Step 4 "Present and Iterate": prior-knowledge list, decomposition table, review questions (~85-105); INVENTED-item review, human-gated (~105-114); earned-silence line (~114)
- Execution-mode recommendation + wait for OK (~118-142)
- Step 8: one-line summary + Handoff block (~321-333); pi variant long fenced hand-off (~336-364)

**joycraft-research.md** (entry: agent)
- Claude: Handoff block + Recommended Next Steps (~169-179); codex/pi: fenced "Research complete…" blocks (~275-290, ~398-413)
- Phase 4 "Diff + stop" (~163)

**joycraft-verify.md** (entry: agent)
- Step 5: exact fenced verdict format (criterion/verdict/evidence table, "Overall: X/Y") (~128-155)
- Step 6: per-verdict next steps; "Do NOT offer to fix failures yourself." (~157-165)

**joycraft-optimize.md** (entry: agent)
- "Conversational diagnostic report — no files created" (line 12)
- Step 9: disposition table + fenced Session Overhead Report template (~120-163)
- Step 10 Reaper proposals, human-approved individually (~185, ~191); Step 11 Further Resources (~195-202)

**joycraft-implement.md** (entry: agent)
- Step 2 dependency warning "Proceed anyway, or stop?" (~49-53)
- Terse fenced per-spec report line + continuation line (~158-165)

**joycraft-implement-feature.md** (entry: human)
- Step 1.4 plan report (~31); Step 3 fail-fast report (~57-63); Final Report fenced block (~69-76 claude; ~116-123 codex; pi ~152-157)

**joycraft-spec-done.md** (entry: agent) — Recommended Next Steps only (~55-67); script errors surfaced (~29)

**joycraft-harden.md** (entry: agent) — Step 3 exact diffs before touching anything (~56-62); Step 6 summary report (~86-89)

**joycraft-lockdown.md** (entry: agent) — Step 3 "generate output in this exact format" fenced block (~72-96); Recommended Permission Mode table (~103-121); Step 4 exact diffs, never auto-apply (~123-130)

**joycraft-bugfix.md** (entry: human) — findings presented before any code/spec, "Does this match?" (~36-42); Phase 5 one-line summary + Handoff (~146-156)

**joycraft-add-fact.md** (entry: agent) — Step 7 fenced report format (~185-197) + Handoff (~199-207); conflicts surfaced (~65)

**joycraft-add-context.md** (entry: agent) — Step 5 fenced confirm report (~74-82) + Handoff (~84-92)

**joycraft-gather-context.md** (entry: situational) — gap-only interview offer (~31); ONE final confirm (~59); batch report + Handoff (~63-65)

**joycraft-collaborative-setup.md** (entry: situational) — bail message (~38); upgrade instruction (~150-152); summary + Handoff (~156-173)

**joycraft-implement-level5.md** (entry: agent) — explanation blockquote (~24-34); guided Q&A; Step 8 setup summary with trigger/effect table (~148-167)

**joycraft-setup.md** (entry: human) — pure router; only output is the instruction to run tune (18 lines)

## Q2: Agent-read artifacts (not human-read)

- **Atomic specs** — `docs/features/<slug>/specs/*.md` (written by new-feature Phase 3, decompose Step 5, bugfix Phase 4; consumed by implement Step 3 and verify Step 2 as "execution contract")
- **Spec queue JSON** — `.joycraft-spec-queue.json` (decompose Step 5a ~246-267: "machine-readable, authoritative spec queue"; consumed by implement, implement-feature, spec-done, session-end Step 3, `joycraft-next-spec`/`joycraft-mark-done`)
- **Spec/brief YAML frontmatter** — `status:`, `mode:`, `owner:`, `created:`, `feature:`, brief `decisions:` block (stamped by decide Step 6; read by decompose's decision gate, verify Step 2.5 oracle)
- **Research docs** — `docs/features/<slug>/research.md` / `docs/research/*.md` (consumed by design Step 1, decompose); temp `.questions-tmp.md` agent-only, deleted
- **Knowledge-layer fact docs** — `docs/context/{decision-log,shipped,production-map,dangerous-assumptions,institutional-knowledge,anchors}.md` (consumed by Retrieve-Before-You-Reason passes and anchor scoring)
- **Discovery stubs** — `docs/discoveries/*.md` 2-line stubs (spec-done Step 2 → session-end Step 1 consolidation)
- **Specs README.md** — decompose line 319 states the audience split: "the brief is for *feature reviewers*…; the README is for *implementers*"
- **Enforcement surfaces** — `.claude/settings.json` `permissions.deny`, `.claude/hooks/joycraft/deny-patterns.txt`
- **State** — `docs/.joycraft/state.json`; **provenance comments** `<!-- origin: … probation: … -->` (harden Step 5; read by tune Step 3)
- Mixed-audience: `docs/joycraft-assessment.md`, `docs/joycraft-history.md` (tune writes AND displays; level5 re-reads); `dossier.html` explicitly human display-only

## Q3: Existing output-format instructions — representative examples

1. **Canonical Handoff block** (asserted by `tests/skill-handoff.test.ts`: contains `Next:`, fenced bash invoking `/joycraft-`, `Run /clear first.`). From session-end (~173-179):
```
## Recommended Next Steps

Next:
```bash
{{skill_prefix}}implement docs/features/<slug>/specs/<next-spec>.md
```
Run {{clear}} first.
```

2. **Session-end report** (~160-169):
```
Feature complete.
- Feature: [slug]
- Specs graduated to done: [N] (remaining at todo: [N])
- Build: [passing / failing]
- Discoveries: [N consolidated / none]
- Pushed: [yes / no — and why not]
- PR: [opened #N / not yet — N specs remaining]
- Next: [what comes after this feature]
```

3. **Verifier verdict** (verify ~110-123): "OUTPUT FORMAT -- you MUST use this exact format:" — `VERIFICATION REPORT` criterion/verdict/evidence table + `SUMMARY: X/Y criteria passed.`

4. **Optimize report** (~122-163): disposition table (Control, Home File, Disposition, Evidence, Reason) + fenced `## Session Overhead Report` template with `PASS ≤200 / WARN >200` annotations.

5. **Per-spec terse report** (implement ~160-165): "After each spec's wrap-up, report tersely before continuing:" — `Spec complete: [spec name] · mode: [mode] · tests: [N] passing · …` + continuation line.

Others: lockdown "generate output in this exact format" (~72); add-fact "Report what you did in this format:" (~185); decompose README spec-table template (~287-317); decide "End with a terse summary" (~213); session-end ledger row "Keep the row **factual and thin**" (~111-114).

## Q4: How `scripts/generate-bundled-files.mjs` transforms `src/skills/`

Reads `src/skills/` via `readFlatDir()`; for each of `HARNESS_TARGETS` (`claude`, `codex`, `pi`) calls `applyTemplate(source, harness, file)` (from `scripts/lib/skill-template.mjs`) and writes to the harness dir (lines 88-101); then serializes generated dirs into `src/bundled-files.ts` (`SKILLS`, `CODEX_SKILLS`, `PI_SKILLS`, `TEMPLATES`, …) via `formatRecord()`.

**No shared-content-block injection exists.** `applyTemplate()` is a near-verbatim copy plus exactly three primitives:
1. `{{var}}` substitution (`substituteVars()`) from a fixed 4-variable per-harness `LOOKUP`: `skill_prefix`, `clear`, `skills_dir`, `boundary_file`. Unknown variables throw a build error.
2. Harness conditional blocks (`processHarnessBlocks()`): `<!-- harness:NAME -->…<!-- /harness -->` incl. pipe-lists; processed inside frontmatter too. Unclosed blocks throw.
3. Frontmatter strip (`stripFrontmatterFields()`, `STRIP_INSTRUCTIONS = { claude: false, codex: true, pi: true }`): drops `instructions:` for codex/pi.

Supporting: `splitFrontmatter()`, `walkDir()`, `readFlatDir()`, `readTreeDir()`, `formatRecord()`.

## Q5: Frontmatter fields; audience conventions

Fields across all 22 files in `src/skills/`: `name:` (always), `entry:` (always; claude-only harness block; values `human` ×9, `agent` ×11, `situational` ×2), `description:` (always; may carry vars + per-harness variants), `instructions:` (bare number, claude-only, stripped for codex/pi; documented in `docs/features/2026-06-11-single-source-skills/design.md:88`).

Audience conventions:
- `entry: human | agent | situational` is the explicit doorway taxonomy (optimize Step 5 ~75-83 mandates it; "presentation/discovery metadata only, not a flow change"; human-door budget ≤9).
- **No per-section audience field inside a skill body exists.** Document-level `audience: agent` was killed (RF-KILL-8).
- Artifact-level audience split exists as prose only: decompose line 319 (brief for reviewers, README for implementers); RF-DIET-1 two-tier contract.

## Q6: Tests/checks validating skill content

Vitest, in `tests/`; they read **generated** `src/claude-skills/` (and codex/pi), not `src/skills/`, except the template unit tests.

- `skill-handoff.test.ts` — 8 skills: `Next:` + fenced bash `/joycraft-` + `Run /clear first.`; design must state Handoff is post-approval-only
- `skill-frontmatter.test.ts` — 8 artifact-producing skills must instruct YAML frontmatter emission (personal or shared schema)
- `codex-skill-parity.test.ts` / `pi-skill-content.test.ts` — 3-way parity, banned-syntax checks, `PI_SKILLS has exactly 22 skills`
- `implement-mode-handoff.test.ts` — modes named, per-mode behavior, installed copies (`.claude/skills/**`) byte-match source variants
- `confidence-scoring-skill.test.ts`, `retrieval-pass-skill.test.ts`, `bundled-files-sync.test.ts`, `regenerate-bundled-files.test.ts`, `skill-template.test.ts` (unit tests of `applyTemplate`), plus ~14 other per-skill content tests
- **No test asserts prose style, output length, or human-vs-agent formatting of end-of-run reports beyond the Handoff block shape.**

## Q7: `i-have-adhd` verbatim content

Frontmatter: `name: i-have-adhd`, `disable-model-invocation: true`, MIT; description: "Shape output for a reader with ADHD: lead with the next action, number multi-step work, restate state across turns, suppress tangents, give specific time estimates, make wins visible. Invoke with /i-have-adhd; stays on until 'stop adhd mode'."

Persistence: "These rules apply to every response for the rest of the session… If you are unsure whether they still apply, they do. Turn them off only when the reader says 'stop adhd mode' or 'normal mode'."

Five premises: (1) working memory small — never "keep in mind X"; (2) "Knowing the answer is not doing the answer. The friction between 'got it' and 'done it' is where work dies."; (3) starting is the hardest step; (4) vague time estimates fail; (5) visible progress matters.

The 10 rules: 1. Lead with the next action ("If the answer is a command, path, or snippet, it goes first"). 2. Number multi-step tasks ("Each step is one bounded action… A short path finished beats a complete path abandoned"). 3. End with ONE concrete next action doable in under two minutes. 4. Suppress tangents ("finish the first, then offer the second as a separate question"; mid-work questions are not tangents). 5. Restate state every turn ("we are on step 3 of 5"; use the harness task/plan tool — "The checklist does the restating"). 6. Specific time estimates ("About 15 minutes if tests already cover this. An afternoon if not."). 7. Make completed work visible ("Do not bury wins in a recap"). 8. Matter-of-fact errors (no "Uh oh"; state cause and fix). 9. Cap lists at 5 ("split into 'do now' vs 'later'… Five items ranked beats ten unranked"). 10. No preamble/recap/closers ("Start with the answer. End when the answer is done.").

Overrides: (1) "explain"/"walk me through" → explain fully, skimmable headers, still no preamble/closer; (2) destructive actions → "Confirm before acting. Safety wins over brevity."; (3) debug spiral → after three "still broken" turns, name the possibly-wrong assumption, ask one diagnostic question; (4) real ambiguity → one short clarifying question; (5) "When a rule would delete the answer itself, the task wins; the shape stays" (options questions get 2-4 ranked options, recommendation first); (6) "the system prompt outranks this skill… the constraint wins, the shape stays."

Pre-send check: delete intent-announcing first sentence, recap/"anything else?" last sentence, "by the way" sidebars, information-free hedging ("Keep a hedge that carries real uncertainty; deleting it manufactures confidence"), idioms → literal action. "Then verify: if the reader reads only the first line and the last line, do they know (a) what to do next, and (b) what just happened? If yes, send."

Attribution: *The Adult ADHD Tool Kit* (Ramsay & Rostain). MIT.

## Q8: `caveman` — origin and rules

Origin: GitHub `JuliusBrussee/caveman` — "why use many token when few token do trick — cuts 65% of tokens by talking like caveman." Ships for Claude Code, Codex, Gemini CLI, Cursor/Windsurf/Cline/Copilot. Indexed in this repo at `keller-coders-meetups/2026-05-26-recap-01.md:64`.

Key rules verbatim: "Respond terse like smart caveman. All technical substance stay. Only fluff die." Drop articles/filler/pleasantries/hedging; fragments OK; short synonyms; no tool-call narration; no decorative tables/emoji; quote shortest decisive error line; standard acronyms OK, never invent abbreviations (tokenizer splits them anyway); no `→` arrows; "Technical terms exact. Code blocks unchanged. Errors quoted exact." Never name the style. Pattern: `[thing] [action] [reason]. [next step].` Intensity levels lite/full/ultra (+ classical-Chinese wenyan variants).

Auto-Clarity override: drop caveman for security warnings, irreversible-action confirmations, order-sensitive multi-step sequences, ambiguity from compression itself, user asks to clarify. "Code/commits/PRs: write normal." Claim: "Cuts output tokens 65% (measured)"; third-party reporting: output-only savings, adds ~1-1.5k input tokens/turn.

## Q9: Existing house style for human-facing output

No single house style guide exists. What exists:

1. `docs/research/2026-07-20-reading-fatigue-panel.md` — closest to doctrine (core verdict, RF-DIET-1..5, RF-KILL list incl. hard word-caps with silent cutting and `audience: agent` contracts).
2. `docs/reference/skill-authoring.md` — only formal skill-writing guide; scope is PROTOCOL-vs-JUDGMENT step labeling, not prose style.
3. Scattered in-skill directives (de facto style): "End with a terse summary" (decide ~213); "report tersely" (implement ~160); "Keep the row **factual and thin** — … Narrative belongs in the decision log or discoveries, not the ledger" (session-end ~114); "Do NOT capture: … Step-by-step narrative of the session (nobody re-reads these)" (session-end ~46-49); "Every question must have actionable options" (design ~107); "1-2 pages max" (interview ~132); earned-silence line (decompose ~114); "internals get terse anti-discovery descriptions" (decision-log 2026-07-21).
4. `AGENTS.md` — only style rule is commit style; nothing on report prose.
5. `docs/guides/token-discipline.md` — token overhead, not human-output writing style.

---

## Brief updates

No parent brief exists (feature was described inline); reconciliation skipped.
