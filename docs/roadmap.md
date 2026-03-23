# Joysmith Roadmap: Level 4 → 4.5 → 5

## Current State: Level 4

We write specs, Claude executes, we run scenarios manually, we feed failures back.

## Level 4.5: Automate the Feedback Loop

**Goal:** Scenarios run automatically after Claude finishes. Failures feed back without human intervention.

### Step 1: Add --ci mode to scenario scripts (1 hour)
- No interactive prompts (loads from .env.test)
- JSON output format for machine parsing
- Non-zero exit code on failure

### Step 2: TaskCompleted hook in Claude Code (30 min)
- When Claude marks a task complete, scenarios auto-run
- Exit code 2 sends failure output back and prevents completion
- Claude keeps iterating until green

### Step 3: Format scenario failures as bug specs (1 hour)
- Structured output that Claude can directly consume
- Includes: which scenario, what failed, expected vs actual, relevant logs

**Estimated effort: one afternoon.**

## Level 5: The Joysmith

**Goal:** Spec drops in, software comes out. No human between spec and ship.

### Step 1: Spec queue
- Directory or system where specs await execution
- Could be `docs/queue/` monitored by cron

### Step 2: Autonomous agent loop
- `claude -p` in non-interactive mode reading specs from queue
- Executes plans, runs scenarios, iterates

### Step 3: PR automation
- All scenarios pass → auto-create PR
- CI runs scenario suite
- Green CI → auto-merge (or human review gate)

### Step 4: Observability
- Token cost tracking per spec execution
- Time-to-green metrics
- Spinning detection (high cost, low progress)

### Step 5: Scenario evolution
- Separate agent writes new scenarios from user feedback and production bugs
- Holdout suite grows autonomously
