---
status: active
owner: Maximilian Maksutovic
created: 2026-09-01
feature: 2026-08-30-curated-harness
---

# Design — curated-harness

**Brief:** docs/research/2026-08-30-curated-harness-brief.md
**Research:** docs/research/2026-08-30-curated-harness-research.md (Q1–Q10, closed)
**Panel:** docs/research/2026-09-01-context-map-panel-verdict.md (13-agent adversarial panel on the pointer layer; verdict: L2 survives — smaller, harder-gated, metered)
**Stamped decisions (do not reopen):** D1 (7-day staleness), D2 (telemetry at session-end, optimize consumes), D3 (scanner = CLI subcommand), D4 (exactly-seven evidence labels), D5 (Product Identity in L1, elicit-first, zero-sum + behavioral check), D6 (check-shaped folder map) — docs/context/decision-log.md 2026-08-31/2026-09-01.

## 1. Current State

**Prior knowledge reused:**
- `docs/context/decision-log.md` 2026-08-31 — Curated-harness D1 (7-day advisory staleness) and D2 (scan at session-end; optimize consumes).
- `docs/context/decision-log.md` 2026-08-11 STE D2 — user-side script obligations are "obtrusive and out of the spirit of a skill"; linter stayed maintainer-only. Constrains how the telemetry scanner ships.
- `docs/context/decision-log.md` 2026-07-21 living-harness D3 — human-door budget ≤9; no new skill doors without cause.
- `docs/context/decision-log.md` 2026-07-31 team-ready D3 — custom output templates; machine-required sections always appended (pattern for new AGENTS.md sections: append-only, regex-guarded).
- `docs/reference/knowledge-lifecycle.md` rotation procedure — "defined once here and invoked from both joycraft-add-fact and joycraft-session-end — never re-implemented per-writer." The home for any new lifecycle rule.

