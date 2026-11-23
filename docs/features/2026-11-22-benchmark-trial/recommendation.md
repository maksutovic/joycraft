# How the ride trial fits Joycraft development

Updated: 2026-11-22. Method: [`docs/guides/benchmark-trial.md`](../../guides/benchmark-trial.md).

**Recommendation in one line:** run the trial before each minor release, with a
vanilla Claude Code arm as the baseline, three rounds per arm, a fixed anchor
task plus one rotating task, and a release rule of "no worse than vanilla on the
product, and within 2× of vanilla on cost and time". Measure the context map
directly in session 2, because it may be Joycraft's best attribute.

The decisions below are on this page. Nothing changes until you answer them.

## 1. Add a vanilla Claude Code arm

Anthropic improves the base harness all the time. A framework that won last
month can be dead weight this month. The question each release must answer is
"does Joycraft beat Claude Code with nothing added?", not "does Joycraft beat
pstack?".

v1 already hints at the answer. Pocock's builder used no skill, so that arm was
close to vanilla. It won the product score and was fastest and cheapest.

The vanilla arm:

- starts from the same empty folder, with the same model, effort, driver,
  persona, answer sheet and operator note;
- gets a setup message with no framework: "set up the project the way you think
  is best: `AGENTS.md`, `CLAUDE.md`, a `docs/` folder and a context map. No app
  code yet." The setup gate stays the same, so every arm has a context map;
- gets the same build and session-2 messages, word for word.

Run Pocock and pstack less often (decision `arms`). They show where the field
is going, but they are not the baseline.

## 2. When it runs, how many runs, what it costs

| Item | Recommendation |
|---|---|
| When | Before each minor release (1.10, 1.11, …), after the release PR is green and before merge. Also once when Claude Code ships a major version or a new default model. |
| Runs | 3 rounds per arm. One run cannot tell a 2-point gap from noise; v1 showed that. |
| Arms each release | `joycraft` and `vanilla`. All four arms once a quarter. |
| Budget | About $5–10 builder cost per arm-run. 2 arms × 3 rounds × 2 tasks ≈ $60–120, plus user agents and judges. Cap: $200 per trial. Stop and report if a trial passes the cap. |
| Smoke | One cheap-model smoke arm-run before every trial, to prove the driver and isolation. |

## 3. Pass and fail rules

Compare arm means over the three rounds. A gap smaller than one standard
deviation counts as a tie.

| Check | Pass |
|---|---|
| Product (/50) | Joycraft mean ≥ vanilla mean − 2 |
| Engineering (/40) | Joycraft mean ≥ vanilla mean |
| Session-2 change done and checked | Joycraft ≥ vanilla (count of rounds) |
| Session-2 time to orient | Joycraft ≤ vanilla |
| Cost (both sessions) | Joycraft ≤ 2.0× vanilla |
| Active time (both sessions) | Joycraft ≤ 2.0× vanilla |
| Isolation | No global-folder warning, no auto-memory carried into session 2, init line clean |

A failed check does not block the release by itself. It needs a written reason in
the release PR and a backlog item. Two releases in a row that fail the same check
block the next release until it is fixed or the rule is changed (decision
`pass-rules`).

v2 round 1 gives a sense of scale: Joycraft took 20.3 active minutes and $9.02,
Pocock 8.0 minutes and $3.30, pstack 10.0 minutes and $4.03. At 2.0× of an 8-minute,
$3.30 baseline, that round would fail time and cost. The 1.9.3 fixes
(reviewer dispatch flags, evidence rejection) target that gap.

## 4. A rotating task set

One app makes Joycraft fit one app. Keep the ride app as a fixed anchor, so
releases stay comparable, and add one task from a rotation.

| Slot | Task | Session 2 |
|---|---|---|
| Anchor (every trial) | "Can I ride through Mill Valley?" (small, greenfield, two keyless APIs) | 3-day forecast |
| Small | A one-screen tool with one API (for example, a sunrise and golden-hour planner) | Add a second city |
| Medium | A multi-page app with local storage and a form (for example, a shared ride log with stats) | Add CSV export and a filter |
| Brownfield | A frozen open-source app of 20–50k lines, set up in session 1 without new features | A bug fix and a small feature from that project's real issue list |

