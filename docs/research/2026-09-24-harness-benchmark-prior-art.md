# Harness benchmarks — prior art and what Joycraft measures today

> Date 2026-09-24. Written for: the maintainer. Status: prior art only. No design. No decision.

## Read this first

The closest prior art to the benchmark the maintainer wants is Harness-Bench. It fixes the task, the sandbox state, the budget, and the evaluator, then varies the harness configuration across model backends. Its headline finding is that agent capability depends on the model and the harness together, not on the model alone. The SkillsBench version question is resolved. ArXiv paper 2602.12670 has four submitted versions, and version 4, submitted 14 June 2026, is the current version of the same SkillsBench paper. It is not a separate paper. Its numbers match the version 1.1 blog post an earlier research pass had already found. Curated skills raise the average pass rate from 33.9% to 50.5%. Self-generated skills score 8.1 to 11.5 points below the no-skills baseline. A benchmark needs 5 to 10 runs per configuration to reliably detect a difference smaller than 5 percentage points. Two scores within a few points of each other count as tied. Joycraft's own telemetry scanner already records document reads and skill invocations from live session transcripts. It does not record tokens, cost, wall time, or a quality score. None of the fields a benchmark needs for grading exist in the tool today.

## Fireship's method

The Fireship comparison video is only partly confirmed. A real video exists. It compares the same game, built once with OpenAI's GPT-6 Astra and once with Claude Fable 5.1. A verdict follows on which one is more fun. It was published around 9 to 10 September 2026 on the Fireship YouTube channel. No confirmed recurring franchise with a fixed named app was found. The format is the useful part: one app built many ways, judged head to head. Fireship itself published no methodology, score, or cost data to cite as rigorous.

Sources: `https://www.youtube.com/c/Fireship` and `https://ai-tldr.dev/releases/fireship-astra-vs-fable-game-sep9/`.

## Prior harness benchmarks

| Benchmark. | What is fixed. | What varies. | N. | Metrics. | Headline result. | URL. |
|---|---|---|---|---|---|---|
| Harness-Bench. | Task, sandbox state, budget, timeout, evaluator. | Harness configuration across model backends. | 106 tasks, 5,194 trajectories. | Completion, process quality, token cost, failure symptoms. | Capability depends on the model and harness pairing together. | https://arxiv.org/html/2605.27922v1 |
| SkillsBench, version 4. | Task set, curated skills, deterministic verifiers. | Skill condition, none, curated, or self-generated, across 18 model-harness pairs. | 87 tasks, 18 configurations. | Pass rate. | Curated skills raise pass rate from 33.9% to 50.5%. Self-generated skills score 8.1 to 11.5 points below the no-skills baseline. | https://arxiv.org/abs/2602.12670 |
| Session-Bench. | Not confirmed, scrape was blocked. | 10 coding harnesses' session records. | Not confirmed. | What a session record retains after the session ends. | Not confirmed, title and teaser only. | https://www.reddit.com/r/ChatGPTCoding/comments/1voh02y/ |
| OpenBench. | The model. | The coding-agent harness: Codex, Pi, OpenCode, Cursor, Devin. | Not stated in the source. | Correctness, speed, token cost. | Direct analogue of a harness-ablation benchmark arm. | https://github.com/minghinmatthewlam/openbench |
| Same Model, Different Harness. | The model. | Two configurations of the same harness. | Not stated in the source. | Score across three coding benchmarks. | Even a harness sub-configuration, not just harness identity, moves results. | https://www.alphaxiv.org/abs/2608.26218 |
| Terminal-Bench. | The task suite. | The model. | Runs cost 1 to 100 US dollars per model, up to about 100 million tokens per full run. | Standard agentic coding score, plus token and cost comparisons. | Reports token and cost differences across models directly. | https://www.tbench.ai/news/terminal-bench-3-0 |
| Bito AI 60-task benchmark. | The harness. | The model. | 60 tasks, 29 models. | Pass rate from mixed grading, plus process metrics such as steps and wall time. | Grading methodology is directly reusable, see the quality section below. | https://bito.ai/benchmarks/ai-coding-model-cost/ |

Several other write-ups describe harness comparisons but publish no methodology or numbers to confirm. These include a MindStudio roundup, a Winder.AI comparison, and a blog leaderboard by Jock Ciesielka. They also include claims from stet.sh, coseto6125, Anup Jadhav, and mem0 about A/B testing AGENTS.md or CLAUDE.md files. Treat all of these as directional, not as data.

### Ready-made tooling

