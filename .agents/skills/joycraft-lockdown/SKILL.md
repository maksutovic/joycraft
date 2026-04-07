---
name: joycraft-lockdown
description: Generate constrained execution boundaries for an implementation session -- NEVER rules and deny patterns to prevent agent overreach
---

# Lockdown Mode

The user wants to constrain agent behavior for an implementation session. Your job is to interview them about what should be off-limits, then generate AGENTS.md NEVER rules and Codex configuration deny patterns they can review and apply.

## When Is Lockdown Useful?

Lockdown is most valuable for:
- **Complex tech stacks** (hardware, firmware, multi-device) where agents can cause real damage
- **Long-running autonomous sessions** where you won't be monitoring every action
- **Production-adjacent work** where accidental network calls or package installs are risky

For simple feature work on a well-tested codebase, lockdown is usually overkill. Mention this context to the user so they can decide.

## Step 1: Check for Tests

Before starting the interview, search the codebase for test files or directories (look for `tests/`, `test/`, `__tests__/`, `spec/`, or files matching `*.test.*`, `*.spec.*`).

If no tests are found, tell the user:

> Lockdown mode is most useful when you already have tests in place -- it prevents the agent from modifying them while constraining behavior to writing code and running tests. Consider running `$joycraft-new-feature` first to set up a test-driven workflow, then come back to lock it down.

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

### AGENTS.md -- add to NEVER section:

- Edit any file in `[user's test directories]`
- Run `[denied package manager commands]`
- Use `[denied network tools]`
- Read log files directly -- interact with logs only through test assertions
- [Any additional NEVER rules based on user responses]

### Codex configuration -- suggested deny patterns:

Add these to your Codex sandbox configuration to restrict command execution:

["[command1]", "[command2]", "[command3]"]

---

Copy these into your project manually, or tell me to apply them now (I'll show you the exact changes for approval first).
```

Adjust the content based on the actual interview responses:
- Only include deny patterns for commands the user confirmed should be denied
- Only include NEVER rules for directories/files the user specified
- If the user allowed certain network tools or package managers, exclude those

## Recommended Execution Model

After generating the boundaries above, also recommend a Codex execution configuration. Include this section in your output:

```
### Recommended Execution Configuration

Codex runs in a sandboxed environment by default. To maximize safety during lockdown:

| Your situation | Configuration | Why |
|---|---|---|
| Autonomous spec execution | Sandbox with deny patterns above | Only pre-approved commands run |
| Long session with some trust | Default sandbox | Network-disabled sandbox prevents external access |
| Interactive development | Default with manual review | Review outputs before applying |

**For lockdown mode, we recommend the default sandboxed execution** combined with the deny patterns above. Codex's sandbox already disables network access by default -- the deny patterns add file-level and command-level restrictions on top.

If you need network access for specific commands (e.g., API tests), configure explicit network allowances in your Codex setup rather than disabling the sandbox entirely.
```

## Step 4: Offer to Apply

If the user asks you to apply the changes:

1. **For AGENTS.md:** Read the existing AGENTS.md, find the Behavioral Boundaries section, and show the user the exact diff for the NEVER section. Ask for confirmation before writing.
2. **For Codex configuration:** Show the user what the deny patterns will look like after adding the new restrictions. Ask for confirmation before writing.

**Never auto-apply. Always show the exact changes and wait for explicit approval.**
