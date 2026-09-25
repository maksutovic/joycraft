# Jev in coding harnesses — what the directory and the benchmarks show

> Date 2026-09-24. Written for: the maintainer and the next panel.
> Sources: awesomejev.com (1,094 entries, snapshot 2026-09-24), TypeSafe docs, README fetches, and the Agentic OS V2 starter.
> Status: evidence only. No decision. No recommendation.

## Read this first

Nine workers scanned 1,075 directory entries across ten sections of awesomejev.com. A separate pass read 12 pages of official TypeSafe documentation. The workers kept 558 entries as relevant to coding-harness routing, tool-call gating, or Jev's measured accuracy. They fetched full content for 58 pages in total. That is 12 TypeSafe doc pages plus 46 project READMEs or articles.

Three facts matter most for the sequencing question.

First, TypeSafe's own skill_suggestion cookbook is a hot-path advisory injection. TypeSafe measured it end to end. Over 488 real requests against a 182-skill catalog, the suggestion cut wrong skill loads from 16.8% to 7.3%. It cut needless loads from 9.8% to 4.0%. The same suggestion also broke 7 requests the agent already had right on its own.

Second, an independent study asked Jev to pick 1 of 12 labels in one call. The call scored only 40.0% accuracy. This is the closest structural match in the evidence to routing a prompt across roughly 22 developer skills in a single call.

Third, Jev's confidence numbers split on usability. Several independent studies found the confidence score usable for a threshold. One study reached 91.5% accuracy on the most confident quarter of its cases. Two separate independent studies found Jev badly calibrated on the same ambiguous task, an emotion-classification benchmark called DAIR Emotion. Confidence stayed high there while accuracy fell under half.

## What TypeSafe itself says

**Confidence gating.** TypeSafe's confidence page (docs.typesafe.ai/confidence) states the principle directly:

```text
"A confidence threshold is not one number. Different actions within the same system should be gated at different levels depending on the consequences of getting it wrong."
```

Its general confidence page uses a floor of 0.5 and a high-stakes threshold of 0.9. Its dedicated confidence-routing pattern page uses a floor of 0.6 and a high-stakes threshold of 0.85. TypeSafe adds: "The correct threshold values depend on your domain and the performance of the model for your use case. Start with conservative thresholds, test with your own data, and adjust as you observe results." No single number is prescribed.

**Option count.** A `Choice` question accepts a maximum of 255 options. TypeSafe's own skill_suggestion cookbook (docs.typesafe.ai/cookbooks/skill_suggestion) covers 182 skills, the closest published analog to a developer skill roster. It states:

```text
"One Choice question holds a roster this size comfortably. A few times larger and you would split it into chunks and rank each one, then run this same shortlist step over the winners."
```

A separate hierarchical-classification cookbook recommends beam search over greedy search for tree-shaped rosters, not relevant to a flat skill list.

**The skill_suggestion cookbook.** URL: docs.typesafe.ai/cookbooks/skill_suggestion. It picks at most one skill for an agent turn out of 182 in a Hermes catalog, using two TypeSafe requests. Call one ranks all 182 skills plus three gating questions asking whether a skill is needed at all, gated at 0.30. Call two re-ranks the top 3 candidates with fuller detail plus one absolute fit question per candidate, also gated at 0.30. Results over 488 requests, agent model `claude-haiku-4-5-20251001`, classifier `jev-1.12`:

| Arm | Wrong loads (of 315 covered) | Needless loads (of 173 uncovered) |
|---|---|---|
| Agent alone. | 16.8%. | 9.8%. |
| Agent plus TypeSafe suggestion. | 7.3%. | 4.0%. |
| Agent given the correct answer (oracle ceiling). | 2.5%. | 1.2%. |

The suggestion is worded as ignorable and appended after the roster, never mixed into it. TypeSafe reports it "fixed 37 and broke 7" of the 315 covered requests the agent already had right on its own. It calls this "the price of putting one in front of the turn".

**Eval methodology and its ground-truth caveat.** TypeSafe's public evals do not grade against independently verified human labels. The reference labels come from an average of two models' responses, GPT-6 Astra and Claude Fable 5.1, both run at high thinking. Both models answer every question in the harness. TypeSafe states this "biases answers towards OpenAI and Anthropic's models". Across four published workflows, Jev averages 67.8% accuracy at $0.0004 per case and 0.4 seconds per case. Claude Sonnet 5 matches that same 67.8% accuracy at roughly 290 times the cost and 195 times the latency. TypeSafe frames this as a cost and speed frontier, not an accuracy win.

