# Pie Agent Regression Fix — Implementation Plan

> **Design Spec:** `pie-regression-fix-design.md`
> **Date:** 2026-03-23
> **Estimated Tasks:** 6 (Phase 1 only — Phase 2 is a separate plan)
> **Target:** Demo-ready by end of week

---

## Prerequisites

- [ ] Design spec reviewed and approved
- [ ] Access to pie-server repo at `/Users/compiler/Developer/clients/pie-server`
- [ ] Valid test credentials for at least one integration (PostHog or RevenueCat)
- [ ] Supabase project running with Vault accessible
- [ ] Required context: Read `docs/specs/2026-03-22-agent-behavior-fixes.md` and `docs/handoffs/2026-03-22-atharva-handoff.md` in the pie-server repo

## Execution Directive

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Complete each task fully before moving to the next. Commit after each task. Start a FRESH SESSION for this plan — do not carry over context from the research/brainstorming session.

---

## Task 1: Credential Validator Module

**Goal:** A module that validates each integration's credentials by making a lightweight API call, returning success/failure per integration.

**Files:**
- Create `src/agent/credential-validator.ts`

**Steps:**
1. Create `credential-validator.ts` with a `validateCredential(integration: Integration)` function
2. For each integration type, make a minimal API call:
   - PostHog: `GET https://app.posthog.com/api/projects/` with `Authorization: Bearer ${api_key}`
   - RevenueCat: `GET https://api.revenuecat.com/v2/projects` with `Authorization: Bearer ${secret_key}`
   - Stripe: `GET https://api.stripe.com/v1/balance` with `Authorization: Bearer ${api_key}`
   - App Store Connect: Attempt JWT generation from the credential fields (validate key_id, issuer_id, and private_key_base64 are present and non-empty — actual JWT signing verification is optional for v1)
3. Return `{ integration: string, valid: boolean, error?: string }` for each
4. Use a 5-second timeout per validation call — don't let one slow service block session creation
5. Run all validations in parallel with `Promise.allSettled`
6. Export a `validateAllCredentials(integrations: Integration[])` that returns the full results array

**Verification:**
- [ ] Import and call `validateCredential` with a known-good PostHog key — returns `{ valid: true }`
- [ ] Call with a garbage key — returns `{ valid: false, error: "401 Unauthorized" }`
- [ ] Call with an empty credential object — returns `{ valid: false, error: "missing api_key field" }`
- [ ] TypeScript compiles: `pnpm build`

**Commit:** `feat: add credential validator module for pre-session validation`

---

## Task 2: Integrate Validation into Session Creation

**Goal:** Session creation validates credentials before spawning the agent, creates session with only valid integrations, and returns credential errors in the response.

**Files:**
- Modify `src/agent/agent-session.ts` (or wherever session creation lives)
- Modify the session creation route handler

**Steps:**
1. After resolving integrations from Vault, call `validateAllCredentials(integrations)`
2. Split integrations into `validIntegrations` and `credentialErrors` based on validation results
3. Build MCP configs using ONLY `validIntegrations`
4. Build `allowedTools` dynamically from only the valid integration types
5. Return updated session creation response:
   ```typescript
   {
     session_id: session.id,
     connected_integrations: validIntegrations.map(i => i.type),
     credential_errors: errors.map(e => ({ integration: e.integration, detail: e.error }))
   }
   ```
6. Log both successes and failures at appropriate levels (info for success, warn for failures)

**Verification:**
- [ ] Create session with valid credentials — response includes `connected_integrations` with correct list
- [ ] Create session with one valid + one invalid — response shows partial success
- [ ] Server logs show validation results for each integration
- [ ] Agent is spawned with only the valid integrations' MCP tools
- [ ] `pnpm build` passes

**Commit:** `feat: validate credentials before session creation, support partial sessions`

---

## Task 3: Add System Prompt

**Goal:** The agent has a clear identity and behavioral rules that prevent fallback to generic assistant behavior.

**Files:**
- Modify `src/agent/sdk-config.ts` (or wherever SDK options are built)

**Steps:**
1. Add a `systemPrompt` (or `instructions` depending on the SDK API) to the agent configuration:
   ```
   You are Pie, a growth analytics co-pilot for mobile app developers.

   Your job is to help users understand their app's growth metrics by querying their connected services (PostHog, RevenueCat, Stripe, App Store Connect) via MCP tools.

   RULES:
   - ALWAYS use MCP tools to answer data questions. Never guess or make up metrics.
   - If an MCP tool call fails or returns an error, tell the user clearly: "The [service] integration returned an error. Your API key may need to be updated in the Pie app settings." Do NOT give step-by-step instructions for navigating service dashboards.
   - When asked to implement growth experiments or make code changes, use GitHub MCP tools to create branches and PRs.
   - Do NOT use Bash, Read, Grep, Edit, Write, or other filesystem tools for data analysis. You are analyzing the USER's app metrics, not the Pie server codebase.
   - Present data clearly with tables and actionable insights.
   - When generating reports, structure them with: Key Metrics Summary, Trends, Anomalies, Recommendations.
   ```
2. Verify the system prompt is being passed correctly by checking SDK init logs
3. NOTE: Check the Claude Code SDK / Agent SDK docs for the correct parameter name — it may be `system`, `instructions`, `systemPrompt`, or set via a different mechanism. Read the SDK source or docs first.

