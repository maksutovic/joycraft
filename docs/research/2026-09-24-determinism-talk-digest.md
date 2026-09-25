# Goodbye Slop, Welcome Determinism — what the talk claims and how it sits against the panel rulings

> **Date:** 2026-09-24. **Source:** David Khourshid, `Goodbye Slop; Welcome Determinism`, Agent Conf 2026, published by Callstack, 21 minutes, https://www.youtube.com/watch?v=1rMgw0Q5MgY. Read as a local transcript plus 41 stills. **Written for:** the maintainer. **Status:** digest only. No decision. No recommendation.

## Read this first

The speaker created XState and founded Stately. The talk makes one argument in three moves. Slop comes from unstructured delegation, where the human hands judgment, structure, implementation, and taste to one agent in one prompt. A mega-prompt encodes control flow as text. The rules decay as context grows, nobody can prove or inspect the flow, and one prompt locks the workflow to one model and one strategy. The fix has three parts. Pull the rules out of the prompt into an explicit state machine, and keep the model inside each state. Then feed the machine, the recorded traces, and the per-step evals to a second agent that proposes a better machine.

Three facts matter most for the Joycraft mapping.

First, the talk names a failure that Joycraft's skills have today. Every Joycraft skill encodes its control flow as prose steps in Markdown. That is the mega-prompt shape the talk argues against at 6:43 and 7:31.

Second, the talk names an eval gap that the panel comparison also names. Teams eval each step and eval the outcome, but nobody evals the edges, the transitions between steps. The panels' first measure, a failure analysis of unshippable sessions, is an outcome measure in the talk's terms. The edge measure is missing on both sides.

Third, the talk's self-improvement loop needs three durable inputs: a machine file, a trace log with one transition per line, and per-run scores. Joycraft records document reads and the active skill today. It does not record transitions, and it has no machine file to record them against.

## What the talk claims, in order

| Time | Claim | Evidence the speaker gives |
|---|---|---|
| 1:38 | A state machine is one relation. Given a state and an event, you reach one next state. That is determinism. | The relation on the slide, and the infant loop at 2:22: crying, feed, eating, fed, sleeping, wake. |
| 3:14 | Loops and graphs are the same picture. The agent hype cycle moved from loops to graphs, and they are one thing. | Assertion, no data. |
| 3:55 | Slop comes from unstructured delegation. The human hands judgment, structure, implementation, and taste to the agent in one throw. | The slide at 3:59. At 4:43 the speaker says it works until it stops working. |
| 5:48 | Determinism lives in the rules, not in the content. For an email agent: draft before send, send only approved emails, never invent a recipient. The content, the clarifying questions, and the drafts stay non-deterministic. | The two-column slide at 6:11. |
| 6:43 | A mega-prompt encodes control flow as text, and repeats it in the tool description. | The prompt at 6:32. Line 11 says NEVER call send_email until approved. Line 20 repeats it in the tool description. |
| 7:31 | The mega-prompt works most of the time. Nobody can prove it works, see how it works, or guarantee it. The rules decay with context, and one prompt means one strategy. | The five-cross slide at 7:31. Assertion, no data. |
| 8:13 | An explicit machine makes bad transitions impossible, not discouraged. There is no transition from drafting or reviewing to sent, so the send cannot happen there. | The XState machine at 8:14: idle, drafting, reviewing, sending, needsRecipient, sent, cancelled, with a hasRecipient guard on APPROVE. |
| 9:11 | Demo one. The machine runs the agent. The diagram is generated from the machine. An agent wrote the machine. | Live demo, 9:11 to 10:29. The v1 flow asks for missing details before drafting. The speaker calls that annoying at 10:13. |
| 10:39 | `Modeling is not ceremony when it replaces confusion`, for the human and for the agent. Not every agent needs a machine. | Assertion. |
| 11:12 | An explicit machine gives structured observability: which state, which event, which path, with counts. | The log slide at 11:13. Path clarifying to drafting to reviewing to sent. Questions 0, drafts 1, guard hits 0. |
| 12:04 | `You cannot draw arrows in paragraphs`. Prose cannot point at where a flow failed or where to adjust it. | The Lorem Ipsum slide with arrows drawn over it. |
| 12:21 | Teams eval each step and eval the outcome, and forget to eval the edges. | The three-slide build at 12:22, 12:44, and 12:54. |
| 13:08 | The machine is a durable artifact. Feed the machine, the traces, and the evals to a second agent and ask for a proposed change. | The prompt at 13:09, reconstructed below. |
| 13:39 | Stately runs this loop on its own state-machine generation and editing pipeline, and with software factories. | Self-report. No numbers. |
| 14:11 | Demo two. The proposing agent produced a v2 that drafts first and asks after. The speaker judges it a quicker workflow. | Live demo, 14:11 to 15:01. One run. No metric. |
| 15:01 | All evals can pass on machine one and it can still be the wrong machine. Only dogfooding plus the propose loop finds the better one. | Assertion from the demo. |
| 15:24 | No library is needed. The only loop you need is init, then while active: next event, transition, execute effects. XState, a switch statement, a reducer, or LangGraph all fit. | The pseudocode at 15:27. |
| 16:27 | The cycle is model, observe, propose, compare. The proposing agent is a different agent from the running one. Compare runs the same scenarios on machine v1 and machine v2. | The cycle slide at 16:26. |
| 17:13 | Prior art: AgentSpec, AFlow, and process mining. Process mining is about twenty years older and does the same thing over event traces. | The three papers on the slide at 17:20. |
| 17:49 | In 2023 the graph kept the agent honest. In 2026 the same graph lets the agent improve its own behavior. | The two slogans at 17:50 and 18:02. |
| 18:16 | Demo three. An espresso machine modeled as a state machine. Jev picks the next event from the full machine and the full event list, with a probability shown per option. Chaos breaks parts, and Jev routes to repair. | Live demo, 19:13 to 20:47. The panel at 20:31 shows conf 0.07, wait 53%, repair the grinder 47%. |