**API limits.** A `Choice` question holds up to 255 options. A `Score` question accepts 2 to 10 levels. A `Noul` question has no option cap. Errors are 401 for a bad key, 422 for a validation failure, 429 for rate limiting, and 529 for temporary overload. Each comes with a documented retry policy. Listed pricing is $0.042 per million input tokens, output free, with a claimed 70 to 500 millisecond response time.

**Jaggedness relevant to a router.** TypeSafe's own reminder list for model 1.13, quoted in full: "Asking the model something code can compute exactly. Hiding several judgments inside one question. System Two tasks: more layers of indirections. Giving it more context in state than the question needs. Jev suffers from context rot, so unrelated material in the state costs you accuracy".

The five modes TypeSafe documents as most relevant to a routing use case:

- A full transcript sent as state hurts accuracy unless filtered first.
- User text is untrusted state that can steer the answer.
- Skill descriptions need to spell out exact scope rather than implied intent.
- Judging fit is a multi-hop judgment and costs accuracy.
- A routing `Choice` does not combine with a gating `Noul` by simple arithmetic.

TypeSafe names the last mode as the direct justification for the skill_suggestion cookbook's two-gate design.

## Precedents for skill or tool routing in coding harnesses

| Project | Stars | Harness | What Jev decides | Primitive | Fallback | Reported numbers | Independent? | URL |
|---|---|---|---|---|---|---|---|---|
| langchain-skill-router. | 3. | LangChain deepagents. | Which SKILL.md files load per turn. | Pick and YesNo. | Timeout or outage loads the full catalog. | 4.4x fewer input tokens, 85% vs 55% right-skill rate against the full catalog, 96% loaded-skill correctness. | Self-reported, one author's own benchmark, a prior run showed the opposite result. | github.com/deyna256/langchain-skill-router. |
| jev-skill-gate. | 5. | Claude Code. | Which installed skills stay in the manifest. | Not stated. | Not documented. | About 75% fewer tokens, 12,750 to 3,185 on 217 skills, $0.0009 per session. | Self-reported. | github.com/ShivamPansuriya/jev-skill-gate. |
| tink-route. | 4. | Generic Agent Skill framework. | Which 0 to 2 of 46-plus skills load. | Noul gate plus Choice ranking. | Not documented. | One example decision at 1.2 seconds, gate at 0.60, no aggregate benchmark. | Self-reported. | github.com/jon-devlapaz/tink-route. |
| typesafe-skill-router. | 13. | Hermes Agent. | Names one skill before the model call. | Not stated. | Not documented. | About $0.001 per routed turn. | Self-reported. | github.com/DECRUX9812/typesafe-skill-router. |
| hermes-jev-skills. | 726. | Claude Code, Codex, Hermes. | Model routing, search, memory, compaction, skill selection, triage, mailbox sort, browser use. | Not stated. | Fails open on no key, timeout, low confidence, or a malformed reply. | Skill selection across 377 skills in about 2.8 seconds, a compaction digest that recalled less than the plain transcript. | Self-reported, discloses its own negative result. | github.com/kerpopule/hermes-jev-skills. |
| jev-router (gargpratyush). | 355. | Claude Code, Codex. | Model tier per turn, not skill choice. | Not stated. | Fails open, never blocks the CLI. | None quantified beyond first-request-only latency. | Self-reported. | github.com/gargpratyush/jev-router. |
| jev-codex-router. | 247. | Codex. | Model tier, reasoning effort, and route scope per call. | 4 Choice questions. | Fails open to the top model tier plus a kill switch. | A historical simulation near minus 60% cost versus the top tier, which the author says is "not measured Codex quota saved". | Self-reported, author disclaims the headline number. | github.com/0xNatoshi/jev-codex-router. |
| jev-codex-pilot. | 3. | Codex. | Model and reasoning route from a 1 to 5 complexity score, advisory only. | Score. | Neither score blocks execution. | None reported. | Self-reported. | github.com/Charlyhno-eng/jev-codex-pilot. |
| skillbox (thread). | Not applicable. | Personal MCP skill router. | Which skills match a query. | Not stated. | Not documented. | None. Anecdotal praise only. | Self-reported, anecdotal. | x.com/thekitze/status/2100556122570792999. |
| fable-jev. | 9. | Generic coding agents. | Steers routing only on ambiguous intent above a 0.20 margin. | Not stated. | Circuit breaker fails open to deterministic routing past 1,200ms or 3 errors. | A self-reported table of 70 to 120ms versus 2,200 to 4,500ms for a 70B router, linked methodology not fetched. | Self-reported, unverified methodology. | github.com/imMamdouhaboammar/fable-jev. |
| Loki Autorouter. | 26. | Loki agent harness. | Picks a lower-cost model for a session's first task, then stays sticky. | Choice, Score, Noul. | Not documented. | None reported. | Self-reported, architectural claim only. | github.com/wundercorp/loki. |
| Jackalope. | 1. | Desktop workspace over Codex, Claude Code, Grok Build, OpenCode, Kimi Code, Antigravity. | Which agent or account handles a task. | Not stated. | Not documented. | None reported, project is pre-release. | Self-reported. | github.com/Jackalope-Dev/jackalope. |
| jev-eval-agent. | 105. | eve, with 100 mocked tools. | Which one tool to expose to the LLM. | Not stated. | Not documented. | Headline numbers not retrievable, the results dashboard returned a 404. | Independent design, numbers unverified. | github.com/vinilana/jev-eval-agent. |

