---
name: Sarama CollarPrototype project context
description: AI dog collar monorepo — firmware, iOS, server, upscale service. Joysmith Level 4 upgrade in progress on branch maksu/joysmith-implementation.
type: project
---

Sarama CollarPrototype is an intelligent dog collar system at /Users/compiler/Developer/Sarama/CollarPrototype.

**Components:** firmware (OpenMV/MicroPython), iOS app (Swift/UIKit), relay server (Python), intelligence service (Gemini SSE), upscale service (Real-ESRGAN), Tauri desktop lab (excluded from harness work).

**Joysmith upgrade completed (2026-03-23):** Branch `maksu/joysmith-implementation` implements Level 4 harness:
- Unified BOUNDARY_FRAMEWORK.md (Always/Ask First/Never)
- Interface contract registry in docs/contracts/ (binary protocol, SSE, TCP, BLE)
- 3 cross-component skills (change workflow, health check, deploy)
- All component CLAUDE.md/AGENTS.md restructured with behavioral tiers
- Deployment runbook

**Why:** Move from Level 3.5 to Level 4 (Developer as PM). User wants specs in → outcomes out.

**How to apply:** When working on Sarama, reference the boundary framework and contracts. Level 4.5 next steps: external scenario test suites, CI/CD automation.
