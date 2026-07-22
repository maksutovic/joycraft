---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-21
feature: 2026-07-21-living-harness
mode: isolated
---

# Create Harden Skill — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-21-living-harness/brief.md`
> **Status:** Ready
> **Date:** 2026-07-21
> **Estimated scope:** 1 session / 5 files / ~180 lines

---

## What

A new repo-local skill `joycraft-harden` (`entry: agent` — an internal, not a human door, D3) that converts eligible ALWAYS/ASK FIRST/NEVER boundary prose into machine-checked form on the **existing two enforcement surfaces only**: `permissions.deny` strings in `.claude/settings.json` and regexes in `.claude/hooks/joycraft/deny-patterns.txt` (S6). Every converted or declined rule gets inline provenance stamped as an HTML comment on its AGENTS.md line: `<!-- origin: <failure|source> <date>, probation: <model> -->` (S7). As proof, at least one real Joycraft boundary is converted. `joycraft-tune` learns to label boundaries **declared** vs **verified** (verified = a matching deny pattern/hook exists), flag provenance-stamped rules for probation review on model upgrades, and point its roadmap at harden.

## Why

Prose boundaries are rules the model merely hopes to follow (Nate Rule 5 — prose hopes, locks enforce), and rules without origin/date provenance outlive the model or failure that created them.

## Acceptance Criteria

- [ ] `.claude/skills/joycraft-harden/SKILL.md` exists with frontmatter `entry: agent` and a terse anti-discovery description ("Invoked by tune, optimize, or session-end … — not a user entry point.")
- [ ] Harden's flow (PROTOCOL where marked): read AGENTS.md boundaries + current `settings.json` `permissions.deny` + `deny-patterns.txt` → classify each rule **eligible** (expressible as a command/edit pattern) or **ineligible** (semantic; stays prose, labeled so) → propose **exact diffs** to the two surfaces → apply only on explicit human approval (PROTOCOL — never auto-apply) → stamp inline provenance on the AGENTS.md rule line (PROTOCOL)
- [ ] Provenance format is exactly `<!-- origin: <failure|source> <date>, probation: <model> -->` — inline on the rule line, invisible in rendered views (resolved design decision: no sidecar table)
- [ ] At least one real boundary from this repo's AGENTS.md is converted and live (e.g. "Push directly to main/master" → a `deny-patterns.txt` regex), with provenance stamped
- [ ] Tune labels each Behavioral Boundary `declared` or `verified` in its boundary-dimension output, surfaces probation-due rules (provenance model ≠ current model), and its roadmap/Tier suggestions reference `/joycraft-harden`
- [ ] Harden never edits `src/safeguard.ts` or adds new hook frameworks — it appends to the generated files only
- [ ] New skill and tune edits carry the PILOT divergence marker
- [ ] Build passes (`pnpm typecheck`)
- [ ] Tests pass (`pnpm test --run`)

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Skill exists, entry: agent | `grep -A2 '^entry:' .claude/skills/joycraft-harden/SKILL.md`-style frontmatter check | structural |
| Flow completeness | grep SKILL.md for classify/eligible/ineligible, exact-diff proposal, explicit-approval gate, provenance stamp | structural |
| Provenance format | grep SKILL.md for the literal `origin:` / `probation:` comment template | structural |
| Proof conversion live | new regex present in `deny-patterns.txt`; matching `<!-- origin:` comment on the AGENTS.md rule line | structural |
| Hook still works | `echo 'git push origin main' \| .claude/hooks/joycraft/block-dangerous.sh` (or the hook's actual stdin contract) exits 2 for the new pattern | integration |
| Tune labels | grep tune SKILL.md for `declared`/`verified` and probation | structural |
| Suite green | `pnpm test --run && pnpm typecheck` | unit |

**Execution order:** write assertions (red) → author the skill → convert the proof boundary (with the human's approval, per the skill's own gate) → edit tune (green).

**Smoke test:** the `block-dangerous.sh` exit-2 check on the newly added pattern — seconds, and it's the actual enforcement surface.

**Before implementing, verify your test harness:**
1. Run all checks — they must FAIL first (skill absent, pattern absent)
2. The hook test drives the real installed hook script, not a reimplementation of its grep
3. Smoke test runs in seconds

## Constraints

- MUST: target only the two existing surfaces — `permissions.deny` + `deny-patterns.txt` (resolved design decision; the machinery in `src/safeguard.ts` generated them and stays untouched)
- MUST: show exact diffs and wait for explicit approval before touching settings (D3; advisory-not-applied pattern from lockdown/tune)
- MUST: leave ineligible rules as prose, labeled ineligible — judgment stays with the model (Nate's caution)
- MUST: keep the description terse and anti-discovery — it costs always-loaded description budget (D3 rationale)
- MUST NOT: touch `src/`, `templates/`, or rename/modify lockdown's flow (they stay unchanged during pilot)
- MUST NOT: convert ASK FIRST rules into hard denies without flagging the semantic downgrade (deny ≠ ask)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `.claude/skills/joycraft-harden/SKILL.md` | The new internal skill |
| Edit | `AGENTS.md` | Provenance comment on ≥1 converted rule line |
| Edit | `.claude/hooks/joycraft/deny-patterns.txt` | ≥1 new pattern (proof conversion) |
| Edit | `.claude/settings.json` | `permissions.deny` additions if the proof rule fits that surface |
| Edit | `.claude/skills/joycraft-tune/SKILL.md` | declared/verified labels, probation surfacing, roadmap pointer |

## Approach

Harden is convert-what-exists; lockdown remains greenfield-interview (design §5 Q-D3 — merging the flows muddies each; rejected alternative: extending lockdown). Classification heuristic: a rule is eligible iff it can be stated as a command regex or file-path pattern with near-zero false positives; when in doubt, ineligible. Proof candidate: "NEVER push directly to main/master" — it's a pure command pattern and this repo's most safety-critical boundary. Tune reads provenance comments when scoring the boundaries dimension; "verified" requires an actual matching pattern, not the comment's presence.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Rule already covered by an existing deny pattern | Label verified, stamp provenance if missing — don't duplicate the pattern |
| Regex would false-positive legitimate commands (e.g. `git push origin main-docs`) | Anchor the regex (word boundaries); if not safely expressible, classify ineligible |
| Human rejects a proposed conversion | Rule stays prose; record the rejection in the harden run summary (reject-framing escape) |
| settings.json has no `permissions.deny` array | Create it; never disturb `permissions.allow` or hooks config |
| Probation review (model upgrade) | Tune lists rules whose `probation:` model ≠ current; human decides keep/retest/retire — harden never auto-retires |