Most of these projects are small, single-maintainer repos built around the time of Jev's launch. Almost every number above is self-reported by the project's own author, in a README or a directory blurb, not audited by a third party. Two projects, jev-codex-router and jev-eval-agent, are explicit that their own headline numbers do not hold up to scrutiny. Fallback behavior is the one consistent design choice across the group. Nearly every router fails open, meaning a Jev outage or a low-confidence answer restores the pre-router behavior rather than blocking the turn. Every router is advisory over what a fuller model or fallback path already does. None treats Jev's pick as a hard gate on which skill actually loads. Only two projects in this table, langchain-skill-router and TypeSafe's own skill_suggestion cookbook above, publish a repeatable benchmark methodology with a stated baseline and sample size.

## Precedents for gates on tool calls and agent loops

| Project | Stars | Harness | What Jev decides | Primitive | Fallback | Reported numbers | Independent? | URL |
|---|---|---|---|---|---|---|---|---|
| jev-shield. | 3. | Claude Code, opencode, Codex. | Allow, ask, deny, or flag on a tool call, result, or description. | Score plus Noul. | Configurable fail-open or fail-closed, plus a kill switch. | About $0.00003 per call and 0.5 to 1.3s latency in the README body. A separate About line claims 94% block recall and $0.00002 per call. | Self-reported, the two cost figures in the same repo disagree. | github.com/caiovicentino/jev-shield. |
| construct-auto-classifier. | 3. | OpenCode, Antigravity. | Allow, deny, or ask on a shell command after fast rules decline. | Choice. | Escalates to a forced ask on a 3rd repeated block in one session. | When five passes over its own labeled battery return zero false allows, it is certified. | Self-reported, the strongest methodology found in this pass, with labeled test files committed to the repository. | github.com/godspede/construct-auto-classifier. |
| jev-kit. | 25. | Claude Code. | A PreToolUse hook guard, a tier guard, and a second look at finished work. | A typed question for whatever fixed rules leave ambiguous. | Fails open everywhere, a hard time budget, a kill switch. | Hook latency 33.2ms median, deny-rule accuracy 100% with zero false denies, $0.0008 versus $0.1868 per browser run against a model deciding instead. | Self-reported, each figure tied to a dated command. | github.com/jonathanavis96/jev-kit. |
| jev-harness (ismaelsoilet). | 6. | OpenCode, Claude Code, Cursor, Antigravity, Windsurf, Pi. | Test-failure triage, a doom-loop abort gate, a completion veto, model routing. | Not stated. | When the API is unavailable, fails open and ships a shadow mode. | A 160-case labeled corpus scored in CI by confusion matrix, precision, recall, F1, and ECE per gate. | Self-reported. | github.com/ismaelsoilet/jev-harness. |
| siege. | 0. | A live support agent with real refund and account tools. | Allow, block, or escalate on every proposed tool call. | Choice. | None stated. A defender loop rewrites the policy each round. | Catch rate rose from 33% to 100% at a 92% benign-allow rate after two policy revisions, gate latency about 150 to 300ms. | Self-reported, scored against a deterministic oracle. | github.com/vnmoorthy/siege. |
| agentgateway llm-guardrail-jev. | About 5,000 (parent repo). | The agentgateway proxy. | Reject a request or response for jailbreak, harmful content, or secret disclosure. | Score, 0 to 3. | Fails closed. "Evaluation errors block the request". | None quantified. | Self-reported example, no benchmark. | github.com/agentgateway/agentgateway (examples/llm-guardrail-jev). |
| Jevbridge. | 41. | Claude Desktop, Cursor, Codex, OpenCode, Zed. | Allow, ask, or deny a pending tool call between the client and the real agent. | Provider-agnostic. | When no key is set, swaps in any LLM as the decision maker. | None quantified. | Self-reported, architectural. | github.com/tacticocc/Jevbridge. |
| agent-fastpath. | 3. | Claude Code, Codex, Cursor, Antigravity, Gemini CLI, OpenCode, Copilot, Cline, Zed, Amp, Pi. | Ship-readiness, risk, and ambiguity presets, plus file triage. | Not stated. | Deterministic rules first, then one Jev call, then a review or escalate gate on low confidence. | File triage read 408 tokens instead of 35,256 for the same task. | Self-reported. | github.com/abhishekswe/agent-fastpath. |
| foreman. | 552. | Codex, OpenCode. | Continue, steer, stop, retry, verify, or escalate a coding worker. | 10 Noul questions in one batched call. | Tolerates up to 3 consecutive assessment failures before escalating to a human. | None. The author states accuracy "is unproven for this use case". | Self-reported, author disclaims the design. | github.com/thruwire/foreman. |
| fast-jev-compaction. | 6,653. | Claude Code. | Keep or drop each tool call and result during compaction. | Two Noul questions per call. | Any failure falls back to Claude Code's built-in compaction summary. | None on accuracy, ships a helper that flags reductions under 25%. | Self-reported. | github.com/tamaratran/fast-jev-compaction. |
| pkg-gate. | 0. | npm install lifecycle scripts. | Allow, warn, or block an install. | Typed verdict with probabilities. | Confidence under 0.50 routes to a human review, an offline simulator runs with no key. | None quantified. | Self-reported. | github.com/hemanth/pkg-gate. |

