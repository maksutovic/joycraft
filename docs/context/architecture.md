---
last_updated: 2026-11-02
last_updated_by: Maximilian Maksutovic
---

# Architecture

> Where the code for each job lives. Moved out of `AGENTS.md` on 2026-11-02 and checked against `src/cli.ts` at 6c7781a. The code is the authority; fix this page when they disagree.

## Two code paths

- **The 1.x CLI** (`bin` → `dist/cli.js`, built from `src/cli.ts`) imports only `install-v1`, `legacy-07`, `rollback` and `payload`.
- **The 0.7 updater** (`init.ts`, `upgrade.ts`, `update*.ts`, `install-manifest.ts`, `improve-claude-md.ts`, `agents-md.ts`, `folder-map.ts`) is no longer reached from the CLI. `src/index.ts` (the package `main`) still exports parts of it, and its tests still run. Change it only when a spec names it.

## Install flow (1.x)

```
npx joycraft@latest init|update            (src/cli.ts)
  → a 0.7 install? print the migration plan and exit 1 (src/legacy-07.ts)
      --migrate: archive known 0.7 files, keep knowledge, install 1.x, recoverable
      rollback: restore the migration backup byte for byte (src/rollback.ts)
  → else choose or reuse hosts; plan per file against .joycraft/installation.json
  → back up edited Joycraft files, never replace foreign ones, write the manifest last (src/install-v1.ts)

payload/  ← scripts/vendor-payload.mjs --tag field-N (never edit by hand; fix joycraft-prototype and re-vendor)
```

## Key files

| File | Purpose |
|------|---------|
| `src/payload.ts` + `src/install-v1.ts` | The vendored payload, host mapping, install/update plan and apply, doctor |
| `src/legacy-07.ts` + `src/rollback.ts` + `src/data/install-inventory.json` | 0.7 detection, migration and rollback; known 0.7 bytes from every published release |
| `scripts/vendor-payload.mjs` + `scripts/release-gates.mjs` | Vendor the field build into `payload/`; G10 gates against the packed tarball |
| `scripts/automatic-release.mjs` + `scripts/release-preparation.mjs` + `scripts/release-verification.mjs` | Version preparation, retained tarball, and consumer verification (the previous version's `init` runs with `--yes`) |
| `scripts/verify-publication.mjs` + `scripts/release-report.mjs` | Registry visibility checks and report reuse across publish attempts |
| `src/detect.ts` | Stack detection: a pure function, no side effects |
| `src/skills/` | 0.7 canonical skill sources. `src/{claude,codex,pi,copilot,omp}-skills/` are generated from it; never edit those |
| `src/local-skills/` | Repo-local maintainer skills (for example `release-docs-sync`). Synced into the installed trees by `scripts/sync-skills.mjs`; never bundled, never shipped |
| `docs/features/<slug>/specs/` | Atomic specs for building Joycraft itself |

## Folders

| Folder | What lives here |
|--------|-----------------|
| `payload/` | The vendored 1.x skills, runtime and templates (generated; see above) |
| `src/` | CLI and library (TypeScript) |
| `src/arcade/` | Experimental playground |
| `scripts/` | Release, vendoring, skill generation and sync, docs-sync gate, `ste-lint.py` |
| `templates/`, `src/templates/` | 0.7 templates (`src/templates/` is bundled and copied to `docs/templates/`) |
| `tests/` | Test suite; `tests/fixtures/` holds real-world manifest files per stack |
| `docs/context/` | Current project knowledge (see the context map in `AGENTS.md`) |
| `docs/features/` | Working material: one folder per feature with brief, specs and queue |
| `docs/discoveries/` | Session surprises worth remembering |
| `docs/backlog/`, `docs/bugfixes/` | Deferred work; per-area bugfix specs |
| `docs/guides/`, `docs/reference/` | How-to guides; cross-cutting reference (spec and knowledge lifecycles) |
| `docs/research/`, `docs/vision/`, `docs/plans/` | Research notes, north-star vision, planning docs |
| `docs/specs/` | Legacy flat specs from before feature folders |
| `docs/max-discussion-transcripts/` | Discussion transcripts (content gitignored) |
| `keller-coders-meetups/` | Meetup notes; not part of the tool |

## Gotchas

1. **Templates and skills use project-relative paths.** They are copied into user projects, where `/Users/...` or Joycraft repo paths do not exist.
2. **User notes are additive.** Joycraft adds to `AGENTS.md` and `CLAUDE.md` and never removes content. When a merge is unclear, append rather than modify.
3. **0.7 skills are self-contained.** A skill installed from `src/skills/` cannot import other files, so its context is inline. 1.x payload skills instead link `.joycraft/references/`.
4. **Fixtures mirror real projects.** Files in `tests/fixtures/` are real-world manifests, not minimal stubs.
