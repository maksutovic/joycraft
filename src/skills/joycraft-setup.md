---
name: joycraft-setup
description: Set up Joycraft and get started on this project -- the first-time entry point. Run this when you're configuring your project, onboarding, or asking "where do I begin?" / "how do I set this up?"
instructions: 6
---

# Setup — The First-Run Door

This is the obvious starting point for setting up Joycraft on this project. It does no work of its own — it routes you to the skill that does the real assessment and onboarding.

**Run `{{skill_prefix}}tune`.**

`{{skill_prefix}}tune` detects your project's current harness state, scores it, applies the upgrades it can, and on a first run kicks off the context-onboarding pass for you. That's the whole setup flow — this alias just exists so "set up", "get started", and "first time" lead you there.

Do not re-implement assessment or scoring here; hand off to `{{skill_prefix}}tune`.
