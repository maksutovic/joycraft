# Testing

> The test pyramid, frameworks, fixtures, and the gates that run in CI.
> A long-form reference doc. Replace the italic examples below with your real conventions.

## Test Pyramid

_Example: Many fast unit tests, fewer integration tests at module boundaries, a thin layer_
_of end-to-end tests covering critical user journeys only. Push assertions down the pyramid._

## Frameworks

| Layer | Tool |
|-------|------|
| _Example: Unit_ | _Vitest_ |
| _Example: Integration_ | _Vitest + test database_ |
| _Example: E2E_ | _Playwright_ |

## Fixtures & Test Data

_Example: Factories build valid objects with overridable fields; never share mutable fixtures_
_across tests. Each test seeds and tears down its own data._

## What to Test

- _Example: Behavior and contracts, not implementation details._
- _Example: Edge cases and error paths, not just the happy path._

## CI Gates

_Example: PRs must pass lint, typecheck, and the full test suite before merge. Coverage may_
_not drop below the current baseline._