The safety language across this table is consistent and candid. jev-kit's own README states: "This is not a security control. A control that depends on an agent choosing to obey it is not a control". jev-shield calls itself "a probabilistic signal layer," not a security boundary. Fail-open is the default in most of these projects. A Jev outage restores prior behavior rather than blocking work. Only construct-auto-classifier and siege publish a repeatable evaluation with a labeled dataset and a defined pass condition.

## Independent benchmarks

| Benchmark | Task | N | Headline number | Baseline | Calibration | Independent? | URL |
|---|---|---|---|---|---|---|---|
| openJev-verdict-2.0. | Typed decisions across 4 enterprise workflows. | 2,000 held-out decisions. | Jev 72.70% accuracy. | Own 150M replica (77.10%), Laya (76.60%). | Jev ECE 0.1440, Brier 0.1480. | Mixed. The Jev row is a third-hand vendor baseline, not called live. | github.com/Heman10x-NGU/openJev-verdict-2.0. |
| jev-eval-agent. | Tool selection among 100 mocked tools. | 6 tasks across 8 LLM backends. | Not retrievable, results dashboard returned a 404. | LLM-direct tool selection. | Not reported. | Independent design, numbers unverified. | github.com/vinilana/jev-eval-agent. |
| Verdict-open-jev. | Typed decisions, plus a TypeSafe eval audit. | 400 cases in one slice, 337 cases in another. | 68.00% accuracy on one slice, 90.80% on TypeSafe's own published slice. | TF-IDF plus logistic regression, own 151M model, a 26B model. | ECE 0.1440 on the first slice. | Mixed, both Jev figures are quoted from other sources. | github.com/Heman10x-NGU/Verdict-open-jev. |
| open-jev-typed-decision-engine. | Typed decisions. | 400-case official test split. | Jev accuracy 0.7270. | Own ensemble (0.6965), a majority-class baseline (0.4830), a human annotator (0.6590). | Jev ECE 0.1440 versus the replica's 0.0565. | The author states "Jev's figures are quoted, not reproduced here". | github.com/intikhab49/open-jev-typed-decision-engine. |
| jev-capability-atlas. | An evidence map of Jev's strengths and failures from real API receipts. | Not a fixed N, a synthesis of other benchmarks. | DAIR Emotion confidence 0.819 against 48% accuracy, cited from a third party. | Varies by cited source. | Poor on DAIR Emotion, corroborates a second source below. | Independent, cites and audits third parties. | github.com/Zaious/jev-capability-atlas. |
| jev-benchmarks (AbdelStark). | Text classification, AG News, Banking77, DAIR Emotion. | 100 held-out examples per dataset. | AG News 0.910 versus 0.700, Banking77 0.870 versus 0.610, DAIR Emotion 0.480 versus 0.440. | GLiNER2.5, a real zero-shot classifier. | DAIR Emotion Brier 0.846 versus 0.668, 16% of true labels scored zero probability. | Independent, both models called directly, bootstrap confidence intervals. | github.com/AbdelStark/jev-benchmarks. |
| jev-benchmark (YidiDev). | Rubric classification, chained decisions, exam grading. | 10 custom test suites, over 15,000 calls. | Jev 98.84% versus Haiku 96.46% and Sonnet 96.18%, 50 to 116 times cheaper. | Claude Haiku 4.5, Claude Sonnet 5, an open replica. | Jev's confidence gap between right and wrong answers is 0.16 to 0.49, both Claude models are 0.00 to 0.07. | Independent. | github.com/YidiDev/jev-benchmark. |
| jev-guardrails. | Agent guardrail judgments on a mock support system. | 51 labeled cases, 25 rules. | Jev 94% (48 of 51) versus an LLM judge at 90% (46 of 51), 177ms versus 1,193ms median latency. | GPT-5.4-mini as an LLM judge. | The LLM judge returns 0.96 to 0.99 confidence almost everywhere and is unusable for a threshold, Jev spreads 0.44 to 1.00. | Independent, built as a matched comparison. | github.com/deepansh-saxena/jev-guardrails. |
| jev-sec-bench. | Prompt-injection detection and vulnerable-code ranking. | 662 messages, 200 code pairs. | Injection accuracy 96.5%, F1 95.6%, ROC-AUC 0.9927, code pairwise ranking 89.0%. | None, an absolute and ablation benchmark. | ECE 0.0588, well calibrated, a 0.85-plus confidence was correct 100% of the time in this sample. | Independent. | github.com/Gaurav-Gosain/jev-sec-bench. |
| typesafe-jev-calibrate-for-code-review. | Threshold calibration for a code reviewer. | 4 files, 82 comment blocks. | Cost about $0.07 across 1.7 million tokens, about 600ms per request. | None, a practitioner field study. | Confidence noise peaks near the decision threshold, standard deviation up to 0.037 mid-range. | Independent, one practitioner, small sample. | github.com/Selmar/typesafe-jev-calibrate-for-code-review. |
| jev-aita. | Verdict prediction on Reddit moral-judgment posts. | 770 posts. | Sonnet 5 Brier 0.344 versus Jev 0.369, Jev loses. | Claude Sonnet 5, GPT-5 nano, local LLMs. | A post-hoc adjustment brings Jev to 0.337, the author flags this as not a fair like-for-like test. | Independent, self-funded, explicitly no TypeSafe affiliation. | github.com/dchristopoulos/jev-aita. |
| jev-agent-failure-benchmark. | Agent-failure attribution on a published academic benchmark. | 6,257 traces. | Jev beats 4 named LLMs on error-type F1, 23.7 versus the next-best 22.2. | GPT-5.4, Claude Sonnet 4.6, GLM-5, Qwen3.5-122B, from the paper's own published numbers. | Not reported. | Independent, notes Jev's constrained-choice format is not fully like-for-like with free-generating LLMs. | github.com/TokenTrim/jev-agent-failure-benchmark. |

