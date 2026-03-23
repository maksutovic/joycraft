# Dark Factory Research Synthesis

## Deep Research: From Level 2 to Level 5 Software Development

Research conducted March 22, 2026. Sources from 5 parallel research agents covering:
StrongDM's Software Factory, Dan Shapiro's 5 Levels, METR Study, Claude Code Harnesses, and Spec-Driven Development.

---

## 1. The Five Levels of Vibe Coding (Dan Shapiro, Jan 2026)

| Level | Name | Human Role | AI Role | Key Skill |
|-------|------|-----------|---------|-----------|
| 0 | Spicy Autocomplete | Writes all code | Tab completion | Typing |
| 1 | Coding Intern | Delegates atomic tasks | Writes functions/tests | Task scoping |
| 2 | Junior Developer | Guides direction | Multi-file changes | AI-native tooling |
| 3 | Developer as Manager | Reviews diffs | Primary developer | Code review at scale |
| 4 | Developer as PM | Writes specs, checks tests | End-to-end development | Specification writing |
| 5 | Dark Factory | Defines what + why | Black box: specs in, software out | Systems design for autonomous validation |

**Key transitions:**
- **2->3**: Stop writing code, start reviewing. "Your life is diffs." Psychologically hardest — feels like things got worse.
- **3->4**: Stop reviewing diffs, start writing specs. "Specification writing becomes the most valuable technical skill."
- **4->5**: Build the factory itself — validation infrastructure, autonomous bug-fixing, digital twins.

**90% of "AI-native" developers are at Level 2.** They mistake flow-state productivity for the ceiling.

Source: https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/

---

## 2. StrongDM's Software Factory (The Definitive Level 5 Example)

### Team & Timeline
- 3 engineers: Justin McCarthy (CTO), Jay Taylor, Navan Chauhan
- Founded July 14, 2025. Inflection point: Claude 3.5 Sonnet (Oct 2024)
- Two rules: "Code must not be written by humans" / "Code must not be reviewed by humans"

### Architecture

**Attractor** (open-source coding agent): https://github.com/strongdm/attractor
- Repo contains ZERO code — only 3 markdown specification files (~6-7K lines of NLSpec)
- Uses Graphviz DOT syntax to define multi-stage AI workflows as directed graphs
- 17+ community implementations across Rust, Python, Go, Java, TypeScript, etc.

**NLSpec (Natural Language Specification):**
- Structured natural English with formal constraints
- Between a requirements doc and a type system
- Precise enough for agent consumption, readable enough for human authoring
- Uses RFC 2119 keywords (MUST, SHOULD, MAY)

**CXDB** (AI Context Store): https://github.com/strongdm/cxdb
- 16K lines Rust + 9.5K Go + 6.7K TypeScript — all produced by the factory
- Stores conversation histories in immutable DAGs
- Turn DAG + Blob CAS (Content-Addressed Storage) with BLAKE3 hashing

### Six Core Techniques

1. **Digital Twin Universe (DTU)** — Behavioral clones of Okta, Jira, Slack, Google Docs/Drive/Sheets. Self-contained Go binaries. Test at volumes exceeding production rate limits.
2. **Gene Transfusion** — Moving working patterns between codebases by pointing agents at concrete exemplars
3. **The Filesystem** — Using directory structures and on-disk state as agent memory substrate
4. **Shift Work** — Separating interactive work from fully-specified work; when intent is complete, agents run end-to-end
5. **Semport** — Semantically-aware automated code ports between languages/frameworks
6. **Pyramid Summaries** — Reversible multi-level summarization: "Summarize in 2 words. Now 4. Now 8. Now 16."

### Scenarios vs Tests (The Holdout Set)
- **Scenarios live OUTSIDE the codebase** — agent can't see them during development
- ML analogy: holdout set to prevent overfitting
- Measured by "satisfaction" not binary pass/fail
- LLM-as-judge evaluation: "What fraction of trajectories likely satisfy the user?"
- Palisade Research proved reasoning models (o1, DeepSeek R1) actively game visible test suites

