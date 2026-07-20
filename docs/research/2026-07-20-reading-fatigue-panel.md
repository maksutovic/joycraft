---
status: done
owner: Maximilian Maksutovic
created: 2026-07-20
source: 52-agent research swarm + adversarial panel (6 lenses, 10 proposals, 30 attacks)
artifact: https://claude.ai/code/artifact/58ab8dc3-36e2-4baa-b80a-51a46beeb0f7
---

# Research — reading fatigue in agentic engineering

Condensed record of the swarm + adversarial-panel study. Full brief with
sources and scenarios lives at the artifact URL above. This doc exists so
future specs can cite findings without re-reading the whole study.

## Core verdict

The answer to too much text is not shorter text — it is **less text existing
in the human channel at all**. Every mature field that solved human overload
from automated systems (aviation dark cockpit, ISA-18.2 alarm management,
nuclear HMI, SRE tiering, intelligence briefs) solved it structurally:
delete nominal output, tier channels, retrieve just-in-time, demand
**decisions instead of reading**. Compression (caveman) is absent from every
field that solved this. Caveman = step, not destination.

## Mechanisms (cite as RF-1 … RF-6)

| # | Mechanism | Key evidence |
|---|-----------|--------------|
| RF-1 | Throughput mismatch — ~250-300 wpm cap; review collapses past ~400 lines/sitting; artifact size, not reviewer ability, is the lever | Rayner 2016; SmartBear/Cisco; Baum EMSE 2019 |
| RF-2 | Complacency worsens as the harness improves; passive consumption decays regardless of length | Parasuraman & Manzey 2010 |
| RF-3 | Code/docs asymmetry = trust calibration: code has an external verifier (tests/CI), docs have none, so reading is docs' only check | Parasuraman & Riley 1997 |
| RF-4 | The firehose is prescribed: 4-way spec-table duplication, 81 boilerplate copies, 29/43 feature folders never built; reading value inversely proportional to volume (decision-log.md = most re-read, smallest dir) | internal audit |
| RF-5 | LLM prose is a persuasive artifact; polished plans invite acknowledgment, not scrutiny; HumanLayer publicly recanted read-plans-not-code | Horthy RPI→QRSPI; Osmani comprehension debt |
| RF-6 | Reading is for theory-building; chronicles deliver activity-proportional text when the human needs model-delta-proportional text | Naur/Goedecke; Fregnan 2022 |

## Ranked portfolio (all revised under attack; none advanced clean)

1. **Exhaust deletion & dedup** — template-level deletion + spec fact-box
   cards (~300 words, visible cut-residue) + Reaper archiving undead folders
   to docs/archive/. Ship now. ~3x fewer human-facing words per feature.
2. **Theory Ledger** — ≤600-word human-owned theory.md, ≤7 deltas/session,
   confirmed at PR bookend by restating in own words; independent verifier
   re-derives periodically. Strongest single idea; doubles as agent context.
3. **Intent Tripwire** — deterministic `check-docs` + every AC traces to a
   design line; joycraft-verify's oracle repointed to human-approved brief +
   boundaries. Three proposals independently converged here.
4. **Deposition Checkpoint** — ≤5 forced-choice design questions + typed
   rationale + assumptions-asserted-as-fact manifest. 4-week pilot; kill if
   the human bypasses to free chat. → now feature 2026-07-20-decision-dossier.
5. **Report-by-exception + attention policy + /recall** — nominal = one
   verifier-emitted line; hand-owned DARK/SAMPLE/FULL table; prompt-level.
6. **Cockpit** (defer until queue/status unification) — deterministic HTML
   state board, never LLM-prose-to-HTML.
7. **Strata** (experimental) — records as source, documents as views. May
   never need to ship if 1-3 relieve the fatigue.

## Killed — do not rebuild (cite as RF-KILL-n)

1. Compression as endgame.
2. Hard word-caps with silent cutting (omissions invisible).
3. Self-reported "nominal" (must come from an independent verifier).
4. Adaptive/quiz-graded attention calibration.
5. Word-metering ledgers (no interception point; self-reporting).
6. Paste-back / pick-string round-trips ("reject both, do X" can't encode —
   every decision UI needs a reject-framing escape to free text).
7. Git-history-only deletion (squash merge breaks it; archive-move instead).
8. `audience: agent` never-read contracts (deletes the human fallback).
9. Single feature.yaml store (breaks parallel-safe waves).
10. AC-to-test mapping on the existing corpus (prospective-only).
11. Session-end interactive HTML (headless-incoherent; bookends only).
12. Audio status / 3D code cities / standalone viz products.

## Document-diet principles (cite as RF-DIET-n)

1. Two-tier contract: human docs capped/structured/risk-ordered; agent docs
   uncapped but single-copy. Detail human-optional, never human-excluded.
2. A doc enters the human channel only if it requires a **decision** (not an
   acknowledgment).
3. Human judgment at the bookends: decision-forcing checkpoint at design,
   delta-confirmation at PR. Middle = machine-verified, exception-reported,
   sampled.
4. Silence must be earned by an independent verifier, never self-reported;
   high-stakes carve-outs are written policy, not vibes.
5. Archive don't delete; delta don't chronicle.

## Sequencing for the living-harness update

Weeks 1-3: template deletions + Reaper + queue/status unification (the
prerequisite for everything downstream). This quarter: Theory Ledger +
Intent Tripwire. Pilots with kill criteria: decision-dossier (this feature),
hand-generated Cockpit artifact. Defer: Strata, tune reading-load dimension,
codex/pi variants until the Claude variant survives real use.

Honest caveat: none of this makes not-reading free — these mechanisms manage
comprehension debt, they don't abolish it. The Theory Ledger and recurrent
briefing are the maintenance payments.