Rules for every task:

- Write the build message, the session-2 message and the answer sheet before the
  first run, and never change them during a trial.
- Write the session-2 change so it needs knowledge from session 1 (a threshold,
  a data source quirk, a decision), not only the code.
- Keep each task in `bench/tasks/<name>/` (or the harness folder) with its
  messages, answer sheet and judge rubric.
- Retire a task after four releases and add a new one, so that nobody tunes
  Joycraft against a known task.

## 5. How results feed back

- **Record.** Each trial adds one row to `docs/context/benchmark-trials.md`, a
  record (search it, do not read it at the start): date, Joycraft version, Claude
  Code version, model and effort, tasks, rounds, and per-arm means ± sd for
  product, engineering, session-2 done, time to orient, cost and active time,
  with a link to the chair's verdict. The trend across releases is the point.
- **Lessons become specs.** The chair ranks lessons for Joycraft, as v1 did. The
  top lessons become backlog items or a feature brief for the next release. Each
  names the trace that proves it, and the next trial checks it.
- **Kill criteria.** A Joycraft step that the process analyst finds skipped or
  faked in two trials in a row (as v1 found for the queue bookkeeping and the
  `[AC:...]` tags) is made automatic or removed.
- **Release notes.** The release PR body states the trial's pass and fail lines.

## 6. Joycraft as a living system: grow where it measurably wins

The trial so far points at one strength: the context map and the handoff docs.
In v2 every session-2 builder oriented in about a minute; pstack's oriented in
one command from its `docs/context-map.md`. In v1, Joycraft's `tide-data.md`
and `decision-log.md` were the best handoff, but nothing used them. Joycraft
should invest where a measurement shows a win, and cut where it shows only cost.

### Measure orientation directly

Compute these from the session-2 `turn-<N>.jsonl` (every line has a `timestamp`)
and add them to `collect.mjs`:

| Metric | Definition |
|---|---|
| Time to orient | Minutes from the session-2 start to the first `Edit` or `Write` of a non-doc file |
| Reads before first edit | `Read`, `Grep`, `Glob` and read-only `Bash` calls before that edit |
| Failed reads | Reads of a path that does not exist, or that return an error |
| Wasted reads | Files read before the first edit that the session-2 diff neither changes nor imports |
| First doc read | The first doc the builder opened (entry file, context map, a mapped page) |
| Lost knowledge | Session-1 facts (threshold, source quirk, a decision in the docs) that session 2 breaks or asks again |

"Lost knowledge" needs a list per task, written before the trial, and a check by
the process analyst.

### Isolate the cause

Time to orient mixes the map with code size and builder luck. Two more steps
make it a fair test:

- **Fix auto-memory first.** v2 builders saved notes to Claude Code auto-memory,
  which session 2 of the same arm can load. Until that is off, session-2 numbers
  are not clean.
- **An ablation arm, once a quarter.** `joycraft-nomap` runs Joycraft as usual,
  then deletes the context map and the docs it maps before `new-session`.
  The gap between `joycraft` and `joycraft-nomap` in session 2 is the value of the
  map, with all else equal.

### Go to larger repos

On a 10-minute app every builder can read all the code. The map can only win on
a repo too large to read: the brownfield slot. Run it with a session 2 and a
session 3 (another fresh builder, another change), so that the docs must stay
true across two handoffs.

## 7. Harness home

Move the harness scripts and templates into this repo as `bench/ride-trial/`,
outside `payload/`. Nothing in `bench/` ships to users: `package.json` `files`
does not list it, and `isProductPath` does not match it, so a change to it
publishes nothing. Arm folders, traces and judge copies stay outside the repo
(they are large and hold live data). Benefits: the method is versioned with the
releases it judges, the fixes found above land as reviewed commits, and another
contributor can run it.

Before the move: add `prepare.mjs` (render messages and personas from
`config.json`), the auto-memory fix, an init-line audit, an anonymizer for the
judge copies, and the orientation metrics. Copy nothing until you agree
(decision `harness-home`).
