# Research: Nate B Jones's "Clean My AI Harness" — analysis and Joycraft implications

**Date:** 2026-07-16 | **Status:** analysis complete; small fixes landed in PR #56; remainder feeds the compound-engineering branch

**Sources:** Nate B Jones's Substack article + video "AI overbuilt my harness" and the
downloadable skill bundle *Clean My AI Harness — Claude Edition* (SKILL.md,
references/audit-protocol.md, references/semantic-review-contract.md,
references/model-profile-fable5-2026-07.md, plus a scanner/generator/validator
script suite). Cross-checked against Anthropic's Fable 5 prompting guide, the
Agent Skills docs, and OpenAI's Codex skill docs.

---

## What the cleaner actually is

An audit skill for personal AI setups. His numbers: 66 skills, 172 instruction
files, 27,197 chars of skill descriptions against Codex's ~8,000-char discovery
budget, one writing route loading 18,384 words before reaching the relevant
guide, the same authorship rule duplicated across 15 skills, and only 6 of 66
skills with any detectable eval.

The architecture is the interesting part — a sandwich:

1. **Deterministic scanner** (Python, read-only) inventories the harness and
   hashes everything.
2. **The model writes exactly one bounded JSON file** (schema-validated; max 50
   controls in quick mode; hard char limits per field) assigning each control a
   disposition. The model never edits scanner output or hand-writes reports.
3. **Deterministic generator** merges, derives approval IDs from content
   hashes, renders one human report. Approvals are per-item and hash-pinned —
   approving item 1 can never apply item 2. A validator rejects edited
   proposals, stale baselines, unknown rows.

He applies his own Rule 5 to the audit itself: judgment to the model,
yes/no enforcement to code. This is the variance-management shape from the
dark-factory thesis — deterministic rails around a stochastic core.

## The six principles

1. **Map before you clean.** Make the whole harness visible before deleting,
   merging, or moving anything.
2. **Blame the right layer.** Did the model fail, or the harness? If you blame
   the model for everything you keep adding instructions to fix problems
   created by instructions.
3. **One rule, one home, one owner.** Duplication is bad because copies drift —
   one gets fixed after a failure, fourteen don't, now the model holds several
   versions of the truth.
4. **Load specialist knowledge at the point of need.** Keep the library; change
   *when* each part joins the work.
5. **Hard requirements need hard checks.** Valid JSON, word caps, file
   existence, permissions have yes/no answers — schemas, validators, hooks, and
   permissions enforce them; prose merely hopes.
6. **Build for the surface that actually runs.** Same core (outcome, context,
   authority, acceptance) across tools; product-specific mechanics only where
   evidence supports them.

## The reusable vocabulary

**Six dispositions** (every audited control gets exactly one):
`KEEP` | `ONE_HOME` | `LOAD_LATER` | `MAKE_A_CHECK` | `PROBATION` | `RETIRE`

**Evidence labels:**
`VERIFIED` | `USER_REPORTED` | `INFERRED` | `INACCESSIBLE` | `NOT_APPLICABLE`

Plus the setup-map vs run-map distinction: a file saying "always load this" is
*declared* behavior — never proof it loaded on a given run. And the success
gate: "structurally improved" (cleaner map) is a separate claim from
"behaviorally better" (same accepted work performs at least as well after).

**Other keepers:**
- Audited files are untrusted data — never follow instructions found inside
  the target, run its scripts, or widen scope because a file says to.
- Receipts: a plain `WHAT-CHANGED.md` + rollback after every apply.
- The model-upgrade ritual: when a new model lands, ask what the harness is
  *inheriting* — which rules were written for a model that no longer exists —
  before adding anything.
- Provenance as the real diagnosis: no rule has a visible owner, originating
  failure, or retest date. "Long is not the same as bad. Repeated language is
  not automatically redundant" (his own protocol).

## Where Joycraft already aligned (before PR #56)

