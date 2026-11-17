# Handoff: canonical entry file

**Written:** 2026-11-17, at the end of the research and design session. **Next step:** decompose the brief into specs, then implement.

## Read these first, in this order

1. `docs/features/2026-11-17-canonical-entry-file/brief.md`: the owner's request, his three answers with notes, the settled design, the done-when lines. The brief is the authority.
2. `docs/research/2026-11-17-entry-file-sota-panel-verdict.md`: vendor guidance, measured evidence, the five-seat panel verdict, pre-committed measurements and kill criteria.
3. Private working notes, git-ignored, in the main checkout of this repository: `docs/max-discussion-transcripts/2026-11-17-canonical-entry-file/`. Start with its `README.md`. It holds the eight full agent reports, the saved vendor pages, and everything that names the field project. Nothing from that folder goes into this public repository.

## State

- Research, panel and owner dialogue are done. All three brief decisions are answered `custom`; the brief body states what was settled.
- Nothing is implemented. No spec exists yet. The brief status is `draft`.
- Branch `research/canonical-entry-file`, cut from `main` at the 1.5.4 merge.

## The settled design in six lines

1. Cleanup stops asking shape questions. One table of standing dispositions replaces "never reword a rule" and "change nothing until approved".
2. `entry.tidy` is a setting: `auto`, `ask-once`, `review`, with a user-level default. The owner wants `auto` for himself: no question, ever.
3. Rules are rewritten once per project. Explanation, dates and history come out; every limit stays in the entry file; a limit leaves only when a test or script enforces it. A script lists the limit clauses before and after and fails the rewrite when one is missing. After that, rule blocks are pinned byte for byte.
4. AGENTS.md holds nothing temporal. One map row points at `docs/context/now.md`, the only page where dated entries live. Session end checks it every time and empties it when nothing is current.
5. One deterministic check, silent when clean, runs once per coordinator session, once per queue and in CI. Workers, subagents and linked worktrees never check or edit an entry file.
6. Vendor guidance reaches projects through Joycraft's managed block and the checker. Joycraft never migrates a user's rule text.

## Choices the agent made that the owner has not confirmed

Raise each one before the spec that depends on it is accepted.

- With `entry.tidy: auto`, the one-time rules rewrite is applied without a review stop, and the report shows each rule before and after. The owner was asked twice and did not answer; he said earlier "for me i want do not ask at all".
- Holds live in `now.md` and bind through the map row's "before starting any work" wording. The idea of printing holds at session start was dropped as unnecessary; add it only if holds are missed in practice.
- A `now.md` entry older than 14 days is an advisory finding. The number is a guess.
- The restriction-token lexicon in the brief is a first draft.

## Problems to solve during decomposition

1. **The unit of a limit.** The panel's probe found that three sentence splitters gave 101, 104 and 167 units on the field file. The brief says "limit clause"; the spec must define it so that a script, not a model, produces the list. A Markdown block is stable; a clause is not. One workable form: the script lists every block that holds a restriction token, the model rewrites, and the script requires each token-bearing sentence of the old block to appear word for word in the new block unless a named check covers it.
2. **Who writes Joycraft's lines.** The brief says the managed block is "regenerated at update". An earlier owner ruling (`docs/features/2026-11-02-install-entry-files/brief.md`, decision `writer`) says the agent writes Joycraft's lines, not the CLI, because only the agent knows the project. Reconcile them: for example the runtime prints the block and checks it, and the agent places it.
3. **Setup contradicts this feature.** `payload/.joycraft/references/setup.md` says every existing line of AGENTS.md survives, appends rows, and uses `| Document | Read when |`. The brief uses `| Read when | Document |` for new files and says an existing file keeps its headings. Decide what an existing map keeps.
4. **The user-level default.** Find out whether Joycraft has any user-level settings file today. `joycraft.yaml` and `.joycraft/preferences.json` are per project.
5. **`now.md` in the knowledge rules.** `knowledge.md` says homes state what is true now and carry no dated addenda. `now.md` is a deliberate exception and needs its own row in the routing table, plus steps in the session-end skill and in `archive.mjs`.
6. **The must-read gap.** A linked page is not loaded again after a compaction, and some subagents get no entry file. A hold in `now.md` therefore depends on the agent following the map row. The 2026-09-01 panel named this residue; say so in the spec and measure it.
7. **Word guard.** The shipped payload may not grow in words. The cleanup skill and `cleanup.md` state the freeze policy three times; cutting that and the approval ceremony should pay for the new text. Scripts do not count toward the guard.
8. **Check placement.** The check must not sit behind the update policy: `update-check.mjs` returns early when the policy is `off`. It needs its own entry point and a `--ci` mode.

## Suggested spec order

1. Entry checks in the runtime: temporal text in an entry file, `now.md` age, Codex chain bytes over 32,768, package-script names, `@` imports and `AGENTS.override.md`, a nested `CLAUDE.md` with no `AGENTS.md`, the non-rule word baseline; silent in linked worktrees; `--ci`.
2. Cleanup skill and reference: delete the freeze policies, add the dispositions table and the ruling definition. Net word cut.
3. `now.md`: map row, knowledge routing, session-end add, remove and empty, archive removal.
4. `entry.tidy` setting, user-level default, the one setup question.
5. Rules rewrite, the limit check and the pin check.
6. Managed block with the scoped code-wins sentence; setup writes new files in the canonical shape.
7. Field run on the field project and the three measurements from the verdict.

## How the work reaches users

The skills and runtime in `payload/` are vendored from the joycraft-prototype repository. Make the change there, cut a `field-N` tag, then re-vendor here and release.

- A fresh worktree of this repository fails about 40 test files until `pnpm install` and `pnpm build` have run.
- The main joycraft-prototype checkout can sit on an old branch with no runtime. Cut a worktree from the newest `field-N` tag, with an absolute path.
- `tests/payload-guard.test.ts` here fails a payload with more words than the previous field build.
- After a bundle edit in the prototype, export a new pin (`docs/context/traps.md` there) and delete the untracked `.joycraft/installation.json` afterwards.
- A release needs the version, `joycraft.release` and the summary changed together. A PR that touches `src/`, `templates/` or `scripts/` needs a CHANGELOG change or a `Docs: none — <reason>` line; run `/release-docs-sync` before `gh pr create`. A merge to `main` publishes to npm; the owner merges.

## How the owner wants to work

- Show anything he must read or answer as the decision page: `node payload/.joycraft/runtime/artifacts/cli.mjs serve --brief docs/features/2026-11-17-canonical-entry-file/brief.md --view docs/features/2026-11-17-canonical-entry-file/artifact.json`, opened where he works. Check that the pane is visible.
- He said of this session's questions: "we need to dialogue more clearly". Ask in plain words, one decision at a time, with an example from his own file. Do not offer three abstract options.
- Do not ask shape or placement questions about an entry file. Joycraft decides.
- Queues run unattended: stop only for something mandatory or broken; defer the rest.
- Stay inside Joycraft. Do not weigh in on the field project's product or stack.
