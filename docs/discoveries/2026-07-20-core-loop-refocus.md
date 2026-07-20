---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-20
feature: 2026-07-16-core-loop-refocus
---

# Discoveries — core-loop refocus (PR #56)

**Date:** 2026-07-20
**Spec:** docs/features/2026-07-16-core-loop-refocus/brief.md (brief-only feature)

## Our own AGENTS.md was a stale stub — the drift disease in our own house
**Expected:** The repo's CLAUDE.md and AGENTS.md siblings carry equivalent instructions.
**Actual:** AGENTS.md was an auto-generated TODO stub with generic boundaries. Every Codex/Pi session in this repo ran without the real rules — no scenarios-repo NEVER rules, no feature-branch flow, no template/skill ASK FIRST.
**Impact:** Two full sibling instruction files drift silently; nobody notices because each tool only reads its own. The `@AGENTS.md` pointer layout (now shipped) makes drift structurally impossible. Worth checking any other multi-tool repo for the same rot.

## Claude Code never reads AGENTS.md natively
**Expected:** Newer Claude Code versions might pick up AGENTS.md as a fallback when CLAUDE.md is absent.
**Actual:** Docs-verified: Claude Code reads only CLAUDE.md, ever. The documented multi-tool pattern is a CLAUDE.md containing `@AGENTS.md` (+ optional Claude-specific section). Import semantics: full expansion, max 4 hops, `@` inside code fences stays literal, relative paths resolve against the importing file.
**Impact:** The pointer is mandatory, not a nicety — a repo with only AGENTS.md is invisible to Claude Code. Init's multi-tool layout depends on this being generated, never assumed.

## A claude|codex-shared conditional block encoded one harness's behavior
**Expected:** Text inside a shared `<!-- harness:claude|codex -->` block is true for both harnesses.
**Actual:** decompose's handoff text claimed "fresh-context subagent per spec" — Codex has no subagents; the claim was false for one of the block's own audiences the day it was written.
**Impact:** Shared conditional blocks are their own drift surface: when per-harness behavior diverges (as implement-feature's did), audit every shared block that describes that behavior. Execution-neutral wording is the safe default in shared blocks.

## `gh pr edit` is broken by the Projects-classic deprecation
**Expected:** `gh pr edit N --body-file f` updates the PR body.
**Actual:** It dies on a GraphQL error (`repository.pullRequest.projectCards` — Projects classic sunset) before applying the edit, twice, with the body unchanged. The failure prints a deprecation *warning* that reads as benign — verify, don't trust it.
**Impact:** Use the REST API for PR body edits in this repo: `gh api repos/<owner>/<repo>/pulls/<N> -X PATCH -F body=@file`. Recorded in institutional knowledge.

## Upgrade backfills run even when everything is "Already up to date"
**Expected:** `upgrade` might early-exit before applying new scaffolding when no managed files changed.
**Actual:** The gitignore-profile and gitattributes application runs before the up-to-date check, so existing projects get new scaffolding (e.g. `.gitattributes`) on the next upgrade regardless.
**Impact:** New init-time scaffolding wired at that call site reaches existing projects for free — the right place to hook future backfills.
