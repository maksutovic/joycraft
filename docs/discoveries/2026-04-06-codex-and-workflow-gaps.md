# Discoveries — Codex Skills & Workflow Gaps

**Date:** 2026-04-06
**Spec:** `docs/specs/2026-04-06-create-codex-skill-sources.md` (and related)

## Interview/new-feature duplicate the interview step
**Expected:** The interview → new-feature pipeline would be a smooth handoff
**Actual:** new-feature has its own built-in interview (Phase 1), so users who run interview first then new-feature do the interview twice
**Impact:** Need to make new-feature detect existing draft briefs in `docs/briefs/` and offer to formalize them instead of re-interviewing. This is captured in the draft brief `docs/briefs/2026-04-06-readme-and-workflow-improvements-draft.md`.

## Research and design skills are orphaned from the workflow
**Expected:** Skills would naturally chain: interview → research → design → decompose
**Actual:** No skill handoff mentions research or design. The interview skill hands off to new-feature/decompose. New-feature goes interview → brief → decompose. Even research skips design. The creator himself skips these steps because nothing nudges him there.
**Impact:** The research → design pipeline was added (2026-03-30) but never wired into the existing skill handoffs. Needs handoff updates across interview, new-feature, research, and their Codex counterparts.