## The reusable artifact, the workflow-review prompt

The slide at 13:09 shows the prompt the speaker uses to get a proposed machine v2. The right edge is cut off on the slide. Bracketed text is the reconstruction.

```text
You are reviewing an agent workflow.
Attached:
- machine.json      the current workflow: state[s and transitions]
- traces.jsonl      N recorded runs, one trans[ition per line]
                    (from, event, to, cost, lat[ency, ...])
- evals.json        per-run scores: step, edge, [outcome, and whether the]
                    user accepted the result
- invariants.md     properties any version of t[he machine must hold]
Task:
1. Read the traces against the machine. Say whe[re]
   low edge scores concentrate, with numbers.
2. Produce a new machine.json. You may add, rem[ove, and]
   reorder states and transitions freely. You a[re not limited to]
   small edits; if the shape of the workflow is [wrong, change]
   the shape.
3. Explain the difference between the two mach[ines,]
   and which edges you expect to improve, and w[hy.]
4. Say what result would mean the new machine i[s]
   rejected.
Constraints:
- Every property in invariants.md must still ho[ld.]
- Change the workflow, not the prompts or model[s.]
- If the current machine is already fine, retu[rn it unchanged.]
```

Four properties of this prompt carry weight on their own.

- The four inputs are all files. The machine, the traces, the evals, and the invariants are durable artifacts on disk, not context in a conversation.
- The proposer states up front what result rejects its own proposal. That is a falsification clause, written before the compare step runs.
- The proposer is free to change the shape. It is not permitted to touch the prompts or the models. The change surface is the graph only.
- The invariants file is the deterministic half from 5:48, carried across versions. The proposer can reshape everything except those properties.

## The loop and the cycle

The execution loop at 15:27:

```text
state, effects = init(machine)
execute(effects)

while state is active:
  event = nextEvent()
  state, effects = transition(machine, state, event)
  execute(effects)

return state.output
```

The improvement cycle at 16:26 is model, observe, propose, compare. The speaker's words on the roles:

```text
Not the exact same agent, but a different agent that's actually introspecting
and looking at its own state machine
```

Compare means to run the same scenarios on machine version one and machine version two.

## The Jev demo, what it shows and what it does not

The espresso demo at 19:13 gives Jev the full machine and the full event list, and asks for the next event. The screen shows a probability per candidate event, a confidence number, and Jev's pick. With the grinder broken, Jev weighs wait at 53% and repair the grinder at 47%, with confidence 0.07. The speaker built this the night before. At 20:46 he says he is surprised that it works.

The demo shows no eval and no run count. It shows no comparison against rules, or against an LLM that picks the next event. The only failure cases are the chaos toggles. This is a one-run demo, the same evidence class as the Agentic OS video that the Jev evidence digest discounts.

## Prior art the talk names

- **AgentSpec**, Wang, Poskitt, and Sun, Singapore Management University, ICSE 2026. Customizable runtime enforcement for LLM agents. The talk cites it for the 2023 half of the argument, the graph as a guardrail.
- **AFlow**. Automated agentic workflow generation by search over a graph of nodes and edges, with execution feedback. The talk cites it for the propose step.
- **Process mining**. Discovery, conformance checking, enhancement, and monitoring over event logs. The talk cites it as the twenty-year-old form of the same loop: traces in, a formal model out, optimization from the model.

