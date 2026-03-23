# Pie Dark Factory Harness Overhaul + Regression Fix — Implementation Plan

> **Design Spec:** `pie-regression-fix-design.md`
> **Date:** 2026-03-23
> **Scope:** Both repos — pie-server AND Pie MacOS
> **Estimated Tasks:** 12 (6 regression fix + 6 harness overhaul)
> **Goal:** Fix the MCP regression AND establish Level 5 harness infrastructure

---

## Overview

This plan has two tracks that can be executed in order:

**Track A (Tasks 1-6): Regression Fix** — Get MCP tools working for demo
**Track B (Tasks 7-12): Harness Overhaul** — Establish Level 5 infrastructure for both repos

Track A should be done first (demo deadline). Track B can follow immediately or in the next session.

---

## Prerequisites

- [ ] Design spec (`pie-regression-fix-design.md`) reviewed and approved
- [ ] Access to both repos:
  - pie-server: `/Users/compiler/Developer/clients/pie-server`
  - Pie MacOS: `/Users/compiler/Developer/clients/Pie`
- [ ] Valid test credentials for at least one integration
- [ ] Supabase project running with Vault accessible

## Execution Directive

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Start a FRESH SESSION for this plan. Read the design spec first.

---

# Track A: Regression Fix (pie-server)

## Task 1: Credential Validator Module

**Goal:** A module that validates each integration's credentials via lightweight API calls.

**Files:**
- Create `src/agent/credential-validator.ts`

**Steps:**
1. Create `credential-validator.ts` with `validateCredential(integration: Integration)` function
2. Per-integration validation calls:
   - PostHog: `GET https://app.posthog.com/api/projects/` with `Authorization: Bearer ${api_key}`
   - RevenueCat: `GET https://api.revenuecat.com/v2/projects` with `Authorization: Bearer ${secret_key}`
   - Stripe: `GET https://api.stripe.com/v1/balance` with `Authorization: Bearer ${api_key}`
   - App Store Connect: Validate key_id, issuer_id, private_key_base64 are present and non-empty
3. Return `{ integration: string, valid: boolean, error?: string }`
4. 5-second timeout per call. Run all in parallel with `Promise.allSettled`
5. Export `validateAllCredentials(integrations: Integration[])` returning full results array

**Verification:**
- [ ] Valid PostHog key returns `{ valid: true }`
- [ ] Garbage key returns `{ valid: false, error: "401 Unauthorized" }`
- [ ] Empty credential returns `{ valid: false, error: "missing api_key field" }`
- [ ] `pnpm build` passes

**Commit:** `feat: add credential validator for pre-session validation`

---

## Task 2: Integrate Validation into Session Creation

**Goal:** Session creation validates credentials, creates partial sessions with only valid integrations, returns errors for failed ones.

**Files:**
- Modify `src/agent/agent-session.ts`
- Modify session creation route handler

**Steps:**
1. After Vault resolution, call `validateAllCredentials(integrations)`
2. Split into `validIntegrations` and `credentialErrors`
3. Build MCP configs from only `validIntegrations`
4. Build `allowedTools` dynamically from valid integration types only
5. Return updated response: `{ session_id, connected_integrations, credential_errors }`
6. Log validation results (info for success, warn for failures)

**Verification:**
- [ ] Valid credentials → `connected_integrations` populated correctly
- [ ] One valid + one invalid → partial success response
- [ ] Agent spawned with only valid integrations' MCP tools
- [ ] `pnpm build` passes

**Commit:** `feat: validate credentials before session creation, support partial sessions`

---

## Task 3: Add System Prompt

**Goal:** Agent has clear identity as growth co-pilot with behavioral rules.

**Files:**
- Modify `src/agent/sdk-config.ts`

**Steps:**
1. Add system prompt to agent configuration (check SDK docs for correct param name — `system`, `instructions`, or `systemPrompt`):
   ```
   You are Pie, a growth analytics co-pilot for mobile app developers.

   Your job is to help users understand their app's growth metrics by querying their connected services (PostHog, RevenueCat, Stripe, App Store Connect) via MCP tools.

   RULES:
   - ALWAYS use MCP tools to answer data questions. Never guess or make up metrics.
   - If an MCP tool call fails, tell the user: "The [service] integration returned an error. Your API key may need to be updated in the Pie app settings." Do NOT give step-by-step dashboard navigation instructions.
   - When asked to implement growth experiments or make code changes, use GitHub MCP tools.
   - Do NOT use Bash, Read, Grep, Edit, Write, or filesystem tools for data analysis. You analyze the USER's app metrics, not the Pie codebase.
   - Present data with tables and actionable insights.
   - Structure reports as: Key Metrics Summary, Trends, Anomalies, Recommendations.
   ```
2. Verify prompt is passed by checking SDK init logs

