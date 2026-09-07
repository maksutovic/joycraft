---
status: todo
owner: Maximilian Maksutovic
created: 2026-09-06
feature: 2026-09-05-reliable-updates
---

# Discoveries — npm metadata readiness

**Date:** 2026-09-06
**Spec:** ../features/2026-09-05-reliable-updates/specs/verify-registry-promotion.md

## A normal installation does not exercise every npm metadata cache

**Expected:** Warming a compact packument cache and running an ordinary package installation would reproduce the failed `npm exec` launch.

**Actual:** The examined npm 10 client requests full metadata during installation. `npm exec` first resolves compact metadata, then enters the installation path. The local HTTP registry fixture recorded distinct Accept headers and request sequences.

**Impact:** Keep both cache modes in release readiness. Compact-cache verification must use a real `npm exec` consumer, not relabel an ordinary installation. The production adapter is checked by `tests/release-consumer-process.test.ts`.
