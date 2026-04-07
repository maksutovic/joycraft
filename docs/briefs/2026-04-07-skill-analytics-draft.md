# Skill Analytics & Telemetry — Draft Brief

> **Date:** 2026-04-07
> **Status:** DRAFT (DEFERRED)
> **Origin:** /joycraft-interview session — split from Level 5 + Skill Evals brief

---

## The Idea

Atharva Vaidya (Tolan) described their approach to skill observability: every time a skill gets invoked, they fire a PostHog event. They correlate skill invocation counts with commit counts to understand actual usage patterns. This gives them hard data on which skills are working and which are being ignored.

The idea: bring this kind of analytics to Joycraft so users (and Joycraft itself) can track skill invocation rates, identify skills that never fire organically, and measure the impact of skill wording changes.

## Problem

Currently there is zero observability into whether Joycraft skills are being invoked in real user sessions. The only signal is anecdotal feedback.

## Why This Is Deferred

**Network calls in an OSS tool are a non-starter.** Joycraft is an open-source CLI/plugin. Sending telemetry to a third-party service (PostHog, Mixpanel, etc.) without explicit opt-in would violate user trust and is inappropriate for this kind of project. Users would rightfully be alarmed to see random network calls from a development tool.

This could potentially work as:
- Strictly opt-in with clear disclosure
- Local-only analytics (write to a file, user reviews themselves)
- A separate paid/enterprise feature if Joycraft ever has a commercial tier

But the ROI of solving the consent/trust problem is low compared to the eval approach (which validates skill invocation without touching user machines at all).

## Relationship to Other Work

The **Level 5 Skill Invocation Evals** brief covers the testing side — verifying skills work correctly in controlled scenarios. Analytics would cover the production/field side — understanding what happens in real user sessions. The eval approach is strictly better for now because it provides signal without any user-facing concerns.

## Out of Scope

Everything. This brief exists to capture the idea and the reasoning for deferral.