**Verification:**
- [ ] "How are my DAUs?" with valid PostHog → agent uses `mcp__posthog__*`, NOT ToolSearch/Bash
- [ ] No integrations → agent explains no services connected
- [ ] Agent does NOT give "go to your dashboard" instructions
- [ ] `pnpm build` passes

**Commit:** `feat: add system prompt for growth co-pilot identity`

---

## Task 4: MCP Connection Status Detection

**Goal:** Detect MCP server connection status and report via SSE.

**Files:**
- Modify SDK event handler (where `init` events are processed)
- Modify SSE stream handler

**Steps:**
1. Extract `mcp_servers` status from SDK init event
2. Log status per server (info=connected, warn=failed)
3. Send `mcp_status` SSE event: `{ type: 'mcp_status', servers: [...] }`
4. Log warning if any server has `failed` status

**Verification:**
- [ ] Valid credentials → SSE includes `mcp_status` with all `connected`
- [ ] Bad credential → `mcp_status` shows server as `failed`
- [ ] `pnpm build` passes

**Commit:** `feat: detect and report MCP connection status via SSE`

---

## Task 5: End-to-End Verification

**Goal:** Full flow works: session → validation → agent → MCP tool call → data returned.

**Steps:**
1. Start server: `pnpm dev`
2. Test happy path: create session with valid PostHog key, send "How are my DAUs?", verify MCP tool call and real data
3. Test failure: use bad credential, verify `credential_errors` in response
4. Test partial: one valid + one invalid, verify partial session
5. Test agent behavior: verify NO ToolSearch/Bash/Grep usage for data questions

**Verification:**
- [ ] All Phase 1 verification items from design spec pass
- [ ] Agent returns real data, not IT support instructions

**Commit:** No code changes — verification only

---

## Task 6: Session Note for Track A

**Goal:** Document what was fixed.

**Files:**
- Create `docs/claude-sessions/2026-03-23-regression-fix.md`

**Steps:**
1. Use session template
2. Document: problem, root causes found, fixes applied, verification results
3. Note any remaining issues for Track B

**Commit:** `docs: session note for MCP regression fix`

---

# Track B: Dark Factory Harness Overhaul (Both Repos)

## Task 7: Rewrite pie-server CLAUDE.md

**Goal:** CLAUDE.md is under 200 lines, has boundary tiers, invariants, and accurately reflects Supabase architecture.

**Files:**
- Rewrite `/Users/compiler/Developer/clients/pie-server/CLAUDE.md`

**Steps:**
1. Start fresh. New structure:
   ```markdown
   # Pie Server — Agent Backend

   ## Behavioral Boundaries

   ### ALWAYS
   - Run `pnpm build` before committing
   - Validate credentials before creating agent sessions
   - Log MCP server connection status on session creation
   - Create session note in docs/claude-sessions/ for work over 30 min
   - Read most recent session note at start of new session

   ### ASK FIRST
   - Modifying MCP server configs (src/mcp/)
   - Changing credential resolution flow (agent-session.ts)
   - Modifying JWT auth middleware
   - Adding new MCP integrations
   - Adding new npm dependencies

   ### NEVER
   - Commit code that doesn't compile
   - Remove or weaken credential validation
   - Allow runtime agent to read this CLAUDE.md (settingSources must stay [])
   - Store credentials outside Supabase Vault
   - Push to main without explicit approval

   ## Invariants (Must Always Hold)
   - Headless agent MUST have system prompt establishing growth co-pilot role
   - MCP failures MUST be detected and reported via SSE
   - Credential validation MUST happen before session creation
   - settingSources: [] MUST remain set in SDK config
   - allowedTools MUST be dynamically built from valid integrations only

   ## Architecture
   [Updated Supabase architecture — auth, Vault, JWT, credential flow]

   ## Project Structure
   [Top-level only — 5-7 lines max]

   ## Commands
   - Dev: `pnpm dev`
   - Build: `pnpm build`
   - Lint: `pnpm lint` (if exists)

   ## Key Conventions
   [Only non-inferable items]

   ## Documentation
   - Specs: docs/superpowers/specs/
   - Plans: docs/superpowers/plans/
   - Sessions: docs/claude-sessions/
   - Patterns: docs/patterns/
   ```
