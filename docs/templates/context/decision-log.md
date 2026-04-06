# Decision Log

> Why choices were made, not just what was chosen.
> Update this when making architectural, tooling, or process decisions.
> This is the institutional memory that prevents re-litigating settled questions.

## Decisions

| Date | Decision | Why | Alternatives Rejected | Revisit When |
|------|----------|-----|----------------------|-------------|
| _Example: 2026-03-15_ | _Use Supabase over Firebase_ | _Postgres flexibility, row-level security, self-hostable_ | _Firebase (vendor lock-in), PlanetScale (no RLS)_ | _If we need real-time sync beyond Supabase's capabilities_ |

## Principles

_Capture recurring decision patterns here — they save time on future choices._

- _Example: "Prefer tools we can self-host over pure SaaS — reduces vendor risk"_
- _Example: "Choose boring technology for infrastructure, cutting-edge only for core differentiators"_
