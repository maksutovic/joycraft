---
feature: testing-overhaul
decisions: [
  {
  "id": "scenario-scope",
  "status": "clarified",
  "question": "How much of the scenario machinery do we remove?",
  "answer": "all",
  "context": "This repo has three workflows that serve the holdout scenario repo: `scenarios-dispatch.yml`, `scenarios-rerun.yml` and `spec-dispatch.yml`. `AGENTS.md` has three NEVER lines and an \"External Validation\" section for them. `CONTRIBUTING.md` line 91 names their placeholders. The 0.7 scenario templates and the level-5 skill are in `src/templates`, `docs/templates` and the installed 0.7 skill trees. None of this is in `payload/`, so no option changes what users install. `spec-dispatch.yml` watches `docs/specs/`, which is no longer used, so it probably never runs.",
  "why": "The answer sets what the agent deletes, and what you must delete yourself on GitHub.",
  "options": [
    {
      "value": "github-only",
      "label": "Workflows and AGENTS.md lines only",
      "description": "Delete the three workflows. Remove the NEVER lines, the \"External Validation\" section and the `CONTRIBUTING.md` line.",
      "example": "One small PR. The 0.7 templates stay until the dead-code deletion removes their trees.",
      "tradeoff": "Dead scenario templates and the external repo stay. The GitHub App and its secrets stay active with no user."
    },
    {
      "value": "repo",
      "label": "Also the 0.7 scenario templates in this repo",
      "description": "As above. The dead-code deletion also removes `docs/templates/workflows`, `docs/templates/scenarios`, `src/init-autofix.ts` and the installed `joycraft-implement-level5` copies.",
      "example": "After the PR, a search for \"scenario\" in this repo finds only archived docs and the migration inventory.",
      "tradeoff": "The external repo, the GitHub App and the secrets stay. You remove them later, or not at all."
    },
    {
      "value": "all",
      "label": "Also the external repo, the App and the secrets",
      "recommended": true,
      "description": "As above. You archive the scenario repo, remove the GitHub App and delete `JOYCRAFT_APP_PRIVATE_KEY`. The agent does not touch these.",
      "example": "The agent gives you a three-line checklist after the PR merges.",
      "tradeoff": "About ten minutes of your time on GitHub. An archived repo can be restored; a deleted App cannot."
    }
  ],
  "recommendation": "Remove all of it. An unused App with a private key is a risk with no benefit. Two new checks replace the holdout: main's release gates run on the PR tarball, and an upgrade test from the last published version. The migration inventory keeps the hashes of the old files, so a 0.7 user can still migrate.",
  "affected": [
    "scenario-removal"
  ],
  "note": "and the 0.7 scenario templates"
},
  {
  "id": "autofix",
  "status": "clarified",
  "question": "What do we do with `autofix.yml`?",
  "answer": "retire",
  "context": "`autofix.yml` starts when the Test workflow fails. It runs Claude to repair the PR, three attempts at most. It has never run to the end: each run was skipped because Test passed. It cannot work today: it runs `npm ci`, and this repo uses pnpm and has no `package-lock.json`. It also uses `node-version: latest`. It needs the GitHub App and `ANTHROPIC_API_KEY`.",
  "why": "Level 5 is an experiment since the core-loop decision. This workflow is its last live part in this repo.",
  "options": [
    {
      "value": "retire",
      "label": "Delete it",
      "recommended": true,
      "description": "Delete `autofix.yml`. With the scenario workflows gone, nothing listens to the Test workflow, so its name is free to change.",
      "example": "A red PR stays red until a person or a session repairs it.",
      "tradeoff": "No automatic repair. You can delete `ANTHROPIC_API_KEY` from the repo secrets."
    },
    {
      "value": "repair",
      "label": "Repair it",
      "description": "Change it to pnpm and a pinned Node version. Keep the App and the key.",
      "example": "A red PR gets up to three repair attempts from Claude.",
      "tradeoff": "It needs the App that the scenario removal would delete. It has no test, and it has never run."
    },
    {
      "value": "leave",
      "label": "Leave it as it is",
      "description": "No change.",
      "example": "It stays skipped while Test passes. It fails at `npm ci` on the first red PR.",
      "tradeoff": "A broken workflow stays in the repo, and the Test workflow must keep its name."
    }
  ],
  "recommendation": "Delete it. It is broken, it never ran, and it depends on machinery you asked to remove.",
  "affected": [
    "scenario-removal"
  ]
},
  {
  "id": "receipt-depth",
  "status": "clarified",
  "question": "How far does Joycraft bind a test result to a commit?",
  "answer": "field",
  "context": "Two shipped sentences tell the reviewer to \"reuse a suite receipt bound to the same revision\". No Joycraft code records a revision: a receipt holds the command, the exit code, a path and a hash. The agreed text change removes those sentences in every option. The field report asks for more: a receipt for each commit in the Git common directory, with reuse by default. The research found that a sound receipt for any stack must also bind the toolchain, the environment and the gate policy. The red team found that the agent chooses the command, so a receipt that says \"full\" can be false.",
  "why": "This is the largest possible code addition in the feature. It decides if Joycraft owns verification state or only reports it.",
  "options": [
    {
      "value": "none",
      "label": "Text only",
      "description": "Remove the false sentences. The reviewer runs the spec's own tests one time and does not run the gate again.",
      "example": "No code change. The implementer's report names the gate command and its exit code, as today.",
      "tradeoff": "A reviewer cannot prove that the gate ran on the commit under review."
    },
    {
      "value": "field",
      "label": "Add the revision to the output",
      "recommended": true,
      "description": "`evidence.mjs` adds `revision` (the HEAD commit and a dirty flag) to the result that it already prints. About five lines. No store and no reuse.",
      "example": "`\"revision\": {\"head\": \"3d05a7c\", \"dirty\": false}` next to `command` and `receipts`.",
      "tradeoff": "It records but does not skip a run. Two agents on one commit still run the gate twice."
    },
    {
      "value": "helper",
      "label": "Commit-bound receipt helper",
      "description": "A new `evidence.mjs verify` mode. It refuses a dirty tree, writes a receipt for the commit in the Git common directory, and reuses a match. `delivery.mjs push` accepts it.",
      "example": "The second `verify` of one commit takes about 0 seconds. The field project measured this.",
      "tradeoff": "New state that Joycraft must keep correct on every stack. It needs project-declared toolchain and environment lists to be sound. About 30 words of new text."
    }
  ],
  "recommendation": "Add the field. It makes the reviewer's check possible for five lines of code. Build the helper only when a second project reports the cost after the tier text ships.",
  "affected": [
    "receipts"
  ]
},
  {
  "id": "record-commits",
  "status": "clarified",
  "question": "Does a commit of only Joycraft records need a test run?",
  "answer": "sentence",
  "context": "Joycraft makes bookkeeping commits: spec status, queue JSON, review reports, receipts. On the field project these were 38% of all verify runs, about 250 minutes in 40 days. That cost came from the project's own rule, \"each clean commit needs a full pass\". Joycraft ships no such rule, but it also does not say that these commits need no run. A wider rule for all docs is not safe: Rust doctests, Go embed, MDX sites and Joycraft's own runtime read docs.",
  "why": "Each Joycraft project makes these commits. The answer is one sentence or new code.",
  "options": [
    {
      "value": "sentence",
      "label": "One sentence, records only",
      "recommended": true,
      "description": "Add to `testing.md`: \"A commit that changes only Joycraft records needs no test run.\" The agent judges. If a project's tests read the features folder, the agent says so and runs them.",
      "example": "A commit that sets a spec to `done` runs nothing.",
      "tradeoff": "It is text. An agent can ignore it or apply it to a commit that also changes code."
    },
    {
      "value": "opt-in",
      "label": "Opt-in inheritance code",
      "description": "Setup asks one question: \"Does a test read your features folder?\" On \"no\", a helper lets a record commit inherit the result of its parent.",
      "example": "The record commit gets a result in about 2 seconds, marked `inherited`.",
      "tradeoff": "It needs the receipt helper from the question above. It adds a setup question and a soundness rule that most stacks can break."
    },
    {
      "value": "none",
      "label": "No rule",
      "description": "Joycraft says nothing. The project's `AGENTS.md` decides.",
      "example": "A project with a strict rule runs the gate for each record commit, as the field project did.",
      "tradeoff": "The largest measured waste stays for any project with a per-commit rule."
    }
  ],
  "recommendation": "The sentence. It removes the cost for the usual project and needs no new machinery. The word \"only\" and the narrow subject keep it safe.",
  "affected": [
    "tier-text"
  ]
},
  {
  "id": "queue-rhythm",
  "status": "clarified",
  "question": "When does the gate run, and when does the pull request open?",
  "answer": "spec-gate-queue-pr",
  "context": "Today the implementer runs the whole test, typecheck and lint set for each spec and for each review fix. The payload has no text about pull requests at all. The agreed tier text gives three levels: focused tests while working, the project gate, and the full suite on the final integrated revision. Two defaults are open. The field project runs the gate one time for each final commit and opens the PR when the queue is finished. The research says a queue-end PR is a valid choice for one owner, but it is not the usual published practice: large teams keep PRs small.",
  "why": "These two defaults set how many gate runs and CI runs a queue costs. A project can change them in its `AGENTS.md`.",
  "options": [
    {
      "value": "spec-gate-queue-pr",
      "label": "Gate each spec; one PR at queue end",
      "recommended": true,
      "description": "The gate runs one time on the final commit of each spec. A review fix runs focused tests only. Joycraft pushes after each accepted spec and opens one PR when no spec can start. It reads CI one time. After a second red CI run it stops and reports.",
      "example": "A queue of 5 specs: 5 gate runs, 5 pushes, 1 PR, 1 CI run if green.",
      "tradeoff": "CI feedback comes at queue end. Small commits for each spec make the failure easy to find."
    },
    {
      "value": "spec-gate-no-pr",
      "label": "Gate each spec; no PR text",
      "description": "The same gate rule. Joycraft says nothing about pull requests. The project's `AGENTS.md` decides, as today.",
      "example": "This repo's `AGENTS.md` already says \"Open a PR when all specs in a feature are complete\".",
      "tradeoff": "A project with no PR rule gets no PR, or one for each spec, by the agent's guess. No rule limits CI repair rounds."
    },
    {
      "value": "queue-gate-queue-pr",
      "label": "Gate at queue end; one PR at queue end",
      "description": "Specs run focused tests only. The gate runs one time when the queue is finished, then the PR opens.",
      "example": "A queue of 5 specs: 1 gate run, 1 PR.",
      "tradeoff": "The implementer's own tests are the only signal for each spec. A broken spec 1 is found after spec 5. The red team rated this risk 4 of 5."
    }
  ],
  "recommendation": "Gate each spec and open one PR at queue end. The gate for each spec is the cheap guard against self-graded work. One PR is the unit that you review. The limit of two CI rounds follows Stripe and stops a loop in an unattended queue.",
  "affected": [
    "tier-text",
    "pr-timing"
  ]
},
  {
  "id": "cleanup-tests",
  "status": "clarified",
  "question": "Does the cleanup skill get a tests lens?",
  "answer": "custom",
  "context": "The cleanup skill covers docs only. Nothing in Joycraft finds a test whose subject is gone. This repo is the proof: 129 of its 162 test files test code that does not ship, and no Joycraft step found them. The risk is the opposite failure. Research shows that Claude cheats mostly by test edits. A cleanup that can delete tests, and runs with no person present, gives that failure a licence. In every option, unattended cleanup never edits or deletes a test.",
  "why": "This extends a shipped skill into a second subject. That is a product-scope question.",
  "options": [
    {
      "value": "asked-lens",
      "label": "A lens, only when the owner asks",
      "recommended": true,
      "description": "Add 38 words to `references/cleanup.md`. When you ask, cleanup lists tests of a finished one-time operation, tests of code that does not ship, and tests of exact prose that no code reads. Each row gives the claim that the test protected. You approve each deletion. A deletion is its own commit.",
      "example": "\"Clean up the tests\" gives a table: file, reason, the claim it protected, keep or delete.",
      "tradeoff": "38 words of the cap. An agent can still propose a useful test for deletion; you must read the list."
    },
    {
      "value": "one-line",
      "label": "One rule in the testing skill",
      "description": "Add nine words to `joycraft-testing/SKILL.md`: \"Delete a test with the code it tests.\"",
      "example": "A spec that removes a module also removes its tests.",
      "tradeoff": "It stops new dead tests. It never finds old ones."
    },
    {
      "value": "none",
      "label": "No change",
      "description": "Cleanup stays a docs tool.",
      "example": "A dead test stays until a person finds it.",
      "tradeoff": "Zero words. The 129-file case can happen again in any project."
    }
  ],
  "recommendation": "The lens, on request only. A stale test is the same defect as a stale doc: a claim with no subject. The permission ledger that cleanup already has makes you the judge of each deletion.",
  "affected": [
    "cleanup-tests"
  ],
  "note": "i want cleaning up tests to be a part of the broader clean-up skill: HOWEVER it is opt-in -- we ask them if they want us to review the tests infrastructure and make recomendations/implement the latest agentic coding best practices etc... (per our plan, research, and field report)"
},
  {
  "id": "main-exports",
  "status": "clarified",
  "question": "Do we keep the frozen 0.7 exports in the package `main`?",
  "answer": "custom",
  "context": "`dist/index.js` exports four 0.7 modules: `update-check`, `auto-safe-update`, `release-artifact` and `detectStack`. The 1.x CLI does not use them. The live update checker is in the payload. Six test files (102 tests, 0.5 seconds) cover them. If we remove a public export, a program that imports `joycraft` can break. We do not know of such a program, and no telemetry can tell us.",
  "why": "Removal is a semver-major change. Only you can decide a 2.0.",
  "options": [
    {
      "value": "keep",
      "label": "Keep them frozen",
      "recommended": true,
      "description": "The exports and their six test files stay. One test stops importing the dead updater.",
      "example": "`import { detectStack } from 'joycraft'` works as before.",
      "tradeoff": "About 1,000 lines of unused code stay in the package and the repo."
    },
    {
      "value": "drop-major",
      "label": "Drop them in a 2.0",
      "description": "Remove the exports, the four modules and the six test files. Publish as 2.0.0.",
      "example": "The package `main` becomes empty or goes away.",
      "tradeoff": "A major version for a cleanup. Each user sees a 2.0 with no new behaviour."
    },
    {
      "value": "deprecate",
      "label": "Mark them deprecated now, drop later",
      "description": "Keep the code. Add a deprecation note to the types and the CHANGELOG. Remove them in the next major release that has another reason.",
      "example": "An editor shows a strike-through on `detectStack`.",
      "tradeoff": "Two steps in place of one. The code stays until then."
    }
  ],
  "recommendation": "Keep them frozen. All four panel seats agree: a breaking release is not worth half a second of test time.",
  "affected": [
    "repo-tests"
  ],
  "note": "can't we delete them?"
},
  {
  "id": "self-install",
  "status": "clarified",
  "question": "Do we migrate this repo's own 0.7 Joycraft install now?",
  "answer": "custom",
  "context": "This repo uses Joycraft 0.7 on itself: the skill copies in `.claude`, `.agents`, `.pi`, `.github` and `.omp`, the old hooks, `docs/.joycraft/` and `docs/templates/`. `AGENTS.md` has an ALWAYS rule to run `pnpm sync-skills` after an edit under `src/skills/`. The dead-code deletion removes `src/skills/` and the sync script, so that rule becomes false. The red team also asked for this migration as a test: run the built CLI on this repo, then roll back, before the old tests go.",
  "why": "`AGENTS.md` is your file, and the migration changes the tools that agents use in this repo.",
  "options": [
    {
      "value": "migrate-first",
      "label": "Migrate before the deletion",
      "recommended": true,
      "description": "Run `node dist/cli.js update . --migrate` on this repo, and prove that rollback works. Remove the `sync-skills` rule from `AGENTS.md`. Keep `release-docs-sync` as a hand-committed skill. Then delete the dead code.",
      "example": "This repo runs the same Joycraft that its users get.",
      "tradeoff": "The feature gets one more step before the deletion. Agents in this repo get the 1.x skill set in the same PR series."
    },
    {
      "value": "later",
      "label": "Delete now, migrate in a later PR",
      "description": "The deletion leaves the installed 0.7 copies in place. The `sync-skills` rule is removed now, because its script is gone. A later PR migrates.",
      "example": "For a time the repo has installed skills with no source.",
      "tradeoff": "The red team's self-migration proof does not happen before the old migration tests go."
    },
    {
      "value": "keep-07",
      "label": "Keep the 0.7 install and its source",
      "description": "Do not delete `src/skills`, the generators or the sync script. Delete only tests and unreached `src/*.ts`.",
      "example": "`pnpm sync-skills` keeps working.",
      "tradeoff": "About half of the dead trees and their generator stay. The build keeps a step that makes nothing that ships."
    }
  ],
  "recommendation": "Migrate first. It is the best available test of the migration path, on a real 0.7 project with months of history, and it ends a rule that guards a tree that does not ship.",
  "affected": [
    "repo-tests"
  ],
  "note": "i want to completely get rid of them, if we have to totally reinstall joycraft to the latest so be it, there should be zero trace. all versions are tagged and archived they are retrivable if necessary"
},
  {
  "id": "required-checks",
  "status": "clarified",
  "question": "Which checks must pass before a PR can merge to main?",
  "answer": "none",
  "context": "Branch protection on main requires one review and an up-to-date branch. Its list of required checks is empty (read from the GitHub API on 2026-11-20). So a PR with a red Test run can merge, and each merge to main publishes to npm. Today the suite runs again on main and in the publish job, and that is the only guard. The plan removes duplicate runs only after a check is required. This is a GitHub setting, so you make the change, or you tell the agent to make it.",
  "why": "Without this, the CI cleanup would remove the last full run before a release.",
  "options": [
    {
      "value": "test-and-report",
      "label": "Test and the compatibility report",
      "recommended": true,
      "description": "Require the `test` job and `Required compatibility report` from the Test workflow. The agent then opens a PR that fails on purpose to prove that the merge is blocked.",
      "example": "A PR with one failing test shows \"Required\" next to the red check, and the merge button is off.",
      "tradeoff": "A red or slow check now blocks a merge until someone repairs it. Admins can still bypass, because admin enforcement is off."
    },
    {
      "value": "plus-docs",
      "label": "Also Docs Sync",
      "description": "As above, and require the Docs Sync check too.",
      "example": "A PR that changes `src/` with no CHANGELOG line cannot merge.",
      "tradeoff": "Docs Sync needs a PR-body edit to pass in some cases. As a required check it can block a correct PR until the body changes."
    },
    {
      "value": "none",
      "label": "No required checks",
      "description": "Leave protection as it is. Keep every duplicate suite run on main and in the publish job.",
      "example": "CI stays as today: about four full-suite runs for each PR.",
      "tradeoff": "A red PR can still merge and publish. No CI time is saved."
    }
  ],
  "recommendation": "Require the Test job and the compatibility report. They are the two checks that prove the package. Keep the full suite in the publish job too: after the deletion it costs about 10 seconds.",
  "affected": [
    "ci"
  ]
}
]
---
# Testing overhaul

