---
feature: joycraft-1-1-wiki-seam
status: approved
decisions: []
---
# Joycraft 1.1: config, cleanup and the wiki seam

Max approved building 1.1 on 2026-11-02 ("let's build 1.1"). Scope comes from the
answered decisions in `docs/features/2026-11-02-field-feedback-1-0-1/brief.md`:
D1 `yaml`, D3 `report`, D4 `recipe`, D5 `split` (1.1 = new surface), D6 `seam-first`.
Research: `docs/research/2026-11-02-wiki-governance-okf-docaudit.md`.

Code lands in `joycraft-prototype` branch `field/1.1` (from `field-8`), is tagged
`field-9` and vendored here. The release is 1.1.0 (a deliberate `package.json` bump).

## Goals

1. **joycraft.yaml** (spec 1). A project-owned `joycraft.yaml` at the root sets
   `paths.features`, `paths.archive`, `paths.context`, `hooks.afterArchive` and
   `cleanup.impact`. No new dependency: a strict YAML subset parser that names the
   line of anything it does not support. With no file, 1.0.1 behavior is unchanged.
   **Done when:** a project with `paths.features: working/features` runs status,
   worktrees and archive with nothing under `docs/features/`.
2. **afterArchive hook** (spec 2). After a successful archive apply, run the
   configured command once with `JOYCRAFT_FEATURE`, `JOYCRAFT_ARCHIVE_PATH` and
   `JOYCRAFT_SOURCE_PATH`. A failing hook is reported and does not undo the archive.
3. **joycraft-cleanup** (spec 3). A report-only script and skill. Checks: finished
   features not archived; links from the context home into working or archive
   folders; broken links in context pages; context pages nothing links to;
   context pages whose mapped code (`cleanup.impact`) changed after the page last
   changed; OKF `stale_after` passed or `status: deprecated` still linked; worker
   trees Joycraft did not create. The skill proposes fixes and applies them only on
   approval.
4. **Spec-to-test trace** (spec 4). Tests name the criterion they check with
   `[AC:<criterion-id>]`. `trace.mjs` lists each criterion of a spec with its tests and
   flags untraced ones. Reviewer startup includes the trace; it reports, it does not
   block (D3).
5. **Doc Detective recipe** (spec 5). An opt-in entry in `review-tools.json` for
   projects whose docs are step-by-step procedures. No dependency (D4).

## Scope and limits

- Not in 1.1: the Feature/Spec/Task rename and per-unit archive (D2, 2.0); the
  optional `parent` field (superseded by D2); OKF frontmatter writing (cleanup only
  reads it).
- Every change keeps the JSON queue as the status authority.