### The $1,000/Engineer/Day Benchmark
- ~$20K/month per engineer in AI compute
- Justified by productivity multiplication when 3 engineers produce what 30 couldn't

Source: https://factory.strongdm.ai/
Simon Willison's assessment: https://simonwillison.net/2026/Feb/7/software-factory/
Stanford Law critique: https://law.stanford.edu/2026/02/08/built-by-agents-tested-by-agents-trusted-by-whom/

---

## 3. The Productivity Paradox (METR Study & J-Curve)

### METR 2025 Randomized Control Trial
- Experienced open-source developers using AI tools completed tasks **19% slower**
- Developers **believed** they were 24% faster — wrong about both direction and magnitude
- Controlled for: task difficulty, developer experience, tool familiarity
- Root causes: workflow disruption, evaluating suggestions, correcting almost-right code, context switching, debugging subtle AI-introduced errors

### The J-Curve
- Productivity dips before it rises when adopting AI tools
- Most organizations are stuck at the bottom
- "Copilot makes writing code cheaper but owning it more expensive"
- Organizations seeing 25-30%+ gains redesigned their **entire workflow**, not just added tools

### The Gap
- Teams running dark factories: accelerating rapidly
- Rest of industry: measurably slower while believing they're faster
- This is a people/culture/organization gap, not a technology gap

---

## 4. Spec-Driven Development: The Core Skill

### What Makes a Good Spec

**Addy Osmani's 6 Essential Areas:**
1. Commands — full executable commands with flags
2. Testing — framework, locations, coverage expectations
3. Project structure — explicit directory organization
4. Code style — real code snippets (one snippet beats paragraphs)
5. Git workflow — branch naming, commit formats, PR requirements
6. Boundaries — "Always do" / "Ask first" / "Never do"

**GitHub Spec Kit 4-Phase Process:**
1. Specify: Product brief with user journeys, problems, success criteria (what + why)
2. Plan: Technical implementation with stack, architecture, constraints (how)
3. Tasks: Break into small, testable, independently validatable work items
4. Implement: AI agents tackle tasks sequentially

**The Specification Spectrum:**
- Spec-First: Specification guides initial development; may drift afterward
- Spec-Anchored: Specs maintained alongside code with automated test enforcement
- Spec-as-Source: Humans edit only specs; code is generated and never manually modified (Level 4)

### Common Failure Modes
1. **Over-specification** — Specs become pseudo-code, constraining implementation
2. **Specification rot** — Specs drift from code when not maintained
3. **Bureaucratic overhead** — Specs become forms to fill
4. **False confidence** — Passing a wrong spec doesn't guarantee correct software
5. **Vague prompts** — "Most agent files fail because they're too vague" (GitHub analysis of 2,500+ repos)

### The "Curse of Instructions"
As requirements pile up, model adherence drops significantly. Solution: modular prompts over monolithic context — feed only relevant spec sections per task.

---

## 5. Claude Code Harness Patterns for Level 4-5

### Boris Cherny's Recommended Workflow
1. Have Claude **interview you** before implementation
2. Write complete spec to SPEC.md
3. Start a **fresh session** to execute the spec with clean context

### Anthropic's Dual-Agent Harness
1. **Initializer Agent** — sets up infrastructure, creates feature list in JSON, generates init.sh
2. **Coding Agent** — runs in subsequent sessions, incremental progress
3. **claude-progress.txt** — session-to-session memory bridge

### Key Automation Primitives
- **Hooks** (guaranteed execution, unlike advisory CLAUDE.md):
  - PreToolUse, PostToolUse — lint/validate after every edit
  - SessionStart — inject context
  - TaskCompleted — prevent premature completion (exit code 2)
  - TeammateIdle — keep agents working
- **Custom Skills** (.claude/skills/SKILL.md) — repeatable workflows via /skill-name
- **Custom Subagents** (.claude/agents/) — isolated context windows, own tool permissions
- **Agent Teams** — 3-5 teammates, each owns different files, shared task list, mailbox messaging
- **Fan-out pattern** — loop through files calling `claude -p` for each
- **Non-interactive mode** — `claude -p "prompt"` for CI/CD integration

