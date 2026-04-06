---
name: joycraft-add-fact
description: Capture a project fact and route it to the correct context document -- production map, dangerous assumptions, decision log, institutional knowledge, or troubleshooting
---

# Add Fact

The user has a fact to capture. Your job is to classify it, route it to the correct context document, append it in the right format, and optionally add a boundary rule to CLAUDE.md or AGENTS.md.

## Step 1: Get the Fact

If the user already provided the fact (e.g., `$joycraft-add-fact the staging DB resets every Sunday`), use it directly.

If not, ask: "What fact do you want to capture?" -- then wait for their response.

If the user provides multiple facts at once, process each one separately through all the steps below, then give a combined confirmation at the end.

## Step 2: Classify the Fact

Route the fact to one of these 5 context documents based on its content:

### `docs/context/production-map.md`
The fact is about **infrastructure, services, environments, URLs, endpoints, credentials, or what is safe/unsafe to touch**.
- Signal words: "production", "staging", "endpoint", "URL", "database", "service", "deployed", "hosted", "credentials", "secret", "environment"
- Examples: "The staging DB is at postgres://staging.example.com", "We use Vercel for the frontend and Railway for the API"

### `docs/context/dangerous-assumptions.md`
The fact is about **something an AI agent might get wrong -- a false assumption that leads to bad outcomes**.
- Signal words: "assumes", "might think", "but actually", "looks like X but is Y", "not what it seems", "trap", "gotcha"
- Examples: "The `users` table looks like a test table but it's production", "Deleting a workspace doesn't delete the billing subscription"

### `docs/context/decision-log.md`
The fact is about **an architectural or tooling choice and why it was made**.
- Signal words: "decided", "chose", "because", "instead of", "we went with", "the reason we use", "trade-off"
- Examples: "We chose SQLite over Postgres because this runs on embedded devices", "We use pnpm instead of npm for workspace support"

### `docs/context/institutional-knowledge.md`
The fact is about **team conventions, unwritten rules, organizational context, or who owns what**.
- Signal words: "convention", "rule", "always", "never", "team", "process", "review", "approval", "owns", "responsible"
- Examples: "The design team reviews all color changes", "We never deploy on Fridays", "PR titles must start with the ticket number"

### `docs/context/troubleshooting.md`
The fact is about **diagnostic knowledge -- when X happens, do Y (or don't do Z)**.
- Signal words: "when", "fails", "error", "if you see", "stuck", "broken", "fix", "workaround", "before trying", "reboot", "restart", "reset"
- Examples: "If Wi-Fi disconnects during flash, wait and retry -- don't switch networks", "When tests fail with ECONNREFUSED, check if Docker is running"

### Ambiguous Facts

If the fact fits multiple categories, pick the **best fit** based on the primary intent. You will mention the alternative in your confirmation message so the user can correct you.

## Step 3: Ensure the Target Document Exists

1. If `docs/context/` does not exist, create the directory.
2. If the target document does not exist, create it from the template structure. Check `docs/templates/` for the matching template. If no template exists, use this minimal structure:

For **production-map.md**:
```markdown
# Production Map

> What's real, what's staging, what's safe to touch.

## Services

| Service | Environment | URL/Endpoint | Impact if Corrupted |
|---------|-------------|-------------|-------------------|
```

For **dangerous-assumptions.md**:
```markdown
# Dangerous Assumptions

> Things the AI agent might assume that are wrong in this project.

## Assumptions

| Agent Might Assume | But Actually | Impact If Wrong |
|-------------------|-------------|----------------|
```

For **decision-log.md**:
```markdown
# Decision Log

> Why choices were made, not just what was chosen.

## Decisions

| Date | Decision | Why | Alternatives Rejected | Revisit When |
|------|----------|-----|----------------------|-------------|
```

For **institutional-knowledge.md**:
```markdown
# Institutional Knowledge

> Unwritten rules, team conventions, and organizational context.

## Team Conventions

- (none yet)
```

For **troubleshooting.md**:
```markdown
# Troubleshooting

> What to do when things go wrong for non-code reasons.

## Common Failures

| When This Happens | Do This | Don't Do This |
|-------------------|---------|---------------|
```

## Step 4: Read the Target Document

Read the target document to understand its current structure. Note:
- Which section to append to
- Whether it uses tables or lists
- The column format if it's a table

## Step 5: Append the Fact

Add the fact to the appropriate section of the target document. Match the existing format exactly:

- **Table-based documents** (production-map, dangerous-assumptions, decision-log, troubleshooting): Add a new table row in the correct columns. Use today's date where a date column exists.
- **List-based documents** (institutional-knowledge): Add a new list item (`- `) to the most appropriate section.

Remove any italic example rows (rows where all cells start with `_`) before appending, so the document transitions from template to real content. Only remove examples from the specific table you are appending to.

**Append only. Never modify or remove existing real content.**

## Step 6: Evaluate Boundary Rule

Decide whether the fact also warrants a rule in the project's boundary configuration (CLAUDE.md and/or AGENTS.md -- check which files the project uses and update accordingly):

**Add a boundary rule if the fact:**
- Describes something that should ALWAYS or NEVER be done
- Could cause real damage if violated (data loss, broken deployments, security issues)
- Is a hard constraint that applies across all work, not just a one-time note

**Do NOT add a boundary rule if the fact is:**
- Purely informational (e.g., "staging DB is at this URL")
- A one-time decision that's already captured
- A diagnostic tip rather than a prohibition

If a rule is warranted, read the project's boundary file(s) -- CLAUDE.md and/or AGENTS.md -- find the appropriate section (ALWAYS, ASK FIRST, or NEVER under Behavioral Boundaries), and append the rule. If no Behavioral Boundaries section exists, append one. Update whichever boundary files the project uses (some projects have CLAUDE.md, some have AGENTS.md, some have both).

## Step 7: Confirm

Report what you did in this format:

```
Added to [document name]:
  [summary of what was added]

[If boundary file(s) were also updated:]
Added boundary rule to [CLAUDE.md / AGENTS.md / both]:
  [ALWAYS/ASK FIRST/NEVER]: [rule text]

[If the fact was ambiguous:]
Routed to [chosen doc] -- move to [alternative doc] if this is more about [alternative category description].
```