## Claims with no data behind them

- The five crosses at 7:31 are assertions. No study is cited for rule decay with context length.
- The v2 machine is judged better by the speaker's feel in one run. No scenario set ran on both machines on stage. The compare step in the cycle was described but not demonstrated.
- The claim that the loop works well for Stately's own pipeline and for software factories is self-report with no numbers.
- The espresso demo is one run with no eval.

## The talk against the panel rulings

Silent means the talk carries no claim to judge against that ruling. Rulings and their wording come from `docs/research/2026-09-24-dynamic-joycraft-panel-comparison.md`.

| Ruling | What the panels concluded | What the talk claims | Agrees, conflicts, or silent |
|---|---|---|---|
| P0. A reimagining is warranted. | Repair and consolidate Joycraft, and measure the slop before building a gate. | Do not throw the agent away, and do not model every agent. Add a machine where it replaces confusion. Observe traces before you propose a change. | Agrees. |
| P1. Hub plus few doors. | Only a router block in `AGENTS.md` has data behind it. A hub skill stays a trial. | Nothing on entry points. | Silent. |
| P2. CLI as state oracle. | Compute state in a local, versioned script, never over `npx` at runtime. | Code computes the next state from the machine, the current state, and the event. The model never holds the state. | Agrees. |
| P3. Gates over advice. | Move the non-overridable guarantee to graduation and to merge, not to a hook. | A rule in prose decays with context. A missing transition is a rule that cannot decay. The guarantee lives in the machine that owns the loop. | Agrees on the diagnosis. Silent on where the machine lives. |
| P4. Gated generation. | Curate process prose by default. Generate only machine-checkable artifacts behind an accepted check. | The proposer generates a new machine file, never prose and never prompts. Every version must satisfy the invariants file. The human compares before adopting. | Agrees. |
| P5. Fetch-and-subtract profiles. | Keep curated, dated model profiles. | Nothing on model guidance. | Silent. |
| P6. Jev on the hot path as core. | Jev is never core. Hot-path routing needs a shadow run or a narrow trial first. | Jev picks the next event from the list of legal events. The machine decides which events are legal. One run, no eval. | Silent on core. Adds a shape: the machine bounds the pick. |
| P7. Hybrid distribution. | The CLI stays the one install and update authority. | Nothing on distribution. | Silent. |
| P8. Which skills die. | No skill dies whole. Cut ceremony first, and protocol only behind an eval. | `Modeling is not ceremony when it replaces confusion`. Not every agent needs a machine. | Agrees. |
| P9. Front-loaded quality. | The human declares an idea clear, and a real explore state exists before that point. | The v1 machine asked questions before drafting. The proposed v2 drafts first and asks after. The speaker judged v2 better on one run. | Mild tension. One demo, no data. |
| P10. Architecture defense. | An opt-in mode where corrections become checks or owner-stamped rows. | Invariants live in one file that every proposed version must satisfy. | Agrees in shape. |
| P11. Background profile forks gates. | A label changes explanation depth only, never which gates run. | Nothing on user profiles. | Silent. |
| Human declares clarity. | The human says an idea is clear. The agent never infers it. | The demo agent asks for missing details, and the human answers. Nothing on who declares clarity. | Silent. |
| No label changes gates. | An expertise label changes explanation depth only. | Nothing on labels. | Silent. |
| CLI is the single authority. | One CLI is the sole install and update authority. | Nothing on install. | Silent. |
| Multi-harness. | Joycraft supports Claude Code, Codex, and Pi. | The loop needs no library. XState, a switch statement, a reducer, or LangGraph all fit. | Agrees. |
| Generated prose. | Curate prose. Do not auto-generate it. | `Change the workflow, not the prompts or models`. | Agrees. |
| Measure the slop first. | Write a failure analysis of bad sessions before building a gate. | Observe comes before propose. The unit of observation is the transition, with cost and latency per edge. | Agrees on order. Differs on unit: transition, not session. |
| `Verify before done`. | Wire an independent check into the move from in-review to done, and require its evidence. | Eval each step and the outcome. Then eval the edges, which teams forget. A different agent proposes. The running agent never grades itself. | Agrees, and adds the edge eval. |

## Where Joycraft already has the talk's shape