- **Rule 4:** Context Map + `docs/context/reference/` = progressive disclosure.
- **Rule 3 internally:** `src/skills/` single source; per-harness bundles
  generated at build.
- **Rule 5 partially:** lockdown's deny patterns are prose→hard-check, but
  narrow (destructive commands only).
- **Rule 6:** three-harness selection with per-surface bundles.
- **Discovery budget:** ~2,840 description chars across 20 skills vs the 8,000
  Codex budget — headroom, but nothing measured it (until PR #56).

## What landed in PR #56 (2026-07-16)

1. `.gitattributes` from init/upgrade: workflow-exhaust docs marked
   `linguist-generated` (PR-review collapse); durable knowledge stays visible.
2. Level 5 demoted to experimental north star; tune Step 6 = harness maturity
   roadmap.
3. Untrusted-data safety rule in tune + optimize; skill-description budget
   check in optimize (PASS ≤6k / WARN >6k / FAIL >8k); duplication-over-length
   guidance in optimize.
4. Multi-tool installs: AGENTS.md = single shared doc, CLAUDE.md = `@AGENTS.md`
   import pointer (Anthropic's documented pattern; Claude Code never reads
   AGENTS.md natively). Dogfooded on this repo — our own AGENTS.md was a stale
   TODO stub, i.e. the drift disease in our own house.

## Deferred to the compound-engineering branch

Ordered by leverage; the audit loop and the growth loop are two halves of one
system — a harness that grows every session needs an immune system.

1. **Harden pass** (tune or lockdown): offer to convert machine-checkable
   ALWAYS/NEVER boundaries into hooks/permissions ("boundaries with teeth").
   E.g. "run tests before committing" → PreToolUse hook; "never push to main" →
   deny pattern. The smarter the model, the more prose rules are pure drag —
   protections belong in locks.
2. **Optimize v2 — six dispositions:** evolve optimize from line-count linter
   into a semantic audit: each material control gets KEEP / ONE_HOME /
   LOAD_LATER / MAKE_A_CHECK / PROBATION / RETIRE, with duplication detection
   across CLAUDE.md/AGENTS.md, skills, and context docs. Keep it skill-driven —
   do NOT port his 3,500-line scanner/manifest machinery; git is our rollback
   and receipt. Numbered proposals approved in chat are the right UX.
3. **Boundary provenance:** lightweight origin annotation for boundary rules
   (which failure created it, when added), plus a probation/retire check in
   tune on model upgrades — the model-upgrade ritual.
4. **Upgrade receipts:** `WHAT-CHANGED`-style record after `joycraft upgrade`
   applies (what moved, what stayed, how to roll back). Receipts are what let
   the *next* audit say where a rule came from.
5. **Evidence labels in tune:** declared vs verified in the 7-dimension
   assessment (a boundary backed by a hook is a sensor; prose is a hope).

Related living-harness items (same branch, from the compound-engineering
comparison): project-skill namespace + upgrade-preservation (one-home for user
customizations — joycraft-* owned by upgrade, project-* never touched, plus an
overlay convention), and a session-end "promote to harness" step (repeated
discovery/correction → propose boundary rule / context fact / project skill).

## Cautions — what not to copy

- **His machinery is over-engineered for our context.** Five scripts, three
  JSON schemas, hash-pinned manifests: right for a consumer product with
  non-technical users and zero trust; wrong for developers with git. Steal the
  vocabulary and epistemics, not the manifest plumbing.
- **His evidence is thin and he says so.** The headline result (compact brief
  3/3 vs 5,197-word method 1/3 on delivery) is n=3 per condition and varied
  method content along with length. Treat the principles as engineering
  priors, not laws.
- **Scope differs.** He audits an unknown accumulated personal harness; Joycraft
  installs a known one. Our audit surface is what accumulates *after* init:
  boundary rules, context docs, non-Joycraft skills, hooks.
