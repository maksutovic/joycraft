---
status: active
owner: Maximilian Maksutovic
created: 2026-07-27
feature: human-readable-output-style
reap: eligible
decisions:
  - id: B1
    question: skill-content ASK FIRST boundary — may this feature edit skill bodies?
    status: clarified
    choice: approve scoped skill edits
    rationale: because living-harness/compound-engineering additions make evolving skills over time an expected Joycraft behavior
  - id: B2
    question: template-content ASK FIRST boundary — may the style doc ship as bundled template content?
    status: clarified
    choice: yes — ship it as a template
    rationale: because the living-harness posture covers shipping evolving harness content to users
  - id: D1
    question: where does the style doc live, and whom does it bind?
    status: clarified
    choice: ship to src/templates/reference/output-style.md; keep Joycraft-repo-specific guidance repo-local
    rationale: because the consumer of the library should not be impacted by Joycraft's own self-hosting quirk, which gets extra guidance here in this repo instead
  - id: D2
    question: short positively-framed rules, or a full anti-slop banned list?
    status: clarified
    choice: short positive rule set (~6-10) with stated motivation
    rationale: because Anthropic's first-party guidance is the only evidence about the models Joycraft actually runs on, so it outranks star counts on skills never tested against frontier Claude
  - id: D3
    question: how much should a test enforce — pointer, placement, or prose?
    status: backlogged
    choice: backlogged
    rationale: because the ≤5 question cap deferred it; presence-only is the standing recommendation pending a decision
  - id: D4
    question: which skills get the pointer — all 9 entry: human, or only heavy output moments?
    status: backlogged
    choice: backlogged
    rationale: because the ≤5 question cap deferred it as lower blast radius than the boundary and rule-shape questions
  - id: D5
    question: should this feature also consolidate the existing scattered terseness directives?
    status: backlogged
    choice: backlogged
    rationale: because the ≤5 question cap deferred it; it widens the diff across six skills and can ride a later optimize ONE_HOME pass
  - id: D6
    question: must the style doc carry at least one worked before/after example?
    status: clarified
    choice: yes — the doc contains at least one worked before/after example
    rationale: because the prose research's finding that concrete examples beat abstract instructions is the cheapest lever available, and it costs ~10 lines in a doc that already states motivation per rule (stamped at decompose 2026-07-27, resolving design Q3 Option C's example half)
  - id: D7
    question: which skills carry the style pointer?
    status: clarified
    choice: 11 skills — every human-facing output moment except joycraft-setup
    rationale: because the artifact decides, not the door — optimize, verify, and decide are entry: agent but emit heavily human-read reports and dossiers, while joycraft-setup is an 18-line router whose only output is a single instruction (stamped at decompose 2026-07-27, resolving backlogged D4)
---

# Feature Brief — human-readable output style

> **Design:** docs/features/2026-07-27-human-readable-output-style/design.md
> **Dossier:** docs/features/2026-07-27-human-readable-output-style/dossier.html
> **Research:** docs/research/2026-07-27-human-readable-output-style.md (structure)
> **Research:** docs/research/2026-07-27-prose-style-techniques.md (sentence-level prose)

## Vision

Joycraft's human-facing output moments — assessment reports, handoffs, design
presentations, decomposition tables — obey one short, explicit style contract.
Agent-facing artifacts (specs, queue JSON, frontmatter, knowledge-layer rows,
deny patterns) stay dense and unchanged. The scarce resource is the human
channel; it should carry decisions, not acknowledgments.

## Hard Constraints

- Skill-body edits are approved for this feature (B1), but every edit requires
  bundle regeneration and installed-copy sync in the same commit or parity
  tests fail.
- The style doc ships as bundled template content at
  `src/templates/reference/output-style.md` (B2, D1) — it lands in user
  projects at `docs/templates/reference/output-style.md`.
- Joycraft-repo-specific guidance about its own self-hosting path asymmetry
  stays repo-local and must not reach the consumer of the library (D1).
- The rule set is short (~6-10 rules), positively framed, and states the
  motivation behind each rule (D2). No long banned-phrase list.
- No new user-invocable skill — the `entry: human` door budget is full at 9.
- No rubric self-scoring loop in any skill (writer-judge reward hacking).
- Style rules are not duplicated into skill bodies; skills cite the doc by
  path, matching the existing seven-skill pointer idiom.
- Pointer placement must avoid the position-fragile 1500-char windows sliced
  by `tests/retrieval-pass-skill.test.ts` and
  `tests/confidence-scoring-skill.test.ts`.
- No new runtime dependencies (AGENTS.md NEVER).

## Out of Scope

- Prose-quality assertions in tests (no mechanical oracle; RF-KILL-2 rejected
  hard word-caps with silent cutting).
- Porting `i-have-adhd` or `caveman` as bundled skills.
- Consolidating the existing scattered terseness directives (D5, backlogged).

## Success Criteria

- `src/templates/reference/output-style.md` exists, ships via `TEMPLATES`, and
  lands in a scaffolded project at `docs/templates/reference/output-style.md`.
- Human-facing output moments cite it by path.
- `pnpm test --run && pnpm typecheck` pass, including 3-way harness parity and
  installed-copy byte-match.
- No change to any `entry: agent` artifact contract.

## Execution Strategy

Decomposed 2026-07-27 into six specs — see
`docs/features/2026-07-27-human-readable-output-style/specs/README.md`.

- **Wave 1: spec 1** (write the style doc) — sequential; everything depends on it.
- **Wave 2: specs 2, 3, 5** — parallel-safe, Affected Files disjoint (a new test
  file, eleven `src/skills/` bodies, one repo-local reference doc). Spec 3 still
  warrants its own context — it is `isolated` for risk, not for file overlap.
- **Wave 3: spec 4** (pointer presence test) — sequential, depends on 3.
- **Wave 4: spec 6** (regenerate + sync) — sequential and terminal. NOT
  parallel-safe with anything: it derives from every preceding spec's output.

The regeneration is deliberately terminal rather than folded into each spec, so
generated-file churn lands in exactly one reviewable commit.

**Principal hazard:** the position-fragile windowed tests
(`retrieval-pass-skill`, `confidence-scoring-skill`) read *installed* skill
copies, so they stay green through spec 3 and only see the pointer edits after
spec 6 syncs. A placement mistake made in spec 3 therefore surfaces in spec 6.
The fix is always to relocate the pointer in `src/skills/` and regenerate — never
to widen a window or edit an assertion.

## Related backlog

- `docs/backlog/2026-07-27-decide-gate-mandatory.md` — any artifact with open
  questions MUST invoke decide, every time.
- `docs/backlog/2026-07-27-auto-open-review-artifacts.md` — auto-open review
  artifacts the way the dossier already does.
- `docs/backlog/2026-07-27-output-style-deferred-decisions.md` — D3/D4/D5.
