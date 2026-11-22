# Cleanup checks

`cleanup.mjs` reports; only `age-out --apply` moves files. The tidy step edits
only the lines that `cleanup.mjs tidy` names. Each finding has `check`, `path`,
`detail` and `fix`. `node .joycraft/runtime/cleanup.mjs --checks` lists every
check, what it finds, its kind, and whether it is a gate. `entry-check.mjs` prints the
findings about entry files, and nothing when they are clean; `--ci` prints one
line for each gate finding and exits 2.

`missing-path` skips globs, placeholders, URLs, paths outside the
project and paths that Git ignores. A record rightly names removed paths and
working material, so it is exempt from `missing-path` and `working-link`: a
page with `type: log` or `type: history` frontmatter, `decision-log.md` and
`shipped*.md`. `entry-check.mjs lost --base <rev>` lists the lines
that a change dropped.

`gate-rule` names an entry-file rule line, outside a table, that names the
recorded `tests.gate` or `tests.full` command, so every agent runs it after
each change. The line is the owner's rule: `joycraft-cleanup` offers its
rewrite as one decision, and `update` shows it once.

## One pass

`AGENTS.md` is the entry file: it is loaded in every session. Its Context Map
points at the pages that hold everything else. Both grow and go stale
together, so clean them together: text that leaves the entry file must land
on a page that is true, findable and short enough to read. The pages are every file that a map
row names, the context pages with no row, and the nested entry files.

The aim:

- The entry file is light: just enough for an agent to gather the context
  that its task needs.
- Each page is true, holds one topic, and is no longer than its job needs.
- Stale data goes. Rules that no longer earn their place go.
- Workers and subagents still get enough context for their task. If a light
  entry file or a split page would starve them, say so.

## Two lenses

Give every statement two verdicts.

1. **Truth.** Check it against the repository as it is now: code, config,
   scripts, tests, Git history. It is true, false, stale (was true), or not
   checkable.
2. **Place.** Does it belong where it is, for the reader who meets it there?
   If not, name the place that owns it.

## The entry file

The entry file holds only what an agent needs in every session and cannot get
from the code:

- **Identity:** two or three sentences.
- **Rules:** short imperative sentences, one rule for each bullet. A rule
  stays in the entry file when a mistake would do harm that is hard to undo,
  or when no code, config or check can show it. A rule of that kind stays in
  full, even when it is long, limits included. No procedure, no checklist, no
  list of examples, no history, no "who said it and when".
- **Joycraft's block.**
- **The Context Map:** one row for each guide, "read when <situation>"; then
  one row for each log, "search when you need why or when, or to check a
  regression". Move a rule or a fact out of a row before you shorten it.

Everything else moves to the page that owns its topic. Delete only what the code, a config file or a check
already states, or what is false.

A permission and its limits stay together: both in the entry file, or both on
one page with one line in the entry file, "Read `<page>` before <action>."
Write that line for each rule that a worker must obey.

Aim for at most half of the current word count, and fewer when that does no
harm. The target never outranks a rule that must stay in full.

## Kinds of page

Decide the kind of each page first. The kind sets what "good" means.

- **Guide.** The current rules, facts and how-to for one topic. It holds only
  what is true now. It opens with what the page is for and its rules. A
  reader that a map row sends can read all of it. Aim for under 1,500 words;
  over 3,000 words is a finding.
- **Log** (`type: log`). A dated record: decisions, operations, what shipped.
  An agent searches it to learn why or when, or to check for a
  regression, and never reads it at the start. A
  current rule or current state that lives only in a log is misplaced: check
  that no later row reversed it, then state it in a guide; the log keeps the
  dated record.
- **History** (`type: history`). A postmortem or an old plan, kept for
  lookup. It gets no map row unless a current rule depends on it; then the
  rule moves to a guide.

A page that is two kinds at once, current rules on top of a long dated log,
is the most common defect. Split it: the guide part becomes a short page with
its own map row, and the log part stays as a log. A log only gains text: for
a wrong or replaced row, add one sentence at its end that names what replaced
it.

## What to find on each page

1. **False and stale statements**, each with evidence (file and line, or
   commit).
2. **Contradictions**: with the entry file, with another page, or inside the
   page. Say which side the code supports. When the code cannot settle it, it
   is a question for the owner.
