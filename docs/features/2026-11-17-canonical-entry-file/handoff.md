# Handoff: canonical entry file

**Written:** 2026-11-17, after the owner confirmed the last four choices and the brief was decomposed. **Next step:** implement the queue in joycraft-prototype, spec 1 first.

## Read these first, in this order

1. `docs/features/2026-11-17-canonical-entry-file/brief.md`: the owner's request, seven answered decisions with his notes, the settled design, the done-when lines. The brief is the authority.
2. `docs/features/2026-11-17-canonical-entry-file/specs/`: eight specs and `.joycraft-spec-queue.json`. `queue-check.mjs` reports no gap.
3. `docs/research/2026-11-17-entry-file-sota-panel-verdict.md`: vendor guidance, measured evidence, the five-seat panel verdict, pre-committed measurements and kill criteria.
4. Private working notes, git-ignored, in the main checkout of this repository: `docs/max-discussion-transcripts/2026-11-17-canonical-entry-file/`. Start with its `README.md`. It holds the agent reports, the saved vendor pages, the confirmation pages with examples from the field project, and everything that names that project. Nothing from that folder goes into this public repository.

## State

- All seven brief decisions are `clarified`. The brief status is `specified`.
- Eight specs are `todo`. Nothing is implemented.
- Branch `research/canonical-entry-file`, cut from `main` at the 1.5.4 merge.

## The settled design

1. Cleanup stops asking shape questions. One table of standing dispositions replaces "never reword a rule" and "change nothing until approved".
2. `entry.tidy` is a setting: `auto`, `ask-once`, `review`, with a default for each user. The owner wants `auto` for himself.
3. Rules are rewritten once per project. The agent finds the safety rules and shows one list: kept, moves, removed. It writes on one yes, for every setting. That list is the only stop in the life of a project. After it, the rules sit between markers and a tidy cannot change them.
4. AGENTS.md holds nothing temporal. One map row points at `docs/context/now.md`, the only page where dated entries live. Session end checks it every time and empties it when nothing is current.
5. One deterministic check, silent when clean, runs at the start of each coordinator session and each queue, at session end and in CI. At the start it prints only the holds. Workers, subagents and linked worktrees never check or edit an entry file.
6. Vendor guidance reaches projects through Joycraft's managed block and the checker. Joycraft never migrates a user's rule text.

## What the owner changed on 2026-11-17

- **No word list and no lock script** (`limit-guard`). He rejected a script that judges rule text: "we are over enginnering for a less than 1% user case". The agent finds the safety rules and the user says yes or no.
- **The rules list is shown first, for him too** (`rewrite-review`). `auto` does not skip it.
- **Holds print at the start** (`hold-delivery`).
- **An old `now.md` entry gets a remark, not a finding to act on alone** (`now-age`): older than about a week, the agent says so in one plain sentence and offers to check it or backlog it.
- **His direction for every open detail:** design for the usual entry file, which is stale and has weak guidance. Do not add machinery for a rare file shape. Under that direction this session also dropped the per-project word baseline, the nested `CLAUDE.md` check and the CI gate on rule text; the brief lists them under "Dropped". He has not reviewed those three cuts one by one.

## How the earlier open problems were settled

| Problem | Settled in |
|---|---|
| The unit of a limit | Gone with the lock script. The pin is a hash of the bytes between the rules markers, taken before a tidy (spec 6). |
| Who writes Joycraft's lines | The runtime prints and checks the block; the agent places it. The `writer` ruling stays (spec 7). |
| Setup contradicts the feature | Setup stays add-only for user text. A new file gets the canonical shape; an existing map keeps its headings and column order (spec 7). |
| The user-level default | None existed. New `~/.joycraft/preferences.json`, with `JOYCRAFT_HOME` for tests (spec 3). |
| `now.md` in the knowledge rules | Its own routing row and two named exceptions; session-end and archive steps (spec 5). |
| The must-read gap | Holds print at session start and queue claim. A subagent and a compacted session are named limits, counted in the field run (specs 5 and 8). |
| Word guard | Spec 4 cuts at least 400 words from the two cleanup files; spec 7 moves the quoted Joycraft lines out of `setup.md`; spec 8 holds the total. |
| Check placement | `entry-check.mjs` is its own entry point with `--ci`; `update-check.mjs check` runs its `start` before the policy return (specs 1 and 5). |

## How the work reaches users

The skills and runtime in `payload/` are vendored from the joycraft-prototype repository. Make the change there, cut a `field-N` tag, then re-vendor here and release (spec 8).

- A fresh worktree of this repository fails about 40 test files until `pnpm install` and `pnpm build` have run.
- The main joycraft-prototype checkout can sit on an old branch with no runtime. Cut a worktree from the newest `field-N` tag, with an absolute path.
- The prototype budgets words for each shipped file in `tests/payload-budget.json`. `tests/payload-guard.test.ts` here fails a payload with more words than the previous field build.
- After a bundle edit in the prototype, export a new pin (`docs/context/traps.md` there) and delete the untracked `.joycraft/installation.json` afterwards.
- A release needs the version, `joycraft.release` and the summary changed together. A PR that touches `src/`, `templates/` or `scripts/` needs a CHANGELOG change or a `Docs: none — <reason>` line; run `/release-docs-sync` before `gh pr create`. A merge to `main` publishes to npm; the owner merges.

## How the owner wants to work

- Show anything he must read or answer as a rendered page, opened where he works. Check that the pane is visible.
- Ask in plain words, one decision at a time, with an example from his own file. Keep such examples in the private notes folder.
- Do not ask shape or placement questions about an entry file. Joycraft decides.
- Do not design around an extreme edge case. When a guard adds a question or a rule the usual user must learn, drop the guard.
- Queues run unattended: stop only for something mandatory or broken; defer the rest.
- Stay inside Joycraft. Do not weigh in on the field project's product or stack.