### CLAUDE.md Best Practices
- Keep under 200 lines — bloated files cause rule ignorance
- Include only what Claude can't infer
- Use emphasis ("IMPORTANT", "YOU MUST") for critical rules
- Test it like code — if Claude keeps violating a rule, the file is too long
- Use `@path/to/import` to reference other files
- Hierarchy: ~/.claude/CLAUDE.md (global) → ./CLAUDE.md (project) → child dirs

### Other Level 4-5 Teams
- **Spotify Honk** — Senior engineers haven't written code since Dec 2025. 1,000 merged PRs every 10 days. Assign tasks via Slack from phone.
- **Anthropic** — "Effectively 100%" AI-generated code. Boris Cherny: 22 PRs in one day, 27 the day before.
- **4% of GitHub commits** from Claude Code, projected to 20% by end of 2026.

---

## 6. The Organizational Shift

### From Coordination to Articulation
- Engineering manager value: "coordinate the team" → "define the specification clearly enough that agents build the feature"
- Program manager value: "track dependencies" → "architect the pipeline of specs that flow through the factory"

### The Centaur Pod (New Team Structure)
- 1 Senior Architect (strategic direction)
- 2 AI Reliability Engineers (human verification)
- Autonomous agent fleet (execution)

### New Metrics
- Mean Time to Verification (speed of safe PR reviews)
- Change Failure Rate (AI-specific regressions)
- Interaction Churn (prompt iterations needed)

### Junior Developer Pipeline
- Junior roles declining 9-10% per six quarters (Harvard 2025)
- UK graduate tech roles fell 46% in 2024, projected 53% more by 2026
- US junior developer postings declined 67%
- Proposed solution: Medical residency model — learning IS the job, not a side perk

---

## 7. Practical Frameworks for Level Advancement

### Shapiro's Practical Advice
1. Accept the J-Curve as inevitable — measure with hard data, not perception
2. Ask "Why am I doing this?" relentlessly — if a human is doing it, automate it
3. Use the **Trycycle pattern**: define problems → write plans → iterate plans → implement → iterate implementations
4. Distinguish tool adoption from workflow transformation (14% vs 25%+ gains)
5. Level 4+ requires organizational change, not just individual skill
6. Build validation infrastructure, not code
7. **Slot machine development**: Run multiple AI models simultaneously, pick best output

### The Migration Path for Brownfield
1. Use AI at Level 2-3 to accelerate existing work (expect J-curve dip)
2. Use AI to document what your system really does — generate specs from code
3. Redesign CI/CD to handle AI-generated code at volume
4. Shift new development to Level 4-5 while maintaining legacy in parallel

---

## Key Sources
- [Dan Shapiro: Five Levels](https://www.danshapiro.com/blog/2026/01/the-five-levels-from-spicy-autocomplete-to-the-software-factory/)
- [Dan Shapiro: You Don't Write the Code](https://www.danshapiro.com/blog/2026/02/you-dont-write-the-code/)
- [Dan Shapiro: Rise of the Trycycle](https://www.danshapiro.com/blog/2026/03/dark-factories-rise-of-the-trycycle/)
- [StrongDM Software Factory](https://factory.strongdm.ai/)
- [StrongDM Attractor](https://github.com/strongdm/attractor)
- [StrongDM CXDB](https://github.com/strongdm/cxdb)
- [Simon Willison on StrongDM](https://simonwillison.net/2026/Feb/7/software-factory/)
- [Stanford Law CodeX Critique](https://law.stanford.edu/2026/02/08/built-by-agents-tested-by-agents-trusted-by-whom/)
- [Addy Osmani: Good Specs for AI](https://addyosmani.com/blog/good-spec/)
- [GitHub Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [Anthropic: Effective Harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Boris Cherny on Lenny's Newsletter](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens)
- [Palisade Research: Specification Gaming](https://palisaderesearch.org/blog/specification-gaming)
- [Brookings: Medical Residency Model](https://www.brookings.edu/articles/to-save-entry-level-jobs-from-ai-look-to-the-medical-residency-model/)
- [GitHub: AGENTS.md Best Practices](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
