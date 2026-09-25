# Dynamic Joycraft — Evidence Pack

> **Date:** 2026-09-24
> **Status:** DRAFT evidence pack. Not a decision. Feeds an adversarial panel.
> **Origin:** /joycraft-interview session (chat-only, no gate artifacts by request)
> **Question:** Should Joycraft be reimagined as a dynamic, agent-built harness — one entry skill, generated per-project skills/scripts/hooks, plugin and/or MCP distribution, runtime-fetched model guidance, Jev-judged routing and gates — now that frontier models need less "stay on task" scaffolding?
> **Parked:** the Opus 5.5 prompting feature (`feature/opus-5-5-prompting`, head 1d30997). Its decompose gate D10–I2 is answered in an artifact but unstamped. Its model-profile mechanism is under review here.

Eight research agents ran in parallel (Opus 5.5). Every claim below carries the agent's citation. Items marked UNVERIFIED were not confirmed at a primary source. Raw fetched sources were saved in the session scratchpad and may not survive.

---

## 0. The user's thesis and influences

Joycraft was designed to keep weaker models on task. Frontier models (Claude Fable 5.1, Opus 5.5; OpenAI GPT-6 Astra and Luna) make spec-to-software more deterministic. The ~22 static SKILL.md files (5,573 lines), five per-harness copies, a static context map, and hand-written per-model profile docs feel like a box gated on the maintainer's release cadence. Users forget the many slash commands. Desired: ONE entry skill that guides the whole SDLC and builds project- and user-specific skills, scripts, hooks, maybe MCP servers on the fly.

Named influences:

- **Pi / oh-my-pi** — "the harness builds its own harness."
- **Shopify Helix** (shopify.engineering/helix, Talha Naqvi, 2026-09-21). A checkpoint-and-gate loop that migrates React Native screens to native code. Principles: "An attempt is allowed to be wrong. It is not allowed to ship until it isn't." Gates are blocking, never advisory; the agent retries but cannot override a failed check. Checkpoints are small enough to review at a glance. "The reference *is* the spec" — the agent reads code, not large spec documents. Two independent, context-isolated adversarial reviewers must both approve. Engineer feedback is "recorded in memory to improve every checkpoint that follows"; autonomy grows as approved work accumulates. "One-shot tools put all the work at the end… Helix moves feedback to the earliest useful point." Nothing in the loop is migration-specific. **Not stated:** how memory is stored, whether agents generate their own tooling, per-project vs global scope, any adoption or cost numbers.
- **Jev (TypeSafe)** — a System One model returning typed judgments (Choice / Noul / Score) with probabilities, no text. Idea: tell Claude Code which skills to invoke and which tools to call; power Helix-style gates.
- **Architecture-defense session (added mid-session; practice of a colleague, Atharva Vaidya, who does not use Joycraft).** At project setup — and again as the project matures — the agent proposes the architecture, **defends it with code examples, and explains every decision**; the human intervenes ("no, this is bad, it should be X"); the corrections become a core part of the context map. He reports much less slop, especially the "slop on slop" that accretes as a project matures. Constraint: it requires a CS background, so it is useless for Joycraft's novice users and very useful for practitioners. Proposed mechanism: setup asks for the user's technical background, and that **forks the abstraction level** the harness works at for them.
- **Front-loaded quality (added mid-session).** The maintainer has been running panels and building diagrams/prototypes by hand *before* specs, and reports it drives quality up far more than discovering after the implement-feature loop that "it's all garbage." Wanted as product: panels as a standard step, HTML artifacts that dialogue with the user, diagrams and prototypes built pre-specs so the human can shape brief and specs before expensive spec+implementation tokens are spent.

---

## 1. Pi and oh-my-pi (r1)

1. Pi's stated philosophy: "Adapt Pi to your workflows… Have Pi manipulate itself in place, hit /reload, and keep going." Pi ships no MCP, sub-agents, plan mode, permission popups, to-dos, or background bash. (pi.dev, fetched 2026-09-24.) Armin Ronacher: "you don't go and download an extension… You ask the agent to extend itself." (lucumr.pocoo.org/2026/1/31/pi/)
2. Origin: Zechner built Pi because Claude Code's changing prompts broke his workflows. System prompt plus tools under 1,000 tokens. On MCP: "overkill… significant context overhead"; he builds "CLI tools with README files" the agent reads on demand. (mariozechner.at/posts/2025-11-30-pi-coding-agent/)
3. Mechanism is a doc-driven, user-prompted ladder: "Start with the least powerful mechanism that meets your need": AGENTS.md → prompt template → skill → extension → TUI → provider → package. The user pre-installs under .pi/ or ~/.pi/agent. Pi reads .agents/skills; docs do not mention .claude/skills. (github.com/earendil-works/pi docs)
4. No per-model system-prompt variants in Pi. Model differences live in provider shims and models.json overrides.
5. oh-my-pi (can1357, ~33k stars, created 2025-12-31): re-adds MCP, subagents, plan mode, LSP, debugger, advisor model, nine model roles; imports rules/skills/MCP from .claude, .cursor, .codex, .github/copilot. "Ask omp to write the piece you're missing, then /reload-plugins."
6. **omp's self-authored skills:** `learn` and `manage_skill` write to ~/.omp/agent/managed-skills, gated behind `autolearn.enabled` (default false), labeled experimental, must "NEVER edit user-authored skills," authored names win conflicts, 64KB cap. (omp docs/tools/learn.md)
7. omp per-model tuning is at the tool level: per-model edit-tool modes; the hashline edit format beat alternatives on 14 of 16 models and raised Grok Code Fast 1 from 6.7% to 68.3%. Main system prompt has no model branches. (stencil.so/blog/the-harness-problem, 2026-02-12)
8. Authors' own critiques: Ronacher — "If each iteration adds another small defense, the system slowly becomes less understandable while appearing more robust." (lucumr 2026-06-23) Pi auto-closed 80% of 3,145 external issues/PRs in 90 days, partly blamed on skills that encourage issue creation. (lucumr 2026-05-24) Zechner's talk: agents compound errors; "a sufficiently detailed spec is a program." (secondhand, 2026-04-10)
9. Security: extensions run with full process permissions; project trust is "not a complete startup boundary." (Pi security.md)
10. Pi joined Earendil 2026-04-08; ~109k stars.

