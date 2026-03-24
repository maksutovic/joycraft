# Add Notification Preferences API — Atomic Spec

> **Parent Brief:** `docs/briefs/2026-03-15-add-user-notifications.md`
> **Status:** Ready
> **Date:** 2026-03-15
> **Estimated scope:** 1 session / 4 files / ~250 lines

---

## What

Add REST API endpoints that let users read and update their notification preferences. Each user gets a preferences record with per-event-type, per-channel toggles (e.g., "PR comments: in-app=on, email=off"). Preferences default to all-on for new users and are stored encrypted alongside the user profile.

## Why

The notification delivery service (Spec 3) needs to check preferences before dispatching. Without this API, there is no way for users to control what they receive, and we cannot build the delivery pipeline.

## Acceptance Criteria

- [ ] `GET /api/v1/notifications/preferences` returns the current user's preferences as JSON
- [ ] `PATCH /api/v1/notifications/preferences` updates one or more preference fields and returns the updated record
- [ ] New users get default preferences (all channels enabled for all event types) on first read
- [ ] Preferences are validated — unknown event types or channels return 400
- [ ] Preferences are stored using the existing encryption-at-rest pattern (`EncryptedJsonColumn`)
- [ ] Endpoint requires authentication (returns 401 for unauthenticated requests)
- [ ] Build passes
- [ ] Tests pass (unit + integration)

## Constraints

- MUST: Use the existing `EncryptedJsonColumn` utility for storage — do not roll a new encryption pattern
- MUST: Follow the existing REST controller pattern in `src/controllers/`
- MUST NOT: Expose other users' preferences (scope queries to authenticated user only)
- SHOULD: Return the full preferences object on PATCH (not just the changed fields), so the frontend can replace state without merging

## Affected Files

| Action | File | What Changes |
|--------|------|-------------|
| Create | `src/controllers/notification-preferences.controller.ts` | New controller with GET and PATCH handlers |
| Create | `src/models/notification-preferences.model.ts` | Sequelize model with EncryptedJsonColumn for preferences blob |
| Create | `src/migrations/20260315-add-notification-preferences.ts` | Database migration to create notification_preferences table |
| Create | `tests/controllers/notification-preferences.test.ts` | Unit and integration tests for both endpoints |
| Modify | `src/routes/index.ts` | Register the new controller routes |

## Approach

Create a `NotificationPreferences` model backed by a single `notification_preferences` table with columns: `id`, `user_id` (unique FK), `preferences` (EncryptedJsonColumn), `created_at`, `updated_at`. The `preferences` column stores a JSON blob shaped like `{ "pr_comment": { "in_app": true, "email": true }, "deploy_status": { ... } }`.

The GET endpoint does a find-or-create: if no record exists for the user, create one with defaults and return it. The PATCH endpoint deep-merges the request body into the existing preferences, validates the result against a known schema of event types and channels, and saves.

**Rejected alternative:** Storing preferences as individual rows (one per event-type-channel pair). This would make queries more complex and would require N rows per user instead of 1. The JSON blob approach is simpler and matches how the frontend will consume the data.

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| PATCH with empty body `{}` | Return 200 with unchanged preferences (no-op) |
| PATCH with unknown event type `{"foo": {"email": true}}` | Return 400 with validation error listing valid event types |
| GET for user with no existing record | Create default preferences, return 200 |
| Concurrent PATCH requests | Last-write-wins (optimistic, no locking) — acceptable for user preferences |