**What exists (research Q1–Q10 + this session's exploration):**

- **Transcripts.** Claude Code: `~/.claude/projects/<cwd-dash-encoded>/*.jsonl`, structured `input.file_path` on Read/Write/Edit `tool_use` blocks. Pi: `~/.pi/agent/sessions/--<cwd-dash-encoded>--/*.jsonl`, typed events. Codex: `~/.codex/sessions/.../rollout-*.jsonl`, file ops only as `exec_command` shell strings — parsing is best-effort.
- **No JSONL reader exists** anywhere in `src/`/`scripts/` — the scanner is greenfield. The house pattern to copy is `src/detect.ts`: small pure `detectX(dir): T | null` functions composed by one exported entry point taking `dir` explicitly, tested in `tests/detect.test.ts`. External-path precedent: `src/frontmatter.ts:117-123` `defaultMemoryDir()` derives `$HOME/.claude/projects/<encoded>/memory` at runtime (no literal absolute paths in shipped text).
- **optimize** (`src/skills/joycraft-optimize.md`, 266 lines): six dispositions, **exactly five** evidence labels (":48-58", disjoint from dispositions), disposition table `| Control | Home File | Disposition | Evidence | Reason |`, Reaper pass with three-leg shipped-delete proof. Pinned by `tests/add-reaper-pass.test.ts`, `tests/upgrade-optimize-v2.test.ts`.
- **session-end** (211 lines): Step 1 consolidates discovery stubs; Step 1b routes to four context docs (unconditional prose); Step 2b (claude-only harness block) writes the ledger + reap marker. Pinned by `tests/session-end-rescope.test.ts` (3-variant parity).
- **add-fact** (207 lines): Step 2 classifies into five context docs by signal words; Step 2b overlap-grep; **Step 6 (last, optional)** considers a `{{boundary_file}}` rule; no step considers deny-patterns or CI checks.
- **Generators.** `improveCLAUDEMd` / `improveAgentsMd` append a generated section only when no header matches its regex (`src/improve-claude-md.ts:250-299`, `src/agents-md.ts:111-150`); no identity/glossary/taste section exists in either. New `src/templates/context/` files register via the recursive walk in `scripts/generate-bundled-files.mjs` — drop in + regenerate, CI catches staleness.
- **init** already writes `.claude/settings.json` three ways (`src/init.ts:348-440`): SessionStart hook, idempotent env var ("only set when absent — never clobber"), permissions merge; malformed-JSON guard skips rather than corrupts. Interactive asks use the one-readline-per-prompt idiom (`src/harness.ts:73-96`) with a pure, tested parser.
- **tune** raises findings inside dimension rows (advisory-only, never auto-edits) and treats every assessed file as untrusted data (`src/skills/joycraft-tune.md:14`). Reads only `docs/.joycraft/state.json` (`autoOpen`).
- **Line budgets.** optimize 266, interview 328, tune 228, session-end 211, add-fact 207 — all already over the ≤200 advisory budget; gather-context (71) is the only touched skill with headroom.
- **No staleness machinery exists.** The knowledge layer's only trigger is size (200-line rotation); `probation:` is model-change-triggered. D1's 7-day rule is new policy and needs one home.

## 2. Desired End State

Six workstreams, shipped as two feature queues plus riders:

**WS1 — read telemetry ("earn your keep").** A pure scanner module in `src/` exposed as a `joycraft telemetry` CLI subcommand (D3); session-end invokes it via npx and skips gracefully (evidence `INACCESSIBLE`) when unavailable. It maps transcript tool calls to per-doc read/write counts for the knowledge layer (`docs/context/**`, `docs/discoveries/**`, `AGENTS.md`, `CLAUDE.md`, `docs/reference/**`). Claude + Pi structured parsing first; Codex ships behind the same interface as best-effort shell-string parsing (anchor: 100 — formats verified in research Q1/Q2). **Hard requirement (panel, 5/6): every read is tagged `mandated` (the active skill's own text opens the doc — session-end 1b, add-fact 2b, optimize's Reaper pass) or `voluntary` (the agent followed a pointer mid-task); only voluntary reads count toward retire/keep evidence** — raw counts would spuriously vindicate the tier. Counts accumulate in a machine-local, gitignored `docs/.joycraft/telemetry.json` keyed by repo-relative doc path, with a scanned-session list so each session file is parsed once (anchor: 75 — file sizes from research make full rescans viable but wasteful). session-end triggers the scan (D2); optimize reads `telemetry.json` and surfaces the evidence via the exactly-seven label vocabulary (D4): `NEVER_READ` (≥1 write, 0 voluntary reads), `WRITE_HEAVY` (≥3:1 writes:voluntary reads) join the existing five; a telemetry-backed healthy row is `VERIFIED`, absent telemetry is `INACCESSIBLE`. Reaper RETIRE recommendations cite the counts under the panel's pre-committed rules: after 30 sessions or 60 days, zero voluntary reads → RETIRE candidate (insurance exemption for troubleshooting-class docs, whose healthy baseline is near-zero); voluntary reads in >20% of feature-shaped sessions → survives outright; aggregate voluntary reads below ~1 per 10 sessions at the 30-session mark → the four non-decision-log docs collapse into decision-log rows, L1 lines, or deletion; 60 days without resolution → default is shrink, not extend-the-study. Team-scale note: before recommending telemetry to multi-contributor projects, per-user counts must merge at optimize time (aggregates, never transcripts) — machine-local counts bias RETIRE evidence toward kill past ~3 contributors.

**WS2 — discovery lifecycle ("graduate or die").** The 7-day staleness rule (D1) is written once in `docs/reference/knowledge-lifecycle.md` (and its shipped template twin); session-end and optimize invoke it by citation, flagging discoveries whose `created:` is >7 days old, whose `status:` is not terminal, and (when telemetry exists) with zero voluntary reads — advisory list, never auto-delete (anchor: 100 — D1 stamped). Panel validation rule for D1: if more than half of 7-day flags fire on discoveries subsequently read, the threshold moves (the decision-log revisit clause anticipates this). add-fact's Step 2 rubric gains the three decay-category bans (redundant-with-{{boundary_file}}, expired shipped-state, point-in-time hazard) as reject-signals before classification (anchor: 75 — rubric structure verified; exact wording is implementation). The lifecycle doc also states the panel's honest-residue caveat out loud: content that is situational AND must-read (rare catastrophic hazards) has no good home in the tier model — the dangerous-assumptions doc must not imply a delivery guarantee it cannot make; the checkable subset converts via harden, the worst of the rest promotes to L1, the remainder is documented accepted risk.

**WS3 — harden-first routing.** add-fact's capture question reorders: a new early step asks "can this be architecture / a deny pattern / a CI check?" and routes to `{{skill_prefix}}harden` before doc classification; the current Step 6 boundary-prose consideration folds into that step (one home for the escalation question). session-end Step 1b gains the same one-line escalation gate. Blast radius: `tests/session-end-rescope.test.ts` and add-fact content tests update in the same commit (anchor: 100 — test pins verified this session).

**WS4 — directional AGENTS.md content.** One `## Product Identity` section (subsections Values / Glossary / Taste) per generator, appended via the existing header-regex guard so existing user files are never modified (anchor: 100 — merge behavior verified at src/improve-claude-md.ts:250-299) — **elicit-first: the section is written only when gather-context/interview collected real content; init never scaffolds a TODO stub** (D5). Two panel conditions ride the decision: (1) *zero-sum admission* — guidance in the elicitation flow that every directional line added to L1 names the line it displaces, ideally an ALWAYS/NEVER prose rule converted to a deny pattern via harden; (2) *behavioral check before broad rollout* — pick 2–3 concrete behaviors the section should change and compare with/without on Joycraft's own sessions (value-prose has A/B evidence of changing nothing); ship small and dated with a pre-committed review at the next optimize run. gather-context (71 lines, has headroom) gains the elicitation questions; interview gains at most a pointer. The generated architecture section becomes a **check-shaped folder map** (D6): folders + one-line descriptions, regenerated from the real filesystem at init/upgrade, drift-diffed by tune (advisory) so a stale map fails a check instead of misleading an agent; the docs name the growth path — past multi-team scale the root map gives way to nested per-directory instruction files via joycraft-collaborative-setup, never a bigger tree. Joycraft's own 40-line AGENTS.md tree is the first trim candidate.

**WS5 — positioning.** README gains the "curated harness, not a memory system" stance and an Acknowledgments section (Zechner, Ronacher, Browne, Lauren, Martin). Rides any release PR; no code.

**WS6 — auto-memory recommendation.** init offers (interactive ask, readline idiom) to write `"autoMemoryEnabled": false` into the project's `.claude/settings.json`, idempotent and never clobbering an explicit value, skipping on malformed JSON — exactly the existing init.ts settings pattern (anchor: 100 — pattern verified at src/init.ts:369-440). tune gains a finding: auto-memory enabled + non-empty project memory dir → advisory graduate-then-archive recommendation. Any cleanup guidance explicitly spares `joycraft-owner.txt` (owner-resolution cache; git-config fallback exists but the file is not stale memory) (anchor: 100 — resolveOwner verified). Pi has no auto-memory to disable (anchor: 50 — reported in brief, not verified against Pi docs); Codex equivalent unknown — both are a one-line research note in the tune finding, not machinery.

**Sequencing:** feature 1 `earn-your-keep` = WS1+WS2 (telemetry feeds lifecycle). Feature 2 `harden-first-directional` = WS3+WS4 (skill/template content edits, ask-first — this design is the ask). WS5 rides a release PR; WS6 ships independently (approved in principle 2026-08-30).

## 3. Patterns to Follow

**Pure scanner + explicit dir (src/detect.ts:329, tests/detect.test.ts):**
```ts
export async function detectStack(dir: string): Promise<StackInfo>
```
Small per-source functions returning `T | null`, composed by one entry point that takes its root as a parameter. The telemetry scanner mirrors this: `parseSessionLine(line): FileOp | null` per harness + `scanTranscripts(projectDir, transcriptDir)` — injectable paths, like `ResolveOwnerOptions` (src/frontmatter.ts:109-114).

**Runtime-derived external path (src/frontmatter.ts:117-123):**
```ts
const encoded = cwd.replace(/\//g, '-');
return join(home, '.claude', 'projects', encoded, 'memory');
```
Shipped skill/template text never carries a literal absolute path; the path is derived from `$HOME` + encoded cwd at runtime.

**Idempotent settings write (src/init.ts:394-403):** "only set when absent — never clobber an explicit user value", with the malformed-JSON skip guard at :377-382. The WS6 init offer copies this verbatim shape.

**Lifecycle rule with one home (docs/reference/knowledge-lifecycle.md:41):** "This procedure is defined once here and invoked from both `joycraft-add-fact` and `joycraft-session-end` — never re-implemented per-writer." The 7-day staleness rule lands as a sibling section under the same contract.

**Append-only section merge (src/improve-claude-md.ts:250-299):**
```ts
if (!hasSection(sections, /context\s*map/i)) additions.push(generateContextMapSection());
```
New directional sections add one generator + one regex line per file; existing content is never modified. Note the two files don't share matching code — WS4 touches both.

**Advisory finding in a tune dimension row (src/skills/joycraft-tune.md:41):** findings live inside the scoring row, advisory-only, "tune never auto-edits." The WS6 auto-memory finding and WS2 stale-discovery list both take this voice.

**Evidence discipline (src/skills/joycraft-optimize.md:58):** "Anything not mechanically checked this run is `INFERRED` or `INACCESSIBLE` — never `VERIFIED`." Telemetry-backed rows are `VERIFIED` only when this run read `telemetry.json`.

## 4. Resolved Design Decisions

> **Decision:** Telemetry accumulates in machine-local, gitignored `docs/.joycraft/telemetry.json` (beside state.json); it stores only repo-relative paths + counters + scanned-session ids, never transcript content.
> **Rationale:** Transcripts are per-machine; committing counts would merge badly and publish individual work patterns (the brief's team-install privacy concern). `docs/.joycraft/` already splits machine-owned (state.json, gitignored) from shared (config.json, committed) — living-harness D4.
> **Alternative rejected:** A committed telemetry file (merge conflicts, privacy leak); rows in a context doc (machine exhaust in the human knowledge layer).

> **Decision:** The 7-day staleness rule (D1) gets ONE home — `docs/reference/knowledge-lifecycle.md` + its shipped template — and session-end/optimize cite it.
> **Rationale:** Matches the rotation-procedure precedent verbatim ("defined once here… never re-implemented per-writer") and output-style D5's ONE_HOME posture; both consuming skills are already over the line budget, so citation is also the cheapest ink.
> **Alternative rejected:** Restating the rule in both skills (two homes, +lines in over-budget files).

> **Decision:** Harden-first is a reorder inside add-fact (escalation check first, absorbing today's Step 6), not a new skill or door.
> **Rationale:** Research Q4 confirmed routing asks "which doc" first and boundary consideration last; Lauren's hierarchy inverts that order. `joycraft-harden` already exists with `entry: agent` — routing to it costs no door (living-harness D3 budget).
> **Alternative rejected:** Keeping Step 6 last and adding a parallel early check (two homes for the escalation question); a new routing skill (door budget, no new capability).

> **Decision:** WS6's init offer writes project-scope `.claude/settings.json` only, as an interactive ask defaulting to no-change; never the user's global settings.
> **Rationale:** The brief verified per-project disable works with global left on; touching `~/.claude/settings.json` would overstep into users' other projects. The write reuses init's guarded idempotent pattern.
> **Alternative rejected:** Global recommendation (overreach); silent write (violates the never-overwrite-user-files boundary).

> **Decision:** Codex telemetry ships behind the same scanner interface as a best-effort `exec_command` string parser, clearly labeled degraded; Claude + Pi are the v1 fidelity targets.
> **Rationale:** Research Q2 — Codex has no structured file-op events; pretending parity would produce false RETIRE evidence. Same-interface keeps optimize's consumption harness-agnostic.
> **Alternative rejected:** Skipping Codex entirely (leaves codex-only installs with zero evidence); blocking v1 on Codex parity (unbounded).

> **Decision:** Additions to over-budget skills (session-end +, add-fact ±0 via Step-6 fold, optimize +) are paid for with same-commit trims or citations so net growth stays ≤ the lines added for new behavior; optimize's budget check remains advisory.
> **Rationale:** Five of six touched skills already exceed 200 lines; this feature is literally about harness decay — it must not worsen it.
> **Alternative rejected:** Accepting silent overage growth (contradicts the feature's own thesis).

> **Decision (D3, stamped 2026-09-01):** The scanner ships as a pure TS module in `src/` plus a `joycraft telemetry` CLI subcommand; session-end invokes it via npx and skips gracefully (`INACCESSIBLE`) when unavailable.
> **Rationale:** Human choice at the decide gate — "keeps things deterministic, testable"; detect.ts idiom, Codex string-parsing in code not prose.
> **Alternative rejected:** Inline bash/jq in the skill (jq not guaranteed, untestable prose logic); shipped script at init (contradicts STE D2, new installed surface).

> **Decision (D4, stamped 2026-09-01):** optimize's evidence vocabulary grows to exactly seven — `NEVER_READ` (≥1 write, 0 voluntary reads) and `WRITE_HEAVY` (≥3:1) join the five — same no-synonyms rule; vocab prose and tests update in the same spec.
> **Rationale:** Human choice — "we want things as greppable as possible"; the exactly-N contract is Joycraft's own anti-drift device and greppability is its purpose, so growing it keeps its spirit.
> **Alternative rejected:** Read/Write ratio column with labels unchanged (verdicts not greppable); ratio + stale marker rows (two report surfaces for one finding).

> **Decision (D5, stamped 2026-09-01):** One generated `## Product Identity` section (Values/Glossary/Taste) in the always-injected files, elicit-first (no TODO stubs), with the panel's two conditions: zero-sum admission and a behavioral check before broad rollout.
> **Rationale:** Panel unanimous on L1 placement (probabilistic reads defeat directional content on the sessions that need it), adopted by the human 2026-09-01; the conditions answer the A/B evidence that value-prose alone changes nothing.
> **Alternative rejected:** Stub at init (empty values sections are themselves decay); three top-level sections (six regex guards across two unshared merge chains); doc-layer-only (not always-loaded — defeats the point).

> **Decision (D6, stamped 2026-09-01):** The generated architecture section becomes a check-shaped folder map — folders + one-line descriptions regenerated from the real filesystem at init/upgrade and drift-diffed by tune — with the nested per-directory growth path documented.
> **Rationale:** Panel unanimous ("a hand-maintained tree is a guaranteed-drift prose copy of machine-derivable ground truth"), adopted by the human 2026-09-01; a generated-and-verified map is a check, not prose.
> **Alternative rejected:** Slim-only without the drift check (keeps the fastest-drifting artifact on the honor system); dropping the section (overshoots — a terse folder map is the one retrieval aid even the anti-memory camp endorses).

## 5. Open Questions

None — all four questions terminated `clarified` at the decide gate (D3–D6, 2026-09-01), informed by the 13-agent adversarial panel (docs/research/2026-09-01-context-map-panel-verdict.md). See Section 4 for the stamped decisions and Section 2 for how they land in the workstreams.

Panel follow-on candidate not yet scoped (flagged, not decided): converting the 200-line doc budget itself into a CI assertion (controls-advocate, uncontested) — backlog candidate pending human confirmation.

## Brief updates

Reconciliation checked against docs/research/2026-08-30-curated-harness-brief.md (already reconciled by the 2026-08-30 research pass). Edits made: `> **Design:**` back-reference added to the header; decisions frontmatter block and Hard Constraints section stamped at the decide gate (2026-09-01). The brief's WS1 sketch "new evidence label (e.g. NEVER_READ, WRITE_HEAVY)" was contested by optimize's exactly-five contract and resolved in the sketch's favor (D4: exactly-seven). No other drift found.
