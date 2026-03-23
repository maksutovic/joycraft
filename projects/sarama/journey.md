# The Sarama Journey: Upgrading a Hardware Product to Level 4

**Date:** March 23, 2026
**Authors:** Max + Claude
**Audience:** Team (Max, Praful, co-founders)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why We Did This: The Dark Factory Vision](#2-why-we-did-this-the-dark-factory-vision)
3. [The Challenge: Why Hardware is Different](#3-the-challenge-why-hardware-is-different)
4. [The Assessment: Where Sarama Actually Stood](#4-the-assessment-where-sarama-actually-stood)
5. [What We Built: The Level 4 Harness](#5-what-we-built-the-level-4-harness)
6. [The Road to 4.5: Automated Testing for Hardware + iOS + Server](#6-the-road-to-45-automated-testing-for-hardware--ios--server)
7. [The Scenarios Structure: External Holdout Tests](#7-the-scenarios-structure-external-holdout-tests)
8. [Roadmap: Level 4 → 4.5 → 5](#8-roadmap-level-4--45--5)

---

## 1. Executive Summary

We upgraded the Sarama CollarPrototype monorepo from Level 3.5 to Level 4 on the Joysmith framework — our methodology for systematically improving how we work with AI coding agents.

**Why this matters:** Most teams using AI tools are stuck at Level 2 (telling Claude what to code line by line) and think they've hit the ceiling. We've been pushing toward Level 5 — where you drop a spec in and working software comes out. This upgrade brings Sarama's harness infrastructure up to the standard needed for that progression.

**What we did:**
- Ran 6 parallel analysis agents across every component (firmware, iOS, server, upscale service, Tauri lab, root)
- Asked Max quick-fire questions during brainstorming (pain points, target level, mono vs multi-repo preference) — not a full structured interview per the Joysmith methodology. **TODO: Conduct full interview with Praful (co-founder, primary developer on Sarama the past few weeks) to validate harness upgrades against his actual pain points and update accordingly.**
- Designed and implemented a top-down harness upgrade: boundary framework → interface contracts → cross-component skills → component upgrades → deployment runbook
- Delivered 22 files (11 new, 10 modified, 1 design spec) in 6 commits on branch `maksu/joysmith-implementation`
- Researched automated testing strategies for the unique challenges of hardware + iOS + server

**Key insight:** Hardware products can't reach Level 5 through the same path as web apps. You need a **layered testing strategy** — protocol-level simulation for the hardware, mock services for iOS, and integration testing for the server — rather than trying to automate everything end-to-end.

---

## 2. Why We Did This: The Dark Factory Vision

If you haven't read the [Pie journey](../pie/journey.md), this section gives you the context. If you have, skip to [Section 3](#3-the-challenge-why-hardware-is-different).

### The 5 Levels of Vibe Coding

Dan Shapiro (CEO of Glowforge) published a framework in January 2026 that maps how teams use AI for coding, modeled after the 5 levels of self-driving cars:

| Level | Name | What You Do | What AI Does |
|-------|------|------------|-------------|
| 0 | Spicy Autocomplete | Write all code, AI suggests | Tab completion |
| 1 | Coding Intern | Delegate atomic tasks | Write functions/tests |
| 2 | Junior Developer | Guide direction | Multi-file changes |
| 3 | Developer as Manager | Review diffs all day | Primary developer |
| **4** | **Developer as PM** | **Write specs, check outcomes** | **End-to-end development** |
| 5 | Dark Factory | Define what + why only | Specs in, software out |

**90% of "AI-native" developers are at Level 2** and think they've reached the ceiling. The psychological difficulty at Level 3 ("letting go of the code") is where most people get stuck.

### The Productivity Paradox

The METR 2025 randomized control trial found that experienced developers using AI tools were **19% slower** — while believing they were **24% faster**. That's a 40-point perception gap.

Why? Debugging spirals with almost-right code, context switching between coding and prompting, sunk cost fallacy (30+ minutes hoping the LLM will crack it), and enjoyment bias (it *feels* faster).

**The J-Curve:** Productivity dips before it rises. The teams who broke through (25-30%+ gains) redesigned their **entire workflow** — not just added tools. For every $1 on AI licenses, they spent $10 on process transformation.

**The critical quote:** "Generating code has become cheap. Owning code remains expensive. The cost hasn't disappeared; it has transferred from creation to comprehension, validation, and maintenance."

### The Core Insight: Specification Quality is the Bottleneck

The bottleneck has shifted from **implementation speed** to **specification quality**. The dark factory doesn't reduce the demand for deep system understanding — it makes it the only thing that matters.

This is why we built Joysmith: a methodology for upgrading projects from "tell Claude what to code" to "write specs, Claude delivers working software." The name is a deliberate counter-narrative to "dark factory" — we believe this work should bring light, joy, and craftsmanship to engineering, not darkness.

### StrongDM's Software Factory: The Level 5 Example

Three engineers at StrongDM have been running a dark factory since July 2025. Two rules: "Code must not be written by humans" and "Code must not be reviewed by humans."

Their key innovations:
- **Attractor** — their coding agent is literally just 3 markdown specification files. Zero code. The specs, fed to AI agents, produced 16K lines Rust + 9.5K Go + 6.7K TypeScript.
- **External Scenarios** — tests stored OUTSIDE the codebase so the AI can't game them. Like a holdout set in ML.
- **Digital Twin Universe** — behavioral clones of Okta, Jira, Slack for safe integration testing.

Simon Willison called it "the most ambitious form of AI-assisted software development I've seen yet."

### What Joysmith Actually Does

Joysmith is the playbook for getting from Level 2 to Level 5. For each project, we:

1. **Assess** — Rate the project against the 5-level framework using analysis agents
2. **Interview** — Understand pain points, constraints, and what "done" looks like
3. **Design** — Write a spec for the harness upgrade itself
4. **Implement** — Add boundary framework, interface contracts, skills, deployment runbook
5. **Build scenarios** — External holdout tests that validate the AI's work
6. **Automate the loop** — Scenarios run automatically, failures feed back to Claude

We already did this for Pie (see the [Pie journey](../pie/journey.md)). That was a server + Mac app — straightforward HTTP-testable software. Sarama is fundamentally harder because it's a hardware product.

---

## 3. The Challenge: Why Hardware is Different

### The Five-Layer Problem

```
Layer 1: Firmware (MicroPython on ARM Cortex-M55)
  ↕ BLE + WiFi + Binary Protocol (0xDEADBEEF)
Layer 2: Relay Server (Python asyncio TCP bridge)
  ↕ SSE Events (JSON over HTTP)
Layer 3: Intelligence Service (Gemini AI translations)
  ↕ SSE → iOS
Layer 4: iOS App (Swift/UIKit, CoreML, BLE)
  ↕ User experience
Layer 5: Physical dog wearing the collar
```

Each layer has its own toolchain, deployment target, and testing constraints:

| Layer | Language | Deploy Target | Can Simulate? |
|---|---|---|---|
| Firmware | MicroPython + C | OpenMV AE3 microcontroller | Partially — protocol yes, sensors no |
| Relay Server | Python | DigitalOcean VPS | Yes — pure asyncio, no hardware deps |
| Intelligence | Python + Gemini API | Same VPS | Yes — mock Gemini responses |
| iOS App | Swift | Physical iPhone | Partially — simulator for UI, not BLE/camera |
| The Dog | N/A | Real world | No |

### Why Standard Approaches Break Down

**Can't just "run the tests":**
- Firmware tests require a physical device connected via USB
- iOS BLE tests require a real BLE peripheral (the collar)
- End-to-end tests require collar + server + phone in the same room
- Audio emotion detection requires actual dog bark recordings

**Can't just "mock everything":**
- The WiFi routing bug (EHOSTUNREACH after AP→STA switch) only manifests on real hardware
- BLE connection storms only happen with real Bluetooth radio interference
- Audio DMA callbacks have timing constraints that don't exist in simulation
- Camera + IMU + audio running simultaneously creates memory pressure that mocks can't reproduce

**The Pie approach (bash scripts calling HTTP endpoints) doesn't scale here.** We need a different strategy.

---

## 4. The Assessment: Where Sarama Actually Stood

We ran 6 parallel analysis agents — one per component — to assess the entire monorepo against the Joysmith 5-level framework. Here's what we found.

### Component Ratings

| Component | Level | Key Strength | Critical Gap |
|---|---|---|---|
| **Root (monorepo)** | 3.5-4 | Strong specs (INTELLIGENCE_LAYER.md), dual harness (.claude + .codex) | No unified boundary framework, no E2E tests |
| **Firmware** | 3.5 | Exceptional hardware gotchas docs, real hardware test suite | No skills, no holdout scenarios, boundaries not tiered |
| **iOS App** | 3-3.5 | Rich session docs (16 sessions), strong brand integration | Zero test coverage, no behavioral boundaries |
| **Server** | 3.5-4 | Zero-dep relay server, multi-phase specs | Relay untested (3K LOC, 0 tests), no E2E scenarios |
| **Upscale Service** | 3 | Clean code, clear constraints documented | Zero tests, no scenarios |
| **Tauri (SD Lab)** | 1-2 | Solid Rust streaming architecture | No CLAUDE.md, no tests, no specs at all |

### Cross-Cutting Themes

1. **Testing was the universal gap** — Every component lacked external scenarios. iOS and upscale service had literally zero tests.
2. **Boundaries existed but weren't structured** — Critical rules were scattered across CLAUDE.md files with no consistent Always/Ask First/Never framework.
3. **Skills were firmware-only** — 5 mature firmware skills (build, flash, verify, OTA, dev-deploy). Server, iOS, and cross-component workflows had zero.
4. **Interface contracts were documented but not centralized** — Binary protocol spec existed in firmware docs, but server and iOS had their own partial copies. No single source of truth.
5. **Session management was good but inconsistent** — Firmware and iOS had rich session notes; server had gaps; Tauri had none.

### The Diagnosis

Sarama's harness was **strong within each component** (especially firmware and iOS docs) but **weak at the boundaries between components**. The pain points — context loss, autonomy ceiling, agents modifying the wrong component — all traced back to the same root cause: no system-level coordination layer.

This is exactly the gap between Level 3.5 and Level 4. Individual components are well-documented enough for Claude to work within them. But nobody told Claude how the components talk to each other, what's safe to change across boundaries, or how to deploy changes that span firmware + server + iOS.

---

## 5. What We Built: The Level 4 Harness

We chose a **top-down approach** — build the root-level "constitution" first, then push patterns into each component. This addresses the coordination problem before touching individual components.

### Phase 1: Root Harness (The Constitution)

**BOUNDARY_FRAMEWORK.md** — Unified behavioral boundaries for the entire system.

This is the #1 gap between Level 4 and Level 5, per the Joysmith research. Without explicit behavioral boundaries, Claude doesn't know when to proceed autonomously vs. pause and ask. Three tiers applied system-wide:
- **ALWAYS:** Commit style, contract references, test before push, tag firmware releases
- **ASK FIRST:** Cross-component changes, dependency additions, protocol modifications, production deployments
- **NEVER:** Hardcode credentials, modify C modules, add deps to relay server, skip CRC validation

Each component then defines additional boundaries specific to its domain (e.g., firmware adds MicroPython constraints, iOS adds UIKit preferences).

**Interface Contract Registry** (`docs/contracts/`) — Four canonical specs:

| Contract | What It Governs | Components |
|---|---|---|
| `binary-protocol.md` | 0xDEADBEEF sync marker, CRC-16, 6 packet types | Firmware → Server → iOS |
| `sse-events.md` | 7 SSE event types (emotion, bark, battery, etc.) | Server → iOS |
| `tcp-streaming.md` | Relay commands (SUB, LIST, STATUS), backpressure | Firmware → Server → iOS |
| `ble-characteristics.md` | Service UUIDs, control commands, mode switching | Firmware ↔ iOS |

These are the **single source of truth**. Before this, the binary protocol was documented in firmware docs, partially copied in server docs, and referenced differently in iOS docs. Now there's one place, and every component's CLAUDE.md links to it. Any protocol change must update the contract first.

### Phase 2: Cross-Component Skills

Skills are reusable workflows that Claude can invoke. Before this upgrade, only firmware had skills (build, flash, verify, OTA, dev-deploy). Now there are three cross-component skills for both Claude Code and Codex:

| Skill | What It Does | Why It Matters |
|---|---|---|
| `cross-component-change` | Safe workflow for changes spanning multiple components: update contract → implement in dependency order → verify at each step | Prevents the "changed the protocol in firmware but forgot to update the iOS parser" problem |
| `system-health-check` | Verify all services are running and communicating: relay status, SSE endpoint, collar connection, firmware version | First thing to run when "something isn't working" |
| `deploy-coordinated` | Safe multi-component deployment: server first → firmware second → iOS last, with rollback at each step | Prevents deploy ordering bugs (e.g., deploying firmware before server is ready for new protocol) |

### Phase 3: Component Upgrades

All 10 CLAUDE.md and AGENTS.md files (root + firmware + server + iOS + upscale) restructured with:
- Explicit Always/Ask First/Never tiers
- References to contract registry
- References to boundary framework
- Verification sections

The existing content wasn't removed — it was reorganized. Battle-tested rules (like "relay_server.py stays zero-dependency" and "MicroPython, not standard Python") got promoted to the ALWAYS tier where they belong.

### Phase 4: Deployment Runbook

`docs/DEPLOYMENT_RUNBOOK.md` — copy-paste-ready operational guide. This is the document you reach for when deploying:
- Pre-deployment checklist
- Server deployment (relay, intelligence, recording, upscale — each with exact `scp` and `systemctl` commands)
- Firmware deployment (Python-only fast path vs. full build + DFU flash)
- iOS deployment (Xcode build, App Store submission)
- Coordinated release procedure (deploy order: server → firmware → iOS)
- Rollback procedures with time estimates (server: seconds, firmware: minutes, iOS App Store: days)
- Version compatibility matrix
- Monitoring and troubleshooting

### The Delivery

| Metric | Count |
|---|---|
| New files created | 11 |
| Existing files modified | 10 |
| Total commits | 6 |
| Branch | `maksu/joysmith-implementation` |
| PR | [#11](https://github.com/saramaxyz/CollarPrototype/pull/11) |
| Code changes | 0 (all documentation/harness infrastructure) |
| Time from first assessment to PR | ~2 hours |

**Important:** This is all documentation and harness infrastructure. Zero lines of product code were changed. The goal was to upgrade how Claude works with the codebase, not to change what the codebase does.

---

## 6. The Road to 4.5: Automated Testing for Hardware + iOS + Server

Level 4.5 requires **automated validation** — scenarios that run without human intervention and feed failures back to Claude. For Sarama, that means solving three distinct testing problems. We ran 3 parallel research agents to investigate what's possible.

Full research details: [testing-research.md](./testing-research.md)

### The Layered Testing Strategy

We can't test everything end-to-end automatically. Instead, we test at **three layers**, each with increasing fidelity and decreasing automation:

```
Layer 1: Protocol Simulation (fully automated, no hardware)
  → Fake collar sends binary packets over TCP
  → Mock SSE server emits test events
  → Validates parsing, routing, event handling
  → Runs in CI, feeds back to Claude

Layer 2: Component Integration (mostly automated, simulator OK)
  → Server: full asyncio stack with mock collar + mock clients
  → iOS: XCTest on simulator for non-hardware features
  → Firmware: host-side logic tests (MicroPython Unix port)
  → Runs locally or in CI

Layer 3: Hardware-in-the-Loop (manual trigger, real devices)
  → Real collar + real phone + real server
  → Soak tests, BLE chaos tests, WiFi transition tests
  → Triggered by human, results captured automatically
```

**The key insight:** Layer 1 catches 80% of regressions and is fully automatable. Layer 2 catches another 15%. Layer 3 catches the remaining 5% (real hardware bugs) but requires human involvement.

### The Testing Pyramid for Hardware Products

```
        /\
       /  \     Layer 3: Hardware-in-the-Loop
      / 5% \    Manual trigger, real devices, soak tests
     /______\   Existing: firmware soak tests, BLE chaos
    /        \
   /  15%     \  Layer 2: Component Integration
  / Simulator  \ xcodebuild test, pytest full stack,
 /______________\ mock peripherals

/                \
/     80%         \  Layer 1: Protocol Simulation
/ Fake collar,     \ Binary protocol tests, SSE tests,
/  mock SSE, no HW  \ relay server unit tests
/____________________\
```

### Server Testing (Highest ROI, Start Here)

The server is the easiest to test and the relay server is the biggest risk (3,000+ LOC, zero tests).

**Key off-the-shelf tools:**

| Tool | Purpose | Effort | URL |
|---|---|---|---|
| **pytest-asyncio** | Async test fixtures for TCP relay | Low | pypi.org/project/pytest-asyncio |
| **Hypothesis** | Property-based protocol fuzzing — generates random valid/invalid packets, tests roundtrip properties | Medium | hypothesis.works |
| **construct** | Declarative binary protocol parser/builder — define packet format once, use for both parsing and building | Low | construct.readthedocs.io |
| **httpx-sse** | Async SSE client for testing intelligence service events | Low | github.com/florimondmanca/httpx-sse |
| **respx** | Mock httpx requests (for Gemini API mocking in tests) | Low | lundberg.github.io/respx |

**What to build:**

1. **Binary protocol library** (using `construct`) — Define all 6 packet types declaratively. Test with Hypothesis: `parse(serialize(packet)) == packet`, corrupted CRC always rejected, parser recovers after garbage bytes.

2. **Fake collar simulator** — Python asyncio TCP client that sends valid binary protocol packets to the relay. This is the **single highest-value testing investment** for Level 4.5. It's a "digital twin" of the collar at the protocol level — the same pattern StrongDM uses for their integration services.

3. **Relay server test suite** (~400 lines) — async tests for backpressure, stream routing, text commands, multi-client broadcast, disconnect handling.

4. **SSE scenario tests** — validate intelligence service event flow end-to-end.

### iOS Testing (Medium ROI, Strategic)

**CoreBluetoothMock (Nordic Semiconductor)** — The game-changer. Drop-in replacement for CoreBluetooth that runs on simulator. Define a mock peripheral matching the collar's GATT profile, and all BLE tests run in CI without hardware. This is built by Nordic, the chip vendor most BLE products use.

**Maestro** (maestro.dev) — YAML-based E2E testing. An AI agent can write and iterate on Maestro flows without understanding XCUITest APIs. Example: `tapOn: "Get Started"`, `assertVisible: "Welcome"`. This is the most AI-agent-friendly testing tool we found.

**CI requirement:** iOS testing requires a Mac with Xcode. No way around this. Options: GitHub Actions macOS runners ($0.08/min), self-hosted Mac Mini ($600 one-time), or MacStadium ($50-150/month).

### Firmware Testing (Complex, Protocol-First)

**MicroPython Unix port** — Runs MicroPython on macOS/Linux. Test all pure logic (protocol parsing, state machines, CRC, config) without hardware.

**TFLite runtime on host** — Full ML pipeline test: pre-recorded bark WAV → MFCC extraction → TFLite inference → emotion label. Validates the entire emotion detection pipeline without a dog.

**The Golioth model** (gold standard for embedded CI): Raspberry Pi as self-hosted GitHub Actions runner, collar connected via USB, pytest fixtures handle flash/connect/reset. They run 530+ hardware-in-the-loop tests per PR.

**Key insight from Fitbit's Golden Gate project:** They invested heavily in making firmware simulatable by abstracting BLE transport behind IP-based protocols. Pattern: test the protocol on host, test the hardware integration on device.

---

## 7. The Scenarios Structure: External Holdout Tests

Following the StrongDM pattern (and what we did for Pie), scenario tests live **outside** the codebase. The agent building the software can't see them, can't game them. This is like a holdout set in ML — it prevents the AI from "teaching to the test."

### Why Outside the Repo?

If the tests live inside the repo, Claude can read them while coding. It can (intentionally or not) write code that passes the specific test cases without actually solving the general problem. By storing scenarios in `~/Developer/scenarios/sarama/` (not in `CollarPrototype/`), we create a genuine holdout evaluation.

### Directory Structure

```
~/Developer/scenarios/
├── pie-server/              # Already exists — 4 scenarios, all passing
├── sarama/                  # NEW
│   ├── setup.sh             # Entry point: config, health check, run all
│   ├── .env.test            # Saved config (server IP, test data paths)
│   ├── lib/
│   │   ├── fake_collar.py   # Sends valid binary protocol packets over TCP
│   │   ├── sse_client.py    # Connects to SSE and captures events
│   │   └── protocol.py      # Binary protocol encoder/decoder
│   ├── fixtures/
│   │   ├── bark_samples/    # Pre-recorded dog bark audio (PCM16, 16kHz)
│   │   ├── test_frames/     # Sample JPEG frames (320x200)
│   │   └── expected/        # Expected outputs for validation
│   ├── scenarios/
│   │   ├── 01-relay-health.sh        # Relay accepts connection, responds to STATUS
│   │   ├── 02-binary-protocol.sh     # Fake collar sends all 6 packet types, relay broadcasts
│   │   ├── 03-sse-emotion-flow.sh    # Emotion → Gemini translation → SSE bark event
│   │   ├── 04-sse-reconnection.sh    # SSE client reconnects, gets missed events
│   │   ├── 05-credential-failure.sh  # Bad Gemini key → explicit error (not silent)
│   │   └── 06-multi-client.sh        # Multiple iOS clients, SUB/UNSUB, backpressure
│   └── results/             # Test run output (timestamped, gitignored)
```

### How Scenarios Work

Each scenario answers ONE question and follows: **setup → execute → evaluate → report.**

```bash
#!/bin/bash
# QUESTION: Does the relay correctly broadcast all 6 binary packet types?
# PASS CRITERIA:
# 1. Fake collar connects to port 8554
# 2. Test client connects to port 8555 and subscribes
# 3. All 6 packet types received with valid CRC

# Setup: start fake collar
# Execute: send packets, capture on client side
# Evaluate: check all packet types received, CRC valid
# Report: PASS/FAIL with details
```

### CLI Integration

```bash
# Interactive (first run prompts for config)
./setup.sh

# CI mode (no prompts, JSON output, exit code = failures)
./setup.sh --ci

# Single scenario for debugging
./setup.sh --scenario 03-sse-emotion-flow
```

### Hooking Into Claude Code (Level 4.5)

Once scenarios are built, a Claude Code hook auto-runs them after test commands:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "if echo '$TOOL_INPUT' | grep -q 'pytest\\|test'; then cd ~/Developer/scenarios/sarama && ./setup.sh --ci --tag server 2>&1 | tail -20; fi",
        "timeout": 120000
      }]
    }]
  }
}
```

Claude runs tests → scenarios auto-run → failures feed back → Claude iterates → green → ship.

---

## 8. Roadmap: Level 4 → 4.5 → 5

### Where We Are Now: Level 4

```
Human → writes spec → Claude executes →
Human runs scenarios → Human reviews → Ship
```

**What we have:**
- Unified boundary framework across all components
- Interface contracts as single source of truth
- Cross-component skills for safe multi-component work
- Deployment runbook with rollback procedures
- Rich session notes and design specs per component

**What's still manual:**
- Running tests and scenarios
- Feeding results back to Claude
- Hardware verification (always manual for real device)

### Level 4.5: Automate What Can Be Automated

```
Human → writes spec → Claude executes →
Layer 1+2 scenarios run automatically → failures feed back →
Claude iterates → automated layers green →
Human runs Layer 3 (hardware) → Ship
```

**Estimated effort: ~15-20 engineering days, starting with server testing.**

| Step | What | Effort |
|---|---|---|
| 1 | Scenario infrastructure (fake collar, SSE client, protocol lib) | 1-2 days |
| 2 | Server test suite (relay, intelligence, protocol) | 2-3 days |
| 3 | iOS unit tests (SSE parsing, state transitions, protocol) | 2-3 days |
| 4 | Hook scenarios into Claude Code | 1 hour |
| 5 | CI/CD integration (GitHub Actions) | 1 day |

### Level 5: The Hardware Dark Factory

```
Spec drops → Claude implements → Layer 1+2 auto-validated →
All protocol/server/iOS-simulator tests green →
Human triggers Layer 3 (real collar + phone) → Ship
```

**Why this is still Level 5:**
- Human writes WHAT (spec) and WHY (product vision)
- Claude writes ALL the code
- Automated tests catch 95% of regressions
- Human only touches hardware for the final 5% that can't be simulated
- The human role shifts from "developer reviewing code" to "QA engineer plugging in a collar and pressing a button"

### The StrongDM Comparison

StrongDM's dark factory works because their product is pure software. They can build "digital twin universes" to test everything in simulation.

**We can't clone a dog.** But we can:
- Clone the binary protocol (fake collar simulator)
- Clone the server stack (Docker Compose)
- Clone the SSE stream (mock intelligence service)
- Clone BLE behavior (CoreBluetooth mock framework)
- Test 95% of the software this way

The remaining 5% — real sensors, real WiFi, real BLE radio, real dog barks — will always need hardware. And that's OK. **Level 5 for hardware means automating everything that CAN be automated and making the hardware testing as push-button as possible.**

---

## Artifacts Reference

All artifacts from this upgrade:

**In CollarPrototype repo** (branch: `maksu/joysmith-implementation`):

| File | Purpose |
|---|---|
| `BOUNDARY_FRAMEWORK.md` | Unified behavioral boundaries |
| `docs/contracts/*.md` | Interface contract registry (4 contracts) |
| `.claude/skills/*.md` | Cross-component skills (3 skills) |
| `.codex/skills/*/SKILL.md` | Same skills for Codex harness |
| `docs/DEPLOYMENT_RUNBOOK.md` | Coordinated deployment guide |
| `docs/plans/2026-03-23-joysmith-harness-upgrade-design.md` | Design spec |
| All `CLAUDE.md` + `AGENTS.md` files | Restructured with behavioral tiers |

**In Joysmith repo:**

| File | Purpose |
|---|---|
| `projects/sarama/assessment.md` | Full assessment with component ratings |
| `projects/sarama/journey.md` | This document |
| `projects/sarama/testing-research.md` | Detailed research: tools, approaches, priority order for automated testing |
| `templates/CLAUDE_MD_TEMPLATE.md` | New — full CLAUDE.md template |
| `templates/AGENTS_MD_TEMPLATE.md` | New — AGENTS.md template |
| `templates/INTERFACE_CONTRACTS_TEMPLATE.md` | New — multi-component contract template |
| `templates/ASSESSMENT_TEMPLATE.md` | New — 5-level assessment template |
| `templates/claude-kit/skills/cross-component-change.md` | New reusable skill |
| `templates/claude-kit/skills/system-health-check.md` | New reusable skill |
| `templates/claude-kit/skills/deploy-coordinated.md` | New reusable skill |

**PR:** [CollarPrototype #11](https://github.com/saramaxyz/CollarPrototype/pull/11)

---

*"The dark factory doesn't need to clone a dog. It needs to clone the protocol, the server, and the stream. Test what you can simulate. Touch hardware only when physics demands it."*