`claude plugin eval` shipped in Claude Code version 2.1.269, around 11 September 2026. Joycraft's own eval template lives at `src/templates/evals/check.sh`. It runs each test case in a fresh isolated `-p` session, three times per condition, always against a no-plugin baseline. It reports the result as a delta. It scores with graders you define or it writes for you: regex match, tool-used rate, tool order, file existence, an LLM grader that needs two of three votes to pass, and a baseline comparison. Its exit code can gate CI.

`/skill-doctor` shipped in Claude Code version 2.1.261, around 4 September 2026, and needs Claude Code 2.1.252 or later. It reports each skill's context token cost and how often it was invoked in your own sessions. It also flags skills or plugins that were never invoked.

## Measuring tokens, cost, and time

| Harness. | Source of truth. | Fields. | Cost available? | Tool. | URL. |
|---|---|---|---|---|---|
| Claude Code. | Local JSONL session transcripts. | Per-turn token counts, session ID, tool calls. | Yes, through a third-party reader. | ccusage. | https://ccusage.com/ |
| Claude Code. | In-session slash commands. | Live token counts. | Yes, an estimated dollar cost for API users. | `/usage`, `/context`. | Confirmed in Claude Code itself. |
| Claude Code. | OpenTelemetry export, set with `CLAUDE_CODE_ENABLE_TELEMETRY` and `OTEL_METRICS_EXPORTER`. | Metrics, traces, and logs sent to any OTLP collector. | Yes, one community wrapper adds a dollar-cost field, unverified as an official field. | claude_telemetry. | https://github.com/TechNickAI/claude_telemetry |
| Claude Code. | Headless output from `claude -p --output-format json`. | Confirmed to exist and used for automation. | Unverified, exact JSON field names for cost and tokens were not confirmed in this pass. | `claude -p`. | Confirm against `claude -p --help` directly. |
| Codex CLI. | `codex exec --json` event stream. | The `turn.completed` event gives a cumulative token total for the whole session, not per call, a known open limitation. | No built-in dollar cost. Confirmed directly: Codex CLI does not price sessions. | ccusage, beta Codex support. | https://ccusage.com/guide/codex/ |
| Pi. | Local usage logs that ccusage reads. | Unverified field names. ccusage lists `pi-agent` as a supported source, which implies Pi writes local usage logs. | Likely yes, through ccusage. | `ccusage pi`. | https://ccusage.com/ |

## Grading quality

Bito AI built the strongest worked example of quality grading found in this pass. It wrote grading criteria before running any model. It graded 21 of 60 tasks by running the model's code against tests confirmed in advance. It graded 7 more by planting a specific fault and testing whether the model found it. It graded the remaining 32 tasks with a single LLM judge, using the model claude-opus-5. It stripped the candidate model's name from the submission first, to blind the judge against brand bias. On the 174 answers graded by both a test and the judge, the two methods agreed 78% of the time. Every disagreement was the judge failing an answer that the test passed. The judge never passed an answer the test failed. Source: `https://bito.ai/benchmarks/ai-coding-model-cost/`.

Judges carry known biases. A systematic study of position bias found that verdicts can flip on a simple order swap. On closely matched pairs, 20% to 40% of verdicts flip this way. When the quality gap between two candidates is small, the effect is strongest, exactly the regime a harness benchmark most needs to tell apart. Source: `https://aclanthology.org/2025.ijcnlp-long.18.pdf`. A software-engineering-specific audit found that a judge can flip its verdict on a plain re-run of the same pair. The rubric, the prompt, and the code all stayed the same. Source: `https://arxiv.org/html/2604.16790v1`. Judges also tend to rate longer answers higher regardless of quality. Source: `https://tianpan.co/blog/2026/04/27/llm-judge-bias-audit-length-position-format`.

The literature suggests four mitigations. Swap the order of the two candidates and require a consistent verdict, treating any inconsistent pair as a tie rather than a resolved comparison. Break one overall score into separate scores per criterion. Run judges from more than one model family and require a majority vote. Normalize for output length, though this can unfairly penalize a genuinely longer correct answer. Source: `https://arize.com/docs/ax/concepts/evaluators/evaluator-best-practices`.

No strong prior-art example was found of a harness benchmark grading software architecture through static analysis or a structured blind human review. This looks like an open gap rather than a place to copy an existing method.

## Run counts and variance

The paper "On Randomness in Agentic Evals" ran the same agent configuration 10 times on the same benchmark. It found real run-to-run variation in pass rate. An improvement measured from a single run can be pure randomness. With 10 runs per configuration, the study detected improvements of 2 percentage points or more reliably, but not smaller effects. The required run count grows sharply as the effect size shrinks, following a standard two-sample power formula: `n ≥ 2 · ((Zα/2 + Zβ) / (Δ/σ))²`, where the required count scales with the square of the noise-to-effect ratio. A large effect, around 10%, can sometimes be detected with very few runs, even one, depending on the noise level. A small effect of 1 to 2 percentage points needs many more runs. Source: `https://arxiv.org/html/2602.07150v1`.