### Where Jev lost or was badly calibrated

- **jev-aita:** Claude Sonnet 5 beat Jev on Brier score, 0.344 versus 0.369, on 770 real posts.
- **The 6.3x speedup versus the claimed 40 to 200x:** the same study measured Jev at 6.3 times faster than Sonnet 5. TypeSafe's launch materials claim a 40 to 200 times speedup instead.
- **DAIR Emotion calibration, two independent sources:** jev-benchmarks found a Brier score of 0.846 for Jev against 0.668 for a baseline classifier. 16% of true labels scored at zero probability. jev-capability-atlas independently cited a separate study with 0.819 average confidence against only 48% accuracy on the same task.
- **rerank-bench-jev:** reports Jev's rerank quality as indistinguishable from a small open reranker, but at a higher cost per call.
- **agentjournal.dev, 1-of-12 routing:** a single Jev call scored 40.0% accuracy picking one of 12 labels. Rows with confidence at or above 0.9 were still only 72.2% accurate.
- **agentjournal.dev, decomposition versus a direct call:** breaking a guardrail question into 12 scored dimensions raised the false-positive rate on hard benign inputs to 37.2%. A single direct Jev call scored only 1.5% on the same inputs.
- **The open reproduction:** a 151M-parameter open reproduction of Jev's approach passed its own promotion gate on only 3 of 12 tested use cases. 9 of 12 failed.
- **Extraction-task latency:** jev-capability-atlas found Jev slower and more costly than an LLM alone on a pure text-extraction task with no action to choose.