3. **Misplaced content**: history inside a guide; a current rule buried in a
   log; anything temporal (a date, a status, paused, open, in progress, who
   decided); a copy of something that another place owns. Name the one home
   for each: a decision and its reason go to the decision log, an operation
   or a status to its log, open work to the backlog (default `docs/backlog/`).
4. **Shape.** What does a reader that this page's map row sends need, and how
   much must it read to get it? Propose the smallest change that fixes it:
   reorder, split, merge or move.
5. **Rules on the page.** List each permission, prohibition and "ask first".
   Does it agree with the entry file? Is it still in force? A rule that is
   obsolete, duplicated, contradicted, or that guards something that no
   longer exists is a candidate to retire.
6. **What this page should receive from the entry file.** Which of its rules,
   procedures and details belong to this page's topic? Is the page ready to
   hold them?
7. **Enough for a worker.** Would a worker that reads only a light entry file
   and this page have what it needs to act safely? Say what is missing.

## Questions for the owner

Do not guess whether a hold or a pause is still in force, whether a rule
still says what the owner wants, which of two conflicting statements wins
when the code is silent, or whether old material may be deleted.

Do not ask about single lines either: the owner cannot research each one.
Group these into at most eight questions, each about one policy. Stops (what
an agent must ask before) and holds are always two of them: never drop one by
recommendation. A hold that the owner keeps is one present-tense rule: in the
entry file when it is general, on the owning guide when it is about one item.
Its date and reason go to the decision log. A question says what the pages say now, gives two to four
policies with your recommendation, and says how many lines it settles. The
answer is a policy: apply it to each line of its theme. Record each question
as a decision of a cleanup brief under `paths.features` and ask it in the
project's [question style](artifacts.md#asking-questions). Every other choice
is a recommendation: show them as a page that the owner can veto.

## The steps

Above about 20,000 words of pages, first state
the word count and the cost (about 25 tokens for each word). Then split the
work into parts: the entry files are one part, and the pages are groups of
about 20,000 words. One agent does each part, in parallel when the host has
subagents. A small set is one part. A coordinator, the session
that talks to the owner, runs the steps.

1. **List.** Each page with its kind and size. Find what parses these files:
   `git grep -l` each file name in tests, scripts, open specs and queues, and
   read what each one pins. Make no change that breaks one without saying so.
2. **Analyze, read only.** Run `cleanup.mjs`. Each part's agent finds the
   seven things on its pages and writes its numbered findings, its plan and
   its questions. No project file changes.
3. **Ask one round.** The coordinator merges the questions into themes, asks
   them, and waits. With no answer, the lines of that theme stay in their
   words.
4. **Apply.** The agent that analyzed a part edits it: it knows the pages.
   Each agent edits only the files of its own part and writes every other
   change as a request: the file, the exact old text, the exact new text, and
   why. Fix a false statement in each place that states it: `git grep --untracked`
   the claim. Each answer goes to the decision log in the owner's words.
5. **Write the entry file last.** The coordinator writes it from the answers
   and applies the requests. No other agent changes an entry file, and no
   agent commits. Then, in this attended pass only, never at session end, run
   `cleanup.mjs age-out --days 14`. If it lists docs, ask once: "N working docs
   have had no commit for 14 days. Archive them?" On a yes, run it again with
   `--apply`. For each `skipped` entry it prints, say its reason and go on.
6. **Check.** Give each finding a final status: fixed, left for the owner,
   or not done and why. Then an agent that wrote no edit checks the changed
   guides against the code (with no subagents: read them again yourself);
   fix what it finds once. Make the permission
   ledger. Run
   `entry-check.mjs lost --base HEAD` and account for each line. Run `cleanup.mjs`,
   `wiring.mjs`, `entry-check.mjs --ci` and the project's gates. Offer one commit.

On request, check the guides again, or fix a line that a person names
and each copy of its claim.

## Permission ledger

Before the commit, take from the diff and the `lost` report every line that
permits, forbids, stops or holds and that the pass changed, moved or removed:
the old text beside the new. For each, name the owner's answer that decided
it. List first each line where you read an answer onto something that the
owner did not name. Put back a change that no answer decides, and list it as
not covered. Show the ledger with the result.

- A grant keeps the owner's words and scope. Add nothing to it.
- The code settles a fact, not a rule. Report a rule that the code breaks; do
  not remove it.
- Change a test or a script only where it pins text that the pass moved, and
  list each such change.
