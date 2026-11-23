---
feature: benchmark-trial
decisions: [
 {
  "id": "harness-home",
  "question": "Where does the trial harness live?",
  "context": "The driver, collector, config and message templates are in ~/Developer/ride-trial/, outside any repo. v2 rendered messages by hand, and five fixes are known (prepare script, auto-memory off, init-line audit, judge anonymizer, orientation metrics).",
  "why": "The method should be versioned with the releases it judges, and another contributor should be able to run it.",
  "options": [
   {
    "value": "bench-in-repo",
    "label": "Move scripts and templates to bench/ride-trial/ in this repo",
    "description": "Arm folders, traces and judge copies stay outside the repo. bench/ is not in package.json files and not a product path, so nothing ships and a change publishes nothing.",
    "example": "bench/ride-trial/turn.mjs, collect.mjs, prepare.mjs, tasks/ride/*.md",
    "tradeoff": "The repo carries non-product scripts that CI does not test.",
    "recommended": true
   },
   {
    "value": "stay-outside",
    "label": "Keep the harness outside the repo",
    "description": "Only the guide is in the repo.",
    "example": "The guide says: copy the scripts from ~/Developer/ride-trial/v2/trial/.",
    "tradeoff": "Fixes are not reviewed, and nobody else can rebuild it exactly."
   },
   {
    "value": "own-repo",
    "label": "A separate public repo",
    "description": "A benchmark repo that other frameworks could also run.",
    "example": "github.com/maksutovic/ride-trial",
    "tradeoff": "Another repo to keep; harder to tie a run to a Joycraft version."
   }
  ],
  "recommendation": "Same versioning as the releases, no shipping risk, and the five fixes land as reviewed commits.",
  "status": "open",
  "answer": null,
  "affected": []
 },
 {
  "id": "arms",
  "question": "Which arms run before each release?",
  "context": "v1 and v2 ran joycraft, pocock and pstack. In v1 the pocock builder used no skill, so it was close to vanilla, and it won product and cost. Claude Code itself keeps getting better.",
  "why": "Each release must show where Joycraft beats or loses to Claude Code with nothing added.",
  "options": [
   {
    "value": "vanilla-each-all-quarterly",
    "label": "joycraft + vanilla each release; all four once a quarter",
    "description": "Vanilla is the baseline. Pocock and pstack show where the field goes.",
    "example": "1.10: 2 arms × 3 rounds. End of quarter: 4 arms × 3 rounds.",
    "tradeoff": "Pocock and pstack results are up to 3 months old.",
    "recommended": true
   },
   {
    "value": "all-each",
    "label": "All four arms every release",
    "description": "The full field every time.",
    "example": "4 arms × 3 rounds per release.",
    "tradeoff": "About twice the cost and operator time."
   },
   {
    "value": "vanilla-only",
    "label": "joycraft + vanilla only",
    "description": "Drop the other frameworks.",
    "example": "2 arms forever.",
    "tradeoff": "No view of better ideas elsewhere (pstack's parallel delegate, its context map)."
   }
  ],
  "recommendation": "Vanilla answers the existential question every release; the other frameworks change slowly enough for a quarterly look.",
  "status": "open",
  "answer": null,
  "affected": []
 },
 {
  "id": "cadence",
  "question": "When does the trial run, and how many rounds?",
  "context": "One round per arm (v1) gave a 1–4 point spread that a rerun could flip. v2 uses 3 rounds. Builder cost is about $5–10 per arm-run.",
  "options": [
   {
    "value": "minor-3",
    "label": "Before each minor release, 3 rounds, cap $200",
    "description": "After the release PR is green and before merge. Also when Claude Code ships a major version or a new default model.",
    "example": "1.10.0: smoke, then 2 arms × 3 rounds × 2 tasks ≈ $60–120 builder cost.",
    "tradeoff": "Adds about half a day of wall clock to each minor release.",
    "recommended": true
   },
   {
    "value": "schedule",
    "label": "On a monthly schedule, 3 rounds",
    "description": "Runs on the current main, not tied to a release.",
    "example": "First Monday of each month.",
    "tradeoff": "A release can ship between runs without a check."
   },
   {
    "value": "minor-5",
    "label": "Before each minor release, 5 rounds",
    "description": "Tighter means.",
    "example": "2 arms × 5 rounds × 2 tasks.",
    "tradeoff": "About 1.7× the cost of 3 rounds."
   }
  ],
  "recommendation": "Ties the check to the thing it protects; 3 rounds is the smallest n that gives a standard deviation.",
  "status": "open",
  "answer": null,
  "affected": []
 },
 {
  "id": "pass-rules",
  "question": "What must Joycraft meet against vanilla before a release?",
  "context": "Proposed checks on 3-round means (a gap under one sd is a tie): product ≥ vanilla − 2 of 50; engineering ≥ vanilla; session-2 done ≥ vanilla; time to orient ≤ vanilla; cost ≤ 2.0× vanilla; active time ≤ 2.0× vanilla; isolation clean. v2 round 1 would fail time and cost against an 8-minute, $3.30 baseline (Joycraft 20.3 min, $9.02).",
  "options": [
   {
    "value": "soft-gate",
    "label": "Soft gate: a fail needs a written reason; two fails in a row block",
    "description": "A failed check goes in the release PR body with a backlog item. The same check failing two releases in a row blocks the next release until fixed or the rule changes.",
    "example": "1.10 fails cost at 2.4×: PR says why, backlog item opened. 1.11 still 2.3×: 1.12 waits.",
    "tradeoff": "One bad release can ship.",
    "recommended": true
   },
   {
    "value": "hard-gate",
    "label": "Hard gate: any fail blocks the release",
    "description": "Every check must pass.",
    "example": "Cost at 2.1× blocks 1.10.",
    "tradeoff": "n = 3 is still noisy; a fluke can block a good release."
   },
   {
    "value": "report-only",
    "label": "Report only",
    "description": "Publish the numbers; no rule.",
    "example": "The record row shows the trend.",
    "tradeoff": "Nothing forces a response to a loss."
   }
  ],
  "recommendation": "Strict enough to stop a trend, loose enough for n = 3 noise.",
  "details": "If you want other limits (for example 1.5× cost), choose Something else and write them.",
  "status": "open",
  "answer": null,
  "affected": []
 },
 {
  "id": "tasks",
  "question": "Which tasks does a trial run?",
  "context": "One app lets Joycraft fit one app. Proposed rotation: small (one-screen, one API), medium (multi-page, storage, form), brownfield (a frozen 20–50k line open-source app with real issues). Each task has a fixed build message, session-2 change, answer sheet and rubric.",
  "options": [
   {
    "value": "anchor-plus-rotation",
    "label": "Ride app every time, plus one rotating task",
    "description": "The anchor keeps releases comparable; the rotation stops overfitting. Retire a rotating task after four releases.",
    "example": "1.10: ride + brownfield. 1.11: ride + small. 1.12: ride + medium.",
    "tradeoff": "Two tasks per trial doubles the cost.",
    "recommended": true
   },
   {
    "value": "rotation-only",
    "label": "One rotating task each trial",
    "description": "No fixed anchor.",
    "example": "1.10: brownfield. 1.11: small.",
    "tradeoff": "No release-to-release trend on the same task."
   },
   {
    "value": "ride-only",
    "label": "The ride app only",
    "description": "Same task every time.",
    "example": "Ride + 3-day forecast each release.",
    "tradeoff": "Overfits; a small app never tests the context map on a big repo."
   }
  ],
  "recommendation": "A trend line and a fresh test in every trial.",
  "status": "open",
  "answer": null,
  "affected": []
 },
 {
  "id": "orient-metrics",
  "question": "Do we measure the context map's value directly?",
  "context": "In v2 every session-2 builder oriented in about a minute; pstack's in one command from its context map. That may be Joycraft's best attribute, but small apps hide it, and auto-memory may leak session 1 into session 2.",
  "options": [
   {
    "value": "full",
    "label": "Orientation metrics + auto-memory fix + quarterly no-map ablation + brownfield session 3",
    "description": "Add time to orient, reads before first edit, failed and wasted reads, first doc read and lost knowledge to collect.mjs. Run joycraft-nomap (map and docs deleted before session 2) once a quarter.",
    "example": "Record row: orient 0.9 min vs vanilla 2.4; no-map 3.1.",
    "tradeoff": "One more arm each quarter; a per-task list of session-1 facts to write.",
    "recommended": true
   },
   {
    "value": "metrics-only",
    "label": "Metrics and auto-memory fix only",
    "description": "No ablation arm.",
    "example": "Orient time in each record row.",
    "tradeoff": "Cannot separate the map from builder luck."
   },
   {
    "value": "none",
    "label": "Not now",
    "description": "Keep the current measures.",
    "example": "—",
    "tradeoff": "The likely strength stays unproven."
   }
  ],
  "recommendation": "The ablation is the only clean test of the map, and the brownfield task is where a map can win.",
  "status": "open",
  "answer": null,
  "affected": []
 }
]
---
# Feature intent

Make the ride trial Joycraft's pre-release framework benchmark: a guide to rebuild and run it (docs/guides/benchmark-trial.md) and a plan for how it fits normal development (recommendation.md beside this brief). Docs only; no harness code is copied until harness-home is answered.

## Context and authorization

Requested by the session that ran the v1 and v2 trials. The harness at ~/Developer/ride-trial/ is read-only for this work. Results of v2 are out of scope; a separate panel studies them.

## Scope and limits

Docs-only PR. Max decides on the page and merges.
