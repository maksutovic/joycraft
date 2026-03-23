# Sarama CollarPrototype — Joysmith Assessment

**Date:** 2026-03-23
**Repo:** `CollarPrototype` (monorepo)
**Assessed by:** Claude Opus 4.6 + 6 parallel analysis agents

## Product

Sarama is an intelligent dog collar that translates canine emotions in real-time via audio + video analysis. Distributed system: firmware (OpenMV/MicroPython) → relay server (Python) → iOS app (Swift/UIKit) + intelligence service (Gemini AI) + upscale service (Real-ESRGAN ML pipeline).

## Current Level: 3.5 (weighted average)

| Component | Level | Key Strength | Critical Gap |
|---|---|---|---|
| Root (monorepo) | 3.5-4 | Strong specs, dual harness (.claude + .codex) | No unified boundary framework, no E2E tests |
| Firmware | 3.5 | Exceptional hardware gotchas docs, real HW tests | No skills, no holdout scenarios, boundaries untiered |
| iOS App | 3-3.5 | Rich session docs (16 sessions), brand integration | Zero test coverage, no boundaries, God Object |
| Server | 3.5-4 | Zero-dep relay, multi-phase specs | Relay untested (3K LOC, 0 tests), no E2E scenarios |
| Upscale Service | 3 | Clean code, clear constraints | Zero tests, no scenarios |
| Tauri (SD Lab) | 1-2 | Solid Rust streaming architecture | No CLAUDE.md, no tests, no specs |

## Cross-Cutting Themes

1. **Testing is the universal gap** — every component lacks external scenarios
2. **Boundaries exist but aren't structured** — no consistent Always/Ask First/Never tiers
3. **Skills are firmware-only** — server, iOS, cross-component have zero
4. **Interface contracts documented but not enforced** — no contract tests
5. **Session management good but inconsistent** across components

## Upgrade Plan

**Approach:** Top-down with interface contracts (see design spec in CollarPrototype repo)
**Target:** Level 4 (Developer as PM) with 4.5 path
**Branch:** `maksu/joysmith-implementation`

### Phases
1. Root harness (boundary framework, contract registry, root CLAUDE.md/AGENTS.md)
2. Cross-component skills (3 new skills)
3. Component CLAUDE.md/AGENTS.md upgrades (all 4 active components)
4. Deployment runbook

### Deferred (Level 4.5)
- External scenario test suites (per-component)
- CI/CD automation
- Tauri harness (separate concern)
- Component-specific skills (server-deploy, ios-device-test)
- Code refactoring (God Objects, missing tests)