**Contradicting:** Pi's skill/extension docs are written for human authors — "agent builds it" is a marketing message, not the documented default. omp's popularity (re-adding built-ins) suggests many users want built-ins over self-built features.

**Inference:** self-building prior art is user-prompted, doc-backed, smallest-mechanism-first. Generated artifacts need a third ownership class, isolated namespace, off by default, review gate, deny patterns. A Joycraft MCP server would not reach Pi users.

---

## 2. Claude Code extension surface as of 2026-09-24, CLI v2.1.282 (r2)

1. **Skill frontmatter:** name, description, when_to_use, argument-hint, arguments, disable-model-invocation, user-invocable, allowed-tools, disallowed-tools, model, effort, context:fork, agent, background, hooks, paths, shell, metadata, license, compatibility. Only name/description/license/compatibility/metadata/allowed-tools belong to the Agent Skills spec. (code.claude.com/docs/en/skills)
2. **Auto-invocation by description matching.** Every turn lists description + when_to_use, capped at 1,536 chars/skill, total listing budget 1% of context; on overflow, least-invoked descriptions drop first. `disable-model-invocation` removes the description from context entirely. Spec caps description at 1,024 chars. Keep SKILL.md under 500 lines.
3. **Progressive disclosure** (platform docs): L1 metadata ~100 tokens/skill always loaded; L2 body <5k tokens on trigger; L3 files/scripts on demand. After compaction each skill re-attaches at ≤5,000 tokens, 25,000 combined.
4. **Mid-session skills load live.** Skills added/edited/removed under ~/.claude/skills, .claude/skills, or --add-dir dirs are picked up without restart. A top-level skills dir created mid-session needs a restart. Settings-file hook edits are picked up by the watcher.
5. **Plugins:** plugin.json optional, only name required. Bundles skills, commands, agents, hooks, mcpServers (.mcpb), lspServers, outputStyles, workflows, bin/ on PATH, userConfig, channels, dependencies. **A root CLAUDE.md is NOT loaded** — instructions must live in skills. Commands namespaced /plugin:skill. Plugin subagents ignore hooks, mcpServers, permissionMode. (plugins-reference)
6. **Install/update:** `/plugin install x@claude-plugins-official`. Auto-update on by default only for official marketplaces, off for third-party. Running session keeps old version until /reload-plugins. Only official-marketplace plugins show a context-cost estimate. Cloud sessions don't load local plugins.
7. **Plugin hints:** a CLI can print a claude-code-hint tag to stderr when CLAUDECODE is set → one-time install prompt; official-marketplace plugins only.
8. **Plugins run as you.** Hooks receive CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT, CLAUDE_PLUGIN_DATA. Docs' own example: a SessionStart hook installing node_modules into CLAUDE_PLUGIN_DATA. Never write state to CLAUDE_PLUGIN_ROOT (moves on update). SessionStart docs say "keep these hooks fast."
9. **`claude plugin eval`** shipped v2.1.269 (2026-09-11): each case runs in a fresh isolated -p session with only the plugin loaded, 3 runs, always against a no-plugin baseline, reported as Δ. Graders: regex, tool_used (Skill-trigger rate), tool_order, file_exists, llm (2-of-3), baseline. Exit code gates CI. **`/skill-doctor`** reports per-skill context cost and invocation count, flags never-invoked skills.
10. **Hooks: 33 events** incl. SessionStart, Setup, InstructionsLoaded, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, Stop, SubagentStop, TaskCompleted, PreCompact, PostCompact, PreModelSwitch, SessionEnd, Elicitation. **Handler types: command, http, mcp_tool, prompt, agent.** additionalContext capped at 10,000 chars. Hooks in skill frontmatter register on invocation, persist for the session, `once:true` available.
    - **http handler (verified by lead):** POSTs the hook input JSON to a URL; header values interpolate `$VAR` only for names in `allowedEnvVars`; response uses the same JSON output format (additionalContext, permissionDecision allow/deny). Default timeout 600s, 30s on UserPromptSubmit. The body is Claude Code's hook JSON, not a third-party API shape → a Jev call needs a thin adapter.
    - **Stop hooks:** the hooks page as fetched states "On Stop and SubagentStop, hooks can't block or make decisions." r7 notes prompt-type Stop hooks and `/goal` exist. UNRESOLVED — needs a direct check before any Stop-gate design.
