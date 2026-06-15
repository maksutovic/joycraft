---
status: todo
owner: Maximilian Maksutovic
created: 2026-06-15
feature: harness-selection
---

# Discoveries — harness selection + harness-neutral state

**Date:** 2026-06-15
**Spec:** none (grew from a design conversation, not a decomposed feature)

## State location was a hidden cross-harness coupling
**Expected:** `STATE_PATH = .claude/.joycraft/state.json` was documented as safe because "`init` always creates `.claude/` for every harness" — treated as a universal invariant.
**Actual:** Once `init` became harness-selectable, that invariant broke: a Codex-only or Pi-only install had no reason to own a `.claude/` tree, yet the state file forced one into existence. Surfaced immediately in a codex-only smoke test.
**Impact:** State is Joycraft's own bookkeeping, not a harness artifact — it belongs in a harness-neutral home. Moved to `docs/.joycraft/state.json` (`docs/` is the one dir always created, so zero new root entries). The 2026-05-31 decision-log row had already flagged this exact risk ("If a Codex-only/Pi-only install mode ever skips creating `.claude/`"). Lesson: when a path constant's justification is "dir X always exists," that assumption is load-bearing and worth revisiting the moment install scope changes.

## Migration must carry the harness selection forward
**Expected:** Relocating legacy state (`writeVersion(dir, version, files, profile)`) was enough — `writeVersion` preserves omitted fields from existing state.
**Actual:** On a *migration* the new `docs/` state doesn't exist yet, so there's nothing to preserve *from*. Dropping the `harnesses` field meant the later `getManagedFiles()` fell back to "all three" and re-installed a `.claude/` tree on a codex-only project — exactly the smell the move was meant to kill. A dedicated migration test caught it before merge.
**Impact:** Migration code must pass every persisted decision explicitly (`profile` AND `harnesses`), because the preserve-on-omit shortcut only works when prior state exists at the target path. Any future state field needs the same treatment in `migrateLegacyVersionFile`.

## upgrade had no harness-awareness at all
**Expected:** Gating `init`'s install blocks would be sufficient.
**Actual:** `upgrade` installs the full managed-file set unconditionally — a codex-only project that ran `upgrade` got a complete `.claude/` tree back. Gating init without gating upgrade leaves the footprint leak half-fixed.
**Impact:** Required persisting the harness selection in state.json so `upgrade` (which can't prompt) can honor it. The pattern: any per-harness gating in `init` needs a mirror in `upgrade`, fed by persisted state, with an all-three fallback for pre-field installs.
