---
feature: talk-review-tan-holmes
status: specified
decisions: [
  {
  "id": "dead-reference-scope",
  "status": "clarified",
  "question": "How much does spec 02 of enforced-gates remove?",
  "answer": "seven-and-text",
  "context": "Spec 02 removes four pointers to reference files that are not shipped, and adds a link test. The panel found three more: the shipped references name `runtime/hooks/judge.mjs` (context.md:70), `runtime/hooks/metrics.mjs` (retro.md:54) and `runtime/hooks/cli.mjs` (dispatch.md:182). No `runtime/hooks/` folder is in the payload. I checked this by hand. The payload also describes parts it does not ship: Jev scoring in context.md and a Claude SessionEnd hook in the session-end skill.",
  "why": "Ben Holmes (7:52–8:56): an agent that reads a stale instruction works around it and does not tell you. The only sign is a slower run.",
  "options": [
    {
      "value": "seven-and-text",
      "label": "Seven paths and the text about unshipped parts",
      "recommended": true,
      "description": "Remove all seven dead paths. Also remove the passages that describe hooks and the Jev ranker, which 1.x does not install.",
      "example": "context.md loses its Jev scoring section. The link test lists seven files on field-18 and none after the change.",
      "tradeoff": "Spec 02 grows. Each removed passage needs a check that no shipped file depends on it."
    },
    {
      "value": "seven-paths",
      "label": "Seven paths only",
      "description": "Remove the seven dead paths. Leave the descriptive text.",
      "example": "retro.md no longer tells the agent to run hooks/metrics.mjs. The Jev scoring text stays.",
      "tradeoff": "An agent can still read about a ranker that is not installed."
    },
    {
      "value": "four",
      "label": "Keep spec 02 as written",
      "description": "Four pointers, as specified on 2026-11-12.",
      "example": "The link test checks references and one level of runtime files.",
      "tradeoff": "A correct link test fails after the change, or a narrow test misses three paths."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "All four panel members supported this. It is the one change that makes the release remove more payload text than it adds.",
  "affected": [
    "dead-references",
    "docs/features/2026-11-12-enforced-gates/specs/02-dead-references.md"
  ]
},
  {
  "id": "review-cap",
  "status": "clarified",
  "question": "What happens to the rule \"a spec gets at most three reviews\"?",
  "answer": "enforce",
  "context": "The implement skill says a spec gets at most three reviews. No runtime file counts reviews. An agent can start reviews until one says PASS. This is the same kind of gap that enforced-gates closes: the rule is a sentence in a skill.",
  "why": "Lauren Tan (9:14): each correction becomes a check, or the problem is removed. Her reason for banning code comments is that they cannot be enforced (8:41).",
  "options": [
    {
      "value": "enforce",
      "label": "Enforce it in the runtime",
      "recommended": true,
      "description": "A small spec 05. The reviewer startup counts the earlier reports for the spec and refuses a fourth review. The message names the spec and says to record \"Decision needed\". Each code revision counts once, so a new review after an environment repair is not counted.",
      "example": "Three reviews of spec 4 failed. The agent starts a fourth. Startup exits 2: \"spec 4 has had three reviews; record Decision needed\".",
      "tradeoff": "New runtime behavior on all six harnesses. A wrong count would block a legitimate review."
    },
    {
      "value": "delete-number",
      "label": "Delete the number",
      "description": "Remove \"at most three\" from the skill. The other stop rule stays: a second FAIL on the same criterion, or a \"decision needed\" finding, stops fix rounds.",
      "example": "The implement skill loses one sentence. No runtime change.",
      "tradeoff": "Nothing limits reviews that fail on a different criterion each time."
    },
    {
      "value": "leave",
      "label": "Leave it",
      "description": "No change in this release.",
      "example": "The sentence stays and nothing checks it.",
      "tradeoff": "The rule holds only when the agent follows it."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "Three of four panel members chose to enforce it. The minimalist chose to delete the number, because a count could block the fresh review after an environment repair; counting code revisions answers that.",
  "affected": [
    "review-cap"
  ]
},
  {
  "id": "gate-on-all-harnesses",
  "status": "clarified",
  "question": "Does the session-end skill run the new gate check on every harness?",
  "answer": "session-end-runs-gate",
  "context": "On 2026-11-12 you chose a Stop hook for Claude Code only and no CI check. With those answers, 1.4.0 changes nothing on Codex, Pi, Oh My Pi, Copilot and OpenCode unless the user runs the check by hand. The session-end skill already runs `status.mjs` on every harness. No spec makes it run `gate.mjs check`. This choice does not reopen your two earlier answers.",
  "options": [
    {
      "value": "session-end-runs-gate",
      "label": "Yes, session end runs the gate check",
      "recommended": true,
      "description": "The session-end skill runs `gate.mjs check` where it runs `status.mjs` today, and reports what the check names.",
      "example": "A Codex session ends. The agent runs the check, which names spec 3: done with no accepted report. The agent runs the review before it closes.",
      "tradeoff": "On those five harnesses the agent can still skip the step. Only the Claude Code hook cannot be skipped."
    },
    {
      "value": "no",
      "label": "No, keep the specs as written",
      "description": "The gate check ships as a command and a Claude Code hook only.",
      "example": "A Codex user gets the check only by asking for it.",
      "tradeoff": "Five of six harnesses get nothing from this release."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "It is one line in a skill the release already touches, and it gives every harness the new check.",
  "affected": [
    "gate-all-harnesses"
  ]
},
  {
  "id": "next-feature",
  "status": "clarified",
  "question": "Which brief do I write after enforced-gates?",
  "answer": "runtime-owns-steps",
  "context": "The panel's strongest finding was not in my candidate list. The payload has three places where the agent does by hand what a command could do. (1) The implementer edits the queue and the spec frontmatter to \"in-review\" as two hand edits; `status.mjs` and the new gate exist to find the drift. (2) The reviewer must report every finding with a severity, but the report has only `unresolved: string[]`, and any entry rejects a PASS, so a non-blocking finding has no place. (3) The test-run rule (CI=1, one run, 300000 ms) is copied in six files and receipts are made by hand. Separately, the field-user member found the weakest link: a PASS rests on the implementer's own test and the reviewer's own report.",
  "why": "Lauren Tan (5:26): \"nuance tends to lead to slop — just design better APIs\". Her first pyramid layer is the codebase; for Joycraft that is the runtime, not the skill text. Both speakers put most of their tokens into verification (12:05).",
  "options": [
    {
      "value": "runtime-owns-steps",
      "label": "The runtime takes over the hand-done steps",
      "recommended": true,
      "description": "A brief for three commands: `completion.mjs submit` (one command to enter in-review), structured findings in the report (blocking, decision needed, follow-up; new or pre-existing), and `evidence.mjs run` (runs the project's test command and writes the receipt). Each removes the skill text it replaces.",
      "example": "The reviewer records a follow-up finding and the spec still passes. The implementer runs one command and the two status files cannot disagree.",
      "tradeoff": "The largest option. It changes the report contract, so every harness and old reports need a migration path."
    },
    {
      "value": "stronger-evidence",
      "label": "Stronger evidence first",
      "description": "A brief for a test-sensitivity check. When a criterion's only runtime evidence is the implementer's own test, the reviewer breaks the behavior in a temporary copy and confirms the test fails.",
      "example": "The reviewer removes the discount line in a copy; the \"discount precedes tax\" test still passes; the criterion is not accepted.",
      "tradeoff": "More tokens for each review. It stays a prompt-level rule until a command supports it."
    },
    {
      "value": "ci-check",
      "label": "The CI gate",
      "description": "Bring the backlogged CI check forward. Tan's static-analysis layer includes CI, and your enforced-gates brief says CI is the only gate that covers all six harnesses.",
      "example": "A pull request with a hand-set done spec fails the Joycraft gates check.",
      "tradeoff": "You answered \"no CI\" three days ago. GitHub Actions only."
    },
    {
      "value": "later",
      "label": "Decide after 1.4.0 ships",
      "description": "Record the three as backlog items. No brief now.",
      "example": "Three files in docs/backlog.",
      "tradeoff": "The finding waits; the next field report may overtake it."
    },
    {
      "value": "custom",
      "label": "Something else",
      "description": "Describe what you want instead.",
      "requiresNote": true
    }
  ],
  "recommendation": "It applies the top of Tan's pyramid to Joycraft itself, and the structured findings also carry three of the smaller candidates (F, C and part of G).",
  "affected": [
    "next-feature"
  ]
}
]
---
# Feature intent

Find what two AI Engineer talks add to the next Joycraft release. Max asked on
2026-11-15: watch both talks, analyze them against Joycraft, use an adversarial
panel if useful. This brief holds the four choices that came out. The full
analysis, the panel verdicts on all twelve candidates and the citations are in
[the digest](../../research/2026-11-15-tan-holmes-talks-digest.md).

## Context and authorization

- Talks: Lauren Tan, "All Code Is Slop (Except Mine)"; Ben Holmes (Warp), "Your
  AI Agent Is Hiding Its Mistakes From You". Both read still by still.
- Panel: four Fable 5.2 members (evidence auditor, pyramid purist, minimalist,
  cross-harness field user), each citing `file:line`.
- Authorized: the analysis and this brief. Not authorized: any change to the
  enforced-gates specs, the payload or joycraft-prototype. The enforced-gates
  folder is unchanged. Each answer below becomes a spec edit or a new spec only
  after Max answers.
- Earlier decisions kept: enforced-gates `ci: none` and `harnesses:
  claude-first` (2026-11-12); no telemetry; Curated-harness D6 (no
  hand-maintained map).

## Goals

- **Answer the four choices.** **Done when:** each decision above is
  `clarified`, and for each answer that changes enforced-gates, the affected
  spec is edited or a new spec exists in that feature's `specs/` folder.

## Agent work and pending choices

Max answered all four on 2026-11-15 ("Yes, apply all four"), each with the
recommended option. Applied the same day:

- `dead-reference-scope`: enforced-gates spec 2 rewritten (seven paths, the
  text about unshipped parts, a terms test, a shorter payload).
- `review-cap`: new enforced-gates spec 5.
- `gate-on-all-harnesses`: one criterion added to enforced-gates spec 3.
- `next-feature`: brief written at
  `docs/features/2026-11-15-runtime-owned-steps/brief.md`, four open decisions.

Backlog items the panel agreed on (escape rate, friction counts in
`retro.mjs`, net-zero remedy order, generated regression map) are listed in
the digest and are not filed yet.

## dead-references

Per `dead-reference-scope`. Verified on 1.3.0: seven shipped paths point to
files that are not in the payload.

## review-cap

Per `review-cap`. `joycraft-implement/SKILL.md` states the cap; no file in
`payload/.joycraft/runtime/` counts review rounds.

## gate-all-harnesses

Per `gate-on-all-harnesses`. The session-end skill runs `status.mjs` and no
gate check.

## next-feature

Per `next-feature`. The three hand-done steps and the evidence gap are
described in the digest under "What the panel found".

## Scope and limits

- Cut by the panel, 4 of 4: a Joycraft copy of Warp's skill-doctor (LLM scorers
  over transcripts). Also cut: a "Worked around:" self-report line, a driver
  script rule (already supported by `review-tools.mjs record --command`).
- No new context home, history file or state store.
- No change to the 2026-11-12 answers.