Rewrite the testing guidance that Joycraft ships, extend the cleanup skill, and
overhaul this repo's own tests and CI. Remove the scenario-dispatch machinery
from GitHub.

## Summary of the research and the ruling

A field project sent a report on 40 days of test and CI work with many parallel
agents. Three research reports, two audits and a four-seat panel examined it.

**What the evidence shows.**

- The field project's largest costs came from its own rule (a full run for each
  commit) and from dozens of agents on one machine. Most Joycraft projects have
  neither.
- Joycraft has one instruction that causes the same waste: the implementer runs
  the whole test, typecheck and lint set for each spec and each review fix.
- Two shipped sentences name things that Joycraft does not have: a receipt
  "bound to the same revision", and a "verify slot".
- Claude cheats mostly by test edits. Prompt text does not stop this. A reviewer
  who reads the test diff does.
- Two defects in Joycraft's own tools lose work: worker-tree removal deletes
  evidence that a report cites, and a raw receipt named `.json` blocks the push.
- In this repo, 129 of 162 test files test 0.7 code that does not ship. The
  suite takes 133 seconds. The 33 files that test the product take 9 seconds.
- Main has no required check. A red PR can merge, and a merge publishes.

**What the panel ruled.**

- Ship the tier model as text: focused tests while working, the project gate on
  a spec's final commit, the full suite one time on the final integrated
  revision. Pay for the new words with cuts.