- **The Pi implement loop is the talk's loop at the spec level.** `src/templates/pi-scripts/joycraft-implement-loop` asks `joycraft-next-spec` for the next state. It runs one fresh `pi -p` process per step, and it stops on the first failure. The model runs inside each step. It never runs the loop.
- **The spec lifecycle is a three-state machine.** `todo` moves to `in-review` through `joycraft-spec-done`, and to `done` through `joycraft-verify` or session-end. `docs/reference/spec-status-lifecycle.md` says `The agent never self-certifies`. One script, `joycraft-mark-done`, owns the transition and rejects any other state word.
- **The panels' four graduation states are a machine.** Worker stopped, checks passed, review unresolved, and accepted. Codex adds that missing evidence or a timeout means unresolved, never passed. That is the talk's missing transition: no edge from unresolved to done.
- **`joycraft-verify` is the talk's different agent.** It spawns a read-only agent that checks an implementation against its spec.
- **`joycraft-optimize` and living-harness S9 are the propose step in advisory form.** Optimize assigns a disposition per control. Session-end proposes repeated discoveries and never applies them, per `docs/features/2026-07-21-living-harness/design.md`.
- **`src/telemetry.ts` already parses transcripts into events.** It reads Claude, Pi, omp, and Codex transcripts, and it detects a skill switch. That is the raw material of a trace.

## Where Joycraft does not have it

- **Inside a skill run there is no machine.** Control flow is prose steps in Markdown. The evidence file counts ten skills that end with `Run /clear first`, so a handoff is a human action, not a transition. The compound-engineering research states `Git/PR/worktree flows are prose, not state machines`, in `docs/features/2026-06-18-compound-engineering-parity/research/ce-vs-joycraft-claude.md`.
- **No transition log exists.** Telemetry records document reads, tagged mandated or voluntary, and the active skill. It does not record from, event, to, cost, latency, or outcome. The benchmark prior-art digest lists the same gap: no tokens, cost, duration, or per-run identity.
- **No invariants file exists.** The Q1 invariant, gates plus lifecycle plus artifacts plus STE plus TDD, is stated in a checkpoint. No check reads it.
- **No edge eval exists.** `joycraft-verify` grades the outcome of one spec against its text. The panels' first measure, the failure analysis, grades sessions. Neither one names the transition that let a bad session through.
- **No compare step exists.** Nothing runs one scenario set against two versions of a workflow. The benchmark digest's verdict is `None of this adds up to a benchmark`.
- **The vocabulary is absent.** The docs have zero hits for process mining, edge eval, XState, LangGraph, AFlow, AgentSpec, and structured log. The context-isolation experiment report says `joycraft_next_spec is a signal, not a state machine`.

## Open questions

- What the machine is in Joycraft's terms. Two candidates: the graduation lifecycle across a feature, where the states exist, or the inside of one skill run, where nothing exists.
- What an edge is in Joycraft's terms. Candidates: spec-done to `joycraft-verify` to done, and the skill-to-skill handoffs that pass through `/clear`.
- Whether `src/telemetry.ts` can emit one transition per line from the transcripts it already parses. Skill switches are detected. State, cost, latency, and outcome are not.
- Which existing skill the propose prompt maps onto: `joycraft-optimize`, session-end S9, or neither.
- Whether a machine that bounds Jev's pick changes the Q5 evidence bar. The talk shows the shape and no eval, so today the answer is no.
- Whether the interview, brief, decompose front-load is the talk's v1 edge, questions before drafting. One email demo is not evidence for a coding workflow.

## Sources

- The talk: https://www.youtube.com/watch?v=1rMgw0Q5MgY. Timestamps in this digest are from the published video.
- `docs/research/2026-09-24-dynamic-joycraft-panel-comparison.md`, the rulings.
- `docs/research/2026-09-24-dynamic-joycraft-evidence.md`, section 8.1 for the ten `Run /clear first` skills.
- `docs/research/2026-09-24-jev-harness-evidence.md`, the Jev evidence class.
- `docs/research/2026-09-24-harness-benchmark-prior-art.md`, the measurement gap.
- `docs/reference/spec-status-lifecycle.md`, the three-state lifecycle.
- `src/templates/pi-scripts/joycraft-implement-loop`, `joycraft-next-spec`, and `joycraft-mark-done`.
- `src/telemetry.ts`, what a transcript line contributes.
- `docs/features/2026-06-18-compound-engineering-parity/research/ce-vs-joycraft-claude.md`, lines 68 and 127.
- `docs/features/2026-07-21-living-harness/design.md`, S9.
- `docs/features/2026-05-27-context-isolation-test/experiment-report.md`, line 78.
