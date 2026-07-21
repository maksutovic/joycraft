---
status: in-review
owner: Maximilian Maksutovic
created: 2026-07-20
feature: 2026-07-20-decision-dossier
mode: checkpoint
---

# Add Decide Skill — Atomic Spec

> **Parent Brief:** `docs/features/2026-07-20-decision-dossier/brief.md`
> **Status:** Ready
> **Date:** 2026-07-20
> **Estimated scope:** 1 session / 1 new skill directory (repo-local)

---

## What

A repo-local skill at `.claude/skills/joycraft-decide/SKILL.md` implementing
the deposition checkpoint: given a brief/design path, it derives ≤5
risk-ordered forced-choice questions (plus mandatory questions for anything
touching an ASK FIRST/NEVER boundary, outside the cap), builds an
assumptions-asserted-as-fact manifest, renders `dossier.html` into the
feature folder from the fixed template, opens it, captures choices + typed
rationales via the native question UI, and stamps results into the brief's
`decisions:` frontmatter, its Hard Constraints, and `docs/context/decision-log.md`.
Every question terminates in exactly one state: clarified | backlogged | discarded.

## Why

Today's Open Questions sections have no capture ergonomics and no terminal
lifecycle — questions linger unanswered while the context needed to answer
them lives elsewhere.

## Acceptance Criteria

- [ ] Skill invocable as `/joycraft-decide <brief-or-design path>`; scans
      `docs/features/*/brief.md` for open decisions when no path given
- [ ] Derives ≤5 questions from Resolved Decisions + Open Questions,
      risk-ordered (boundary-touching first); any decision touching an
      ASK FIRST/NEVER boundary from CLAUDE.md/AGENTS.md becomes a mandatory
      question exempt from the cap
- [ ] Renders `docs/features/<slug>/dossier.html` by filling the template's
      SLOT comments only — template structure and CSS byte-identical outside
      slots
- [ ] Dossier includes the assumptions manifest with UNVERIFIED labels on
      every unchecked load-bearing claim
- [ ] Opens the dossier (`open` on darwin, `xdg-open` fallback) before
      asking; offers artifact publishing as an optional extra render
- [ ] Every question includes a reject-framing escape; every answer captures
      a one-sentence rationale using the pattern chosen by
      verify-question-capture (exactly one re-prompt when missing)
- [ ] Answers stamp: `decisions:` frontmatter block (id/question/status/
      choice/rationale), Hard Constraints additions where a choice
      constrains implementation, and one decision-log row per decision
- [ ] Terminal states enforced: clarified | backlogged (writes/updates a
      `docs/backlog/` entry) | discarded (reason recorded); no decision left
      in `open` after the skill completes unless the user explicitly stops

## Test Plan

| Acceptance Criterion | Test | Type |
|---------------------|------|------|
| Question derivation + cap | Run against a fixture brief with 8 open questions incl. 2 boundary-touching; verify ≤5 + 2 mandatory | manual/e2e |
| Template fidelity | Diff generated dossier vs template outside SLOT regions → structure unchanged | unit (diff script) |
| Rationale capture | Answer one question without rationale; verify exactly one re-prompt | manual/e2e |
| Frontmatter stamping | After answering, parse brief YAML; every decision has terminal status + choice + rationale | unit (parse) |
| Backlog terminal | Answer one question "backlog it"; verify docs/backlog entry created and status backlogged | manual/e2e |

**Execution order:** write the fixture brief first, run the skill flow
against it red (skill absent → nothing happens), implement the skill,
re-run to green.

**Smoke test:** invoke the skill against the fixture brief (~2 min).

**Before implementing, verify your test harness:** the fixture brief must
live in a scratch feature folder (`docs/features/9999-99-99-fixture/`,
deleted before commit) so trials never stamp a real brief.

## Constraints

- MUST: consume the template from `docs/templates/DECISION_DOSSIER_TEMPLATE.html`;
  never generate freeform dossier HTML
- MUST: keep dossier display-only — capture happens exclusively in the
  question UI (brief's local-server clarification)
- MUST: include the pilot divergence marker comment (`<!-- PILOT: repo-local,
  not in src/ — see brief decision #7 -->`) in the skill file
- MUST NOT: create or modify anything under `src/` or `templates/` — this
  skill is repo-local for the pilot
- MUST NOT: present a question without the reject-framing escape (RF-KILL-6)
- MUST NOT: self-certify the question set as complete — the manifest exists
  because the reviewee filters the review channel (RF-KILL-3)

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| create | `.claude/skills/joycraft-decide/SKILL.md` | the skill |
| create | `docs/features/<slug>/dossier.html` (at runtime) | generated per feature |
| modify | `docs/context/decision-log.md` (at runtime) | one row per decision |

## Approach

Skill is pure prompt logic: read brief + boundaries → derive/rank questions
→ fill template slots → open → ask (AskUserQuestion with reject escape) →
re-prompt once for missing rationale → stamp three surfaces → enforce
terminal states. Rejected alternative: stamping only the decision-log and
not brief frontmatter — rejected because the decompose gate (spec 4) reads
frontmatter as its single source (locked D3), and a second source would
recreate the two-systems drift.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Brief has zero open questions | Skill says so, verifies `decisions:` block reflects it, exits without dossier |
| User rejects framing on every question | Free-text answers captured verbatim; skill restates each as a decision row and confirms before stamping |
| >5 non-boundary questions derived | Lowest-risk overflow recorded in the brief as pre-backlogged decisions, named out loud (visible residue, never silent cut) |
| Brief lacks a `decisions:` block | Skill creates it |
| User stops mid-questioning | Answered decisions stamp; unanswered stay `open`; skill states the gate remains closed |
