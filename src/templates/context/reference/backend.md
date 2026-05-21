# Backend

> Service boundaries, API conventions, the data model, and how errors are handled.
> A long-form reference doc. Replace the italic examples below with your real conventions.

## Service Boundaries

_Example: A modular monolith. Each domain (billing, accounts, notifications) owns its tables_
_and exposes a service interface; cross-domain calls go through that interface, never direct_
_table reads._

## API Conventions

| Aspect | Convention |
|--------|-----------|
| _Example: Routing_ | _REST under `/api/v1`; resources are plural nouns_ |
| _Example: Auth_ | _Bearer token in `Authorization` header; validated in middleware_ |
| _Example: Pagination_ | _Cursor-based; `?limit` + `?cursor`_ |

## Data Model

_Example: Postgres as the source of truth. Every table has `id` (uuid), `created_at`,_
_`updated_at`. Soft-delete via `deleted_at` rather than hard deletes._

## Error Handling

_Example: Throw typed domain errors; a single boundary handler maps them to HTTP status_
_codes and a `{ error: { code, message } }` body. Never leak stack traces to clients._

## Background Work

- _Example: Long-running jobs go on the queue, not the request thread._
