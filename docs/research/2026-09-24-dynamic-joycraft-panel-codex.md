# Dynamic Joycraft — Codex adversarial panel

Research findings for discussion · 24 September 2026 · Repository `f82688d`

## Ten-line summary

Recommend a curated Joycraft with a thin hub, validated local workflow state, and independently checked completion.
Build the smallest verified-graduation transition first, keeping worker completion, checks passed, and acceptance distinct.
Measure escaped acceptance failures against all independently reviewed accepted outputs, alongside accepted yield and repair effort across every attempted task.
Require later mechanisms to beat an incrementally repaired baseline, rather than crediting the whole redesign for any improvement.
Keep explicit workflow addresses and useful TDD guidance while testing whether the hub reduces navigation and recovery effort.
Treat generated prose as an optional evaluated experiment, with executable generation requiring separate evidence.
Permit a narrow bring-your-own-key Jev skill-suggestion trial directly on the hot path, while keeping acceptance independent.
Fetch guidance into dated, applicable, reviewable updates, and retain the CLI as the single installation and update authority.
Use prototypes during exploration, require commitment only when decisions are ready, and target panels and architecture defense at consequential uncertainty.
Personalize explanations rather than gate authority, preserving STE, TDD, shared project evidence, and maintainer-first sequencing.

| Proposition | Ruling |
|---|---|
| P0 · Reimagining | QUALIFY |
| P1 · Hub | QUALIFY |
| P2 · State | QUALIFY |
| P3 · Gates | QUALIFY |
| P4 · Generation | QUALIFY |
| P5 · Guidance | QUALIFY |
| P6 · Jev | QUALIFY |
| P7 · Distribution | QUALIFY |
| P8 · Skills | QUALIFY |
| P9 · Design | QUALIFY |
| P10 · Architecture | QUALIFY |
| P11 · Personalization | QUALIFY |

All twelve rulings are conditional. This does **not** endorse the complete candidate bundle. Each section identifies what survives, the exact conditions, and what evidence would reverse or strengthen the ruling. Shared verdict labels do not erase differences between the skeptics' objections.

## Panel method and evidence limits

Twelve proposition judges each commissioned three context-isolated skeptics: **36 skeptics and 12 judges, all GPT-6 Astra at ultra**. Each proposition includes an evidence auditor. Other lenses were selected from the seven in the brief. Delegated evidence collectors used GPT-6 Luna at medium. Judges read their three returns before ruling. A separate synthesis follows the twelve rulings. The Claude panel was not read. These are recommendations for discussion, not approved decisions, specifications, or implementation changes.

The common inputs were the evidence pack, filed intent, repository instructions and relevant source, and the parked feature brief read through `git show`. Sharing those inputs makes the panel context-isolated, **not statistically independent**: agreement can reflect common omissions. No outcome experiment on Joycraft was run. Reported bad sessions and colleague adoption are maintainer testimony, not independently observed measurements. The protocol and frame are in `docs/research/2026-09-24-dynamic-joycraft-panel-codex-brief.md:9–43` and `docs/research/2026-09-24-dynamic-joycraft-evidence.md:264–279`.

**Dates and citations.** Live checks occurred on **2026-09-24 Pacific / 2026-09-25 UTC**. Unless another access date is stated, every web citation below carries that access date. Publication or revision dates are identified separately where material. Repository citations name paths and line numbers at the inspected checkout. Proposed conditions and experiments are judgments, not established results. **UNVERIFIED** means the panel did not establish a claim; it does not mean the claim is false. A retrieval failure is not evidence of a dead link.

**Execution exception.** Some evidence workers used Firecrawl's multi-URL mode, which wrote temporary scrape caches despite instructions to return stdout only. The workers identified and removed their own files; repository status returned to its initial state before report creation. One worker reported switching to Python deletion after a command guard rejected its cleanup command. That was an instruction-following failure, not clean compliance with the two-file restriction. No further such cleanup was requested. No source changes, commits, decision stamps, or intent edits were made.

## P0 — Reimagining versus incremental repair

**Ruling: QUALIFY.** Reimagine the entry and completion contract, but make the larger dynamic bundle compete against a repaired baseline with independent verification. Adopt additional mechanisms separately when they reduce total human repair and maintenance effort without weakening independently assessed acceptance.

### Strongest refutation

The maintainer reports “slop that took hours and that was not shippable,” while also saying “we are already doing alot of what helix is doing.” Those observations establish a serious problem without identifying its cause. Static skills, missing verification, weak requirements, and implementation mistakes remain competing explanations. The panel did not inspect the failed sessions. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:269`.)

There is a direct experiment available: session-end validates and graduates specs while explicitly saying independent verification in the loop has not shipped. A verifier already checks the implementation against the spec, parent brief, decisions, and boundaries. Connecting these functions tests the actual completion complaint more directly than generating new skills. (`src/skills/joycraft-session-end.md:84–94,127–139`; `src/skills/joycraft-verify.md:34–42,64–108`.)

### Evidence for the refutation

Five output trees already have one canonical authoring source. The map renderer can preserve human descriptions while refreshing marked structure; current update inventory preserves existing create-once documents. These are specific integration and distribution problems, not evidence that the whole organizing model must be replaced. (`scripts/generate-bundled-files.mjs:44–58,171–190`; `src/folder-map.ts:88–126`; `src/update-inventory.ts:236–263`.)

The pack also overstates update behavior. Local-only vendor-file edits are preserved; simultaneous vendor and local edits become conflicts. Collapsing skills still requires attention to stale generated files because the generator and sync loop do not remove them. (`src/update-plan.ts:325–351`; `scripts/generate-bundled-files.mjs:171–190`; `scripts/sync-skills.mjs:68–89`.)

### Evidence against the refutation

Cosmetic repair alone is inadequate. The implementation loop mainly checks queue state and commits between workers; graduation remains an instruction to the worker. An independently controlled acceptance transition may require a bounded architecture change. That does not require adopting generation, Jev, fetched guidance, and new packaging together. (`src/skills/joycraft-implement-feature.md:61–73`; `src/skills/joycraft-session-end.md:127–139`.)

[Helix](https://shopify.engineering/helix), published 2026-09-21, provides a specialized checkpoint-and-review precedent, not a controlled comparison of redesign strategies. [SkillsBench v4](https://arxiv.org/html/2602.12670v4), revised 2026-06-14, makes maintained curated skills a serious baseline. [Vercel's evaluation](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) tests access to framework documentation, not an SDLC hub. None identifies the cause of Joycraft's reported failure.

### Skeptic disagreements

**Maintainer: qualified; harness expert: qualified; auditor: qualified.** The maintainer wants verifier integration tested before larger investment. The harness expert warns that a cosmetic-only baseline understates the necessary state-and-acceptance change. The auditor rejects treating success of a bundled redesign as evidence for every component. These are different sequencing and attribution requirements despite the shared verdict.

### What would change the ruling

Measure escaped acceptance failures and subsequent human repair on representative maintainer work before and after verified graduation. Broader redesign earns adoption if it improves residual failures or total effort beyond that repair. Equivalent outcomes favor incremental evolution. Failure frequency, causes, comparative cost, and colleague transfer remain **UNVERIFIED**.

## P1 — A hub plus a few doors

**Ruling: QUALIFY.** Offer a thin hub and a small visible core, preserving explicit workflow addresses, visible lifecycle state, and recovery. Superiority over clearer descriptions and repaired existing discovery must be demonstrated.

### Strongest refutation

The unsuccessful Vercel arm already had **one** documentation skill. Its noninvocation result concerns whether knowledge is available, not how many commands the user sees. A single hub can also go unloaded. The persistent-index result is not evidence for a one-versus-22 command comparison. ([Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), published 2026-01-27.)

Nor is the current alternative an undifferentiated 22-command menu. README foregrounds five commands plus specialist shortcuts; setup already routes to tune; optimize distinguishes human, agent, and situational entries and limits human doors. The fair baseline repairs this design. (`README.md:49`; `src/skills/joycraft-setup.md:6–18`; `src/skills/joycraft-optimize.md:97–121`.)

### Evidence for the refutation

Human menu visibility and model discovery are separate. Claude's `user-invocable: false` hides a menu item while retaining its description; `disable-model-invocation: true` changes automatic access. Listing pressure depends on text volume. Issue #64606 describes version-specific over-budget examples, not a controlled command-count threshold or Joycraft overflow. ([Claude skills](https://code.claude.com/docs/en/skills); [issue #64606](https://github.com/anthropics/claude-code/issues/64606).)

Compaction is conditional too: current Claude restores invoked skill content within per-skill and combined limits, newest first. An early hub can age out. Pi supports explicit invocation, but its compaction contract does not guarantee a full invoked body survives. Recovery must be tested per host. ([Claude lifecycle](https://code.claude.com/docs/en/skills#skill-content-lifecycle); [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md); [Pi compaction](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md).)

### Evidence against the refutation

The intent records real command-recall frustration, and the existing setup alias demonstrates compatible navigation. A hub is worth trying. But Pi's loop and extension call named workflows in fresh sessions; replacing known addresses with fresh inference adds a dependency to automation that already knows its destination. (`docs/intent/2026-09-24-dynamic-joycraft.md:9`; `src/templates/pi-scripts/joycraft-implement-loop:76`; `src/templates/pi-extensions/joycraft-pipeline.ts:55`.)

The maintainer values “getting people used to TDD agentic development.” Reducing recall should preserve a legible explanation of the chosen stage and next consequential action. The super-user's ability to detect a wrong route is not evidence that colleagues can. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:266–267`.)