Bito AI's own benchmark gives a concrete noise number. Re-running the same model on the same 60-task suite moves the score by about 2 points out of 60. Roughly one verdict in four flips between pass and partial. Its own rule of thumb treats any two configurations within 3 to 4 points of each other as statistically tied. Source: `https://bito.ai/benchmarks/ai-coding-model-cost/`. Dan Luu's essay on agentic coding benchmarks warns that small benchmarks, such as pass or fail counted over only 4 runs, are dominated by noise. Tasks cluster near a perfect score or a zero score for a given model. The informative middle band is exactly where a handful of runs can support almost any conclusion. Source: `https://danluu.com/ai-coding/`.

Two more claims appear in the literature without a traceable primary source. Both count as unverified here. Kili Technology cites an industry claim about some enterprise agent deployments. Accuracy holds at 60% on a single run but collapses to 25% across eight consecutive runs. Source: `https://kili-technology.com/blog/agentic-ai-benchmarks-guide-what-they-are-how-they-work`. A practitioner blog offers an informal rule: 50 or more tasks is solid, 20 is workable to start, and 300 or more is excellent, with each configuration run at least twice. The same post claims Anthropic recommends 5, without saying 5 of what. Source: `https://theendofcoding.com/blog/how-to-build-ai-benchmarks`.

Bottom line from this literature: budget at least 5 to 10 runs per harness-and-model configuration to detect differences smaller than about 5 percentage points. Treat any two configurations within a few points of each other as tied unless the run count is large. Report a noise band alongside every headline number.

## What Joycraft measures today

Joycraft's read-telemetry scanner lives in `src/telemetry.ts` and `src/telemetry-store.ts`. It records a DocCounts entry per document. Each entry holds a read count and a count of reads a skill mandated. It also holds a count of reads an agent chose to follow on its own, and a write count. It holds the list of session IDs that touched the file. A Codex-only fidelity flag exists too. When a record comes from parsing shell strings rather than structured tool calls, this flag marks the record as degraded.

The scanner reads four transcript formats. Claude Code writes to `$HOME/.claude/projects/<cwd-dash-encoded>/*.jsonl`. Pi writes to `$HOME/.pi/agent/sessions/--<cwd-dash-encoded>--/*.jsonl`. omp writes to `$HOME/.omp/agent/sessions/<cwd-dash-encoded>/*.jsonl`. Codex writes to `$HOME/.codex/sessions`, nested by date, and the scanner reads it recursively. The scanner only tracks reads and writes inside the knowledge layer: `docs/context/`, `docs/discoveries/`, `docs/reference/`, `AGENTS.md`, and `CLAUDE.md`. It does not track general source-code files. Skill attribution differs by harness. Claude Code and Pi can name the active skill, from a tool-use block or a `/skill:` message pattern. Codex cannot name it, because shell-string parsing cannot recover which skill was active. Every Codex read counts as mandated for this reason. The `joycraft telemetry` command reports the number of new sessions scanned and documents tracked, and writes the result to `docs/.joycraft/telemetry.json`.

A few eval-adjacent mechanisms already exist in the repository outside the scanner. The `claude plugin eval` template and the `/skill-doctor` report, both described above, are the two ready-made tools. A dogfood test suite at `tests/dogfood-update.test.ts` confirms that mechanisms ship in a working state, with one known red test as of 2026-09-23. Hook recipe tests at `tests/hook-recipes.test.ts` confirm four gate scripts added 2026-09-22. The repository's own research documents cite outside literature on skill effectiveness, but they do not implement a benchmark from it. The citations include SkillsBench, arXiv 2602.12670, SkillOpt, arXiv 2605.23904, and a Vercel study comparing an always-loaded AGENTS.md index against skill-based loading. They also include an independent experiment on a forced-eval hook. That hook scored 22 of 22 correct with zero of five false positives. A Haiku classifier hook also scored 22 of 22 correct, but it produced four of five false positives on prompts that were not matches. Source: `https://scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals`.

None of this adds up to a benchmark. What is missing, stated plainly: token counts, dollar cost, wall-clock time, a stable identity linking one run to one specific harness-model-skillset configuration, and a quality score. The scanner counts document touches. It does not measure any of the five things a harness benchmark needs.

## The 22 skills

