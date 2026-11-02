---
status: todo
owner: Maximilian Maksutovic
created: 2026-11-02
feature: 2026-11-02-field-feedback-1-0-1
---

# Discoveries — release verification after 1.0

**Date:** 2026-11-02
**Spec:** ../features/2026-11-02-field-feedback-1-0-1/brief.md

## The automatic release does not set the release notes

**Expected:** CI bumps the version and the release fields follow.

**Actual:** CI bumped `version` to 1.0.1 and left `joycraft.release` at 1.0.0. `tests/public-docs.test.ts` requires them to match, so the publish failed (fixed in #83).

**Impact:** A release PR sets `version`, `joycraft.release`, `joycraft.summary` and `src/joycraft-release.json` `releaseVersion` together. `docs/guides/releasing.md` says so.

## The previous-version check changed meaning at 1.0

**Expected:** The release check that runs the previous version's `init` works for every previous version.

**Actual:** Since 1.0, `init` without `--yes` only previews and exits 1. The 1.0.0 release passed only because its previous version was 0.7, which applied without `--yes`. The 1.0.1 publish failed a second time on this (fixed in #85: `init . --yes`).

**Impact:** When a CLI default changes, the release check that runs the old CLI must use arguments that work on both sides. The fixture CLI in `tests/release-consumer-process.test.ts` now models the 1.x preview.