2. Keep under 150 lines
3. Remove: old BYOK-in-request-body references, Quick Start (that's README), environment variable listings

**Verification:**
- [ ] Under 200 lines
- [ ] Boundary tiers at top
- [ ] Invariants section present
- [ ] Architecture reflects Supabase (not old BYOK flow)
- [ ] No inferable content (project structure trees, tech stack from package.json)

**Commit:** `docs: rewrite CLAUDE.md for Supabase architecture + Level 5 harness`

---

## Task 8: Rewrite Pie MacOS CLAUDE.md

**Goal:** Same treatment as server — boundaries, invariants, accurate architecture, under 200 lines.

**Files:**
- Rewrite `/Users/compiler/Developer/clients/Pie/CLAUDE.md`

**Steps:**
1. Same structure as Task 7 but for the Mac app context:
   ```markdown
   ## Behavioral Boundaries

   ### ALWAYS
   - Build succeeds in Xcode before committing
   - Follow MVVM + @Observable pattern
   - Use SwiftData for local persistence
   - Create session note for work over 30 min

   ### ASK FIRST
   - Adding new Swift packages
   - Changing Supabase auth flow
   - Modifying Vault read/write logic
   - Changing SSE event parsing

   ### NEVER
   - Store API keys outside Keychain or Supabase Vault
   - Commit code that doesn't build
   - Modify the credential type shapes without updating pie-server contract
   - Push to main without approval

   ## Invariants
   - Credentials MUST be stored in Supabase Vault, not local Keychain (post-migration)
   - SSE event parsing MUST handle mcp_status event type
   - Session creation response MUST handle partial success (credential_errors)
   ```
2. Keep the "Common Gotchas" section (Supabase auth client pattern etc.) — these are high-signal
3. Remove: full project structure tree, tool list that can be inferred, stale "Supabase (Minimal)" section
4. Keep under 150 lines

**Verification:**
- [ ] Under 200 lines
- [ ] Boundary tiers at top
- [ ] Invariants reflect Supabase migration
- [ ] No stale references to pre-Supabase architecture

**Commit:** `docs: rewrite CLAUDE.md for Supabase architecture + Level 5 harness`

---

## Task 9: Create .claude/skills/ for Both Repos

**Goal:** Reusable skills for common workflows in both repos.

**Files:**
- Create `pie-server/.claude/skills/new-feature.md`
- Create `pie-server/.claude/skills/session-start.md`
- Create `pie-server/.claude/skills/session-end.md`
- Create `pie-server/.claude/skills/quick-fix.md`
- Create `Pie/.claude/skills/new-feature.md`
- Create `Pie/.claude/skills/session-start.md`
- Create `Pie/.claude/skills/session-end.md`
- Create `Pie/.claude/skills/quick-fix.md`

**Steps:**
1. Copy the skill templates from `/Users/compiler/Developer/Claude-Code-Chat-General/templates/claude-kit/skills/` into both repos
2. Customize each skill for the specific repo:
   - pie-server: reference `pnpm build` as build command, reference Fastify/Agent SDK patterns
   - Pie MacOS: reference Xcode build, reference SwiftUI/SwiftData patterns
3. Update the session-start skill to reference each repo's specific docs paths
4. Update the session-end skill to reference each repo's specific build/lint commands

**Verification:**
- [ ] Both repos have `.claude/skills/` with 4 skills each
- [ ] Skills reference correct build commands per repo
- [ ] `/new-feature` would trigger the interview → spec → plan → execute workflow
- [ ] `/session-start` reads the most recent session note

**Commit (pie-server):** `feat: add .claude/skills for session management and feature workflow`
**Commit (Pie):** `feat: add .claude/skills for session management and feature workflow`

---

## Task 10: Create docs/patterns/ for Both Repos

**Goal:** Extract reusable patterns from CLAUDE.md and session notes into dedicated pattern docs.

**Files:**

**pie-server:**
- Create `docs/patterns/mcp-integration.md` — How to add a new MCP integration (file pattern, config builder, credential shape, allowedTools update)
- Create `docs/patterns/credential-flow.md` — How credentials flow from Mac app → Vault → server → MCP config (the full pipeline, post-Supabase)
- Create `docs/patterns/agent-session.md` — How agent sessions work (creation, streaming, idle timeout, cleanup)

**Pie MacOS:**
- Create `docs/patterns/vault-operations.md` — How to read/write Vault credentials (the Supabase client pattern)
- Create `docs/patterns/sse-events.md` — How to handle SSE event types from the server (including new mcp_status)
- Create `docs/patterns/supabase-auth.md` — Auth flow, JWT handling, the createClient vs createAdminClient gotcha

**Steps:**
1. Extract pattern content from existing CLAUDE.md, session notes, and handoff docs
2. Each pattern doc should be self-contained: when to use, code example, gotchas
3. CLAUDE.md should reference these with one-line pointers: `"See docs/patterns/credential-flow.md"`

**Verification:**
- [ ] pie-server has 3 pattern docs in `docs/patterns/`
- [ ] Pie MacOS has 3 pattern docs in `docs/patterns/`
- [ ] Pattern docs contain concrete code examples from the actual codebase
- [ ] CLAUDE.md references pattern docs instead of inlining the content

**Commit (pie-server):** `docs: create pattern docs for MCP, credentials, and sessions`
**Commit (Pie):** `docs: create pattern docs for Vault, SSE, and auth`

---

## Task 11: Create Cross-Repo Contract

**Goal:** Shared API contract between Mac app and server, referenced by both repos.

**Files:**
- Create `docs/contracts/client-server-api.md` in BOTH repos (identical content)

**Steps:**
1. Document the full API surface:
   - `POST /agent/session` — create session (request shape, response shape including credential_errors)
   - `POST /agent/chat` — send message (request shape, SSE event types including mcp_status)
   - `DELETE /agent/session/:id` — destroy session
2. Include exact TypeScript interfaces for all request/response shapes
3. Include the credential type union (Integration type)
4. Include SSE event type union (all event shapes the Mac app must handle)
5. Add a "Change Protocol" section:
   ```markdown
   ## Change Protocol
   When modifying the API surface:
   1. Update this contract doc in BOTH repos
   2. Bump the version number
   3. Update the design spec before implementing
   4. Both repos must be updated in the same sprint
   ```
6. Add version number: `v2.0 (post-Supabase)`

**Verification:**
- [ ] Contract doc exists in both repos with identical content
- [ ] All current endpoints documented with request/response shapes
- [ ] Credential type union matches actual code
- [ ] SSE event types include mcp_status
- [ ] Change protocol section present

**Commit (pie-server):** `docs: add client-server API contract v2.0`
**Commit (Pie):** `docs: add client-server API contract v2.0`

---

## Task 12: Consolidate docs/ Structure + Spec Templates

**Goal:** Clean up docs/ in both repos. Add spec and plan templates. Remove stale/duplicate content.

**Files:**

**pie-server docs/ cleanup:**
- Remove `docs/plans/` (migrate any active content to `docs/superpowers/plans/`)
- Ensure `docs/superpowers/specs/` and `docs/superpowers/plans/` are the canonical locations
- Add `docs/superpowers/specs/DESIGN_SPEC_TEMPLATE.md` (from our template)
- Add `docs/superpowers/plans/IMPLEMENTATION_PLAN_TEMPLATE.md` (from our template)
- Update `docs/README.md` (or create if missing) with docs directory index

**Pie MacOS docs/ cleanup:**
- Same consolidation: `docs/superpowers/` is canonical for specs and plans
- Move any active plans from `docs/plans/` to `docs/superpowers/plans/`
- Add spec and plan templates
- Add `docs/patterns/` (created in Task 10)
- Update `docs/README.md` with directory index including:
  ```markdown
  ## Documentation Structure
  - `docs/superpowers/specs/` — Design specs (what + why). Use DESIGN_SPEC_TEMPLATE.md
  - `docs/superpowers/plans/` — Implementation plans (how). Use IMPLEMENTATION_PLAN_TEMPLATE.md
  - `docs/patterns/` — Reusable code patterns and reference docs
  - `docs/claude-sessions/` — Session notes for context continuity
  - `docs/contracts/` — Cross-repo API contracts
  - `docs/handoffs/` — Team handoff documents
  ```

**Steps:**
1. Audit both repos' `docs/` for stale content (completed plans, outdated specs)
2. Move active content, archive or delete completed content
3. Copy templates from `/Users/compiler/Developer/Claude-Code-Chat-General/templates/`
4. Write or update `docs/README.md` in both repos

**Verification:**
- [ ] No duplicate plan locations (everything in superpowers/)
- [ ] Spec and plan templates present in both repos
- [ ] docs/README.md accurately describes the structure
- [ ] No stale/completed plans still listed as active

**Commit (pie-server):** `docs: consolidate docs structure, add spec/plan templates`
**Commit (Pie):** `docs: consolidate docs structure, add spec/plan templates`

---

## Rollback Plan

- Track A (Tasks 1-6) and Track B (Tasks 7-12) are independent — Track B can be reverted without affecting the regression fix
- Each task is independently committable
- CLAUDE.md rewrites: keep a backup of the originals (`CLAUDE.md.bak`) until verified
- If skills don't work as expected: `.claude/skills/` can be deleted without side effects

---

## Post-Implementation

After both tracks are complete:

1. **Test the harness:** Open a fresh Claude Code session in pie-server and try `/session-start` — it should load the latest session note and report status
2. **Test the workflow:** Try `/new-feature` for a small feature — it should interview you, write a spec, create a plan
3. **Demo prep:** Run through the full flow: Mac app → server → MCP tools → data returned
4. **Share with Atharva:** The contract doc (Task 11) gives him everything he needs to work on the server independently
5. **Consider Phase 2:** Tool restrictions, smoke tests, credential schema validation (from the design spec)
6. **Apply to other projects:** Once you're happy with how Pie's harness drives, use the same templates/skills across Diligent, Foodtrails, Shuffle, TrashBlitz, and Simmons