### Skeptic disagreements

**Novice: qualified; Pi developer: qualified; auditor: qualified.** The novice requires comprehension and easy correction; the Pi developer requires deterministic direct access; the auditor requires attributable benefit. A smaller menu alone satisfies none. The panel records no factual or verdict split.

### What would change the ruling

Compare identical workflows behind repaired direct entry and a hub. Include ambiguity, interruption, fresh sessions, compaction, learned shortcuts, and a supported Pi/open-weight configuration. Measure misroutes, human corrections, recovery, gated completion, and effort; test novice understanding separately. Keep Jev out of this comparison. Fresh-template-only routing would miss established users because AGENTS.md is create-once. (`src/update-inventory.ts:236–263`.) Optimal door count and cross-harness routing benefit remain **UNVERIFIED**.

## P2 — A local state interface, not an oracle

**Ruling: QUALIFY.** Centralize validated local workflow facts in a versioned interface. Keep recorded status, eligibility, verified acceptance, and durable rationale distinct. Automate handoff transport without discarding its meaning.

### Strongest refutation

Code can make an unverified status look authoritative. Today `in-review` satisfies dependencies while meaning agent-finished but unverified. The status writer permits any allowed target state without consuming validation evidence; a selector with no extracted entries reports completion. A CLI wrapper would consolidate these semantics, not establish truth. (`docs/reference/spec-status-lifecycle.md:9–23`; `src/templates/pi-scripts/joycraft-next-spec:49–69`; `src/templates/pi-scripts/joycraft-mark-done:42–77`.)

P2 already exists in part: Pi has local queue selection and a driver. Its dependency expression at line 84 transforms `1,2` into `12` by removing all whitespace after replacing commas. Two panel members reproduced that expression without running the file-writing script. This is a parser defect, not an end-to-end reproduction. (`src/templates/pi-scripts/joycraft-next-spec:66–95`; `src/templates/pi-scripts/joycraft-implement-loop:63–88`.)

### Evidence for the refutation

The handoff includes decisions not to reopen, a known hazard, execution parameters, and completion conditions. Queue fields do not carry all this meaning. Team use adds checkout identity, concurrent changes, stale evidence, and mixed CLI/skill versions. The current helper performs an unlocked read/modify/replace; the loop prefers PATH helpers over bundled siblings. These are identified design risks, not observed multi-user failures. (`src/skills/joycraft-decompose.md:324–343,409–421`; `src/skills/joycraft-implement-feature.md:30–34`; `src/templates/pi-scripts/joycraft-mark-done:78–114`; `src/templates/pi-scripts/joycraft-implement-loop:47–61`.)

### Evidence against the refutation

JSON queue state, spec frontmatter, and README guidance currently require coordination; `spec-done` tells an agent to update two status representations. A shared transactional implementation can remove duplicated parsing and detect disagreements. (`src/skills/joycraft-decompose.md:322–392`; `src/skills/joycraft-spec-done.md:21–32`.)

[OpenSpec's 1.0 release](https://github.com/Fission-AI/OpenSpec/releases/tag/v1.0.0), published 2026-01-26, supports artifact-readiness queries. Its [CLI documentation](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/docs/cli.md) explicitly distinguishes planning completion from implementation completion. [Pi's creator](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/), published 2025-11-30, advocates documented CLI tools. These are viable mechanics, not comparative outcome measurements. Local state inspection can work offline independently of whether the coding model can.

### Skeptic disagreements

**Harness expert: qualified; team lead: qualified; auditor: qualified.** No factual split emerged. The expert emphasizes distinct authorities and retained rationale, the team lead coordination and freshness, and the auditor the unearned word “beats.” The maintainer's wish for a “shippable product” requires more than a scheduler; “we can easily get it for others” does not resolve team coordination. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:267–269`.)

### What would change the ruling

Start with status, next, and explanation: version the contract, scope the feature and checkout, error on malformed or conflicting state, and preserve decision/hazard pointers. Bind acceptance evidence to code, spec, and check revisions. Compare wrong advances, false completion, interruptions, and recovery effort against direct-file continuation, including multiple writers and offline queries. Measured improvement supports keep; extra maintenance without benefit favors repairing current helpers. Comparative outcomes remain **UNVERIFIED**.

## P3 — Gates over advice

**Ruling: QUALIFY.** Use deterministic acceptance gates for specified requirements; retain concise work and recovery guidance. Missing evidence, timeout, interruption, and exhausted retries mean unresolved, never passed. A hook invokes a mechanism; it is not itself an assurance of shippability.

### Strongest refutation

Teaching a process, stopping a prohibited action, and accepting completed work are different jobs. Harder enforcement improves compliance with a predicate, not the predicate's adequacy. Joycraft's harden already limits conversion to low-false-positive command/path rules, keeps semantic rules as prose, and warns that turning ASK FIRST into deny changes policy. Without a Claude installation, its non-Claude path stops after classification. (`src/skills/joycraft-harden.md:25–50`.)

The maintainer values “the formality of the loop” and TDD. Implement requires tests against actual functions, an observed failure, and investigation of suspicious immediate passes. A final green command does not establish those steps. Preserve the instructional contract while strengthening evidence. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:266`; `src/skills/joycraft-implement.md:76–105`.)

### Evidence for the refutation

**Stop is resolved at the documentation level:** Claude supports blocking Stop decisions, contradicting the pack. But eight consecutive blocks end the turn, and user interruptions skip Stop. Command/HTTP/MCP-tool PreToolUse timeouts fail open; SDK callback timeouts have a different, blocking contract. A bounded continuation hook cannot supply an unoverrideable acceptance boundary. Installed-runtime behavior was not exercised. ([Stop](https://code.claude.com/docs/en/hooks#stop-input); [timeouts](https://code.claude.com/docs/en/hooks#timeouts).)

Pi's driver trusts worker exits without independent progress detection or a retry budget. Its finisher hard-codes pnpm checks, suppresses stderr, and stages changes, while its README promises additional finishing behavior. Repeated zero-exit/no-progress work is a plausible failure mode, not an observed incident. (`src/templates/pi-scripts/joycraft-implement-loop:63–89`; `src/templates/pi-scripts/joycraft-session-end:13–37`; `src/templates/pi-scripts/README.md:45–52`.)

### Evidence against the refutation

Bounded gates already help: Pi stops on nonzero worker exits, and repository tests demonstrate protected-write blocking with legitimate edits permitted. [Helix](https://shopify.engineering/helix) supports checkpoint acceptance through concrete review and checks, but reports no general defect or recovery-rate result. (`src/templates/pi-scripts/joycraft-implement-loop:79–87`; `tests/hook-recipes.test.ts:161–195`.)

Q4 asks for confidence when the loop ends. Separate “stopped,” “checks passed,” and “accepted against the brief.” A human may repair a mistaken policy; an unchanged failed artifact must not silently become passed. This is a proposed acceptance contract, not a shipped guarantee. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:269`.)

### Skeptic disagreements