| Skill. | Description. | Entry. |
|---|---|---|
| joycraft-setup. | First-time entry point for setting up Joycraft and getting started on a project. | User. |
| joycraft-new-feature. | Guided feature development: interview the user, produce a feature brief, then decompose into atomic specs. | User. |
| joycraft-interview. | Brainstorm freely about what to build and get a structured summary. | User. |
| joycraft-gather-context. | First-run onboarding pass that populates the project context layer through a gap-only interview. | User. |
| joycraft-design. | Design discussion before decomposition, producing a short design artifact for human review. | User. |
| joycraft-decompose. | Break a feature brief into small, testable, independently executable specs. | User. |
| joycraft-bugfix. | Structured bug fix workflow: triage, diagnose, discuss, write a spec, hand off. | User. |
| joycraft-implement-feature. | Run a feature's entire spec queue from one invocation, with parallel subagents only on marked waves. | User. |
| joycraft-tune. | Assess and upgrade a project's AI development harness across seven dimensions. | User. |
| joycraft-collaborative-setup. | Set up Joycraft for a team, with per-area folders and a contributing guide. | User. |
| joycraft-session-end. | Wrap up a session: capture discoveries, confirm results, prepare for a pull request or next session. | User. |
| joycraft-add-context. | Author one long-form reference document after a knowledge gap surfaces. | Agent. |
| joycraft-add-fact. | Route a surfaced fact to the correct context document. | Agent. |
| joycraft-decide. | Turn open questions into a decision dossier at the design gate. | Agent. |
| joycraft-harden. | Convert eligible boundary prose into machine-confirmed deny patterns. | Agent. |
| joycraft-implement. | Execute atomic specs with test-driven development until green. | Agent. |
| joycraft-implement-level5. | Set up the autofix loop and holdout scenario testing for Level 5. | Agent. |
| joycraft-lockdown. | Generate deny rules before a constrained implementation session. | Agent. |
| joycraft-optimize. | Semantic self-audit of harness overhead, with a disposition per control. | Agent. |
| joycraft-research. | Produce objective codebase research, separating question generation from fact-gathering. | Agent. |
| joycraft-spec-done. | Lightweight per-spec wrap-up: bump status, note a discovery, commit. | Agent. |
| `joycraft-verify`. | Spawn an independent, read-only verifier subagent against a spec. | Agent. |

## Sources

- `https://arxiv.org/abs/2602.12670`.
- `https://arxiv.org/abs/2602.12670v4`.
- `https://arxiv.org/abs/2602.12670v1`.
- `https://www.skillsbench.ai/blogs/skillsbench-1-1`.
- `https://www.skillsbench.ai/`.
- `https://arxiv.org/html/2605.27922v1`.
- `https://github.com/Qihoo360/harness-bench`.
- `http://www.harness-bench.ai/`.
- `https://www.reddit.com/r/ChatGPTCoding/comments/1voh02y/`.
- `https://github.com/minghinmatthewlam/openbench`.
- `https://www.alphaxiv.org/abs/2608.26218`.
- `https://www.tbench.ai/`.
- `https://www.tbench.ai/news/terminal-bench-3-0`.
- `https://arxiv.org/html/2601.11868v1`.
- `https://bito.ai/benchmarks/ai-coding-model-cost/`.
- `https://code.claude.com/docs/en/plugin-evals`.
- `https://code.claude.com/docs/en/skills`.
- `https://ccusage.com/`.
- `https://ccusage.com/guide/codex/`.
- `https://github.com/ccusage/ccusage`.
- `https://langwatch.ai/docs/coding-agents/claude-code`.
- `https://github.com/TechNickAI/claude_telemetry`.
- `https://github.com/openai/codex/issues/17539`.
- `https://agenticcontrolplane.com/blog/codex-cli-cost-tracking`.
- `https://aclanthology.org/2025.ijcnlp-long.18.pdf`.
- `https://arxiv.org/html/2604.16790v1`.
- `https://tianpan.co/blog/2026/04/27/llm-judge-bias-audit-length-position-format`.
- `https://arize.com/docs/ax/concepts/evaluators/evaluator-best-practices`.
- `https://arxiv.org/html/2602.07150v1`.
- `https://danluu.com/ai-coding/`.
- `https://kili-technology.com/blog/agentic-ai-benchmarks-guide-what-they-are-how-they-work`.
- `https://theendofcoding.com/blog/how-to-build-ai-benchmarks`.
- `https://scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals`.
- `https://www.youtube.com/c/Fireship`.
- `https://ai-tldr.dev/releases/fireship-astra-vs-fable-game-sep9/`.
