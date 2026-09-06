---
name: joycraft-add-fact
description: Invoked by session-end or the human after a fact surfaces — route it to the correct context document (production map, dangerous assumptions, decision log, institutional knowledge, troubleshooting)
---

# Add Fact

The user has a fact to capture. Your job is to escalate it to a check where one is possible, otherwise classify it, route it to the correct context document, and append it in the right format.

## Step 1: Get the Fact

If the user already provided the fact (e.g., `/skill:joycraft-add-fact the staging DB resets every Sunday`), use it directly.

If not, ask: "What fact do you want to capture?" -- then wait for their response.

If the user provides multiple facts at once, process each one separately through all the steps below, then give a combined confirmation at the end.

## Step 1b: Escalate to a Check First (Harden-First)

Before choosing a doc, apply the intervention-elimination hierarchy: **can this fact be enforced as architecture, a deny pattern, or a CI check?** A fact that is ALWAYS/NEVER-shaped, could cause real damage if violated, and applies across all work belongs in AGENTS.md's behavioral boundaries with teeth — invoke `/skill:joycraft-harden` to convert it (rule + deny pattern stamped together) and stop; prose is the residue after checks fail, not the default destination. Advisory, never blocking: if the human declines, or harden is not installed (note it), continue to Step 2. A check-eligible fact whose *why* deserves prose can still land in the decision log per Step 2's rubric. Purely informational facts, one-time decisions, and diagnostic tips are not escalation candidates — classify them below.

## Step 2: Classify the Fact

### Reject before you route

A curated layer rots when it absorbs facts that decay. Check these three reject-signals FIRST — a fact matching any of them is not captured:

- **Redundant with AGENTS.md** — the fact restates a rule AGENTS.md already carries. Example: "we never push to main."
- **Expired shipped-state** — the fact describes a state the shipped ledger already supersedes. Example: "the retry logic is being rewritten."
- **Point-in-time hazard** — PR numbers, "currently broken", live URLs to unshipped work. Example: "PR #412 is currently broken."

Reject with a one-line reason and, where one exists, the fact's correct existing home ("already in AGENTS.md under NEVER"). Never silently drop a fact — the human can override and capture it anyway with the ban noted.

If none fire, route the fact to one of these 5 context documents based on its content:

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

## Step 2b: Overlap Check (PROTOCOL)

Before creating any new discovery/context file or row, grep the knowledge layer for an existing home for this fact:

```bash
grep -ril '<topic keywords>' docs/context/ docs/discoveries/ docs/reference/
```

- **No match** — proceed to Step 3 and create/append as normal.
- **Match found** — that's an overlap. Update the existing doc in place (per `docs/reference/knowledge-lifecycle.md`'s Update/Consolidate verbs) instead of minting a near-duplicate row or file, and say so in your confirmation message (Step 6).
- **Multiple conflicting matches** — surface the contradiction to the human; don't pick a winner silently (`docs/reference/knowledge-lifecycle.md`).

## Step 3: Ensure the Target Document Exists

1. If `docs/context/` does not exist, create the directory.
2. If the target document does not exist, create it from `docs/templates/` (the matching template is the source of truth for its structure). If no template is installed, write a minimal file: an `# H1` title, a one-line `>` purpose blurb, one `##` section, and the header row of the table below — except institutional-knowledge, which is a list.

| Document | Section | Columns |
|----------|---------|---------|
| production-map | Services | Service, Environment, URL/Endpoint, Impact if Corrupted |
| dangerous-assumptions | Assumptions | Agent Might Assume, But Actually, Impact If Wrong |
| decision-log | Decisions | Date, Decision, Why, Alternatives Rejected, Revisit When |
| institutional-knowledge | Team Conventions | (list, not a table) |
| troubleshooting | Common Failures | When This Happens, Do This, Don't Do This |

## Step 4: Read the Target Document

Read the target document to understand its current structure. Note:
- Which section to append to
- Whether it uses tables or lists
- The column format if it's a table

## Step 5: Append the Fact

Add the fact to the appropriate section of the target document. Match the existing format exactly:

- **Time-ordered table documents** (decision-log): Prepend the new row directly under the header/separator, newest-first. Never modify or remove existing rows.
- **Other table-based documents** (production-map, dangerous-assumptions, troubleshooting): Add a new table row in the correct columns. Use today's date where a date column exists.
- **List-based documents** (institutional-knowledge): Add a new list item (`- `) to the most appropriate section.

Remove any italic example rows (rows where all cells start with `_`) before appending, so the document transitions from template to real content. Only remove examples from the specific table you are appending to.

**Prepend new rows for time-ordered table docs (newest-first); append for other tables and lists. Never modify or remove existing rows.**

**Rotation:** if prepending pushes a time-ordered live-head doc (e.g. `decision-log.md`) over its 200-line budget, follow the rotation procedure in `docs/reference/knowledge-lifecycle.md` (numbered shards + pointer-only manifest, created only at first rotation) rather than truncating or leaving it unbounded.

## Step 5b: Update Shared Frontmatter

Context docs are *shared* artifacts (no single owner). After appending, update (or add) YAML frontmatter — the 2-field shared schema:

```yaml
---
last_updated: YYYY-MM-DD
last_updated_by: <resolved name>
---
```

If the file already has a frontmatter block, update the `last_updated` and `last_updated_by` fields in place. If it doesn't, prepend a fresh block ABOVE the existing `# Heading`.

**Owner resolution:** look up the owner name in this order — (1) `git config user.name`, (2) value in your auto-memory `joycraft-owner.txt` if present, (3) ask the user once and persist.

## Step 6: Confirm and Hand Off

Report what you did in this format:

```
Added to [document name]:
  [summary of what was added]

[If the fact escalated to a check in Step 1b:]
Escalated to /skill:joycraft-harden:
  [the rule it will stamp]

[If the fact was ambiguous:]
Routed to [chosen doc] -- move to [alternative doc] if this is more about [alternative category description].
```

End with the canonical Handoff block. For most facts, the next move is back to whatever the user was doing — the Handoff block degrades to just a slash command pointing them home.

## Recommended Next Steps

Next:
```bash
/skill:joycraft-session-end
```
Run /new first.
