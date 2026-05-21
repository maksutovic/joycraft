# Stack-Aware Scenario Testing — Draft Brief

> **Date:** 2026-03-26
> **Status:** Decomposed
> **Origin:** /joycraft-interview session

---

## The Idea

The Level 5 QA scenario agent has a fundamental gap: it assumes the thing being tested can be exercised by running unit tests or CLI commands. This works for libraries and CLI tools (like Joycraft itself), but falls apart for web apps, mobile apps, and anything with a UI. A Next.js app needs a browser. An iOS app needs a simulator. The QA agent needs *something to test against*, and that something varies by stack.

The idea is to make Joycraft's scenario testing stack-aware. When `detectStack()` identifies the project type, the QA agent gets instructions for the right testing backbone — Playwright for web, Maestro for mobile, HTTP requests for APIs, native test runners for libraries. Joycraft doesn't build any of these tools. It teaches the QA agent which tool to use and how to generate tests for it.

This also preserves the core Level 5 principle: the QA agent must be separated from the implementation agent. It tests against the app's behavior, not its source code. For web apps, that means testing against a preview URL or localhost. For mobile, that means testing against a simulator running the built app. The QA agent writes test files and reports — never source code.

## Problem

The Level 5 scenario QA agent currently only works for projects where `pnpm test` (or equivalent) exercises the full behavior surface. This excludes:

- **Web apps** (Next.js, Vite, etc.) — need a browser to test UI flows
- **Mobile apps** (React Native, Flutter, native iOS/Android) — need a simulator/emulator
- **Full-stack apps** — need both API testing and UI testing
- **Desktop apps** — need the app running

Without stack-aware testing guidance, the QA agent either can't test meaningfully or falls back to testing only the API/logic layer, missing the UI entirely. Praful flagged this gap from real experience with hardware/firmware projects where the "thing being tested" isn't just code.

## What "Done" Looks Like

1. **`detectStack()` informs testing strategy.** When Joycraft detects a Next.js app, it knows the QA agent should use Playwright. When it detects React Native, it knows to use Maestro. When it detects a Go CLI, it knows to run binaries and check stdout.

2. **QA agent gets stack-specific instructions.** The scenario testing skill/template includes a section per stack type explaining: what tool to use, how to generate tests, how to run them, what output to read.

3. **The separation principle holds.** The QA agent still cannot write source code. It generates test files (Playwright specs, Maestro YAML flows, HTTP request scripts) and reports results. The implementation agent is the only one that touches source.

4. **Graceful degradation.** If the full UI testing tool isn't available (no simulator, no browser), the QA agent falls back to the deepest testable layer — API requests, unit tests, or static analysis. Something is always testable.

## Testing Backbone by Stack

| Stack | Detected By | Primary Tool | Test Format | What QA Agent Generates |
|-------|------------|-------------|-------------|------------------------|
| Next.js / Vite / web apps | `package.json` deps | Playwright (Agents API) | TypeScript specs | `.spec.ts` files, run headlessly |
| React Native | `react-native` in deps | Maestro (preferred) or Detox | YAML flows or Jest specs | `.maestro/*.yaml` or `e2e/*.test.ts` |
| Flutter | `pubspec.yaml` | Maestro | YAML flows | `.maestro/*.yaml` |
| Native iOS | `.xcodeproj` / `Package.swift` | Maestro (or XCUITest) | YAML flows (or Swift) | `.maestro/*.yaml` |
| Native Android | `build.gradle` | Maestro (or Espresso) | YAML flows (or Kotlin) | `.maestro/*.yaml` |
| CLI tools / libraries | No UI framework detected | Native test runner | Language-native tests | Test files in project's test dir |
| API-only backends | Express/FastAPI/etc. | HTTP requests (Playwright API testing or curl) | Request scripts | API test specs |
| Python packages | `pyproject.toml` / `setup.py` | pytest | Python test files | `tests/*.py` |
| Rust crates | `Cargo.toml` | cargo test | Rust test modules | `tests/*.rs` |
| Go modules | `go.mod` | go test | Go test files | `*_test.go` |

## Testing Layers (Graceful Degradation)

For any given app, the QA agent tests at the deepest accessible layer:

