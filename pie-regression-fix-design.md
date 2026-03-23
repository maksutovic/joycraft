# Pie Agent Regression Fix + Hardening — Design Spec

> **Status:** Draft — Pending Review
> **Date:** 2026-03-23
> **Project:** Pie (pie-server + Pie MacOS)
> **Context:** After Supabase migration, headless Claude Code agent cannot correctly use MCP tools. Agent falls back to built-in tools and gives users IT support instructions instead of querying their data.

---

## 1. Problem Statement

The Pie agent worked correctly pre-Supabase: user's BYOK credentials were sent directly in request bodies, MCP servers initialized with valid keys, and the agent queried PostHog/RevenueCat/Stripe/App Store Connect data as expected.

After the Supabase migration (March 20-22), the agent creates sessions and connects to MCP servers, but MCP tool calls fail silently. The agent then falls back to its 26 built-in Claude Code tools (Bash, Read, Grep, ToolSearch, etc.) and behaves like a generic assistant — telling users to "go to your RevenueCat dashboard and generate a new API key" instead of querying their data.

**Root cause is two problems stacked:**
1. Credentials resolved from Supabase Vault are invalid, expired, or incorrectly formatted — causing MCP tool calls to return auth errors (401)
2. The agent has no behavioral guardrails — when MCP tools fail, it silently falls back to built-in tools instead of reporting the credential error

**Evidence from server logs:**
- Session creates successfully, resolves 2 integrations (posthog, revenuecat)
- SDK initializes with 94 tools (26 built-in + 68 MCP)
- Agent's first action is `ToolSearch` (a built-in tool), not an MCP tool
- Agent tells user their "RevenueCat API access token has expired" and gives manual fix instructions
- No error logged for the MCP tool failure — it's completely silent

**Trigger:** 3+ hours of debugging could not identify the issue because failures are silent and the agent's fallback behavior masks the real problem.

---

## 2. Constraints

- [ ] MUST NOT break existing session creation, SSE streaming, or multi-provider support
- [ ] MUST work with the current Supabase Vault credential storage (Mac app writes, server reads)
- [ ] MUST support all 4 MCP integrations: PostHog, RevenueCat, Stripe, App Store Connect
- [ ] MUST support both Claude and Codex providers
- [ ] MUST ship Phase 1 (working demo) within 2-3 days (demo deadline this week)
- [ ] MUST preserve the agent's ability to use GitHub MCP for code generation (future feature)
- [ ] SHOULD NOT require changes to the Mac app's Vault writing logic (unless credential format is the root cause)
- [ ] The agent MUST be able to both analyze data AND write code (via GitHub MCP) — it should be judicious about when to use which capability, guided by a system prompt

---

## 3. Approach

### Phase 1: Fix the Regression (Demo-Ready)

Three surgical fixes, each independently valuable:

**Fix 1A: Credential Validation Before Session Creation**
Before spawning the agent, validate that each resolved credential actually works by making a lightweight API call to each service. If a credential fails, return a clear error to the Mac app (NOT to the agent) with the specific integration that failed.

| Service | Validation Call | Expected Success |
|---------|----------------|-----------------|
| PostHog | `GET https://app.posthog.com/api/projects/` with Bearer token | 200 with project list |
| RevenueCat | `GET https://api.revenuecat.com/v2/projects` with Bearer token | 200 with project list |
| Stripe | `GET https://api.stripe.com/v1/balance` with Bearer token | 200 with balance object |
| App Store Connect | Attempt to generate JWT and verify it's not expired | Valid JWT generated |

If validation fails: include the failed integration in a `credential_errors` array in the session creation response, but still create the session with the valid integrations. Users may only have 1-2 integrations configured, not all 4. The Mac app should display which integrations connected and which failed, and allow the user to chat with whatever tools are available.

```typescript
// Session creation response (partial success)
{
  session_id: "...",
  connected_integrations: ["posthog"],           // worked
  credential_errors: [                            // failed
    { integration: "revenuecat", detail: "401 Unauthorized — key may be expired" }
  ]
}
```

