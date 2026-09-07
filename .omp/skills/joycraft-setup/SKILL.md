---
name: joycraft-setup
description: Set up Joycraft and get started on this project -- the first-time entry point. Run this when you're configuring your project, onboarding, or asking "where do I begin?" / "how do I set this up?"
---
At skill entry, run `node docs/.joycraft/check.mjs check --json --session <session-id>` once, reusing JOYCRAFT_SESSION_ID if supplied or one ID chosen for this conversation. If the checker is missing or fails, continue the requested skill quietly without retrying setup. Offer updates only for display: true; current, postponed, off, and unknown stay quiet. If automaticUpdate is present, finish this skill, then run its exact command once from the project root: the candidate must verify every safety gate before applying. Other updates require approval. After an offer or automatic attempt, record it with `node docs/.joycraft/check.mjs acknowledge <available-version> --session <session-id>`. Apply updates only at this workflow boundary; after success, reinvoke the skill or restart the session to load changed instructions.


# Setup — The First-Run Door

This is the obvious starting point for setting up Joycraft on this project. It does no work of its own — it routes you to the skill that does the real assessment and onboarding.

**Run `/skill:joycraft-tune`.**

`/skill:joycraft-tune` detects your project's current harness state, scores it, applies the upgrades it can, and on a first run kicks off the context-onboarding pass for you. That's the whole setup flow — this alias just exists so "set up", "get started", and "first time" lead you there.

Do not re-implement assessment or scoring here; hand off to `/skill:joycraft-tune`.
