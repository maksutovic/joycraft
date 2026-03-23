# External Scenario Tests

## The Core Concept

External scenarios are holdout tests that live **outside** the project codebase. The agent building the software can never see them, can never optimize for them, and can never game them.

This is the ML train/test split applied to software development. Palisade Research proved that reasoning models (o1, DeepSeek R1) actively engage in specification gaming when they can see the test suite. External scenarios eliminate this attack surface.

## How They Work

```
1. Agent implements a feature from a spec
2. Agent says "done, all tasks verified"
3. YOU (or a CI hook) run the external scenarios
4. Scenarios test behavioral correctness from the outside
5. Failures get fed back as bug specs
6. Agent iterates until all scenarios pass
```

## Directory Structure

```
~/Developer/scenarios/
├── pie-server/           # Pie server scenarios (4 scenarios, all passing)
│   ├── setup.sh          # One-command runner: config → JWT → server check → run all
│   ├── config.sh         # Shared config and helpers
│   ├── 01-health-and-session.sh
│   ├── 02-mcp-tool-usage.sh
│   ├── 03-credential-failure-handling.sh
│   ├── 04-agent-identity.sh
│   └── .env.test         # Saved credentials (gitignored)
├── foodtrails/           # TODO
├── trashblitz/           # TODO
└── [project]/            # One directory per project
```

## Writing a Scenario

Each scenario answers ONE question: "Does this specific user journey work correctly?"

```bash
#!/bin/bash
# scenario-[name].sh
# QUESTION: [What user journey are you testing?]
# PASS CRITERIA:
# 1. [Observable behavior 1]
# 2. [Observable behavior 2]

source "$(dirname "$0")/config.sh"

# Setup: create the preconditions (session, test data, etc.)
# Execute: trigger the user journey (API call, CLI command, etc.)
# Evaluate: check the criteria (grep output, check status codes, etc.)
# Report: pass/fail with specific details
```

## Design Principles

1. **Scenarios live OUTSIDE the codebase** — the agent can't see them
2. **Test behaviors, not implementation** — "agent returns real data" not "function returns array"
3. **Use satisfaction criteria** — "did the user get what they needed?" not just boolean assertions
4. **Save full responses** — dump to /tmp for debugging when scenarios fail
5. **Each scenario is independently runnable** — for debugging specific failures
6. **The suite grows over time** — every regression becomes a new scenario

## From Mechanical to Qualitative (Advanced)

Basic scenarios use grep/jq to check for specific patterns. For qualitative evaluation ("is this report actually useful?"), you can use LLM-as-judge:

```bash
# Send the agent's response to a SEPARATE Claude instance for quality evaluation
JUDGMENT=$(echo "$AGENT_RESPONSE" | claude -p "
Score 1-5 on: data accuracy, actionability, structure, clarity.
Output JSON: {data: N, actionable: N, structure: N, clarity: N}
")
```

This is how StrongDM measures "satisfaction" — the fraction of trajectories that likely satisfy the user.