If ALL credentials fail validation, still create the session (the agent can explain what's wrong). If zero integrations were requested, that's also fine — the user may just want to chat.

**Fix 1B: Add System Prompt to the Agent**
The agent currently has no identity or behavioral guidance. Add a system prompt that establishes its role:

```
You are Pie, a growth analytics co-pilot for mobile app developers.

Your job is to help users understand their app's growth metrics by querying their connected services (PostHog, RevenueCat, Stripe, App Store Connect) via MCP tools.

RULES:
- ALWAYS use MCP tools to answer data questions. Never guess or make up metrics.
- If an MCP tool call fails, tell the user exactly which integration failed and that they may need to update their API key in the app settings. Do NOT give instructions about navigating service dashboards.
- When asked to implement growth experiments or make code changes, use the GitHub MCP tools to create branches and PRs.
- Do NOT use Bash, Read, Grep, Edit, Write, or other filesystem tools unless you are writing code via GitHub MCP. You are not a code assistant for the Pie server — you are a growth co-pilot for the USER's app.
- Present data clearly with tables, charts descriptions, and actionable insights.
- When generating reports, structure them with: Key Metrics Summary, Trends, Anomalies, Recommendations.
```

**Fix 1C: Detect and Report MCP Connection Failures**
After SDK initialization, check the `mcp_servers` status from the init event. If any MCP server has status `failed` or `needs-auth`, log the failure AND include it in the SSE stream as a system event so the Mac app can display it.

```typescript
// In the SDK init handler:
const mcpStatuses = initEvent.mcp_servers; // [{ name, status }]
const failed = mcpStatuses.filter(s => s.status !== 'connected');
if (failed.length > 0) {
  log.warn({ failed }, 'MCP servers failed to connect');
  // Send to Mac app via SSE
  sendSSE({ type: 'mcp_status', servers: mcpStatuses });
}
```

### Phase 2: Harden Toward Level 5 (Post-Demo)

**Fix 2A: Restrict Built-in Tools**
Change the SDK configuration to disable unnecessary built-in tools. The agent should have:
- ALL MCP tools (PostHog, RevenueCat, Stripe, App Store Connect, GitHub)
- WebFetch (for supplementary research)
- WebSearch (for looking up documentation/context)
- NO filesystem tools (Bash, Read, Write, Edit, Grep, Glob) UNLESS GitHub MCP is active

Implementation: use the `tools` option in SDK config to explicitly list allowed tools, rather than relying on `allowedTools` + `dontAsk` (which auto-approves but doesn't restrict).

**Fix 2B: Credential Format Validation**
Add a schema validation layer between Vault resolution and MCP config building. Each integration type has a known credential shape (from the MCP integrations spec). Validate the Vault response matches before passing to the MCP config builder.

```typescript
// Example: validate PostHog credential shape
function validatePostHogCredential(raw: unknown): { api_key: string } {
  const parsed = JSON.parse(raw as string);
  if (!parsed.api_key || typeof parsed.api_key !== 'string') {
    throw new Error('PostHog credential missing api_key field');
  }
  if (!parsed.api_key.startsWith('phx_')) {
    throw new Error(`PostHog api_key has unexpected format: ${parsed.api_key.slice(0, 4)}...`);
  }
  return parsed;
}
```

**Fix 2C: End-to-End Smoke Test**
Create a test script that validates the full flow: create session → send message → verify MCP tool is called → verify data is returned. This runs before every deploy and after any changes to credential resolution, MCP config, or agent session code.

**Fix 2D: Update CLAUDE.md for Both Repos**
Both repos' CLAUDE.md files are stale (still describe pre-Supabase architecture). Update with:
- Current architecture (Supabase auth, Vault credentials, JWT verification)
- Boundary tiers (Always/Ask First/Never)
- Invariants section ("Agent MUST only have MCP tools for data queries", "MCP failures MUST be detected and reported")

**Fix 2E: Cross-Repo Contract Spec**
Create a shared contract document that defines the API surface between the Mac app and pie-server. Both repos reference it. Any change to the contract requires updating the doc in both repos.

---

## 4. Affected Files

### Phase 1 (pie-server)

| Action | File Path | What Changes |
|--------|-----------|-------------|
| Modify | `src/agent/agent-session.ts` | Add credential validation before session creation |
| Modify | `src/agent/sdk-config.ts` | Add system prompt to agent configuration |
| Modify | `src/agent/chat-handler.ts` (or equivalent SSE handler) | Detect MCP connection failures from init event, send status via SSE |
| Create | `src/agent/credential-validator.ts` | Lightweight API call validation for each integration type |
| Modify | `src/mcp/integrations.ts` | Add credential format validation before building MCP configs |

### Phase 1 (Pie MacOS — if needed)

| Action | File Path | What Changes |
|--------|-----------|-------------|
| Modify | SSE event handler | Handle new `mcp_status` event type, display connection errors to user |

### Phase 2 (pie-server)

| Action | File Path | What Changes |
|--------|-----------|-------------|
| Modify | `src/agent/sdk-config.ts` | Restrict built-in tools via `tools` option |
| Create | `src/agent/credential-schema.ts` | Per-integration Vault response validators |
| Create | `bin/smoke-test.ts` or `test/e2e/mcp-flow.test.ts` | End-to-end smoke test script |
| Modify | `CLAUDE.md` | Update architecture, add boundary tiers, add invariants |

### Phase 2 (Pie MacOS)

| Action | File Path | What Changes |
|--------|-----------|-------------|
| Modify | `CLAUDE.md` | Update architecture, add boundary tiers |

### Phase 2 (shared)

| Action | File Path | What Changes |
|--------|-----------|-------------|
| Create | Both repos: `docs/contracts/client-server-api.md` | Shared API contract between Mac app and server |

---

## 5. Data Shapes

### Credential Validation Response (new)

```typescript
interface CredentialValidationResult {
  integration: string;       // "posthog" | "revenuecat" | "stripe" | "appstore"
  valid: boolean;
  error?: string;            // "401 Unauthorized" | "missing api_key field" | etc.
}
```

### MCP Status SSE Event (new)

```typescript
interface McpStatusEvent {
  type: 'mcp_status';
  servers: Array<{
    name: string;            // "posthog" | "revenuecat" | etc.
    status: 'connected' | 'failed' | 'needs-auth';
    error?: string;
  }>;
}
```

### Session Creation Response (updated shape — partial success)

```typescript
// Before: session always created, MCP failures silent
// After: session created with partial integrations, failures reported explicitly
interface SessionCreationResponse {
  session_id: string;
  connected_integrations: string[];      // ["posthog", "stripe"] — successfully validated
  credential_errors: Array<{             // failed validations (may be empty)
    integration: string;
    detail: string;                      // "401 Unauthorized" | "missing api_key field" | etc.
  }>;
}

// Only returned if Vault itself is unreachable (not per-credential)
interface SessionCreationError {
  error: 'vault_error';
  detail: string;
}
```

### Vault Credential Schemas (validation targets)

```typescript
// What we expect from Vault for each integration type:
type VaultCredential =
  | { type: "posthog";     api_key: string }           // phx_...
  | { type: "revenuecat";  secret_key: string }        // sk_...
  | { type: "stripe";      api_key: string }           // rk_... or sk_...
  | { type: "appstore";    key_id: string; issuer_id: string; private_key_base64: string; vendor_number?: string }
```

---

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|------------------|
| Vault returns empty/null for a credential | Return `credential_invalid` error to Mac app with specific integration name. Do NOT create session. |
| Vault returns credential in wrong format (e.g., raw string instead of JSON) | `credential-validator.ts` catches parse error, returns specific error. |
| Credential is valid format but expired/revoked | Pre-validation API call catches 401. Return error with "expired or revoked" detail. |
| One integration valid, another invalid | Create session with valid integrations only. Return `credential_errors` array listing failed ones. Agent only gets MCP tools for valid integrations. Mac app shows which connected/failed. |
| MCP server connects but tool call fails at runtime | System prompt instructs agent to report the failure clearly, not give IT support instructions. |
| User has no integrations configured | Return `no_integrations` error. Mac app should prompt user to set up at least one integration. |
| Vault is unreachable | Return `vault_error` with connection details. Do not attempt to create session. |
| Agent calls ToolSearch or other built-in tools for data questions | System prompt explicitly prohibits this. Phase 2 enforces via `tools` restriction. |

---

## 7. Out of Scope

- NOT: Changes to how the Mac app writes credentials to Vault
- NOT: OAuth flows (API keys only for v1)
- NOT: GitHub MCP integration (separate feature, comes later)
- NOT: Codex provider fixes (focus on Claude provider for demo)
- NOT: iOS companion app
- NOT: Automated daily report generation (async agent feature — separate spec)
- NOT: Rate limiting or token budget management

---

## 8. Verification

### Phase 1 (Demo-Ready)

- [ ] Create session with valid PostHog + RevenueCat credentials from Vault — both MCP servers show `connected` status
- [ ] Send "How are my DAUs looking?" → agent calls `mcp__posthog__*` tool and returns real data
- [ ] Send "Show me my subscription metrics" → agent calls `mcp__revenuecat__*` tool and returns real data
- [ ] Create session with INVALID PostHog key + valid RevenueCat → session created with only RevenueCat connected, `credential_errors` includes PostHog with specific error
- [ ] Create session with expired RevenueCat token → `credential_errors` array includes `{ integration: "revenuecat", detail: "401 Unauthorized — key may be expired" }`
- [ ] Create session with ALL invalid credentials → session still created, `credential_errors` lists all failures, agent can explain what's wrong
- [ ] Agent does NOT call ToolSearch, Bash, Read, Grep, or other built-in filesystem tools when answering data questions
- [ ] Agent does NOT tell users to "go to your dashboard and generate a new key" — it reports the error clearly as a system issue
- [ ] SSE stream includes `mcp_status` event showing connection status of all MCP servers
- [ ] Server logs show credential validation results before session creation
- [ ] Mac app displays MCP connection errors when they occur

### Phase 2 (Hardened)

- [ ] Built-in tools (Bash, Read, Grep, etc.) are NOT available to the agent for data queries
- [ ] Smoke test script passes: session → message → MCP tool call → data returned
- [ ] CLAUDE.md in both repos accurately describes current Supabase architecture
- [ ] CLAUDE.md has boundary tiers (Always/Ask First/Never) and invariants section
- [ ] Cross-repo contract doc exists and is referenced by both repos
- [ ] Credential format validation catches malformed Vault responses with specific error messages

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-16 | Supabase evaluation recommended AGAINST adoption for MVP | "Supabase solves zero actual problems for the MVP today" |
| 2026-03-20 | Decision reversed — full Supabase migration approved | Team call: need auth for billing, Vault for key security, cross-device sync for iOS companion. Tradeoff: increased complexity for MVP in exchange for production-ready infrastructure |
| 2026-03-23 | Regression diagnosed — credential flow + agent guardrails | Silent MCP failures + unguarded agent fallback behavior. Not a Supabase code bug — a missing validation layer exposed by the credential flow change |
