# Contextual Stewardship, Evals, and the Memory Wall — Research for Joycraft

**Date:** 2026-03-24
**Source:** Nate B Jones video (March 2026), Scale AI RLI, Alibaba SWE-CI, Harvard seniority paper, Praful's feedback
**Status:** Research complete, roadmap defined

---

## Core Thesis

> "The best tools we have for managing agent danger are human brains crafting evaluations. Not better prompts, not bigger context windows, but human judgment about what matters, what's fragile, and what the AI doesn't know it doesn't know." — Nate B Jones

Joycraft's job isn't just to scaffold CLAUDE.md and skills. It's to **interview humans about their domain knowledge and encode it into machine-enforceable artifacts** (hooks, permissions, context docs).

---

## The Studies

### Remote Labor Index (Scale AI + Center for AI Safety)
- **Paper:** https://arxiv.org/abs/2510.26787
- **Key stat:** Best agent completed 2.5% of 240 Upwork projects at client-acceptable quality. 97.5% failure rate.
- **Implication:** Providing context transforms agent capability. GDP-val (context provided) shows expert-level performance; RLI (figure it out) shows 2.5%. The gap IS the context.

### SWE-CI (Alibaba)
- **Paper:** https://arxiv.org/html/2603.03823v1
- **Key stat:** 75% of frontier models break working features during maintenance. 100 codebases, 233 days average, 71 consecutive updates.
- **Implication:** Writing code and maintaining code are fundamentally different. Only Claude Opus 4.5/4.6 exceeded 0.5 zero-regression rate.

### Harvard Seniority Paper (Lichtinger, Hosseini Maasoum)
- **Paper:** https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5425555
- **Key stat:** 62M workers, 285K firms. Junior employment declined 9-10% within 6 quarters of AI adoption. Senior employment unchanged.
- **Implication:** The market pays for contextual stewardship, not task execution. Seniors hold context; juniors execute tasks. AI replaces the latter.

### Gartner Prediction (Feb 2026)
- **Source:** https://www.gartner.com/en/newsroom/press-releases/2026-02-03-gartner-predicts-half-of-companies-that-cut-customer-service-staff-due-to-ai-will-rehire-by-2027
- **Key stat:** 50% of companies that cut staff due to AI will rehire by 2027. Only 20% actually reduced staffing.

### Forrester Data
- **Key stat:** 55% of employers regret AI-driven layoffs. Agents achieve only 58% success rate on single-step tasks.

---

## Key Findings

### 1. Boundaries Are Evals (But Advisory-Only Isn't Enough)

CLAUDE.md boundaries are pre-action constraints — a form of eval. But they're advisory: Claude reads them but can choose to ignore them. The enforcement ladder:

| Mechanism | Strength | Override |
|-----------|----------|---------|
| CLAUDE.md boundaries | Advisory | LLM can ignore |
| `.claude/settings.json` permissions | Permission system | User approves "ask" items |
| PreToolUse hooks (exit 2) | Hard block | Requires editing hook script |

High-risk rules should be hooks, not just CLAUDE.md lines.

### 2. The Risk Interview Is the Highest-Value Feature

The Alexi story (1.9M rows deleted) happened because the agent didn't know it was in production. A 3-5 question interview during `/tune` that captures "what's dangerous here?" and generates enforceable artifacts would have prevented it.

Proposed questions:
1. "What could this agent break that would ruin your day?"
2. "What external services are production vs. staging?"
3. "What are the unwritten rules a new developer would need months to learn?"
4. "What happened last time something went wrong?"
5. "How should permissions change for risky areas?"

### 3. Permission Generation Addresses Praful's WiFi Problem

Claude Code has deny/ask/allow rules in `.claude/settings.json`. Joycraft should generate stack-specific deny rules during init/tune:
- All projects: deny `rm -rf *`, `git push --force *`, editing `.env*`
- Web apps: scope network access
- Infra projects: deny `terraform apply`, `kubectl delete`
- Database projects: deny `DROP TABLE`, `TRUNCATE`

### 4. Four Context Documents Close the Memory Wall

| Document | Purpose |
|----------|---------|
| `docs/context/production-map.md` | What's real, what's staging, what's sensitive |
| `docs/context/dangerous-assumptions.md` | Things the agent might assume wrong |
| `docs/context/decision-log.md` | Why choices were made, what was rejected |
| `docs/context/institutional-knowledge.md` | Unwritten rules, org context |

### 5. Skill Namespacing: `joycraft-*` Now, Plugin Later

Short term: rename `/tune` to `/joycraft-tune`, etc. Works today.
Medium term: migrate to Claude Code plugin format for automatic `/joycraft:tune` namespacing.

### 6. Risk Tiers Map to Three Enforcement Mechanisms

- **Tier 1 (Advisory):** CLAUDE.md — code style, patterns
- **Tier 2 (Prompted):** settings.json `ask` — deps, config, push
- **Tier 3 (Blocked):** settings.json `deny` — network, secrets, force-push
- **Tier 4 (Hard-blocked):** PreToolUse hooks — production access, destructive ops

---

## Prioritized Roadmap

### Phase 1: Namespace + Permissions (Next)
1. Rename skills to `joycraft-*` prefix
2. Generate `.claude/settings.json` deny/ask/allow rules based on stack

### Phase 2: Risk Interview + Hooks (Sprint +1)
3. Add Risk Interview to `/joycraft-tune` (3-5 questions)
4. Generate PreToolUse hooks from NEVER rules + interview answers

### Phase 3: Context Documents (Sprint +2)
5. Add `docs/context/` with four living documents
6. Enhance `/joycraft-session-end` with context update prompts

### Phase 4: Risk Tiers + Eval Scoring (Sprint +3)
7. Classify boundaries into advisory/prompted/blocked/hard-blocked
8. Add "Safeguards & Enforcement" to `/joycraft-tune` assessment

### Phase 5: Plugin Migration (Future)
9. Migrate to Claude Code plugin for automatic `:` namespacing and marketplace distribution