## How Agentic OS V2 uses Jev

Agentic OS V2 runs voice requests through a fixed order of layers, and Jev sits last. About 15 deterministic rule handlers try first, matching exact phrases, filenames, and keyword tables in code. A closed-vocabulary strict parser runs next, handling only two request types. Neither layer calls a model. Jev is only consulted for the traffic left over after both layers decline, and it cannot override a rule or strict-layer match.

The one question Jev answers is a 23-option `Choice`, covering 21 named workflows plus two generic tiers. Jev's pick must also be the single most probable option in its own returned distribution, or the answer is rejected outright.

A fast path exists, but it is narrow by design. Jev can only short-circuit the generic delegate-to-worker tier, never a specific named workflow. The fast path requires all of these at once:

- A configured confidence threshold.
- An answer from a pinned model build.
- A probability at or above that threshold.
- A synthetic candidate that passes the same validators real model output goes through.

Any failure on any of these falls back to waiting for the real classifier model. It never falls back to asking the user, and never to a separate rules pass.

Parity tests prove that shadow mode has no behavioral authority. When Jev is fed an adversarially wrong, confident answer, shadow and off still produce byte-identical output on every test case. Every decision's source is recorded, so a wrong fast-path exit stays auditable after the fact.

The repository has no held-out labeled evaluation set for Jev's routing decision, and no accuracy number for it is stored anywhere in the codebase. A replay tool exists that rebuilds real production inputs, but it produces unlabeled cases only and leaves grading to a human. Once an operator saves an API key through the setup flow, the shipped defaults jump straight to the fast path at a 0.9 confidence threshold. There is no enforced shadow trial period before that happens.

## What the evidence does not contain

- No independent benchmark measures Jev routing a real developer prompt across a skill roster the size of Joycraft's own.
- jev-eval-agent is the one project built to answer that exact question, and its numbers were not retrievable from its README.
- No study in this evidence set logs Jev's pick next to the skill or tool a session actually used.
- No study reports the harm from an ignorable but wrong suggestion, except the skill_suggestion cookbook's count of 7 broken picks out of 315 covered requests.
- Most numbers in this evidence set come from a single run, not a repeated or audited one.

## Caveats

- Star counts and repo states are a directory snapshot from one point in time. Several repos had commits within days of the scrape and can drift.
- Nearly every quantitative claim in this evidence set is self-reported by the project's own maintainer. Very few are reproduced by a third party.
- Two of the most-quoted numbers here are disclaimed by their own authors as unreliable for a decision: jev-codex-router's cost estimate and foreman's assessment design.
- Several source repos report inconsistent numbers for the same underlying dataset. One dataset, LocalLLaMA/typed-decisions, gets a different Jev accuracy figure in each of three separate repos that cite it.
- Sample sizes vary widely. Some benchmarks use over 6,000 traces. Others use fewer than 100 cases or a single practitioner's own files.
- The bulk of skill and tool-call routing repos in this corpus are small, single-maintainer, and built around the same launch window. This is consistent with a coordinated build event rather than independent adoption over time.
- Public benchmark corpora used in some studies, including a prompt-injection dataset and a code-vulnerability dataset, can already sit inside Jev's own training data. The study authors flag this risk themselves.
- Several benchmarks report only one run per model, with no repeats to measure variance.
- None of the deep-dived independent benchmarks are affiliated with TypeSafe, which favors independence but also means no vendor review of methodology.
- Most benchmarks reflect one snapshot of one Jev model version, not a track record across versions.
- X and Twitter threads dominate the highest-relevance tier of the articles and lists sections. These threads are almost entirely anecdotal, with no disclosed methodology or sample size.
- fable-jev is a thin, single-contributor repo with promotional language in its own README. Its shadow-mode and circuit-breaker design is worth citing. Its benchmark table is not independently verified.
- The Verdict open-jev reproduction is not TypeSafe's Jev. It is an independent small model built to approximate the same approach, and its failure rates describe that smaller model's ceiling.
- jev-shield reports two different per-call cost figures in the same repository, $0.00002 in one place and $0.00003 in another.
- The tag "Jev primitive used" is marked unknown for most rows in the directory pass. Most one-line descriptions do not name a specific TypeSafe primitive. This is a gap in the source material, not evidence those projects lack one.
- Non-English READMEs and list descriptions were read for keyword matches only, not fully translated, in several sections.
- Agentic OS V2's own code comments describe the strict rule layer as gated by Jev's output. The actual control flow runs the strict layer first, independent of Jev. This mismatch between comments and code is a general documentation risk, not specific to Jev.

