# Pi Support — Specs

> **Feature Brief:** `docs/features/2026-05-26-pi-support/brief.md`
> **Design:** `docs/features/2026-05-26-pi-support/design.md`

## Specs

| # | Spec | Depends On | Status |
|---|------|------------|--------|
| 0 | [sync-skills-to-per-feature-layout](./sync-skills-to-per-feature-layout.md) | — | Complete |
| 1 | [add-pi-skills](./add-pi-skills.md) | 0 | Complete |
| 2 | [add-spec-queue-manifest](./add-spec-queue-manifest.md) | — | Complete |
| 3 | [add-pi-pipeline-runtime](./add-pi-pipeline-runtime.md) | 2 | Complete (BROKEN — see #7) |
| 4 | [wire-pi-init](./wire-pi-init.md) | 1, 3 | Complete (re-verify after #7) |
| 5 | [wire-pi-upgrade](./wire-pi-upgrade.md) | 1, 4 | Complete (re-verify after #7) |
| 6 | [add-pi-tests](./add-pi-tests.md) | 1, 4 | Complete (may need updates after #7) |
| 7 | [fix-pi-extension-api](./fix-pi-extension-api.md) | — | **READY** |
| 8 | [add-api-safety-guards](./add-api-safety-guards.md) | — | **READY** |

## Execution Waves

### Wave 0 (prerequisite — must run first)
- **Spec 0** — `sync-skills-to-per-feature-layout`: Fix stale paths in Codex source skills, sync Claude collaborative-setup, move research file

### Wave 1 (parallel — after spec 0 completes)
- **Spec 1** — `add-pi-skills`: `src/pi-skills/` + bundler (needs clean Codex source from spec 0)
- **Spec 2** — `add-spec-queue-manifest`: JSON manifest in decompose
- **Spec 3** — `add-pi-pipeline-runtime`: bash scripts + extension + subagent defs

### Wave 2 (after 1 + 3 complete)
- **Spec 4** — `wire-pi-init`: detection + full Pi install in init.ts

### Wave 3 (parallel — after 4 completes)
- **Spec 5** — `wire-pi-upgrade`: Pi in managed files
- **Spec 6** — `add-pi-tests`: comprehensive test suite

### Wave 4 (post-mortem fix — parallel, independent)
- **Spec 7** — `fix-pi-extension-api`: Rewrite extension to real Pi SDK (fixes broken spec 3)
- **Spec 8** — `add-api-safety-guards`: Encode 6 preventive layers into Joycraft templates

## Dependency Graph

```
0 (fix skills) ──> 1 (Pi skills) ──┐
                                   ├──> 4 (init) ──┬──> 5 (upgrade)
                   3 (runtime) ────┘                │
                   ↑                                └──> 6 (tests)
                   2 (manifest) — independent

7 (fix extension)   — independent fix for broken spec 3
8 (safety guards)   — independent Joycraft infra improvement
```

## Estimated Total

**9 sessions total** (7 original + 2 post-mortem). Specs 7 and 8 can run in parallel.

## To Execute

Each session: `/skill:joycraft-implement docs/features/2026-05-26-pi-support/specs/<spec>.md`
End each session with `/joycraft-session-end` to capture discoveries before starting the next.
