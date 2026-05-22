# Frontend Methodology

> How the frontend is structured: architecture, state, folder conventions, and patterns.
> A long-form reference doc. Replace the italic examples below with your real conventions.

## Architecture

_Example: A component-driven SPA. Routes map to page components; pages compose feature_
_modules; feature modules compose shared UI primitives. Data flows down, events flow up._

## State Management

_Example: Server state lives in a query cache (stale-while-revalidate); UI state is local_
_component state; cross-cutting state (auth, theme) is in a small global store. We do not_
_put server data in the global store._

## Folder Conventions

| Path | Holds |
|------|-------|
| _Example: components/_ | _Shared, presentational, reusable primitives_ |
| _Example: features/_ | _Feature modules — colocated UI, hooks, and tests_ |
| _Example: lib/_ | _Framework-agnostic helpers and clients_ |

## Patterns

- _Example: Data fetching happens at the page boundary, not deep in the tree._
- _Example: Side effects are isolated in hooks named `useX`; components stay declarative._

## Anti-Patterns

- _Example: Prop-drilling more than two levels — lift to context or a hook instead._