| Layer | What's Tested | Requirements | Fallback If Unavailable |
|-------|-------------|-------------|------------------------|
| **Layer 4: Full UI** | End-to-end user flows through the actual UI | Browser (web) or simulator (mobile) | Drop to Layer 3 |
| **Layer 3: API/Endpoints** | HTTP requests against running server | Dev server or preview URL | Drop to Layer 2 |
| **Layer 2: Business Logic** | Unit/integration tests on non-UI code | Test runner only | Drop to Layer 1 |
| **Layer 1: Static Analysis** | Type checking, lint, build succeeds | Build toolchain only | Report "unable to test meaningfully" |

## Key Tool Details

### Playwright (Web — Primary)
- v1.56+ has built-in AI Agents: Planner, Generator, Healer
- `--loop=claude` flag for direct Claude Code integration
- Runs headlessly in CI on Linux (cheap)
- Produces JSON/JUnit XML results the QA agent can parse
- The QA agent can generate tests, run them, and self-heal failures — all via CLI

### Maestro (Mobile — Primary)
- Declarative YAML format — extremely LLM-friendly (~15 core commands)
- Framework agnostic: React Native, Flutter, native iOS, native Android
- Has an MCP server for AI agent integration
- `assertWithAI` for natural-language assertions
- One CLI install (`curl -Ls "https://get.maestro.mobile.dev" | bash`)
- iOS simulator only (no physical devices)
- CI: self-hosted emulator (free) or Maestro Cloud ($250/device/month)

### Detox (React Native — Alternative)
- Gray-box testing with automatic idle synchronization (no `sleep()` hacks)
- JavaScript/TypeScript test format (Jest)
- React Native only (Android native apps not supported)
- Heavy setup (Xcode, Android SDK, applesimutils)
- macOS required for iOS (10x CI cost)
- Best for teams already using Detox who want AI-generated tests

## Constraints

- **Joycraft does not bundle or install testing tools.** It generates guidance and templates. The user installs Playwright/Maestro/Detox themselves.
- **Mobile UI testing is guidance-tier, not first-class.** Web (Playwright) is the only fully automated path. Mobile requires user setup of simulators/emulators.
- **The separation principle is non-negotiable.** QA agent writes test files and reports only. Never source code.
- **No paid service dependencies.** Maestro Cloud, Percy, BrowserStack are mentioned as options but never required.

## Open Questions

- **How does the QA agent get a URL to test against?** For web: does it start the dev server itself, or does it expect a preview deploy URL? Both?
- **Maestro YAML generation quality** — has anyone validated LLM-generated Maestro flows at scale? We should prototype this.
- **Should Joycraft detect whether Playwright/Maestro is installed** and prompt the user to install it, or just assume?
- **How do we handle auth flows in scenario tests?** Most apps require login. The QA agent needs test credentials or a way to bypass auth.
- **Visual regression** — should we recommend Argos/Chromatic/Percy as an optional layer, or is that scope creep?
- **What about Expo?** Detox doesn't officially support it. Maestro does. This matters for the React Native detection path.
- **CI cost guidance** — should Joycraft warn users about macOS runner costs for mobile testing?

## Out of Scope (for now)

- **Building a testing tool.** Joycraft composes existing tools, it doesn't build new ones.
- **Desktop app testing.** Electron (use Playwright), native macOS/Windows (use Computer Use or platform-specific tools) — too fragmented to support well.
- **Physical device testing.** Both Maestro and Detox are simulator-only for iOS. Physical device testing requires cloud services.
- **Performance/load testing.** Different concern entirely.
- **Flaky test detection/healing.** Playwright Agents has self-healing built in. Maestro has retry. We don't need to build this.

## Raw Notes

- Praful raised this gap from real experience: "if they don't have access to the codebase OR the app itself, how can they test?"
- The current Level 5 scenario testing worked by accident — Joycraft tests are pure logic (pnpm test), no UI needed
- Playwright Agents API (v1.56+) is the single biggest unlock — it was literally designed for AI-driven test generation
- Maestro's YAML is arguably the most LLM-friendly test format in existence — ~15 commands, declarative, no code
- Maestro has an MCP server already — Claude Code can talk to it natively
- `assertWithAI` in Maestro lets you write "verify the total matches the cart" instead of exact element selectors
- Mobile UI testing is a trillion-dollar problem — we explicitly don't try to solve it, we compose tools that partially solve it
- The "graceful degradation" model (Layer 4 → 3 → 2 → 1) ensures the QA agent always has something to test, even without full UI access
- Detox is React Native only on Android — this is a documented, unresolved blocker
- macOS CI runners cost 10x Linux — real factor for mobile testing in CI