- Repair the two tool defects and the delivery lock in code. Add no receipt
  store, worker budget, slots or test selection.
- Delete the dead 0.7 code and tests in one PR, after proof that no shipped
  byte changes and that migration tests are stronger first.
- Remove no CI run before a check is required on main.
- Replace the holdout with two checks that a change cannot edit.

The ruling has seven specs that need no answer from you, and nine questions
that do. The questions are above.

## Agent work and pending choices

Work that can start now: specs A1 to A7 in `panel-ruling.md`.

| Decision | Blocks |
|---|---|
| `scenario-scope`, `autofix` | [scenario-removal](#scenario-removal) |
| `receipt-depth` | [receipts](#receipts) |
| `record-commits`, `queue-rhythm` | the last sentences of [tier-text](#tier-text) and [pr-timing](#pr-timing) |
| `cleanup-tests` | [cleanup-tests](#cleanup-tests) |
| `main-exports`, `self-install` | the last part of [repo-tests](#repo-tests) |
| `required-checks` | [ci](#ci) |

## tier-text

`references/testing.md` "Running tests", the implementer and reviewer agent
files, and the rows that setup writes. See `record-commits` and `queue-rhythm`.

## pr-timing

Push and pull-request text in `joycraft-implement` and `joycraft-session-end`.
See `queue-rhythm`.

## receipts

`evidence.mjs` output and the reviewer text. See `receipt-depth`.

## cleanup-tests

`references/cleanup.md` or `joycraft-testing`. See `cleanup-tests`.

## scenario-removal

Workflows, `AGENTS.md` lines and old templates. See `scenario-scope` and
`autofix`. The agent does not open the scenario repo.

## repo-tests

The dead-code deletion and this repo's own install. See `main-exports` and
`self-install`.

## ci

Required checks, then removal of duplicate runs. See `required-checks`.

## Scope and limits

- Stack-agnostic: no text names a test runner.
- No guard machinery for a rare case.
- A queue stops only for a mandatory or broken step.
- Payload text stays under the word cap.
- Max merges. A merge is a release.

## Reports

All in `docs/max-discussion-transcripts/2026-11-21-testing-overhaul/`:

- [panel-ruling.md](panel-ruling.md): rulings, safety preconditions, build plan
- [field-report.md](field-report.md): the field project's report
- [research-1-harness-practice.md](research-1-harness-practice.md): published agent practice
- [research-2-selection-ci.md](research-2-selection-ci.md): selection, receipts, flaky tests, CI cost
- [research-3-testing-skill-products.md](research-3-testing-skill-products.md): how to test a skill product
- [audit-payload-guidance.md](audit-payload-guidance.md): shipped guidance against the report
- [audit-repo-tests.md](audit-repo-tests.md): this repo's tests and CI
- [panel-advocate.md](panel-advocate.md), [panel-minimalist.md](panel-minimalist.md), [panel-redteam.md](panel-redteam.md), [panel-practitioner.md](panel-practitioner.md): the four seats