**Harness expert: qualified; Pi developer: qualified; auditor: qualified.** The expert prioritizes independent acceptance authority, Pi prioritizes bounded recovery and stack-correct checks, and the auditor limits the claimed transfer from Helix. The live audit resolves the documentation disagreement; cross-vendor runtime parity remains open.

### What would change the ruling

Demonstrate fewer independently judged defects without unacceptable false blocks or recovery cost, across supported harnesses and Node, Python, Rust, and Go. Inject missing tools, timeout, interruption, and zero-exit/no-progress workers; none should create acceptance. Retain visible diagnostics and manual-review requirements for semantic criteria. Gate counts and successful worker exits are insufficient. False-block rates, runtime parity, and net improvement remain **UNVERIFIED**.

## P4 — Gated generation versus curated skills

**Ruling: QUALIFY.** Curated skills remain the default. Trial one reusable generated prose skill against an equally improved curated alternative, with independent future work and total evaluation/maintenance cost counted. Human approval authorizes a preference; it does not prove quality uplift. Executable hooks and scripts need separate evidence.

### Strongest refutation

An acceptance gate establishes only what its evaluator measures. It neither isolates generation's effect nor makes evaluator authoring free. The intent permits activation after evaluation **or** human approval, leaving unanswered who defines good outcomes independently of the generator. This challenges Q1's “process prose generated” as an invariant while retaining the maintainer's actual STE, TDD, and lifecycle preferences. (`docs/intent/2026-09-24-dynamic-joycraft.md:15–21`; `docs/research/2026-09-24-dynamic-joycraft-evidence.md:266–269`.)

### Evidence for the refutation

