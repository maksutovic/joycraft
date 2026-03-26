# Add Fact Skill — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-25-incremental-knowledge-capture.md`
> **Status:** Ready
> **Date:** 2026-03-25
> **Estimated scope:** 1 session / 3 files / ~120 lines

---

## What

Create a `/joycraft-add-fact` skill that takes a fact from the user and intelligently routes it to the correct context document. The user says "always use flash.sh, never connect to serial directly" and the skill determines this belongs in `troubleshooting.md`, then appends it in the right format.

## Why

Most project knowledge surfaces *during development*, not during the initial risk interview. Without a lightweight capture mechanism, developers either break flow to manually edit files or lose the knowledge entirely. This is the incremental counterpart to the upfront risk interview.

## Acceptance Criteria

- [ ] `/joycraft-add-fact` skill exists at `.claude/skills/joycraft-add-fact/SKILL.md`
- [ ] Skill accepts a fact as natural language from the user
- [ ] Skill intelligently routes to one of 5 context docs:
  - Production/infra facts → `docs/context/production-map.md`
  - "Agent assumes X but actually Y" → `docs/context/dangerous-assumptions.md`
  - Architectural decisions with rationale → `docs/context/decision-log.md`
  - Team conventions, unwritten rules → `docs/context/institutional-knowledge.md`
  - "When X happens, do Y" diagnostic knowledge → `docs/context/troubleshooting.md`
- [ ] Skill appends to the correct section of the target doc (table row, list item, etc.)
- [ ] Skill also evaluates whether the fact warrants a CLAUDE.md boundary rule (ALWAYS/ASK FIRST/NEVER) and adds one if so
- [ ] Skill confirms what was added and where: "Added to troubleshooting.md: When Wi-Fi disconnects → wait and retry, don't switch networks"
- [ ] If the target context doc doesn't exist, skill creates it from the template structure
- [ ] Skill source is added to `src/skills/` and to `SKILLS` in `bundled-files.ts`
- [ ] Skill is included in `joycraft init` copy
- [ ] Build passes

## Constraints

- MUST be a self-contained skill — all routing logic is in the markdown prompt, not TypeScript
- MUST NOT ask the user which document to route to (infer from content)
- MUST append, never overwrite existing content
- MUST match the format of the target document (table rows for tables, list items for lists)
- SHOULD handle ambiguous facts by picking the best fit and mentioning the choice: "Routed to troubleshooting.md — move to dangerous-assumptions.md if this is more about what agents get wrong"

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/skills/add-fact.md` | New skill file |
| Modify | `src/bundled-files.ts` | Add skill to SKILLS object |

## Approach

The skill is a prompt-only artifact — Claude reads the skill instructions and executes the routing logic at runtime. The skill should:

1. Read the fact from the user
2. Classify it against the 5 context doc categories using clear heuristics in the prompt:
   - Contains service names, URLs, endpoints, "production", "staging" → production-map
   - Contains "assumes", "might think", "but actually" → dangerous-assumptions
   - Contains "decided", "chose", "because", "instead of" → decision-log
   - Contains "convention", "rule", "always", "never", general team knowledge → institutional-knowledge
   - Contains "when X fails", "if you see", "diagnose", "stuck", "before trying" → troubleshooting
3. Read the target document to understand its current structure
4. Append the fact in the correct format
5. Evaluate if it also needs a CLAUDE.md rule
6. Confirm to the user

Rejected alternative: TypeScript-based routing with NLP classification — overengineered, adds runtime dependencies, and the heuristics are clear enough for an LLM prompt.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Fact fits multiple categories | Pick best fit, mention alternative in confirmation |
| Context doc doesn't exist | Create from template structure, then append |
| Fact is clearly a CLAUDE.md rule ("never push to main") | Add to both context doc AND CLAUDE.md boundaries |
| User provides multiple facts at once | Process each one separately, confirm all |
| `docs/context/` directory doesn't exist | Create it |