## Sources

**TypeSafe official docs**
docs.typesafe.ai/patterns.
docs.typesafe.ai/patterns/confidence-routing.
docs.typesafe.ai/patterns/intent-routing.
docs.typesafe.ai/cookbooks/skill_suggestion.
docs.typesafe.ai/cookbooks/hierarchical_classification.
docs.typesafe.ai/model-jaggedness/jev-1.13.
docs.typesafe.ai/api.
evals.typesafe.ai.
typesafe.ai/blog/introducing-system-one-models-and-jev.
docs.typesafe.ai/introduction/coding-agents.
docs.typesafe.ai/confidence.
docs.typesafe.ai/primitives.

**Skill or tool routing precedents**
github.com/deyna256/langchain-skill-router.
github.com/ShivamPansuriya/jev-skill-gate.
github.com/jon-devlapaz/tink-route.
github.com/DECRUX9812/typesafe-skill-router.
github.com/kerpopule/hermes-jev-skills.
github.com/gargpratyush/jev-router.
github.com/0xNatoshi/jev-codex-router.
github.com/Charlyhno-eng/jev-codex-pilot.
x.com/thekitze/status/2100556122570792999.
github.com/imMamdouhaboammar/fable-jev.
github.com/wundercorp/loki.
github.com/Jackalope-Dev/jackalope.
github.com/vinilana/jev-eval-agent.

**Gates on tool calls and agent loops**
github.com/caiovicentino/jev-shield.
github.com/godspede/construct-auto-classifier.
github.com/jonathanavis96/jev-kit.
github.com/ismaelsoilet/jev-harness.
github.com/vnmoorthy/siege.
github.com/agentgateway/agentgateway.
github.com/tacticocc/Jevbridge.
github.com/abhishekswe/agent-fastpath.
github.com/thruwire/foreman.
github.com/tamaratran/fast-jev-compaction.
github.com/hemanth/pkg-gate.

**Independent benchmarks**
github.com/Heman10x-NGU/openJev-verdict-2.0.
github.com/Heman10x-NGU/Verdict-open-jev.
github.com/intikhab49/open-jev-typed-decision-engine.
github.com/Zaious/jev-capability-atlas.
github.com/AbdelStark/jev-benchmarks.
github.com/YidiDev/jev-benchmark.
github.com/deepansh-saxena/jev-guardrails.
github.com/Gaurav-Gosain/jev-sec-bench.
github.com/Selmar/typesafe-jev-calibrate-for-code-review.
github.com/dchristopoulos/jev-aita.
github.com/TokenTrim/jev-agent-failure-benchmark.
agentjournal.dev/blog/llm-judge-vs-feature-extraction.

**Articles, threads, and design patterns**
x.com/rauchg/status/2100307962262872105.
x.com/heman10x/status/2100836659533336676.
x.com/thdxr/status/2100288951978164647.
x.com/ephraimduncan/status/2100454070536351824.
x.com/isNickMa/status/2100566407524344225.
warmersun.com/jev.
zc277584121.github.io/rag/2026/09/22/jev-search-deep-evaluation.html.

**Agentic OS V2 (internal repository)**
agentic-os/agentic-os-starter-v2/obsidian-v2, runner/jev.mjs.
agentic-os/agentic-os-starter-v2/obsidian-v2, runner/voice-router.mjs.
agentic-os/agentic-os-starter-v2/obsidian-v2, tests/voice-jev-hedge.test.mjs.
agentic-os/agentic-os-starter-v2/obsidian-v2, tests/voice-jev-parity.test.mjs.
