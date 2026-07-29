# Gate markers are per-gate, not per-skill

The spec asked for each marker "exactly once" per skill, but the canonical sources
carry one per *gate moment*: new-feature has 2 (brief + handoff), research has 3
(claude/codex/pi harness blocks), and handoff skills carry `Done when:` twice by
design (template + worked example). Pinned exact per-skill counts instead — still
catches copy-paste drift without failing correctly-authored multi-gate skills.
