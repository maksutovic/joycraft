---
name: joycraft-cleanup
description: Audit project docs and the AGENTS.md context map for rot (stale claims, finished plans and logs, contradictions, dead paths, drifted authorities, unreachable pages), check each claim against the code, propose trimming an AGENTS.md that is too long, and change only what the user approves. Use for "clean up the docs", "audit the docs", "what in our docs is stale", "AGENTS.md is too long", after a feature is archived, or when cleanup.mjs reports findings.
compatibility: Requires Node.js 22+ and the installed .joycraft runtime. Git improves the code-drift and worktree checks.
---

# Joycraft Cleanup

Keep project docs true and the context map lean. Treat every doc claim as a
hypothesis and the repository as the evidence. The homes the map points to must
state the current truth; see [knowledge guidance](../../../.joycraft/references/knowledge.md)
for that rule. This method is adapted from doc-cleanup by aka-luan
([MIT](../../../.joycraft/references/doc-cleanup-LICENSE.md)), brought in by David Moshal.

Work in two passes: diagnose and report without editing, then execute only what
the user approves. Approval to edit is not approval to commit. Read
[cleanup reference](../../../.joycraft/references/cleanup.md) for the checks, the
AGENTS.md trim and the execution playbook.

## 1. Inventory

List every in-scope Markdown file (skip generated, dependency, VCS, installed
skill and runtime files, and paths the user excludes) with its line count and
role: **entry** (`AGENTS.md`, `CLAUDE.md`), **required** (an entry doc says to
read it), **reference** (read when a task needs it) or **historical** (kept for
lookup, not guidance). Follow every reading pointer in the entry docs and mark it
resolved, dead or external. Rot costs more the more often a file is read. In a
large repo, do the entry docs and their pointers first, then area by area, and say
what you have not read.

## 2. Diagnose without editing

Run `node .joycraft/runtime/cleanup.mjs` first: exit 2 means findings, and each
is evidence to confirm, not a verdict. Then read each doc for the six rot
patterns: completed-work logs, executed plans, internal contradictions, stale
claims, dead paths, and authority drift. Check every suspected hit against the
repository (file lookup, search, config, tests, Git history) and record its
location, the claim, the evidence, your confidence and the smallest disposition:
keep, correct, condense, move, archive or banner. Code proves what is
implemented, not what was intended; when a doc may define the contract, report
the mismatch as unresolved authority drift.

Mark the load-bearing content that must survive: hard rules, active decisions,
recurring traps, do-not-do lines and domain vocabulary.

An entry file loads every session, so it holds the project's identity, its rules
and the context map. When it carries file tables, folder trees, workflow or
command sections, code or data-flow walkthroughs, or gotcha lists, propose moving
each into a linked context page with a map row that says when to read it. Never
propose moving, rewording or reformatting rules: ALWAYS / ASK FIRST / NEVER lists
and any other must or never section stay exactly as they are. A gotcha that is a
rule ("Never reference absolute paths") is a rule: it stays.

## 3. Report and stop

Order findings by reading frequency × how badly they would mislead. For each,
give the claim, the evidence, the consequence and the proposed change. Then give
a per-file plan, list unresolved decisions separately, and name the load-bearing
content that will remain. Show it as a rendered page (the decision artifact for
choices, otherwise an HTML page), not only as Markdown in chat.

Stop for approval. Until the user approves, change no file in the project: no
edits, no new pages, no "safe" fixes.

## 4. Execute the approved plan

Apply only approved changes, re-checking each fact against the code just before
writing it, with the playbook in the cleanup reference. Never delete a context
page to clear a finding; merge or redirect it. When the code does not settle a
fact, record the question in the owning brief rather than inventing an answer.
Remove an unknown worktree only after checking it for unmerged work.

## 5. Verify and hand off

Run `cleanup.mjs` again. Check that every link in touched files resolves, that
archives match their sources, that the load-bearing content survives (rules
byte-identical), that only approved Markdown changed, and that no new
contradiction appeared. Report the changed files, archive mappings, remaining
findings with reasons and unresolved decisions. Offer a docs-only commit with a
specific message; commit only when the user says yes.
