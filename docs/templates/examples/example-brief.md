# Add User Notifications — Feature Brief

> **Date:** 2026-03-15
> **Project:** acme-web
> **Status:** Specs Ready

---

## Vision

Our users have no idea when things happen in their account. A teammate comments on their pull request, a deployment finishes, a billing threshold is hit — they find out by accident, minutes or hours later. This is the #1 complaint in our last user survey.

We are building a notification system that delivers real-time and batched notifications across in-app, email, and (later) Slack channels. Users will have fine-grained control over what they receive and how. When this ships, no important event goes unnoticed, and no user gets buried in noise they didn't ask for.

The system is designed to be extensible — new event types plug in without touching the notification infrastructure. We start with three event types (PR comments, deploy status, billing alerts) and prove the pattern works before expanding.

## User Stories

- As a developer, I want to see a notification badge in the app when someone comments on my PR so that I can respond quickly
- As a team lead, I want to receive an email when a production deployment fails so that I can coordinate the response
- As a billing admin, I want to get alerted when usage exceeds 80% of our plan limit so that I can upgrade before service is disrupted
- As any user, I want to control which notifications I receive and through which channels so that I am not overwhelmed

## Hard Constraints

- MUST: All notifications go through a single event bus — no direct coupling between event producers and delivery channels
- MUST: Email delivery uses the existing SendGrid integration (do not add a new email provider)
- MUST: Respect user preferences before delivering — never send a notification the user has opted out of
- MUST NOT: Store notification content in plaintext in the database — use the existing encryption-at-rest pattern
- MUST NOT: Send more than 50 emails per user per day (batch if necessary)

## Out of Scope

- NOT: Slack/Discord integration (Phase 2)
- NOT: Push notifications / mobile (Phase 2)
- NOT: Notification templates with rich HTML — plain text and simple markdown only for now
- NOT: Admin dashboard for monitoring notification delivery rates
- NOT: Retroactive notifications for events that happened before the feature ships

## Decomposition

| # | Spec Name | Description | Dependencies | Est. Size |
|---|-----------|-------------|--------------|-----------|
| 1 | add-notification-preferences-api | Create REST endpoints for users to read and update their notification preferences | None | M |
| 2 | add-event-bus-infrastructure | Set up the internal event bus that decouples event producers from notification delivery | None | M |
| 3 | add-notification-delivery-service | Build the service that consumes events, checks preferences, and dispatches to channels (in-app, email) | Spec 1, Spec 2 | L |
| 4 | add-in-app-notification-ui | Add notification bell, dropdown, and badge count to the app header | Spec 3 | M |
| 5 | add-email-batching | Implement daily digest batching for email notifications that exceed the per-user threshold | Spec 3 | S |

## Execution Strategy

- [x] Agent teams (parallel teammates within phases, sequential between phases)

```
Phase 1: Teammate A -> Spec 1 (preferences API), Teammate B -> Spec 2 (event bus)
Phase 2: Teammate A -> Spec 3 (delivery service) — depends on Phase 1
Phase 3: Teammate A -> Spec 4 (UI), Teammate B -> Spec 5 (batching) — both depend on Spec 3
```

## Success Criteria

- [ ] User updates notification preferences via API, and subsequent events respect those preferences
- [ ] A PR comment event triggers an in-app notification visible in the UI within 2 seconds
- [ ] A deploy failure event sends an email to subscribed users via SendGrid
- [ ] When email threshold (50/day) is exceeded, remaining notifications are batched into a daily digest
- [ ] No regressions in existing PR, deployment, or billing features

## External Scenarios

| Scenario | What It Tests | Pass Criteria |
|----------|--------------|---------------|
| opt-out-respected | User disables email for deploy events, deploy fails | No email sent, in-app notification still appears |
| batch-threshold | Send 51 email-eligible events for one user in a day | 50 individual emails + 1 digest containing the overflow |
| preference-persistence | User sets preferences, logs out, logs back in | Preferences are unchanged |
