---
name: joysmith
description: Assess your project's AI development harness — detect state, score dimensions, recommend upgrades
---

# Joysmith — Project Harness Assessment

You are evaluating this project's AI development harness. Follow these steps precisely.

## Step 1: Detect Harness State

Check the following and note what exists:

1. **CLAUDE.md** — Read it if it exists. Check whether it contains meaningful content (not just a project name or generic README).
2. **Key directories** — Check for: `docs/specs/`, `docs/briefs/`, `docs/discoveries/`, `docs/templates/`, `.claude/skills/`
3. **Boundary framework** — Look for `Always`, `Ask First`, and `Never` sections in CLAUDE.md (or similar behavioral constraints).
4. **Skills infrastructure** — Check `.claude/skills/` for installed skill files.
5. **Test configuration** — Look for test commands in package.json, pyproject.toml, Cargo.toml, Makefile, or CI config files.

## Step 2: Classify and Route

Based on what you found, classify the project into one of three states:

### State A: No Harness
**Trigger:** No CLAUDE.md, OR CLAUDE.md exists but has no behavioral boundaries, no spec references, and no structured sections.

**Action:** Tell the user:
- Their project has no AI development harness (or a minimal one)
- Recommend running `npx joysmith init` to scaffold one
- Briefly explain what Joysmith will set up: CLAUDE.md with boundaries, spec/brief templates, skills, and documentation structure
- Stop here — do not run the full assessment

### State B: Partial Harness
**Trigger:** CLAUDE.md exists with some structured content (boundaries, commands, or architecture), but not all 7 dimensions score 3.5 or above.

**Action:**
- Tell the user you've detected a partial harness and will run a detailed assessment
- Invoke the detailed assessment by running `/joysmith-assess`

### State C: Full Harness
**Trigger:** All of the following are true:
- CLAUDE.md has Always/Ask First/Never boundaries
- `docs/specs/` exists and contains spec files
- `docs/briefs/` exists
- `.claude/skills/` exists with skill files
- Test commands are configured
- Documentation structure is in place
- Knowledge capture mechanism exists (docs/discoveries/ or similar)

**Action:** Tell the user:
- Their project harness is solid across all dimensions
- Provide a quick summary of what's well-configured
- Offer to start work: "Your harness is ready. What would you like to work on? You can use `/new-feature` to start a new feature, or `/decompose` to break down a large task."

## Quick Scoring Rubric (for routing decisions)

Use these presence checks to quickly estimate scores. You do NOT need to do deep analysis here — that's what `/joysmith-assess` is for.

| Dimension | Score 1 (None) | Score 3 (Partial) | Score 5 (Complete) |
|-----------|---------------|-------------------|-------------------|
| Spec Quality | No specs directory | Specs exist but informal | Atomic specs with acceptance criteria |
| Spec Granularity | N/A | Large multi-session specs | Each spec fits one session |
| Behavioral Boundaries | No CLAUDE.md | CLAUDE.md without boundaries | Always/Ask First/Never sections |
| Skills & Hooks | No .claude/ directory | .claude/ exists, few skills | Multiple skills, hooks configured |
| Documentation | No docs/ directory | docs/ exists with some content | Structured docs/ with templates |
| Knowledge Capture | No discovery tracking | Ad-hoc notes | Structured discoveries directory |
| Testing & Validation | No test config | Tests exist, no CI | Tests + CI + validation commands in CLAUDE.md |

If the average quick score is 3.5 or above, classify as State C. Otherwise, classify as State B.

## Edge Cases

- **Not a git repo:** Note this to the user. Joysmith works best in a git repository. Recommend initializing one first.
- **CLAUDE.md is just a README:** Treat as State A — the file exists but isn't a harness.
- **Non-Joysmith skills already installed:** Acknowledge them. Do not suggest replacing them — suggest Joysmith skills as additions.
- **Monorepo:** Assess the root CLAUDE.md. Note if component-level CLAUDE.md files exist in subdirectories.
