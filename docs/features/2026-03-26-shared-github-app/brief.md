# Feature Brief: Shared Joycraft GitHub App for Level 5

**Date:** 2026-03-26
**Status:** Future
**Priority:** Medium

## Problem

Setting up Level 5 requires users to create their own GitHub App (~2 minutes, 9 steps). This is the biggest friction point in the Level 5 setup flow. Users who aren't familiar with GitHub Apps find it intimidating, and it's one more thing that can go wrong before they even see the autofix loop work.

## Vision

A single shared "Joycraft Autofix" GitHub App that users install with one click. No private key generation, no App ID configuration, no manual secrets setup.

## Why We Can't Do This Today

GitHub Apps require a **private key** to generate installation tokens. The private key can only be created from the App owner's settings page. If we share a single Joycraft App, we'd need to distribute the private key to every user — which is both a security risk and operationally impossible (we'd have to manually hand out keys).

## How It Would Work

The standard pattern (used by Renovate, CodeRabbit, Dependabot, etc.):

1. User clicks "Install Joycraft Autofix" on the App's public page
2. GitHub redirects to our backend with an installation ID
3. Our backend stores the installation ID and can generate short-lived tokens on demand
4. The autofix workflow calls our backend to get a token instead of generating one locally
5. No private key in the user's repo secrets — our backend holds it

## What This Requires

- **A backend service** — small API that handles:
  - OAuth callback from GitHub App installation
  - Token generation endpoint (installation ID → short-lived token)
  - Storing the App's private key securely
- **Hosting** — could be a single Vercel serverless function
- **The GitHub App itself** — already partially exists, needs OAuth setup
- **Updated workflows** — autofix.yml calls our token endpoint instead of `actions/create-github-app-token`

## Scope

- Backend: 1 API route (token exchange), 1 webhook handler (installation events)
- CLI: update `init-autofix` to skip App creation steps, just install the shared App
- Workflows: swap token generation step

## Alternatives Considered

| Alternative | Why Not |
|-------------|---------|
| PAT-based (no App) | Shows as user's identity, broader permissions than needed, token management burden |
| Distribute private key via CLI | Security risk — private key in every user's repo secrets |
| GitHub Actions OIDC | Can't bypass branch protection, can't trigger other workflows |

## Open Questions

- Where to host the backend? Vercel is the obvious choice but adds a dependency
- How to handle rate limits on token generation?
- Do we need a database or can we be stateless (generate tokens on-the-fly from installation ID)?
- Pricing implications — if Joycraft grows, the App's API rate limits are shared across all installations

## Success Criteria

- User can set up Level 5 without creating a GitHub App
- Setup time drops from ~5 minutes to ~1 minute
- No private keys stored in user repos
