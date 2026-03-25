# Register Joycraft Autofix GitHub App — Atomic Spec

> **Parent:** docs/research/autofix-loop-closing.md
> **Status:** Ready
> **Date:** 2026-03-24
> **Estimated scope:** 1 session / 0 code files / manual setup + documentation

---

## What

Register a "Joycraft Autofix" GitHub App on GitHub that any Joycraft user can install on their repos. This provides the separate bot identity needed for the auto-fix loop.

## Why

GitHub's anti-recursion protection blocks same-identity workflow triggers. A dedicated GitHub App provides a distinct identity whose pushes and comments DO trigger workflows. Hosting a shared app means users don't have to create their own.

## Acceptance Criteria

- [ ] GitHub App registered at github.com/organizations/joycraft (or user account)
- [ ] App name: "Joycraft Autofix" (or similar, must be globally unique)
- [ ] Permissions: Repository Contents (Read & Write), Pull Requests (Read & Write), Actions (Read), Checks (Read)
- [ ] No webhook URL (all execution happens in user's Actions)
- [ ] App is publicly installable
- [ ] App ID documented in Joycraft's source (public, not secret)
- [ ] Installation URL documented in README and setup guide
- [ ] Private key generation instructions documented for users

## Approach

1. Register the app at github.com/settings/apps/new
2. Set permissions (minimal: contents + PRs read/write)
3. Uncheck "Webhook active"
4. Make it publicly installable
5. Document the App ID in Joycraft's codebase (it's public)
6. Users install the app → generate a private key → store as repo secret

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| User's org restricts app installations | Document how to create their own app as fallback |
| App name taken | Try alternatives: "Joycraft Bot", "Joycraft CI" |
| User wants to self-host the app | Document the "create your own" path in the guide |