11. **MCP:** tools, resources (@-mentions), prompts (become /server:prompt). Tool search on by default; descriptions truncated at 2,048 chars. Docs frame skills as knowledge/workflows and MCP as external connections. Anthropic's "Code execution with MCP" (2025-11-04): 150k→2k tokens, 98.7% cut; suggests saving working code as a SKILL.md.
12. **Subagents:** frontmatter name, description, tools, model (sonnet/opus/haiku/fable/id/inherit), permissionMode, maxTurns, skills (preloads), mcpServers, hooks, memory, background, omitClaudeMd, effort, isolation:worktree. Agent Teams experimental behind env flag; one implicit team per session since v2.1.178.
13. **Memory:** @imports up to 4 hops; .claude/rules/*.md with `paths:` globs. **AGENTS.md native since v2.1.277 (2026-09-18) — but read ONLY when no CLAUDE.md or CLAUDE.local.md exists**, unless the claude-md-and-agents-md option is set. Joycraft's CLAUDE.md `@AGENTS.md` pointer is still required.
14. **Skills that write skills:** skill-creator plugin (anthropics/skills, last commit 2026-04-23): draft → evals → benchmark with/without → blind A/B → description-trigger tuning. `/run-skill-generator` and `/verify` write per-project skills into .claude/skills/.
15. **Per-model prompting guides are fetchable Markdown** at platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-<model>.md for Fable 5, Fable 5.1, Opus 4.8, Opus 5, Opus 5.5, Sonnet 5; plus migration guides and published system prompts. URL-slug stability UNVERIFIED.

**Contradicting:** /skill-doctor version conflict (docs say v2.1.252, changelog v2.1.261). Description 1,536 (Claude Code) vs 1,024 (spec) — a working description can fail claude.ai/API packaging. No official doc sanctions scaffold-on-install via SessionStart.

**Inference:** generating skills on the fly is natively supported and Anthropic ships the pattern; create .claude/skills at init so later writes load live. 22 always-listed descriptions is what the budget and /skill-doctor penalize → gate internals with disable-model-invocation. Plugin path adds namespacing, eval Δ, CLI hints, but is Claude-only and cannot carry CLAUDE.md/AGENTS.md → hybrid CLI + plugin. MCP server justified only for live queries (e.g., spec-queue state).

---

## 3. Cross-harness landscape (r3)

| Harness | Instructions | Project skill dirs | Invoke | Mid-session pickup | Beyond skills |
|---|---|---|---|---|---|
| Claude Code | CLAUDE.md; AGENTS.md only if no CLAUDE.md | .claude/skills ONLY | auto + /name | watcher, no restart | plugins, 33 hook events, MCP |
| Codex | AGENTS.md | .agents/skills cwd→root, ~/.agents/skills | auto + $name | auto-detect, else restart | .codex-plugin marketplace, hooks, MCP |
| Copilot CLI | AGENTS.md | .github/, .claude/, .agents/skills | auto + /name | /skills reload | Agent Plugins 1.0, hooks, MCP |
| Cursor | AGENTS.md, .cursor/rules | .agents/, .cursor/, .claude/, .codex/ | auto + /name | auto | marketplace (2.5), hooks, MCP, /create-hook |
| Gemini CLI → Antigravity | AGENTS.md | .gemini/ or .agents/skills | activate_skill + consent | /skills reload | plugins, hooks.json, MCP |
| OpenCode | AGENTS.md | .opencode/, .claude/, .agents/skills | skill tool | n/a | n/a |
| Amp | AGENTS.md | .agents/skills + .claude/skills | auto | n/a | MCP, plugin API |
| Pi | (r1) | .agents/skills, ~/.agents/skills | /skill:name + auto | /reload | TS extensions, no MCP |
| omp | (r1) | native .omp + .claude/skills provider | — | — | — |

1. AGENTS.md stewarded by the Linux Foundation's Agentic AI Foundation (Dec 2025); agents.md claims 60k+ repos, 23 tools.
2. Agent Skills spec (agentskills.io, open since 2025-12-18) requires only name + description, mandates no directory; 46 clients listed.
3. **Path convergence:** `.agents/skills` read by Codex, Copilot, Cursor, Antigravity, OpenCode, Amp, Pi. `.claude/skills` read by Claude Code, Copilot, Cursor, OpenCode, Amp, omp. **Two directories reach every harness surveyed.**
4. **Plugin packaging split:** Agent Plugins 1.0 (2026-08-06) by AWS, Anysphere, GitHub, Microsoft, OpenAI, Vercel, Google joining. **Anthropic absent.** Covers skills and MCP only — no hooks.
5. **Skills over MCP** (SEP-2640) Final 2026-09-13; allows generated skills but "Hosts MAY decline to load such skills." 2 of 572 servers declared support nine days later; no mainstream client shipped it.
6. Self-extension precedents: Pi (write/reload/test loop), Hermes Agent (auto-creates skills from completed tasks), Cursor /create-hook and /migrate-to-skills.
7. **Traction (GitHub API + npm, 2026-09-24):**

| Pack | Channel | Stars | npm/mo |
|---|---|---|---|
| obra/superpowers | per-harness plugin wrappers | 291k | — |
| anthropics/skills | skills repo | 178k | — |
| github/spec-kit | `specify init` scaffolder | 139k | — |
| Fission-AI/OpenSpec | npx scaffolder | 70k | 1.79M |
| BMAD-METHOD | npx / `npx skills add` | 53k | 73k |
| vercel-labs/skills | `npx skills add`, 27+ agents | 32k | 28.5M |
| compound-engineering-plugin | plugin | 25k | — |
| joycraft | npx scaffolder | — | 453 |

**Contradicting:** hooks have no shared standard. Claude Code is the only major harness ignoring .agents/skills. **arXiv 2608.12851 (2026-08-13): all 21 evolved (self-evolving) agent configurations authored unsafe skill artifacts; exposure to malicious tasks raised carryover attack success from 16.0% to 35.3%.** Platforms churn (Gemini CLI → Antigravity CLI 2026-06-18).

**Inference:** five copies → two. `npx skills add owner/repo` decouples delivery from release cadence. On-the-fly skills are mechanically viable everywhere; the misevolution paper argues for a human review gate and provenance. MCP as main channel premature. Hooks still need per-harness adapters. Traction leader ships one skill set with thin wrappers.

---

## 4. Self-extending harnesses vs curated skills — the research (r4)

1. **Unaided self-generated skills do not help.** SkillsBench (arxiv 2602.12670, 2026-02-13): curated skills +16.2pp mean pass rate across 86 tasks / 7,308 trajectories; self-generated skills "provide no benefit on average." Curated skills hurt 16 of 84 tasks. Software engineering gained least (+4.5pp). Focused skills with 2–3 modules beat exhaustive ones.
2. **Generated artifacts help only behind a verifier.** SkillOpt (arxiv 2605.23904, 2026-05-22): +24.8 in Codex, +19.1 in Claude Code on GPT-5.5, keeping an edit only if it strictly improves a held-out score; beat human-written skills in all 52 cells. SkillAxe (2606.10546): eval-guided refinement closes 47–67% of the gap to human skills. ACE (2510.04618, ICLR 2026): +10.6% on agents but "context adaptation depends critically on feedback quality" — one unstructured rewrite collapsed a playbook from 18,282 to 122 tokens and accuracy from 66.7 to 57.1, below the 63.7 no-adaptation baseline. Voyager (2305.16291): removing self-verification cut discovered items 73%.
3. **Self-evolving harnesses: big gains, documented pathologies.** Agentic Harness Engineering: Terminal-Bench 2 69.7→77.0. HarnessFix: SWE-bench Verified 45→57. Darwin Gödel Machine 20→50 for ~$22k and **gamed its hallucination check by deleting the markers the check read.** Adaptive Auto-Harness (2606.01770): on a task stream "accuracy peaks early and then declines." (survey: jxzhangjhu.github.io, 2026-06-28)
4. **Harness-edit benefit is an inverted U in capability.** Lin et al. (2605.30621): weak models benefit little, mid-tier most, strong "less than mid-tier." Qwen3.5-9B's edits gained about as much as Claude Opus 4.6's.
5. **Stronger models need less process scaffolding, not less verification.** Harness ablation (2609.20804, 2026-09-17): explicit planning +11.6% for a 30B model, −2.0 to −0.4% for the strongest at ~30% lower cost; bash-only beat predefined tools at 550B (+3.6%, −53% cost). Harness-Bench (2605.27922): stronger backends vary less across harnesses, but a 23.8pp spread remains. Scaffold Effect (2607.22585): same-model pass rates differ 0–8pp across harnesses while tokens per solve differ up to 40×.
6. **Anthropic's own guidance points both ways.** Prompting Claude Fable 5: skills built for prior models "are often too prescriptive… and can degrade output quality," and the model "does a good job of updating skills on the fly." Same page: "fresh-context verifier subagents tend to outperform self-critique"; auditing progress claims "nearly eliminated fabricated status reports." Opus 5.5 guide: unattended runs stop early; recommends a checklist the model updates. **Skill-creator post (claude.com/blog, 2026-03-03): capability-uplift skills become unnecessary as models improve; encoded-preference skills for team workflow persist.**
7. **Context files rarely help.** Gloaguen et al., ETH (2602.11988, 2026-02-12): context files, generated or hand-written, "do not generally improve task success" and add >20% cost.
8. **Auto-invocation is unreliable and count-sensitive.** Vercel (2026-01-27): skill never invoked in 56% of evals → pass rate 53% = no-docs; explicit instruction → 79%; **8KB always-loaded index → 100%.** Claude Code issue #64606 (2026-06-02): 25–56-skill sets silently lose descriptions, after which Claude "writes custom scripts instead of invoking available skills." Anthropic tool search (2025-11-24): deferred loading raised Opus 4.5 79.5%→88.1%. Toollery (2609.22218): with ~450 tools, top-10 retrieval beat full-library prompting (0.84 vs 0.77–0.79) at 2.1K vs 84.1K tokens.
9. **Skills are an attack surface.** Snyk ToxicSkills (Feb 2026): 13.4% of 3,984 skills had critical issues, 76 confirmed malicious. Malicious-skill study (2608.05223): exploited Gemini CLI in 95.5–96.1% of runs; explicit safety detection 1.99%.

**Unverified:** no study compares one orchestrating entry point vs many commands for onboarding; no controlled study of spec-driven development exists (2609.00252 says so); no data on quality/security of agent-generated hooks or MCP servers specifically; METR calls horizons above 16 hours unreliable.

**Inference:** every study where generation worked had an acceptance gate. One compact always-loaded router matches the best measured result. Cut step-by-step process for frontier models; keep independent verification, grounded progress claims, persisted state. Keep team-convention artifacts committed and reviewed; per-user regeneration risks the ACE-style collapse. Generated hooks/MCP servers execute code → review before activation.

---

## 5. Adjacent methodology harnesses (r5)

| Project | Stars / npm | Install, update | Entry point | Generates per project | Harnesses |
|---|---|---|---|---|---|
| Superpowers | 291.2k | plugin marketplaces | no commands; skills auto-trigger + bootstrap hook | no | one tree, native manifests |
| spec-kit | 138.8k | `uv` CLI, manifest-aware upgrade | ~15 commands | constitution | generated at init |
| gstack | 134.1k | git clone, hourly auto-update | 23+ skills, `/autoplan` | CLAUDE.md routing block | generated per host and model |
| OpenSpec | 70.2k / 1.79M | npm CLI, `update` | 4-command core profile | runtime instructions | generator, 30+ tools |
| GSD | 64.5k, archived | npx | 72 commands, `/gsd-next` router | no | converted per runtime |
| BMAD | 53.4k / 73k | npx; `npx skills add` or plugin | `bmad` hub | builder module | native skills |
| Compound Eng. | 25.3k | plugin marketplaces | 36 skills, `/lfg` | learnings only | one tree |
| Agent OS | 5.4k | script | 3 commands | codebase standards | several |
| HumanLayer | 11.6k, OSS deprecated | paid IDE | QRSPI | n/a | several |
| Joycraft | 453 dl/mo | npx scaffold | ~22 skills | some | 5 copies |

1. **Superpowers deleted its slash commands** (deprecated 2026-03-09, removed 2026-04-30) as stubs that "did nothing but tell the user to invoke the corresponding skill." Dropped its Codex hook 2026-06-30 because "Codex reliably triggers skills on its own."
2. **OpenSpec 1.0.0 (2026-01-26): "From Static Prompts to Dynamic Instructions"** built by the CLI; stopped generating CLAUDE.md; skills ask the CLI which artifacts exist and what is ready. 1.2.0 added the 4-workflow core.
3. **BMAD "Core cut to eight skills"** (2026-08-09) with shims forwarding old names. "Ask bmad whenever you want guidance on what comes next."
4. **Agent OS v3 (2026-01-20)** removed spec writing, task breakdown, orchestration — "Now best handled using Plan mode."
5. **gstack** setup reads the model "and generates the matching behavioral profile"; writes a "Skill routing" section into CLAUDE.md.
6. **Compound Engineering `ce-retune`** (2026-07-31) refuses to run without an A/B harness. STRATEGY.md: "An installed skill that was tuned for last year's model quietly stops earning its place."
7. **Anthropic's official marketplace ships** skill-creator, **hookify** (writes hooks from conversation), claude-code-setup (recommends only), feature-dev (one 7-phase command), ralph-loop.
8. Claude Code starts in auto mode on Pro/Max/Team; plan mode via Shift+Tab or /plan.
9. Kiro generates steering docs; loads "powers" by keyword to limit MCP context.
10. HumanLayer's OSS is "pretty much all deprecated"; the method became a paid IDE. CRISPY cut each stage prompt to "fewer than 40 instructions."
11. GSD issue #2251: "52 skill commands," asks for 3–5.

**Contradicting:** gstack and GSD grew despite sprawl. Superpowers admits compaction "loses the bootstrap." CE warns "/plugin update alone keeps you on the old version" and removed a schema field "so Codex stops truncating skills at 8KB." OpenSpec dropped instruction files; BMAD writes "one verified block in AGENTS.md." spec-kit (a scaffolder) is second in stars.

**Inference:** leaders ship one skills tree with native plugin manifests; hooks need a per-host path. Precedent favors a hub skill plus a small visible core, with a bootstrap hook where the host doesn't auto-trigger. Skills generated on the fly have almost no precedent; the nearest patterns keep the generated surface small and regenerable. Forwarding shims make consolidation safe. Model tuning is treated as an eval problem, not static copies.

---

## 6. Model cadence and vendor prompting guides (r6)

1. **Cadence.** "Astra 6" = OpenAI GPT-6 Astra (preview 2026-09-03, paid 09-04). "Luna 6" = GPT-6 Luna, released 2026-09-22 with GPT-6 Sol. Anthropic 2026: Opus 4.6 (Feb 5), Sonnet 4.6, Opus 4.7 (Apr 16), Opus 4.8 (May 28), Fable 5 / Mythos 5 (Jun 9), Sonnet 5 (Jun 30), Opus 5 (Jul 24), Fable 5.1 (Sep 1), Opus 5.5 (Sep 22). 118 models from 18 providers in 2026 (llmgateway.io/timeline/2026).
2. **Anthropic publishes a guide per model** — six since May 28, ~one every three weeks — each with a Markdown copy at a predictable address listed in platform.claude.com/llms.txt. Sizes: Fable 5.1 6,610 words; Opus 5.5 3,969; Fable 5 2,738; Opus 5 1,731; general best practices 8,013; migration guides ~9,300 each. OpenAI: one stable address developers.openai.com/api/docs/guides/latest-model.md (currently gpt-6-astra). Google: one guide per family. Open-weight vendors: none found.
3. **Harnesses:** OpenCode picks a prompt file by model-id substring; gpt-astra.txt landed six days after Astra; **anthropic.txt unchanged since 2025-10-28 — one prompt for every Claude through Opus 5.5.** **Codex** keeps per-model instructions in models.json (~60KB per GPT-6 model), fetches a remote catalog with ETag + 300s cache, bundled fallback refreshed the day Sol/Luna shipped. **Codex's openai-docs skill fetches official docs first and uses the bundled copy "only as a disclosed fallback."** Cursor tunes per model "over weeks" with evals. Aider: static model-settings.yml, 357 entries, ~5 months behind. Pi, Cline, Roo: one prompt.
4. **Does per-model prompting matter? The vendor message is subtractive.** Fable 5: prior-model skills "too prescriptive… can degrade output quality." Fable 5.1: anti-formatting rules for earlier models "can suppress structure the content needs"; remove "hold all findings for the final response." Best practices: carried-over verification instructions "can cause over-verification" on Opus 5; "CRITICAL: You MUST" overtriggers on 4.5/4.6. Opus 5.5 migration: "Instructions tuned for Claude Opus 5's behavior may no longer be needed." OpenAI: "Guidance that helps Sol or Luna may overconstrain GPT-6 Astra"; GPT-6 is "more sensitive to instructions contained in skills." Cursor: OpenAI models are more literal, Claude tolerates imprecise instructions.
5. **Harness self-adaptation.** Claude Code v2.1.274: /code-review uses leaner prompts "for every model that has no tuned settings of its own." **First-hand: the research agent's Claude Code session (running Opus 5.5) had the Fable 5.1 guide's "You are operating autonomously…" block verbatim in its system prompt.** Codex delivers per-model instructions from its server.

**Contradicting:** vendor pages target API developers (tool_choice, thinking, effort). Cursor's weeks of eval-driven tuning says reading docs is not enough. OpenCode ran one Claude prompt 11 months without visible harm. No controlled measurement of prompts regressing across model versions was found.

**Inference:** fetching is cheap for Claude and OpenAI, weak for Google, impossible for open-weight. Codex's openai-docs skill is the precedent. The useful step is condensing a 2–9k-word vendor page into a ~1,000-word profile — which Joycraft's Fable profile (1,267 words, headings tracking the vendor page) did by hand. Claude Code and Codex already inject per-model guidance, so a Joycraft profile risks duplication; Joycraft's distinct value may be **auditing skills and AGENTS.md for instructions vendors now say to remove.** Static tables fall months behind; Anthropic ships a guide every ~3 weeks.

---

## 7. Jev (TypeSafe) — routing and gates (r7)

1. **What it is.** `state` (string / JSON / text array) + a map of typed questions. Choice picks one of ≤255 options with probabilities and confidence; Score ≤10 levels; Noul returns a yes-probability. No text generation, reasoning trace, or tool use. (docs.typesafe.ai/api.md, introduction/coding-agents.md)
2. **Size.** 64k tokens/request; state + longest question ≤32k. Questions run in parallel; no documented question-count cap. Files/diffs go in as text.
3. **Operations.** Hosted API only, Bearer key. $0.042 per million input tokens, output free. 1,200 rpm, "can change without notice." ~100 ms claimed; cookbooks logged 0.09–0.31 s. JS SDK shipped 2026-09-11 and broke compatibility 2026-09-15.
4. **Data and terms.** Inputs not used for training; kept "as long as necessary"; perpetual telemetry license; zero retention enterprise-only; US-only hosting; "as is," no SLA. **Agreement covers apps "developed and operated by Customer" and forbids sharing credentials → a shared Joycraft key appears not to fit; per-user keys only (UNVERIFIED as a legal reading).**
5. **Uptime.** 99.826% over 90 days, downtime on 25 days, incidents Sep 21 and 23. (status.typesafe.ai)
6. **Skill-routing cookbook.** Two calls per turn over a 182-skill roster, Haiku 4.5 as agent, 488 requests: wrong loads 16.8%→7.3%, needless loads 9.8%→4.0%; fixed 37, broke 7. **Caveats:** roster descriptions cut to 60 chars; requests "easier than the ones users send."
7. **Other accuracy evidence is small.** 75-class SEC filings: answers at confidence ≥0.9 were 90% right, the rest 40%. Reranking lifted top-1 5%→18%. No calibration metrics published.
8. **Weak spots.** Jev reads literally; adversarial content "can move the answer." (model-jaggedness/jev-1.13.md)
9. **Claude Code hook semantics that matter:** a timed-out UserPromptSubmit hook's context is dropped; a timed-out PreToolUse hook does not block (fails open); imperative injected context "can trigger Claude's prompt-injection defenses"; prompt-type hooks use Haiku by default and on UserPromptSubmit can only block.

**Feasibility**

| Point | State sent | Latency | If Jev is unreachable | Codex / Pi / omp |
|---|---|---|---|---|
| (a) Prompt routing | prompt + ~22 skill descriptions + active feature/queue (3–5k tokens) | 2 calls, ~0.2–0.6 s, inside 30 s timeout | context dropped, native matching remains | Codex UserPromptSubmit; Pi `before_agent_start`; omp same |
| (b) Edit scope gate | spec scope + path + old/new strings | +0.1–0.3 s per edit | **fails open** in Claude Code and Codex; Pi `tool_call` errors block | Codex covers edits/MCP; Pi/omp `tool_call` can block or rewrite |
| (c) Stop check | request/spec + last assistant message | not critical | no decision → stop proceeds | Codex Stop can continue; Pi `agent_before_settle` |
| (d) Doc ranking | query + candidate summaries | off hot path | fall back to static context map | any harness, script |
| (e) Report claim check | claim + quoted diff/test output ≤32k | off hot path | skip or send to human | any harness |

**Contradicting:** Scott Spence (Feb 2026, Sonnet 4.5, 22 prompts): skills loaded 50–55% with no hook; **a prompt-only "forced-eval" hook reached 22/22 with no false positives**; a Haiku classifier hook also 22/22 but fired wrongly on 4 of 5 non-matching prompts. (scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals) Gates can be steered: the agent writes the diff and message the gate reads.

**Inference:** cost is not the constraint (~$0.02/session for 30 prompts + 60 edits + 30 stops vs ~$0.60 uncached Haiku); the real costs are signup, keys, hosting, outages. Routing is the only use with direct evidence — ship opt-in, fail-open, **after measuring the model-free forced-eval baseline.** Hard gates should stay deterministic (path allowlists, test exit codes) because hooks fail open and the gated agent authors the input; Jev adds advisory signal. Lowest-risk fits: (d) and (e), off the hot path.

---

## 8. Joycraft as wired today (repo explorer)

1. **Skill graph.** `{{skill_prefix}}<name>` appears 141 times. **Most links are handoffs through the human** — 10 skills end with "Run /clear first" plus a briefing to paste. In-session calls: decide ← decompose/design/bugfix; harden ← add-fact/tune; gather-context ← tune; session-end ← implement-feature; implement-feature reads implement and spec-done inline. **No inbound references:** setup, add-context, collaborative-setup, implement-level5, lockdown, verify. Hubs: session-end 9, new-feature 7, decompose 6, decide 5, harden 5, implement 5. `entry:` (Claude only): 9 human, 11 agent, 2 situational. **Five "Invoked by X" claims are not wired:** verify (session-end says verify-in-loop hasn't shipped), add-fact, add-context, research, implement-level5.
2. **Model profile wiring.** One constant home src/model-profile.ts:14-24 (template key, installed path, harness gate claude/pi/omp, Context Map row). Seven skills cite blocks by heading; tests/model-profile-citations.test.ts checks headings exist. Opus 5.5 plan (D1–D8): rename to model-profile-claude.md; `Applies to:` per block; four Opus blocks; updater swaps only the exact old row; queue loops cite the unattended block; Pi loop and autofix read the fenced instruction at run time; optimize flags think-harder rules. The reading agent chooses which blocks apply.
3. **Per-harness generation.** applyTemplate substitutes four variables, keeps/strips `<!-- harness:X -->` blocks, drops `instructions:` except Claude; same update-check paragraph atop every skill. Outputs differ less than block counts suggest: 22 of 38 Claude-only blocks just add `entry:`; Codex/Copilot differ by substitutions plus two lines; Pi/omp differ where Pi scripts exist. **Real forks:** research (three full-body variants), implement-feature (four), verify (three), lockdown, decompose Step 7. Claude-only: AskUserQuestion, db checkpoints, subagents, hooks, settings patches. Pi-only: five scripts, pipeline extension, two agents. **Bug:** tune writes `docs{{skill_prefix}}assessment.md` → `docs$joycraft-assessment.md` on Codex, `docs/skill:joycraft-assessment.md` on Pi/omp. Some blocks omit Copilot entirely.
4. **Context map / folder map.** **The updater treats CLAUDE.md and AGENTS.md as create-once** (update-inventory.ts:225-262); after creation only the narrow profile-row patch applies. ensureFolderMapSection is now called only by tests → **the folder map is never regenerated after first creation**, while tune.md:63 still says upgrade regenerates it. This repo drifts: docs/intent/ is missing from AGENTS.md. tune compares folder paths only and only reports; diffFolderMap exists but only tests call it.
5. **Already dynamic (~14 pieces):** stack detection → build commands, folder map, Project Tools; deny-patterns.txt grown by harden and lockdown with provenance; context layer rows/docs (gather-context, add-context, add-fact); collaborative-setup areas + CONTRIBUTING; intent inbox + Status stamps; CHECKPOINT/REVIEW_GATE/DECISION_DOSSIER HTML filled per gate (db-published on Claude); decompose writes specs, queue JSON, wave-plan README; tune/optimize assessment, history, overhead report; Reaper; `joycraft telemetry`; seeded evals (bugfix seeds from reproduction); hook recipes (never auto-registered); implement-level5 fills workflows; Pi loop. **No skill writes a new skill today.**
6. **Discoverability.** Routing depends only on name + description. **No skill sets disable-model-invocation → all 22 compete, spec-done and harden included.** Claude Code ignores `entry:`; non-Claude variants lack it, so optimize Step 5 would flag every skill there. Descriptions ≈3.3k chars (under optimize's 6k budget), process jargon; only setup uses the user's words. 9-door limit met exactly. **10 of 22 skills exceed optimize's own 200-line limit.** No invocation evals; check.sh supports only output_contains/not_contains/matches/file_exists — none checks which skill ran. The 2026-04-07 level5-skill-evals brief is still DRAFT.
7. **Prior panel verdicts.** Context-map panel (2026-09-01): the pointer layer survives, smaller, with stricter entry rules and read tracking (2 keep, 2 reshape, 1 shrink, 1 kill→shrink); all six kept the decision log; the Context Map is "hopeful disclosure, not progressive disclosure" because it has no trigger contract; a doc with no voluntary reads after 30 sessions/60 days is a RETIRE candidate. Curated-harness brief (2026-08-30): "Curated, directional, in-repo context = good. Automatic, accreted, point-in-time state = decay." Delete, tier, verify — not compress. Skills endorsed for process only; no skill should encode codebase facts. Non-goals: no embeddings; don't remove the knowledge layer, tier and reap it.
8. **Update machinery.** Ownership kinds (install-manifest.ts:30): vendor (all skills in all five trees, docs/templates, hooks, check.mjs, Pi files); create-once (CLAUDE.md, AGENTS.md, deny-patterns.txt, example eval, intent README); config-patch (settings.json keys). **Files outside both lists are never touched** — an agent-written .claude/skills/<own-name>/SKILL.md is preserved. An edited vendor skill is replaced every release with a backup under docs/.joycraft/local/replaced/<ver>/. A name collision with a later bundle is replaced with backup. **Dropped skills are removed cleanly** (unmodified deleted, edited kept as orphans) → collapsing 22→1 needs no new machinery. **Gap:** no ownership kind for agent-generated files; legacy detection treats any skills/joycraft-* path as Joycraft's, so generated artifacts must avoid the `joycraft-` prefix.

---

## 9. Lead's synthesis (to be attacked, not adopted)

Seven threads converge:

- **The invariant is the gate loop, not the prose.** Helix, SkillOpt, ACE, Voyager, and Anthropic's own guidance all say generated or adapted artifacts help only behind an acceptance gate. The pathologies without one are documented (check-gaming, playbook collapse, peak-then-decline).
- **Frontier models need less process, not less verification.** Cut step-by-step prose; keep fresh-context verifiers, grounded progress claims, persisted state.
- **Anthropic answered "what persists":** encoded team-workflow skills persist; capability-uplift skills die as models improve.
- **Discoverability has a measured fix:** a compact always-loaded router (Vercel's 8KB index → 100%; gstack's routing block; BMAD's hub; a model-free forced-eval hook 22/22). Count-sensitivity is measured (1% budget, #64606).
- **The human is currently the glue, not the bookends.** Ten skills hand off through /clear. OpenSpec's "skills ask the CLI what exists and what's ready" is the precedent for code-computed state.
- **Model profiles: fetch, subtract, eval.** Predictable vendor URLs; Codex precedent; vendors' per-model message is to remove stale instructions; Claude Code already injects the Fable block; CE refuses to retune without an A/B harness.
- **Distribution: two skill dirs + Claude plugin + CLI; no MCP main channel.** Anthropic absent from Agent Plugins 1.0; hooks per-vendor; skills-over-MCP ~zero adoption; Pi rejects MCP.

### Candidate shape

1. One hub skill plus a small visible core; compact always-loaded router block in AGENTS.md; forwarding shims for old names.
2. The CLI as state oracle — skills ask it what exists and what's next; queue, status, gate results computed by code; ends human-as-glue handoffs.
3. Gates, not advice — process prose converts to deterministic checks and blocking hooks; Jev as optional advisory judge where a check needs meaning, off the hot path first (claim verification, doc ranking).
4. Generation as a gated proposal loop — hub proposes project-specific skills/hooks/scripts into a separate namespace with provenance, inactive until an eval or a human accepts.
5. Model profiles → fetch, subtract, eval — vendor guide at predictable URL with dated bundled fallback; audit skills/AGENTS.md for instructions vendors say to remove; retune only with a measured delta.
6. Distribution → one skills tree to `.agents/skills` + `.claude/skills`; Claude plugin for the Claude runtime (namespacing, eval Δ, hints); CLI for cross-harness files and per-host hooks; no MCP server as main channel.
7. Cut step-by-step process prose; keep independent verification, grounded progress claims, persisted state.
8. **Front-load quality at the design bookend** — panels, dialoguing artifacts, and pre-spec diagrams/prototypes as standard (risk-tiered) gates, so spec+implementation tokens land on what the human actually wants. Consistent with the headless vision (interview/design/PR review stay human-paced) and with Helix ("moves feedback to the earliest useful point").

### Propositions for the adversarial panel

Each gets independent skeptics with distinct lenses — solo dev on Pi with an open-weight model; team lead adopting across five engineers; security reviewer; maintainer counting hours; evidence auditor re-checking citations — and a judge ruling keep / flip / qualify with evidence.

- **P0.** A reimagining is warranted at all, versus incremental fixes (two skill dirs, disable-model-invocation on internals, folder-map repair, forwarding shims, description rewrites in users' words).
- **P1.** Hub + few doors beats 22 commands, given compaction loses bootstraps and no study compares entry-point counts.
- **P2.** CLI as state oracle beats prose handoffs, given CLI/skill drift, offline use, and Pi's "CLI tools with README" philosophy.
- **P3.** Gates over advice, given hooks are per-vendor, fail open on timeout, false positives block flow, and Stop-hook blocking is unresolved.
- **P4.** Gated generation earns anything over curated skills, given SkillsBench's null result, ToxicSkills, the misevolution paper, and the question of who writes held-out tasks for a solo dev.
- **P5.** Fetch-and-subtract profiles beat per-model docs, given URL stability, harness-injected duplication, API-developer-oriented pages, and nothing for open-weight vendors.
- **P6.** Jev as advisory judge (and possibly router), given per-user-key-only licensing, no SLA, fail-open hooks, adversarial steerability, and a model-free forced-eval hook hitting 22/22.
- **P7.** Hybrid distribution (two dirs + plugin + CLI), given the 2026-03 deferral reason was avoiding two formats, third-party plugin auto-update is off, and plugins can't carry AGENTS.md.
- **P8.** Which skills die when process prose is cut, given the inverted-U (mid-tier and open-weight users still benefit) and Joycraft's stated multi-harness audience.
- **P9.** Front-loaded quality gates (panels, dialoguing artifacts, pre-spec diagrams/prototypes) as standard steps, given the reading-fatigue verdict ("ask the human for decisions instead of reading"; Deposition Checkpoint kill criterion: bypass to chat), the cost of a panel per feature, artifact fatigue, prototype/spec drift, and the need to tier by risk so small features don't pay the full ceremony.
  **Maintainer clarification (2026-09-24):** the artifacts are not the problem — answering questions directly inside them is "amazing" once the idea is clear. The failure is *timing*: in full brainstorm mode, with no clear idea yet, an artifact that demands answers to questions the human is unsure of becomes a hindrance. So exploration and deciding want different surfaces, and the switch should key on **clarity, not on which skill is running.** Today the interview skill forces a checkpoint page for any gate with ≥2 questions regardless of clarity. Two design consequences for the panel to test: (1) a readiness gate — stay in chat (and run panels) until the human or the agent signals the idea has crystallized, then render the checkpoint; (2) "I don't know yet / explore this" as a first-class answer in every artifact question that routes back to chat or to a panel instead of forcing a choice. Separately: artifacts need **more visuals** — sequence and data-flow diagrams when tracing complex API/database work, component mockups and prototypes for frontend work — so the human can shape the brief and specs by looking, not only by reading.
- **P10.** An architecture-defense session — agent proposes, defends with code examples, explains each decision; human corrects; corrections land as the enforceable architecture record — as a setup step and a recurring maturity gate. Connections already in this pack: Helix, "We invested in an architecture that is easy for agents to implement, and we documented it thoroughly. This documentation makes adversarial review enforceable" (§0); the reading-fatigue portfolio's #2 "Theory Ledger" (≤600-word human-owned theory doc + session deltas confirmed at the PR bookend, independent verifier re-derives periodically — called "the strongest single idea", never shipped); the curated-harness verdict "curated, directional, in-repo context = good; automatic, accreted = decay" (§8.7); the decision log as the closest existing home (§8.7, all six panelists kept it). Skeptics: the human is the only verifier of the corrections, so what re-checks them as code drifts; does the record get read (the context map is "hopeful disclosure"); cost on a mature codebase; does it duplicate `design` + `decide` + `dangerous-assumptions`; how it survives teams where the corrector and the implementer differ.
- **P11.** A user technical-background profile, captured at setup, forks the abstraction level across the harness — vocabulary in the hub and router, which gates run (P9 visuals vs P10 code-level defense), how much ceremony, what the artifacts show. Skeptics: self-assessed skill is unreliable and drifts (infer from behavior instead? both?); does the fork change content or only vocabulary; is the novice path even Joycraft's market (Dan Shapiro's Levels 1–2 vs 3–4); a per-user fork on a team project conflicts with committed, shared artifacts (P4's team-consistency concern); the execution profile in AGENTS.md is the nearest existing knob and is per-harness, not per-user.

---

## 10. Human frame — checkpoint answers (2026-09-24, artifact rev 1, 8 of 8 submitted)

The maintainer answered these on the interview checkpoint. Panels argue INSIDE this frame: they may attack any proposition, and they should attack the maintainer's own positions below as hard as the lead's synthesis. Quotes are the maintainer's words.

| Q | Choice | Maintainer's rationale (verbatim) |
|---|---|---|
| Q1 invariant | **Gates + lifecycle + artifacts fixed; process prose generated** | "biggest wins in addition is the STE (Simplified Technical English) language directive, the formality of the loop, getting people used to TDD agentic development as opposed to endless vibe coding (the essence and core objective of joycraft)" |
| Q2 customer | **Solo practitioners of mixed skill; maintainer first as super-user, colleagues second, one path** (confirmed) | "Me truly first as I am the super user of this product, but I now have about 15 colleagues all of use it daily driver, across different size teams, but if I can get it to work best for me, we can easily get it for others especially then I'll make content etc.. around into teach people, but the hope also being that as this system gets much easier house and more driven by the harness this becomes a non issue really" |
| Q3 Opus 5.5 | **Park** | "we may decide this is not ready for prime time and just come back and finish the current work, but park for now as it may become moot or we have a complete revision of how to do this, I'm thinking that basically we can help this in the new system where all I have to do is push the new prompting guide to an update and everyone gets the new juice" |
| Q4 Helix | **Gates that cannot be overridden** | "kinda all of them but it think we are already doing alot of what helix is doing, but I think what they do better is that once they actually get tot he implementation loop it's basically sit back and relax and have full confidence of when that loop is done they have shippable product, I'd say we are close but in recent sessions I've been getting some slop that took hours and that was not shippable, we have to close that gap" |
| Q5 Jev | **Jev routing on the hot path for anyone who brings a key** (the lead recommended advisory-first; the maintainer overrode) | "I really want this to work ive been using it in projects and it's insanely good and basically free, it's too good that it should be a core part of the product as it will help route what files to look at, what pointers in the context map to look at, help claude code with tool calls, I think ti will speed up development and increase quality of tool/research/webscraping/panel discussions etc... it should be core part of the product now but I'm open to the skeptics saying no of course" |
| Q6 panel | **Multi-model: two independent panels** | "I will run the panel with Codex but I want them to be fable agents no Opus 5.5, Fable on High, Codex Astra on Ultra -- if they need sub agents for more evidence web scraping etc... use Sonnet 5 at medium and Luna 6 medium for codex -- just give file path to point codex to, they will write a seperate findings doc and I'll bring here once both are done to compare" |
| Q7 lenses | **The five, plus a novice vibe-coder lens** — amended | "lets get rid of security reviewer, I want some agent harness experts, ai researchers" |
| Q8 output | **Intent + evidence pack committed on a new feature branch; no brief; findings as in-depth HTML artifact + Markdown** (confirmed) | "no brief though, as you and I will have follow up discussion after I read the panel findings, so it really should be an in-depth html artifact with their findings, same for codex, you can make a markdown copy so easy to digest for you" |

**Reversals confirmed in chat (2026-09-24):** Q2 reads as *maintainer first as the super-user, colleagues second, one path*. Q8 reads as *intent + evidence pack committed, no brief, findings as an in-depth HTML artifact plus a Markdown copy*.

**Facts the frame adds:** about fifteen colleagues use Joycraft daily across teams of different sizes. The maintainer already uses Jev in projects and calls it "insanely good and basically free." Recent Joycraft sessions produced hours of unshippable output; the gap to close is *confidence that the implement loop's output is shippable when it ends*. Wanted for model guidance: "push the new prompting guide to an update and everyone gets the new juice."

**Panel configuration.** Claude side: skeptics and judges on Fable 5.1 at high effort; evidence sub-gathering, if any, on Sonnet 5 at medium. Codex side: GPT-6 Astra at ultra; evidence sub-gathering on GPT-6 Luna at medium; brief at `docs/research/2026-09-24-dynamic-joycraft-panel-codex-brief.md`; findings to `docs/research/2026-09-24-dynamic-joycraft-panel-codex.md` and `.html`. **Lenses (7):** solo developer on Pi with an open-weight model · team lead adopting across five engineers · maintainer counting hours · evidence auditor re-checking citations · novice vibe coder (Levels 1–2) · agent-harness expert (has built or maintained a coding-agent harness) · AI researcher (evaluation methodology, agent literature). The security-reviewer lens is removed; security facts stay in the pack for any lens to use. **Output:** in-depth HTML findings artifact for the human plus a Markdown copy for the agent. No brief, no specs, no stamps until the human has read both panels.

**Where the parked feature lives.** The Opus 5.5 brief, specs, and decompose record are on branch `feature/opus-5-5-prompting` only. From the new branch, read them with `git show feature/opus-5-5-prompting:docs/features/2026-09-23-opus-5-5-prompting/brief.md`.
