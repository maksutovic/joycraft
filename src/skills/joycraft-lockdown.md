---
name: joycraft-lockdown
description: Generate constrained execution boundaries for an implementation session -- NEVER rules and deny patterns to prevent agent overreach
---

# Lockdown Mode

The user wants to constrain agent behavior for an implementation session. Your job is to interview them about what should be off-limits, then generate CLAUDE.md NEVER rules and `.claude/settings.json` deny patterns they can review and apply.

## When Is Lockdown Useful?

Lockdown is most valuable for:
- **Complex tech stacks** (hardware, firmware, multi-device) where agents can cause real damage
- **Long-running autonomous sessions** where you won't be monitoring every action
- **Production-adjacent work** where accidental network calls or package installs are risky

For simple feature work on a well-tested codebase, lockdown is usually overkill. Mention this context to the user so they can decide.

## Step 1: Check for Tests

Before starting the interview, check if the project has test files or directories (look for `tests/`, `test/`, `__tests__/`, `spec/`, or files matching `*.test.*`, `*.spec.*`).

If no tests are found, tell the user:

> Lockdown mode is most useful when you already have tests in place -- it prevents the agent from modifying them while constraining behavior to writing code and running tests. Consider running `/joycraft-new-feature` first to set up a test-driven workflow, then come back to lock it down.

If the user wants to proceed anyway, continue with the interview.

## Step 2: Interview -- What to Lock Down

Ask these three questions, one at a time. Wait for the user's response before proceeding to the next question.

### Question 1: Read-Only Files

> What test files or directories should be off-limits for editing? (e.g., `tests/`, `__tests__/`, `spec/`, specific test files)
>
> I'll generate NEVER rules to prevent editing these.

If the user isn't sure, suggest the test directories you found in Step 1.

### Question 2: Allowed Commands

> What commands should the agent be allowed to run? Defaults:
> - Write and edit source code files
> - Run the project's smoke test command
> - Run the full test suite
>
> Any other commands to explicitly allow? Or should I restrict to just these?

### Question 3: Denied Commands

> What commands should be denied? Defaults:
> - Package installs (`npm install`, `pip install`, `cargo add`, `go get`, etc.)
> - Network tools (`curl`, `wget`, `ping`, `ssh`)
> - Direct log file reading
>
> Any specific commands to add or remove from this list?

**Edge case -- user wants to allow some network access:** If the user mentions API tests or specific endpoints that need network access, exclude those from the deny list and note the exception in the output.

**Edge case -- user wants to lock down file writes:** If the user wants to prevent ALL file writes, warn them:

> Denying all file writes would prevent the agent from doing any work. I recommend keeping source code writes allowed and only locking down test files, config files, or other sensitive directories.

## Step 3: Generate Boundaries

Based on the interview responses, generate output in this exact format:

```
## Lockdown boundaries generated

Review these suggestions and add them to your project:

### CLAUDE.md -- add to NEVER section:

- Edit any file in `[user's test directories]`
- Run `[denied package manager commands]`
- Use `[denied network tools]`
- Read log files directly -- interact with logs only through test assertions
- [Any additional NEVER rules based on user responses]

### .claude/settings.json -- suggested deny patterns:

Add these to the `permissions.deny` array:

["[command1]", "[command2]", "[command3]"]

---

Copy these into your project manually, or tell me to apply them now (I'll show you the exact changes for approval first).
```

Adjust the content based on the actual interview responses:
- Only include deny patterns for commands the user confirmed should be denied
- Only include NEVER rules for directories/files the user specified
- If the user allowed certain network tools or package managers, exclude those

## Step 4: Offer to Apply

If the user asks you to apply the changes:

1. **For CLAUDE.md:** Read the existing CLAUDE.md, find the Behavioral Boundaries section, and show the user the exact diff for the NEVER section. Ask for confirmation before writing.
2. **For settings.json:** Read the existing `.claude/settings.json`, show the user what the `permissions.deny` array will look like after adding the new patterns. Ask for confirmation before writing.

**Never auto-apply. Always show the exact changes and wait for explicit approval.**