[SkillsBench v4](https://arxiv.org/html/2602.12670v4#A4.SS6), revised 2026-06-14, reports 87 tasks and a 16.6-point curated gain. Its three-configuration self-generation diagnostic is negative by 8.1–11.5 points. Discovery failures, displaced solving time, and imperfect creator/solver separation limit inference: this is evidence against effortless self-generation under those protocols, not every gated optimizer.

[Misevolution](https://arxiv.org/html/2608.12851v1), published 2026-08-13, distinguishes 21 configurations authoring unsafe artifacts from 15 producing harmful behavior in fresh sessions. Its pooled carryover figure is experiment-specific. [ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/), published 2026-02-05, surveys public marketplace artifacts; its rates cannot forecast local generation. Neither makes one creation-time approval a complete maintenance lifecycle.

### Evidence against the refutation

[SkillOpt v2](https://arxiv.org/html/2605.23904v2), revised 2026-05-25, is substantive positive evidence for optimizing one compact prose skill offline with a frozen model/harness and separate training, selection, and final-test data. Its six domains do not include software engineering. It supports a narrower alternative: centrally optimize reusable curated skills and amortize the evaluation, before making each practitioner run an optimizer.

Repeatedly used held-out scores become selection feedback. Final or prospective work must remain unused during optimization. For solo users without independent task authors, freeze a candidate before future work and call the results exploratory. If credible evaluation costs more than the recurring problem, generation has not earned its place.

### Skeptic disagreements

**Researcher: qualified; maintainer: qualified; auditor: qualified.** The researcher requires an equal baseline and independent final evaluation. The maintainer proposed a cheap bounded pilot—six hours over two weeks, six reserved tasks, and a 20% time target. Those are proposed economic limits, not statistically validated thresholds. The auditor favors centrally improved shared skills first. The judge requires economic value, sound comparison, and artifact-specific evidence; a cheap signal alone does not establish generalization.

### What would change the ruling

Replicate gains on unseen maintainer and colleague work, counting proposal review, rejected candidates, task authoring, repairs, and revalidation. Require provenance, ownership, rollback, and retirement. Current manifest kinds do not include generated artifacts; existing customized vendor content is already protected. The eval runner has a command assertion, contrary to the pack's four-kind claim, but does not supply meaningful comparative tasks automatically. (`src/install-manifest.ts:30–42`; `src/update-plan.ts:320–343`; `src/templates/evals/check.sh:51–63`.) Net value and generated executable-artifact quality remain **UNVERIFIED**.

## P5 — Fetch guidance, preserve accepted applicability

**Ruling: QUALIFY.** Fetch vendor guidance as evidence for a dated, reviewable model × harness × task-mode change. Keep an accepted local profile and last-known-good fallback. Acquisition and the validated runtime artifact are complementary.

### Strongest refutation

Finding current text, deciding whether it applies, and authorizing changed instructions are separate decisions. Opus 5.5 guidance distinguishes unattended operation from human-paced work. Fetching the right model's page does not make every instruction appropriate to every task. The maintainer's “push the new prompting guide to an update and everyone gets the new juice” is a distribution aspiration, not proof of universal benefit. ([Opus 5.5 guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5.md); `docs/research/2026-09-24-dynamic-joycraft-evidence.md:268`.)

### Evidence for the refutation

Current profiles already require observable symptoms and removal of unnecessary guidance; optimize already makes advisory contradiction findings. The parked brief consolidates Claude guidance with applicability tags. This is a stronger baseline than an ever-growing pile of static docs. (`src/templates/reference/model-profile-claude-fable-5-1.md:7–22`; `src/skills/joycraft-optimize.md:72–80`; `feature/opus-5-5-prompting:docs/features/2026-09-23-opus-5-5-prompting/brief.md:8–11`.)

Model identity is an immediate gap: installation eligibility uses Claude/Pi/omp harness identity. The parked unknown-model fallback applies current-Claude blocks even to Pi/omp. Newer fetched text would not fix that mismatch. (`src/model-profile.ts:19–28`; parked brief `:146–151`.)

The pack's “none found” becomes an unsupported claim that open-weight fetching is impossible. Official [DeepSeek-R1 recommendations](https://github.com/deepseek-ai/DeepSeek-R1#usage-recommendations) and [Qwen3 guidance](https://qwenlm.github.io/blog/qwen3/) exist. Coverage is uneven and not necessarily coding-agent-specific, but categorical absence is false. DeepSeek guidance also illustrates why deleting Claude-disfavored instructions from shared files can be inappropriate; no actual regression was measured.

### Evidence against the refutation

Official discovery works: [Anthropic's index](https://platform.claude.com/llms.txt) lists model guides and [OpenAI's latest-model guide](https://developers.openai.com/api/docs/guides/latest-model.md) exposes current metadata. [Fable 5.1 guidance](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1.md) contains subtractive advice. But checked guides also prescribe additions and workload evaluation. “Audit, adapt, evaluate” is more faithful than subtraction alone. Live reachability does not establish permanent URL stability.

### Skeptic disagreements

**Pi developer: qualified; harness expert: qualified; auditor: qualified.** No verdict split. The Pi lens rejects the open-weight absence premise; the expert separates model, harness, and policy; the auditor accepts the subtractive examples but rejects their use as the entire vendor message. None advocates leaving curated profiles frozen indefinitely.

### What would change the ruling

Resolve model/version and attended/unattended mode before changes; unknown identity keeps the accepted baseline. Record source date and identity, refresh outside active execution, and propose clause-level changes. Vendor advice cannot revoke STE, TDD, or human approval requirements. Compare current, absent, curated-update, and fetched-amendment profiles with quality, interruptions, unwanted autonomy, cost, and maintenance measures. The quoted Sol/Luna-versus-Astra sentence was absent from the checked guides; its attribution, general harness-injected duplication, future URL stability, and comparative gains remain **UNVERIFIED**.

## P6 — Jev can be advisory on the hot path

**Ruling: QUALIFY.** Trial optional BYOK prompt-to-skill suggestions on the maintainer's actual harness. A key should enable that measured feature, not automatically activate every proposed routing and judging surface. Acceptance remains independent of Jev.

### Strongest refutation

The maintainer says Jev “should be core part of the product now” and expects better file, context, tool, research, and panel decisions. The measured intervention is much narrower. Skill activation is a surrogate for finished-task quality; positive personal experience and cheap API calls do not establish net development savings. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:269–270`.)

The panel also challenges the lead: **advisory and hot-path are not alternatives**. The [TypeSafe skill-suggestion cookbook](https://docs.typesafe.ai/cookbooks/skill_suggestion.md) evaluates an ignorable suggestion with the native roster retained. Its benchmark uses Haiku 4.5, 182 skills, and synthetic first responses. The baseline's descriptions are shortened while Jev receives richer information, so the comparison does not isolate classification from information access.

### Evidence for the refutation

[Jev's documented jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md) includes literal interpretation and adversarial steerability. [Confidence guidance](https://docs.typesafe.ai/confidence.md) requires application-specific threshold testing. Fail-open fallback protects availability, not an available service giving a harmful suggestion. Extending an adapter also adds candidate construction, diagnostics, and support work; no panel member quantified those hours. (`src/claude-session-start.ts:14`; `src/update-inventory.ts:266,425`.)

### Evidence against the refutation

The cookbook's numerical improvement holds: wrong loads fall from 16.8% to 7.3%, needless loads from 9.8% to 4.0%; 37 selections improve and seven regress. That earns a narrow trial. The supposedly decisive simpler baseline is overstated too: [Spence's experiment](https://scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals), published 2026-02-07, gets 22/22 on easier prompts but 18/24 on harder ones, with only five negatives. Its classifier can reduce total time. Forced evaluation avoids an additional classifier; it still uses the coding model.

BYOK stays because the intent requires it. The [TypeSafe agreement](https://typesafe.ai/legal/mca) restricts credential sharing and also contemplates customer-operated applications serving end users. It does not establish the pack's blanket per-user-key-only claim. This is a citation correction, not legal clearance for any shared-service design. (`docs/intent/2026-09-24-dynamic-joycraft.md:31`; evidence pack `:181,250`.)

### Skeptic disagreements

**Researcher: qualified; maintainer: qualified; auditor: qualified.** All permit direct advisory hot-path testing and reject immediate broad deployment. The researcher requires information-matched causal comparison; the maintainer positive net operator hours; the auditor limits promotion to what was evaluated. Off-path document ranking and claim judging do not automatically have better evidence than routing.

### What would change the ruling

Compare native matching, improved descriptions/router, forced evaluation, and Jev with equivalent information. Fix model/harness versions; include no-match, ambiguity, multiple skills, misleading content, and outage cases. Judge human correction time and accepted tasks, with routing accuracy and latency as diagnostics. The judge proposed a four-week accounting window, sub-second incremental p95 latency, and an upper confidence bound below one percentage point for increased harmful misroutes as pilot tolerances—not established product thresholds. Broader promotion needs benefit over the strongest simpler baseline, positive net saved hours, and colleague replication. Confidence calibration, latency tails, cross-harness transfer, and downstream gains remain **UNVERIFIED**.

## P7 — Distribution with one update authority

**Ruling: QUALIFY.** Keep the CLI as installation/update authority. Treat two discovery directories as a portability target and a Claude plugin as an optional adapter. Test a CLI-owned in-place plugin before introducing a second marketplace release channel.

### Strongest refutation

Discovery location, executable instructions, and update ownership are different. Current transformations alter invocation syntax, session commands, boundaries, frontmatter, and whole conditional bodies. The repository's Claude, Codex/Copilot/omp, and Pi queue paths differ substantially. A shared directory cannot reconcile those semantics by itself. This verifies differences in Joycraft's instructions, not the current accuracy of every host-capability assertion in them. (`scripts/lib/skill-template.mjs:4–49,73–90`; `src/skills/joycraft-implement-feature.md:20–46,86–115,142–163`.)

Claude can load equivalent local and namespaced plugin skills together. A second package can therefore duplicate candidates. Installation updates can also leave the current session running old instructions. The manifest records project bundle metadata, not plugin-loaded-session compatibility. ([Skill collision rules](https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name); [plugin updates](https://code.claude.com/docs/en/discover-plugins#configure-auto-updates); `src/install-manifest.ts:30–52`.)

### Evidence for the refutation

The historical research actually recommended eventual hybrid delivery, then deferred it until the feature set stabilized to avoid iterating on two formats. That is a sequencing condition, not hostility to plugins. The proposed redesign changes several interfaces at once. Five generated directories already share one source, so maintenance-hour savings from two directories are unmeasured. (`docs/features/plugin-architecture/research.md:39–55`; `docs/intent/2026-09-24-dynamic-joycraft.md:13–21`; `scripts/generate-bundled-files.mjs:171–190`.)

Q3's “everyone gets the new juice” also requires distinguishing publication, installation, and activation. Ordinary third-party marketplaces default to auto-update off, with documented exceptions for claude.ai-added marketplaces and separate command-source behavior. The pack's universal version is too broad. ([Update rules](https://code.claude.com/docs/en/discover-plugins#configure-auto-updates); evidence pack `:268`.)

### Evidence against the refutation

The live docs offer a cheaper possibility omitted from the pack: a manifest-bearing **skills-directory plugin** loads in place under `.claude/skills`, without marketplace installation or plugin-cache copying. The inference is that the CLI could own its bytes. This is not yet a tested Joycraft integration. Primary-working-directory discovery, workspace trust, session-start discovery, and reload rules need coverage. ([Plugin reference](https://code.claude.com/docs/en/plugins-reference#skills-directory-plugins); [location rules](https://code.claude.com/docs/en/plugins-reference#choose-where-the-plugin-loads-from).)

[Pi documents `.agents/skills`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md), and [Claude documents `.claude/skills`](https://code.claude.com/docs/en/skills#where-skills-live). That supports a portability experiment, not the entire matrix or identical shared payloads. Team marketplaces can also pin configuration if that channel later earns its cost. ([Team marketplaces](https://code.claude.com/docs/en/discover-plugins#configure-team-marketplaces).)

### Skeptic disagreements

**Maintainer: qualified; team lead: qualified; auditor: qualified.** The maintainer wants stabilization and measured savings before marketplace work. The team lead permits that channel with reproducible selection, versions, and rollback. The auditor favors trying the documented in-place adapter first. The judge chooses the latter sequence without foreclosing marketplace delivery.

### What would change the ruling

Test each selected host combination, duplicates, subdirectory startup, upgrades, customizations, activation, and rollback. Require one active intended implementation per host and an explicit compatibility contract wherever update authorities differ. Lower effort with reliable mixed-host adoption supports keep; duplicate discovery and persistent divergent semantics favor retained host variants. Complete path parity, in-place-plugin minimum versions, AGENTS automatic loading from plugins, and measured savings remain **UNVERIFIED**. “Cannot carry AGENTS.md” confuses file carriage with automatic loading; only root CLAUDE omission was explicit in the checked reference.

## P8 — Retire controls individually, preserve useful capabilities

**Ruling: QUALIFY.** Consolidate entry points and executable bookkeeping. Remove specific instructions only after measured replacement preserves the affected workflow. No checked evidence establishes that a whole functional Joycraft skill has expired. Existing `ONE_HOME`, `LOAD_LATER`, `MAKE_A_CHECK`, `PROBATION`, and `RETIRE` dispositions already distinguish simplification from deletion. (`src/skills/joycraft-optimize.md:24–44`.)

### Strongest refutation

Model capability is not a proxy for which instructions can disappear. In Pi, semantic policy remains prose where enforcement is unavailable. Deletion before replacement loses behavior. The literature's inverted-U describes **task-solving consumers**, not superior mid-tier authors; open-weight is not a capability tier. [Lin et al.](https://arxiv.org/html/2605.30621v1#S4), published 2026-05-28, does not test Joycraft skill deletion. (`src/skills/joycraft-harden.md:25–40`.)

### Evidence for and against the refutation

The planning ablation corrects a material inference: strong tested models save roughly 30% **with planning enabled**. Their accuracy differences are small; removing planning is not the measured cost saving. For Nemotron-3 550B the table shows 65.8%/$2.33 with planning and 67.8%/$3.31 without; these results do not establish Fable or GPT-6 behavior. ([Fan et al., Table 3](https://arxiv.org/html/2609.20804v1#S3.T3), published 2026-09-17.)

There is evidence for selective simplification: [Anthropic's taxonomy](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills), published 2026-03-03, distinguishes capability assistance from durable workflow preferences. It is guidance, not longitudinal proof that a named skill should die. Pi's existing executable queue and setup's existing alias are concrete consolidation opportunities. (`src/skills/joycraft-implement-feature.md:143–167`; `src/skills/joycraft-setup.md:10–18`.)

### Proposed disposition of all 22 skills

These are recommendations, not implementation decisions. Fewer visible names need not mean fewer capabilities.

| Skills | Disposition and retained behavior | Repository evidence |
|---|---|---|
| setup | Alias only; no independent workflow to remove | `src/skills/joycraft-setup.md:10–18` |
| interview, new-feature | One feature entrance; retain exploration and commitment as distinct states | `src/skills/joycraft-interview.md:26–31,102–111`; `src/skills/joycraft-new-feature.md:115–124,179–184` |
| design, decide, decompose | Staged internal modules: grounded design, decision resolution, testable decomposition | `src/skills/joycraft-design.md:36–49,81–109`; `src/skills/joycraft-decide.md:11–17`; `src/skills/joycraft-decompose.md:62–89` |
| bugfix, research | Keep distinct, directly callable specialist operations | `src/skills/joycraft-bugfix.md:20–55`; `src/skills/joycraft-research.md:290–317` |
| implement, implement-feature, spec-done | One execution entrance; curated TDD worker, code-owned orchestration/status updates | `src/skills/joycraft-implement.md:76–105,127–147`; `src/skills/joycraft-spec-done.md:19–32` |
| verify, session-end | Preserve independent verification and finishing contracts | `src/skills/joycraft-verify.md:201–215,268–277`; `src/skills/joycraft-session-end.md:84–94,127–139` |
| gather-context, add-fact, add-context | One context-management entrance; preserve gap elicitation, fact rejection, reference pointers | `src/skills/joycraft-gather-context.md:29–48`; `src/skills/joycraft-add-fact.md:22–36`; `src/skills/joycraft-add-context.md:47–70` |
| tune, optimize | One maintenance entrance; retain assessment and evidence-based control audit | `src/skills/joycraft-tune.md:27–39`; `src/skills/joycraft-optimize.md:35–61` |
| harden, lockdown | Internal policy operations with host-specific implementations; keep semantic rules | `src/skills/joycraft-harden.md:12–40`; `src/skills/joycraft-lockdown.md:34–68` |
| collaborative-setup, implement-level5 | Optional advanced modules, loaded when applicable | `src/skills/joycraft-collaborative-setup.md:11–27`; `src/skills/joycraft-implement-level5.md:12–22` |

### Skeptic disagreements

**Pi developer: qualified; novice: qualified; auditor: qualified.** Pi sees executable orchestration as a concrete starting point; the auditor still requires outcome evidence before instructional removal. The novice adds a separate educational requirement: stronger models do not imply more knowledgeable users. Q1's “essence and core objective” includes learning TDD, not merely producing green exits. Current reports of passing counts do not prove that learning. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:266`; `src/skills/joycraft-implement.md:165–172`.)

### What would change the ruling

Trial individual removals with unchanged acceptance criteria, across harnesses and capability tiers. Measure completion, cost, intervention, and workflow fidelity; separately ask users to explain the failed behavior, fix, evidence, and remaining uncertainty. Keep STE in its existing human-facing scope rather than repeating it as machine ceremony. (`src/templates/reference/output-style.md:14–30`.) Joycraft non-inferiority after cuts and novice learning effects remain **UNVERIFIED**.

## P9 — Readiness changes the surface, not the truth

**Ruling: QUALIFY.** Make early visual learning and bounded panels available. Require panels only for a justified risk tier with measured incremental value. Capture decisions when each is ready; permit unresolved exploration without fabricated consent. Retain implementation verification.

### Strongest refutation

P9 bundles more reasoning, criticism, visuals, and timing. Favorable maintainer experience does not isolate their effects. The clarification is nevertheless decisive about preference: artifacts are “amazing” after clarity, while premature questions obstruct brainstorming. The failure is timing, not the existence of artifacts. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:23,254`.)

Clear intent is not technical review competence. A novice can clearly want booking software without spotting a concurrency error in a polished diagram. This is a plausible failure case, not a measured result. Likewise, reviewer context isolation does not establish independent errors when everyone receives the same evidence and framing. (`docs/research/2026-09-24-dynamic-joycraft-panel-codex-brief.md:9–14`.)

### Evidence for the refutation

The timing defect is real: interview promises low pressure but triggers a page at two questions. Existing escapes are backlog/discard/assign; other choice keys map to clarified. A decorative “explore” choice could falsely complete the decision. Decompose blocks `open` specifically, so adding an unfamiliar state without updating consumers could also let uncertainty pass. (`src/skills/joycraft-interview.md:12,37–44`; `src/templates/CHECKPOINT_TEMPLATE.html:264–319`; `src/skills/joycraft-decompose.md:45–54`.)

[Helix](https://shopify.engineering/helix) reviews built checkpoints against an existing reference; it does not test standard pre-spec panels. [SkillOpt](https://arxiv.org/html/2605.23904v2), [Voyager](https://arxiv.org/html/2305.16291), and [ACE](https://arxiv.org/html/2510.04618) study different verification/adaptation loops. Their mechanisms do not establish P9's human-facing efficacy.

### Evidence against the refutation

The first customer's interaction preference is itself relevant. A prior dogfood session rejected all three offered framings and rescoped the feature, supporting escape outside the agent's menu. But separate question-capture tests used scripted compliant input and left human compliance untested. (`docs/features/2026-07-20-decision-dossier/brief.md:109–115`; `docs/discoveries/2026-07-20-question-capture.md:117–133`.)

Use exploratory diagrams before clarity when they help create it. Readiness should govern demands for commitment, not forbid visual thinking. Preserve settled answers and return the unresolved portion to chat or investigation without an assignee or invented rationale. Keep it semantically nonterminal throughout downstream consumers. Existing acceptance-criterion provenance can connect visual discoveries to decisions and specs. (`src/skills/joycraft-decompose.md:172–188`.)

### Skeptic disagreements

**Novice: qualified; researcher: qualified; auditor: qualified.** The novice and auditor permit targeted panels as bounded available interventions. The researcher demands separate measured panel benefit before mandatory defaults. The judge permits the capability now and reserves default gates for an evaluated risk tier. All reject approval count or attractive artifacts as quality evidence. The maintainer's “we can easily get it for others” remains untested transfer. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:267`.)

### What would change the ruling

Compare equal-budget chat, readiness-triggered visual checkpoints, and those checkpoints plus panels. Include abandoned artifacts and exploration returns; measure attention through delivery, requirement defects, cost, and rework. Reopen affected decisions when prototype behavior changes. A return to chat may be success under this design, so the prior bypass-to-chat kill criterion needs reinterpretation. (`docs/research/2026-07-20-reading-fatigue-brief.html:402`.) Risk thresholds, readiness accuracy, novice comprehension, and incremental panel benefit remain **UNVERIFIED**.

## P10 — Architecture defense needs ownership and rechecking

**Ruling: QUALIFY.** Offer bounded architecture defense for consequential unresolved or changed boundaries within existing design/decide work. Avoid compulsory whole-system setup defenses or recurrence triggered merely by “maturity.” A correction becomes enforceable only through a check or explicit review obligation.

### Strongest refutation

Explanation, recording, and later enforcement are separate interventions. Design already investigates code, uses snippets, and records rationale/alternatives; decide already updates constraints and the decision log. Another architecture document risks duplicating authority while leaving loading, supersession, and verification unresolved. Mature-project onboarding deliberately uses gap-only elicitation rather than exhaustive source inference. (`src/skills/joycraft-design.md:19–105`; `src/skills/joycraft-decide.md:249–259`; `src/skills/joycraft-gather-context.md:18–33`.)

For a team, the corrector and implementer may differ. Current context metadata records the last editor but not an accountable approver or clear current/superseded decision status. The maintainer's ease-of-transfer assumption is therefore a question for a handoff trial. (`src/skills/joycraft-add-fact.md:86–128`; evidence pack `:267`.)

### Evidence for the refutation

Harden cannot turn semantic architectural tradeoffs into exact command/path rules; a Context Map pointer does not guarantee retrieval. The verifier's explicit inputs are brief constraints, decisions, and boundaries, not arbitrary new architecture prose. (`src/skills/joycraft-harden.md:18–40`; `src/skills/joycraft-design.md:23–34`; `src/skills/joycraft-verify.md:34–42,99–108`.)

Record update policy is itself ambiguous: add-fact says update overlapping entries in place but later prohibits modifying existing decision-log rows; the knowledge lifecycle permits in-place revision. Resolve supersession before promising authority. (`src/skills/joycraft-add-fact.md:69–111`; `docs/reference/knowledge-lifecycle.md:9–23`.)

### Evidence against the refutation

[Helix](https://shopify.engineering/helix) provides a precedent for documentation used with independent review, not a controlled architecture-defense result. The colleague's reported “slop on slop” reduction is an anecdote worth testing. The proposed Theory Ledger accurately includes bounded deltas and independent re-derivation; it is a proposal, not validated practice. Prior panelists did all keep the decision log. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:22`; `docs/features/2026-07-20-reading-fatigue-panel/research.md:41–43`; `docs/research/2026-07-20-reading-fatigue-brief.html:369–376`; `docs/research/2026-09-01-context-map-panel-verdict.md:7–22`.)

[Gloaguen v2](https://arxiv.org/html/2602.11988v2#S4.SS2), revised 2026-06-23, supports an aggregate caution about context files. Developer-written files have a small nonsignificant average benefit and lower cost increases than generated files. Neither categorical ineffectiveness nor reliable uplift for curated architecture corrections follows.

### Skeptic disagreements

**Team lead: qualified; harness expert: qualified; auditor: qualified.** Their primary conditions are authority transfer, effective loading/enforcement, and demonstrated incremental value. They also disagree on the context-paper label: the auditor says the abstract-level citation holds; the expert says applying it against human-curated architecture records is a misread. Both are preserved because claim and extrapolation differ.

### What would change the ruling

Use one existing decision home with scope, accountable approval, anchors, revisit triggers, and supersession. Distinguish desired policy, current behavior, and hypotheses; a verifier must not rewrite intent to fit code. Supply relevant decisions to workers and reviewers, with checks for mechanical invariants and named review obligations for semantics. Compare recurrence, missed drift, rework, and review time when engineer B uses engineer A's corrections. The Theory Ledger's historical “never shipped,” mature-codebase cost, and sustained benefit remain **UNVERIFIED**.

## P11 — Personal explanations, shared acceptance

**Ruling: QUALIFY.** Keep optional, revisable task-level preferences for explanation depth and format. Reject a setup-time expertise label that changes required assurance, approval authority, or canonical project evidence. Gate applicability follows work and shared policy, not the author's declared level.

### Strongest refutation

Human understanding, model capability, and project acceptance policy are three separate dimensions. Model-scaling research does not establish how to classify users or which technical checks they may skip. An experienced frontend engineer may need help with a database migration; comprehending a diagram is neither sufficient nor necessary to validate the underlying design. These are possible failure cases, not experimental results.

Q1 fixes lifecycle and gates while valuing “getting people used to TDD agentic development”; Q2 asks for “one path.” A personal fork that weakens verification contradicts those choices. Joycraft's Levels describe modes of agent use, not a computer-science proficiency scale. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:266–267,275`; `docs/intent/2026-09-24-dynamic-joycraft.md:20–21`; `docs/guides/levels.md:14–24`.)

### Evidence for the refutation

The architecture-defense benefit and its claimed novice limitation come from one colleague's anecdote. No comparison establishes that an accessible version is useless to novices. The execution profile is explicitly human-owned and team-shared, not a suitable inferred personal-competence store. (`docs/research/2026-09-24-dynamic-joycraft-evidence.md:22`; `src/execution-profile.ts:5–17`.)

[Lin](https://arxiv.org/abs/2605.30621), [the planning ablation](https://arxiv.org/html/2609.20804v1#S3.SS2), and [SkillsBench v4](https://arxiv.org/html/2602.12670v4) manipulate model/harness factors, not human expertise. None validates this proposed classification or a behavior-inferred alternative.

### Evidence against the refutation

Task-specific assistance already has a place: new-feature records comfortable/learning/needs-guidance in test strategy, and design permits customized presentation with stable required content. These show compatibility, not effectiveness. Shared area ownership offers a better basis for technical approval authority. (`src/skills/joycraft-new-feature.md:179–184`; `src/skills/joycraft-design.md:70–77`; `src/skills/joycraft-collaborative-setup.md:44–96`.)

[Anthropic's capability/preference distinction](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills) supports durable workflow preferences. [Helix](https://shopify.engineering/helix) varies applicable review with the work, not with an expertise label. A fixed policy can therefore select different appropriate checks for different changes without defining weaker novice assurance.

### Skeptic disagreements

**Novice: qualified; team lead: qualified; auditor: qualified.** No substantive verdict disagreement. The novice rejects exclusion from architectural decisions; the team lead requires stable handoff and clarifies that fixed gates need not mean an identical checklist for every change; the auditor finds no human-expertise causal evidence. The judge accepts shared task-based applicability and rejects personal gate selection.

### What would change the ruling

Offer concrete choices such as code examples, diagrams, or consequence explanations; let users override them per task. Behavioral signals may suggest changes, not silently relabel competence. Keep one shared decision/evidence record with personal views. Compare a common clear default plus on-demand help against explicit preferences and suggested adjustments among colleagues, independently assessing relevant expertise. Measure tradeoff comprehension, mistaken approvals, detected defects, rework, and handoffs. Faster approvals or satisfaction alone do not suffice. Persistent-personalization benefit and behavior-based expertise accuracy remain **UNVERIFIED**.

## Cross-cutting synthesis

The independent synthesis agent recommends an incremental redesign around **trustworthy completion, a thin entry layer, and shared project policy**. Curated workflows remain the default; generation, Jev, fetched guidance, and packaging changes earn adoption separately. The most concrete gap is graduation without the already-available independent verifier. The reported unshippable sessions establish urgency, not their cause. (`src/skills/joycraft-session-end.md:84–94,127–139`; `src/skills/joycraft-verify.md:34–42,64–108`; evidence pack `:269`.)

### First build and first measurement

**Build first: a bounded, independently checked completion transition.** Connect verification to graduation and distinguish worker stopped, checks passed, review unresolved, and accepted against recorded requirements. Bind evidence to the evaluated code, requirements, and check revisions. Add only enough validated local state to expose those distinctions and explain the next action. Preserve decision and hazard pointers when automating handoffs. Current `in-review` dependency semantics and status writes are not acceptance evidence. (`docs/reference/spec-status-lifecycle.md:9–23`; `src/templates/pi-scripts/joycraft-mark-done:42–77`; `src/skills/joycraft-decompose.md:409–421`.)

**Measure first: escaped acceptance failures at delivery review.** Count declared-acceptable outputs that independent review finds violate previously recorded requirements; divide by all declared-acceptable outputs reviewed. Review every declared-acceptable output and report raw counts plus the adjudication basis. Separately count every attempted task, accepted completions, unresolved attempts, and human repair minutes per attempted task. Otherwise a system that accepts nothing can appear perfect.

Establish a current-workflow baseline before the intervention, using comparable task classes and the same review procedure. Do not relabel changed requirements as implementation defects; report them separately. Measure a defined follow-up period for defects found after acceptance. Later additions must beat the repaired baseline with independent verification. These are proposed evaluation rules. The panel supplies no statistically justified universal threshold or sample size.

### Where this differs from the lead's synthesis

| Lead's direction in §9 | Panel replacement | Reason |
|---|---|---|
| Gate loop is the invariant | Accepted requirements, evidence, and accountable transitions are the invariant | A stricter predicate can still test the wrong thing; P0/P3. |
| Discoverability has a measured router fix | Persistent access is supported; Joycraft hub benefit needs comparison | Vercel tests documentation access, not lifecycle navigation; P1. |
| CLI as state oracle | Local validated facts and explanations, with separate verification authority | Computed state is not evidence of completion; P2. |
| Gates replace advice | Checks plus concise TDD and recovery guidance | Policy interception, instruction, and acceptance have different functions; P3/P8. |
| Generated process behind acceptance | Curated default; generated candidates compete against equally maintained alternatives | Evaluation authorship and lifecycle cost remain unsolved; P4. |
| Fetch, subtract, eval | Discover, assess applicability, adapt, evaluate, retain accepted fallback | Source freshness does not establish applicability; guides also add instructions; P5. |
| Jev advisory off the hot path first | Narrow advisory routing may be trialed directly on the hot path | Timing and authority differ; routing has the direct evidence; P6. |
| Two directories plus plugin plus CLI | One update authority, explicit adapters, tested discovery; optional in-place plugin first | Existing trees are generated and host behavior differs; P7. |
| Stronger models imply less process | Test removal per control/model/task/host | Planning can save cost even for strong models; P8. |
| Front-load quality as standard gates | Early learning capability, readiness for commitment, evaluated mandatory risk tiers | No cited study tests the proposed artifact bundle; P9/P10. |

The table records the synthesis agent's architectural judgments and the previously cited proposition evidence, not additional experiments.

### A coherent sequence

After verified graduation, simplify navigation while preserving explicit interfaces and lifecycle visibility. The existing smaller README menu and Pi's named calls are part of the baseline; remove command-recall burden without making automation infer a known operation. Consolidate interfaces and bookkeeping before removing capabilities. (`README.md:49`; `src/templates/pi-scripts/joycraft-implement-loop:76`.)

Make the checkpoint timing repair alongside that work: diagrams and prototypes may create clarity during exploration; readiness controls demands for commitment. Keep unresolved choices nonterminal and retain implementation verification. Use bounded panels and architecture defense for consequential uncertainty, storing decisions in the existing home with scope, approval, anchors, supersession, and explicit checks or review obligations. Personal views may differ while the shared record does not. (`src/skills/joycraft-interview.md:37–44`; `src/skills/joycraft-design.md:19–105`; `src/skills/joycraft-decide.md:249–259`.)

Run the maintainer's Jev trial separately, preserving native matching and equal-information baselines. Promote each new routing surface on its own evidence. A configured key must not silently turn the whole proposed system on. Keep acceptance independent of semantic routing. ([TypeSafe cookbook](https://docs.typesafe.ai/cookbooks/skill_suggestion.md); evidence pack `:270`.)

Treat guidance refresh as a reviewed configuration change, and preserve one update authority. Keep last-known-good local guidance and model/harness/task applicability. Try the CLI-owned plugin option before adding marketplace release coordination. Consider generated prose only where repeated work can repay independent evaluation; centrally optimizing shared curated skills is a serious alternative. Executable generation stays a separate question. ([Skills-directory plugins](https://code.claude.com/docs/en/plugins-reference#skills-directory-plugins); [SkillOpt v2](https://arxiv.org/html/2605.23904v2); `src/templates/reference/model-profile-claude-fable-5-1.md:7–22`.)

This sequence has a tradeoff: it delays the full self-building vision and broad distribution experiment. In return, each later intervention faces a stronger baseline and fewer unexplained moving parts. It also preserves the possibility that the repaired curated product is sufficient. That is a recommendation, not a forecast.

### Which human positions the panel challenges

The panel has **not** changed the maintainer's mind; it proposes the following revisions for discussion. Quotations and preferences come from `docs/research/2026-09-24-dynamic-joycraft-evidence.md:266–275`.

| Position | Proposed movement | Evidence or distinction |
|---|---|---|
| Q1: gates, lifecycle, artifacts fixed; process prose generated | Keep STE, TDD and shared acceptance; make generated prose optional and earned | Generation's evaluator and maintenance burden are not solved by human approval; P4. Gate applicability can follow the work without following user expertise; P11. |
| Q2: maintainer first, colleagues next, one path | Retain service order; reject easy transfer as established | Different correctors/implementers require handoff trials; beginner understanding needs direct assessment; P1/P2/P10/P11. |
| Q3: parked feature, fast guidance delivery | Keep the feature parked; deliver accepted applicable changes rather than assuming a fresh guide helps everyone | Existing scoped profiles and unknown-model gaps; P5. No stamp or resumption follows this panel. |
| Q4: confidence in shippable output through unoverrideable gates | Replace the hook guarantee with evidence-controlled acceptance and honest unresolved outcomes | Stop limits, missing verifier integration, and predicate adequacy; P0/P3. |
| Q5: Jev core now for every key-holder | Permit the requested hot-path experiment; narrow it to advisory skill suggestions before broader promotion | Direct but limited cookbook evidence, seven regressions, information imbalance, and absent downstream measurement; P6. |
| Q6–Q8: independent panels, chosen lenses, findings before specs | Retain the requested process | These are discussion/output preferences, not unproven product-performance claims. This report supplies findings without decisions or specs. |

The clarification about artifacts survives intact: their value and desired visuals are respected; the panel challenges premature commitment and inferred consent. The architecture-defense idea survives as a bounded extension of existing work, while its enforcement and transfer require explicit design. Personalization survives as assistance, not authority.

## Citations rechecked

All external rows were checked live on **2026-09-24 Pacific / 2026-09-25 UTC**. “Holds” applies to the stated narrow claim, not every inference made from the source. “Misread” includes stale-version conflation and an extrapolation stronger than the source; it does not imply fabrication. No audited citation was established to be a dead link. The proposition column makes the minimum of two rechecked pack sources per proposition explicit.

| ID | Citation and relevant date | Verdict | What the check established or corrected | Propositions |
|---|---|---|---|---|
| C01 | [Shopify Helix](https://shopify.engineering/helix), published 2026-09-21 | holds | Narrow checkpoints, review and checks; human review default, autonomy optional. No controlled general shipping-quality or pre-spec-panel result. | P0, P3, P9, P10, P11 |
| C02 | [Vercel evaluation](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), published 2026-01-27 | holds | 56% noninvocation, 53/79/100 results, compressed framework-doc index. | P0, P1 |
| C03 | [Same Vercel source](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), as router proof | misread | Persistent Next.js documentation access is not a hub-versus-many-commands experiment. | P0, P1 |
| C04 | [Claude skills](https://code.claude.com/docs/en/skills), live reference | holds | Text-budget and selective-exposure mechanisms exist; a shorter menu and a smaller model catalog are separate. | P1, P7, P11 |
| C05 | [Claude issue #64606](https://github.com/anthropics/claude-code/issues/64606) | misread | Version-specific reporter examples do not establish a universal skill-count threshold or Joycraft overflow. | P1 |
| C06 | [Claude skill lifecycle](https://code.claude.com/docs/en/skills#skill-content-lifecycle); [Superpowers releases](https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md) | misread | Blanket bootstrap loss is overbroad; bounded restoration and host-specific persistence exist. | P1 |
| C07 | [OpenSpec v1.0.0](https://github.com/Fission-AI/OpenSpec/releases/tag/v1.0.0), 2026-01-26 | holds | Runtime instructions and artifact-readiness queries are explicit; no comparative outcome evidence. | P2 |
| C08 | [OpenSpec CLI documentation](https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/docs/cli.md) | holds | Planning-artifact completion and implementation completion are distinct. | P2 |
| C09 | [Pi creator's article](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/), 2025-11-30 | holds | CLI tools documented on demand are advocated; this does not establish a lifecycle acceptance oracle. | P2 |
| C10 | [Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md); [compaction](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md) | holds | Explicit skill invocation and shared-path discovery; complete skill-body survival is not guaranteed. | P1, P7 |
| C11 | [Claude Stop decision control](https://code.claude.com/docs/en/hooks#stop-decision-control) | misread | Current docs permit blocking. Whether the pack quoted an older source is unverified. | P3 |
| C12 | [Claude Stop input](https://code.claude.com/docs/en/hooks#stop-input); [timeouts](https://code.claude.com/docs/en/hooks#timeouts) | holds | Eight-block continuation limit; interruption and handler-specific timeout semantics qualify enforcement claims. | P3 |
| C13 | [SkillsBench v1](https://arxiv.org/html/2602.12670v1), 2026-02-13 | holds | Historical +16.2-point result and self-generation null belong to this version; the source's 86/84 wording needs care. | P0, P4, P8, P11 |
| C14 | [SkillsBench v4](https://arxiv.org/html/2602.12670v4#A4.SS6), revised 2026-06-14 | misread | Treating the pack's old numbers as current is wrong: 87 tasks, 18 configurations, +16.6 points; software engineering +11.6, not +4.5. Three self-generation diagnostics remain negative with protocol caveats. | P0, P4, P8, P11 |
| C15 | [SkillOpt v2](https://arxiv.org/html/2605.23904v2), revised 2026-05-25 | holds | One compact skill, frozen model/harness, selection separated from final test; six domains, no software-engineering benchmark. Not evidence for an entire generated SDLC. | P4, P9 |
| C16 | [Misevolution](https://arxiv.org/html/2608.12851v1), 2026-08-13 | holds | Distinguishes unsafe artifacts, fresh-session harm, and an experiment-specific pooled carryover rate. | P4 |
| C17 | [ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/), 2026-02-05 | holds | 534/3,984 critical findings and 76 confirmed malicious payloads concern marketplace artifacts, not local-generation prevalence. | P4 |
| C18 | [Anthropic model-guide index](https://platform.claude.com/llms.txt); [Fable 5.1 guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1.md) | holds | Current guide discovery and conditional subtractive advice verified; durable URL contracts not established. | P5 |
| C19 | [Opus 5.5 guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5.md) | misread | A broadly subtractive account omits additions and attended/unattended applicability. | P5 |
| C20 | [OpenAI latest-model guide](https://developers.openai.com/api/docs/guides/latest-model.md) | holds | Live model metadata and migration/evaluation guidance; not proof that automatic prompt replacement helps. The attributed Sol/Luna-versus-Astra sentence was not recovered. | P5 |
| C21 | [DeepSeek-R1](https://github.com/deepseek-ai/DeepSeek-R1#usage-recommendations); [Qwen3](https://qwenlm.github.io/blog/qwen3/) | misread | These official sources refute the pack's categorical open-weight absence/impossibility inference; coverage remains uneven. | P5 |
| C22 | [TypeSafe skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion.md) | holds | Reported gains hold for advisory first-response skill suggestions; richer treatment input confounds classifier-only attribution. | P6 |
| C23 | [TypeSafe API](https://docs.typesafe.ai/api.md); [jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md); [confidence](https://docs.typesafe.ai/confidence.md) | holds | Typed API and limitations verified; local calibration and quality-gate reliability unestablished. | P6 |
| C24 | [TypeSafe agreement §§2.2–2.4](https://typesafe.ai/legal/mca) | misread | Credential confidentiality alone does not establish per-user-only licensing. BYOK is a product constraint here. | P6 |
| C25 | [Spence activation experiment](https://scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals), 2026-02-07 | misread | 22/22 easy cases is real but incomplete; harder cases give 18/24 and negatives number five. “Model-free” omits the executing model's reasoning. | P6 |
| C26 | [Claude plugin reference](https://code.claude.com/docs/en/plugins-reference#plugin-directory-structure) | holds | Root CLAUDE.md is not automatically project context. AGENTS-specific nonloading was not established; file carriage is a separate issue. | P7 |
| C27 | [Plugin auto-updates](https://code.claude.com/docs/en/discover-plugins#configure-auto-updates) | misread | Ordinary third-party defaults are off, with documented exceptions and separate activation timing. | P7 |
| C28 | [Skills-directory plugins](https://code.claude.com/docs/en/plugins-reference#skills-directory-plugins); [collision rules](https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name) | holds | In-place CLI-owned packaging is plausible; local and plugin skill duplication must be addressed. Minimum supported version unverified. | P7 |
| C29 | [Lin et al.](https://arxiv.org/html/2605.30621v1#S4), 2026-05-28 | holds | Inverted-U is about task-solving consumers; author capability is comparatively flat. No operator-expertise or Joycraft-removal experiment. | P8, P11 |
| C30 | [Fan et al. Table 3](https://arxiv.org/html/2609.20804v1#S3.T3), 2026-09-17 | misread | Planning enabled supplies the strong-model cost savings; removing it does not. Results are model/task-specific. | P8, P11 |
| C31 | [Anthropic skill-creator article](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills), 2026-03-03 | holds | Capability-uplift/workflow-preference taxonomy is guidance, not proof that named skills expire or users should get different gates. | P8, P11 |
| C32 | [ACE](https://arxiv.org/html/2510.04618#S2.SS2) | misread | Feedback dependency holds. The 18,282→122-token and 66.7→57.1 collapse is a Dynamic Cheatsheet case discussed by ACE, not an ACE-run result. | P9 |
| C33 | [Voyager](https://arxiv.org/html/2305.16291) | holds | Model self-verification ablation reduces discovered items by 73% in Minecraft; no human pre-spec-gate experiment. | P9 |
| C34 | [SDD conceptual analysis](https://arxiv.org/abs/2609.00252), submitted 2026-08-31 | misread | An immature, predominantly gray-literature evidence base does not prove no controlled SDD study exists anywhere. | P9 |
| C35 | [Gloaguen v2](https://arxiv.org/html/2602.11988v2#S4.SS2), revised 2026-06-23 | holds | Aggregate caution holds. Developer-file mean gain is 2.4% and nonsignificant (p=.21), with at most 19% cost increase; generated-file averages differ. Neither universal human-file failure nor reliable benefit follows. | P10 |

### Repository and local-research corrections

| Pack claim | Verdict | Checked evidence and corrected scope |
|---|---|---|
| Five copies imply five authoring surfaces | misread | One canonical source already generates them: `scripts/generate-bundled-files.mjs:44–58,171–190`. Host semantics still differ. |
| Folder-map helper is called only by tests | misread | Helper callers remain at `src/agents-md.ts:135–148` and `src/improve-claude-md.ts:402–414`. Active create-once preservation still explains the update gap: `src/update-inventory.ts:236–263`. |
| Eval runner has only four assertion kinds | misread | It also has `command`; no dedicated invocation assertion appears in the dispatch: `src/templates/evals/check.sh:51–63`. |
| Edited vendor skills are replaced every release | misread | Local-only changes are preserved; simultaneous local/vendor changes conflict; explicit replacement is separate: `src/update-plan.ts:325–351`. |
| Collapsing skills requires no new machinery | misread | Retirement logic is not stale generated-output cleanup: `scripts/generate-bundled-files.mjs:171–190`; `scripts/sync-skills.mjs:68–89`. |
| Plugin deferral opposed hybrid delivery | misread | It recommended hybrid delivery after stabilization to avoid simultaneous format iteration: `docs/features/plugin-architecture/research.md:39–55`. |
| Theory Ledger supplied a bounded record and independent re-derivation | holds | It is a proposal, with no validated outcome in the cited artifact: `docs/research/2026-07-20-reading-fatigue-brief.html:369–376`. Historical “never shipped” remains unverified. |
| Prior context panel unanimously kept the decision log | holds | Verified in `docs/research/2026-09-01-context-map-panel-verdict.md:7–22`; consensus is not effectiveness evidence. |

## UNVERIFIED register

- **Problem causation:** the frequency, causes, and cost distribution of the reported unshippable sessions; whether static skills caused them. The report preserves the testimony without inventing a failure baseline.
- **Comparative product outcomes:** superiority of the full dynamic bundle, a hub, a state interface, or any particular number of visible commands; current Joycraft description overflow; adoption and support-hour savings.
- **Acceptance reliability:** installed-runtime hook behavior, cross-vendor parity, false blocks, timeout/recovery performance, and how much verifier integration reduces escaped requirements defects.
- **Generation economics:** who can sustainably author independent tasks for a solo user; net gains beyond equally maintained curated skills; generated hook/script quality; repeated reuse and retirement performance.
- **Model guidance:** long-term URL stability, reliable model identity everywhere, general duplication of harness-injected text, the pack's Codex catalog size/cache assertions, and the unrecovered Sol/Luna-versus-Astra quotation.
- **Jev:** local calibration, latency tails, successful-response misroutes, net correction-hour savings, multiple-skill and long-session behavior, and transfer to current frontier models or additional routing/judging surfaces. This review grants no legal clearance for a shared-key service.
- **Distribution:** full host discovery/precedence matrix, minimum in-place-plugin version, automatic plugin-root AGENTS loading, mixed-version behavior, and cost advantage of either packaging topology.
- **Learning and personalization:** novice TDD learning from existing prose, reliable inference of review competence, persistent-personalization benefit, and the assumption that super-user success transfers easily to colleagues.
- **Design and architecture:** causal panel/prototype benefit, readiness accuracy, optimal risk tiers, reviewer-error independence, mature-codebase review cost, recurrence frequency, and engineer-to-engineer transfer of corrections.
- **Historical or exhaustive absence claims:** Theory Ledger never having shipped, no controlled SDD study existing anywhere, and the historical wording that produced the pack's Stop contradiction. An absence in the inspected material does not settle these claims.
