---
last_updated: 2026-11-02
last_updated_by: Maximilian Maksutovic
---

# Architecture

> Where the code for each job lives. Moved out of `AGENTS.md` on 2026-11-02 and checked against `src/cli.ts` at 6c7781a. The code is the authority; fix this page when they disagree.

## The code

The package ships `dist/cli.js` (`bin`, built from `src/cli.ts`) and `payload/`. It has no library export (`main`). `src/` holds only the CLI: `cli`, `install-v1`, `payload`, `legacy-07`, `legacy-guard` and `rollback`. The 0.7 updater, its skill and template trees and their generators were removed; they are in the 0.7 git tags.

## Install flow (1.x)

```
npx joycraft@latest init|update            (src/cli.ts)
  → a 0.7 install? print the migration plan and exit 1 (src/legacy-07.ts)
      --migrate: archive known 0.7 files, keep knowledge, install 1.x, recoverable
      rollback: restore the migration backup byte for byte (src/rollback.ts)
  → else choose or reuse hosts; plan per file against .joycraft/installation.json
  → back up edited Joycraft files, never replace foreign ones, write the manifest last (src/install-v1.ts)

payload/  ← the source of the installed skills, runtime and references; edit here, then node scripts/pin-payload.mjs
```

## Key files

| File | Purpose |
|------|---------|
| `src/payload.ts` + `src/install-v1.ts` | The payload, host mapping, install/update plan and apply, doctor |
| `src/legacy-07.ts` + `src/legacy-guard.ts` + `src/rollback.ts` + `src/data/install-inventory.json` | 0.7 detection, migration, the old shell guard and rollback; known 0.7 bytes from every published release (`scripts/build-install-inventory.mjs`) |
| `scripts/pin-payload.mjs` + `scripts/release-gates.mjs` | Rewrite `payload/PIN` after a payload edit (`--check` verifies it); G10 gates against the packed tarball |
| `scripts/automatic-release.mjs` + `scripts/release-preparation.mjs` + `scripts/release-verification.mjs` | Version preparation, retained tarball, and consumer verification (the previous version's `init` runs with `--yes`) |
| `scripts/verify-publication.mjs` + `scripts/release-report.mjs` | Registry visibility checks and report reuse across publish attempts |
| `.claude/skills/release-docs-sync/` + `.agents/skills/release-docs-sync/` | Repo-local maintainer skill, committed by hand (keep both copies identical); never shipped |
| `.claude/`, `.agents/`, `.joycraft/` | This repo's own Joycraft install, written by `node dist/cli.js update .`; update it with the CLI, never by hand |
| `docs/features/<slug>/specs/` | Atomic specs for building Joycraft itself |

## Folders

| Folder | What lives here |
|--------|-----------------|
| `payload/` | The 1.x skills, runtime, references and templates (source; see above) |
| `src/` | The CLI (TypeScript) |
| `scripts/` | Release, payload pin, 0.7 inventory builder, docs-sync gate, `ste-lint.py` |
| `tests/` | Test suite; `tests/fixtures/` holds real stack manifests and real 0.7 installs (`v07/`) |
| `docs/context/` | Current project knowledge (see the context map in `AGENTS.md`) |
| `docs/features/` | Working material: one folder per feature with brief, specs and queue |
| `docs/discoveries/` | Session surprises worth remembering |
| `docs/backlog/`, `docs/bugfixes/` | Deferred work; per-area bugfix specs |
| `docs/guides/`, `docs/reference/` | How-to guides; cross-cutting reference (spec and knowledge lifecycles) |
| `docs/context/reference/` | Model profiles and other reference pages the context map links |
| `docs/research/`, `docs/vision/`, `docs/plans/` | Research notes, north-star vision, planning docs |
| `docs/specs/` | Legacy flat specs from before feature folders |
| `keller-coders-meetups/` | Meetup notes; not part of the tool |

## Gotchas

1. **Payload files use project-relative paths.** They are copied into user projects, where `/Users/...` or Joycraft repo paths do not exist.
2. **User files stay the user's.** The CLI never writes `AGENTS.md` or `CLAUDE.md`; it reports the wiring sentence for the agent instead.
3. **Payload skills link their references.** They read `.joycraft/references/` in the user's project rather than inlining context.
4. **Fixtures mirror real projects.** Files in `tests/fixtures/` are real-world manifests, not minimal stubs.