**Verification:**
- [ ] Send "How are my DAUs looking?" with valid PostHog credentials — agent uses `mcp__posthog__*` tools, NOT ToolSearch/Bash/Grep
- [ ] Send a question with NO integrations connected — agent explains it doesn't have any services connected, asks user to set up integrations in the app
- [ ] Agent does NOT give "go to your RevenueCat dashboard" style instructions
- [ ] `pnpm build` passes

**Commit:** `feat: add system prompt establishing agent as growth co-pilot`

---

## Task 4: MCP Connection Status Detection & Reporting

**Goal:** After SDK initialization, detect which MCP servers connected successfully and report failures via SSE to the Mac app.

**Files:**
- Modify the SDK event handler (wherever `init` events are processed)
- Modify SSE stream handler to support new `mcp_status` event type

**Steps:**
1. In the SDK init event handler, extract `mcp_servers` status array
2. Log the status of each MCP server (info for connected, warn for failed)
3. Send an `mcp_status` SSE event to the Mac app:
   ```typescript
   sendSSE({
     type: 'mcp_status',
     servers: mcpStatuses.map(s => ({
       name: s.name,
       status: s.status,
       error: s.status !== 'connected' ? `MCP server ${s.name} status: ${s.status}` : undefined
     }))
   });
   ```
4. If ANY MCP server has status `failed` after init, log a warning with the full status array

**Verification:**
- [ ] Create session with valid credentials — SSE stream includes `mcp_status` event with all servers `connected`
- [ ] Intentionally use a bad credential (bypassing validation for testing) — `mcp_status` shows the server as `failed`
- [ ] Mac app can parse the new `mcp_status` event type (or at minimum, it doesn't break on receiving it)
- [ ] `pnpm build` passes

**Commit:** `feat: detect and report MCP connection status via SSE`

---

## Task 5: Update CLAUDE.md (pie-server)

**Goal:** CLAUDE.md accurately reflects current architecture and has boundary tiers.

**Files:**
- Modify `/Users/compiler/Developer/clients/pie-server/CLAUDE.md`

**Steps:**
1. Update the architecture description to reflect Supabase (auth, Vault, JWT verification)
2. Remove or update any references to the old BYOK-in-request-body flow
3. Add boundary tiers at the top:
   ```markdown
   ## Behavioral Boundaries

   ### ALWAYS
   - Run `pnpm build` before committing
   - Validate credentials before creating agent sessions
   - Log MCP server connection status on session creation
   - Update this CLAUDE.md when architecture changes

   ### ASK FIRST
   - Modifying MCP server configurations in src/mcp/
   - Changing the credential resolution flow (agent-session.ts)
   - Modifying JWT auth middleware
   - Adding new MCP integrations

   ### NEVER
   - Commit code that doesn't compile
   - Remove or weaken credential validation
   - Allow the runtime agent to read this CLAUDE.md (settingSources must stay empty)
   - Store credentials outside of Supabase Vault
   ```
4. Add invariants section:
   ```markdown
   ## Invariants (Must Always Hold)
   - The headless agent MUST have a system prompt establishing its role as a growth co-pilot
   - MCP server connection failures MUST be detected and reported via SSE
   - Credential validation MUST happen before agent session creation
   - `settingSources: []` MUST remain set to prevent runtime agent from reading CLAUDE.md
   ```

**Verification:**
- [ ] CLAUDE.md accurately describes Supabase architecture
- [ ] Boundary tiers are at the top, before project context
- [ ] Invariants section exists
- [ ] No references to the old BYOK-in-request-body flow remain
- [ ] File is under 200 lines

**Commit:** `docs: update CLAUDE.md for Supabase architecture, add boundary tiers and invariants`

---

## Task 6: End-to-End Verification

**Goal:** Confirm the full flow works: Mac app → server → credential validation → agent session → MCP tool call → data returned via SSE.

**Steps:**
1. Start the server locally: `pnpm dev`
2. Test via curl (or Mac app if available):
   - Create session with valid PostHog key from Vault
   - Send "How are my DAUs looking?"
   - Verify: SSE stream shows `mcp_status` with PostHog connected
   - Verify: Agent calls `mcp__posthog__*` tool (NOT ToolSearch or Bash)
   - Verify: Agent returns real data with insights
3. Test failure case:
   - Update a Vault credential to a known-bad value
   - Create session — verify `credential_errors` in response
   - Verify: Agent explains the service is unavailable, doesn't give IT support instructions
4. Test partial session:
   - Have one valid and one invalid credential
   - Verify: Session creates with valid integration only
   - Verify: Agent uses the valid integration's tools and notes the other is unavailable
5. Create session note in `docs/claude-sessions/` documenting what was fixed and how

**Verification:**
- [ ] All Phase 1 verification items from the design spec pass
- [ ] Session note created
- [ ] Server is demo-ready

**Commit:** `docs: add session note for regression fix verification`

---

## Rollback Plan

If something goes wrong mid-implementation:
- Each task is independently committable — revert to the last good commit
- The credential validator (Task 1) is additive and can be disabled by commenting out the call in Task 2
- The system prompt (Task 3) can be removed without affecting other changes
- The MCP status detection (Task 4) is additive and doesn't change existing behavior
- If the whole approach fails: `git stash` and return to `feat/supabase-integration` branch state

---

## After Implementation

1. Copy this plan + the design spec into the pie-server repo: `docs/superpowers/specs/` and `docs/superpowers/plans/`
2. Apply the same CLAUDE.md updates to the Pie MacOS repo
3. Create Phase 2 plan for hardening (tool restrictions, schema validation, smoke tests, cross-repo contract)
4. Consider applying the boundary framework and spec templates to both Pie repos as a baseline
