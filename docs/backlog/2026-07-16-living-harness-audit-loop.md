# Living harness: growth loop + audit loop (compound-engineering branch)

**Captured:** 2026-07-16, during the core-loop refocus (PR #56)
**Full analysis:** `docs/research/2026-07-16-nate-jones-harness-cleaner.md`

The follow-up work deferred from the Nate B Jones harness-cleaner discussion,
plus the living-harness items from the compound-engineering comparison. The
two loops ship together: a harness that grows every session (compound
engineering) needs an audit loop as its immune system (the cleaner), or it
accumulates the crud Nate hit.

Work items, ordered by leverage — details and design notes in the research doc:

1. Harden pass — convert machine-checkable ALWAYS/NEVER boundaries into
   hooks/permissions (tune or lockdown).
2. Optimize v2 — six-disposition semantic audit (KEEP / ONE_HOME / LOAD_LATER /
   MAKE_A_CHECK / PROBATION / RETIRE) with cross-file duplication detection.
   Skill-driven; do not port his scanner/manifest machinery.
3. Project-skill namespace + upgrade preservation — joycraft-* owned by
   upgrade, project-* never touched; overlay convention for amending joycraft
   skills.
4. Session-end "promote to harness" step — repeated discovery/correction →
   propose boundary rule / context fact / project skill.
5. Boundary provenance + probation on model upgrades (the model-upgrade
   ritual).
6. Upgrade receipts (WHAT-CHANGED-style record after apply).
7. Evidence labels in tune (declared vs verified).

Promote by turning this into a Feature Brief under `docs/features/<slug>/`
when the branch starts.
