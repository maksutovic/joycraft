# Panel Verdict — the pointer layer on trial

## The question and the vote

**On trial:** Is the probabilistically-read L2 pointer layer (`docs/context/*.md`, 200-line budget, reached only when an agent chooses to follow a pointer) worth having — or must everything that matters live in always-injected L1, become a machine check, or die?

| Panelist | Verdict |
|---|---|
| Prosecutor | kill-L2 (narrowed under cross-examination to: keep only an append-only decision log) |
| Defender | keep-L2-as-is |
| Minimalist | shrink-L2-to-near-zero (decision log survives; everything else graduates or dies) |
| Scale-skeptic | keep-L2-but-reshape (re-partition by code locality, not document type) |
| Controls-advocate | keep-L2-but-reshape (harden-first as admission gate; L2 = quarantine for the non-convertible) |
| Empiricist | keep-L2-as-is (pending pre-committed telemetry thresholds) |

**Tally: 2 keep-as-is, 2 keep-but-reshape, 1 shrink-to-near-zero, 1 kill — and the kill vote conceded its way to shrink in rebuttal.** No panelist's final position deletes the decision log. The tier survives the trial, but on probation and with a narrower charter than its five-doc name set implies.

## Where the panel agrees

Points carried by at least four of six:

1. **The decision log lives (6/6).** Rejected alternatives and rationale cannot be reconstructed from code or diffs (ADR literature; DCBench's +49% decision-compliance result), and this very feature's design.md reused five prior decision-log rows to constrain its own choices — an in-repo, same-session demonstration of the tier paying rent. Even the prosecutor conceded this twice.

2. **Directional/values content belongs in always-injected L1, never behind a pointer (6/6).** Values, glossary, and taste apply to every task; a probabilistic read defeats them precisely on the sessions that need them. The design's own Q3 Option C rejection ("burying it behind a pointer defeats the point") was endorsed by every panelist. The empiricist's caveat — verify it changes behavior before shipping — is a condition, not a dissent.

3. **Harden-first drains L2 before anything else is decided (6/6).** Everything enforcement-shaped (test-before-commit, branch protection, commit style, line budgets themselves) exits the prose tiers entirely via Lauren's hierarchy. The controls-advocate's sharpest point stood unrebutted: the 200-line budget is currently an honor-system rule in skills that are themselves over budget (five of six touched skills, per design.md §1) — a 10-line CI assertion ends that. WS3's reorder in add-fact is the panel's most unanimous endorsement.

4. **The current hand-maintained architecture tree should not exist (6/6).** A repo-global tree is a guaranteed-drift prose copy of machine-derivable ground truth; the brief itself calls it "the least useful thing and the fastest to drift." Acceptable residue: folders plus one-line descriptions, machine-regenerated or CI-diffed so drift fails a check instead of misleading an agent.

5. **Must-read content is disqualified from L2 (5/6, incl. the defender's own concession).** A dangerous-assumption row skipped in the one session where it bites has negative value — false confidence that the hazard was documented. Anything whose miss cost is unrecoverable graduates to L1 or a deny pattern. An honest L2 holds only recoverable-miss reference content.

6. **L2 is unevaluated, and the telemetry — if it ships — must stratify voluntary from mandated reads (5/6).** Nobody has run the no-L2 baseline; Zechner's "adopted without comparison" charge applies. And because Joycraft's own skills mechanically open context docs (session-end 1b, add-fact 2b, optimize's Reaper pass), raw read counts will spuriously vindicate the tier. The empiricist demanded stratification; the prosecutor adopted it as his own condition.

## Where it genuinely splits

**1. Do the four non-decision-log docs (production map, dangerous assumptions, institutional knowledge, troubleshooting) survive?**
- *Delete/graduate now* (prosecutor, minimalist): the entire non-decision-log payload is ~141 lines protected by an order of magnitude more machinery — "when the immune system outweighs the organism, the organism is the wrong design." Run harden-first to fixpoint and only exhaust remains.
- *Keep pending evidence* (defender, empiricist, and the reshapers): the minimalist's per-doc dispositions fail on contact — production topology often isn't in this repo's code at all; the 0.7.10 npx-cache caveat is a troubleshooting fact with nothing to fix and everything to remember; deny patterns cover only the regex-shaped subset of dangerous assumptions. The residue is thinner than the current docs but not empty.

**2. Does the WS1 telemetry scanner ship?**
- *Cancel it* (prosecutor, minimalist): it is the most expensive workstream, built to meter a tier that shouldn't exist; it measures attention, not value; it cannot run the counterfactual; and its own designers admit degraded Codex parsing risks false RETIRE evidence.
- *It is the trial's instrument* (empiricist, defender): D2 is stamped, the module is small (detect.ts idiom, pure functions), and killing the measurement before the measurement exists is deciding by debate the one question that is literally a number — P(read | pointer, relevant task). Cancel it and you delete the evidence before the verdict.

**3. Does scale help or hurt L2?**
- *Hurts* (prosecutor, minimalist): curation cost scales with LOC and change rate; grep is paid per-task and can never be stale; context-rot data says mid-task prose detours pollute exactly when the window is most contended.
- *Helps, if reshaped* (defender, scale-skeptic): grep-first degrades on large repos (Cursor's semsearch gains are largest there); with embeddings a declared non-goal, L2 is the only remaining alternative to per-session re-derivation. But the scale-skeptic's condition is real: type-partitioned global docs invert at scale — the growth path is locality-partitioned per-directory files (deterministic proximity injection), and the machine-local gitignored telemetry silently stops working past ~3 contributors.

**4. Is a probabilistic read a pricing model or a defect?** The defender's best line: a doc read in 20% of sessions is free in the other 80%, while the same content in L1 taxes 100% — expected value per token, not read guarantee, is the standard for *reference* content. The prosecutor's best line: the expected-value ledger omits the maintenance side — Reaper, scanner, rotation manifests, staleness flags — and audited-but-unread fails identically to hidden-and-unread; the audit trail changes who is embarrassed, not whether the agent had the knowledge.

## What the web evidence actually supports

**Solid:**
- **ETH Zurich context-file study** (arXiv 2601.20404; companion mechanism paper cited as 2602.11988): LLM-generated AGENTS.md files *reduce* success (SWE-bench Lite −0.5%, AGENTbench −2%) at +20% cost; hand-written files improve ~4% but still cost up to 19% more steps. Cuts both ways: curation works, and is never free.
- **DCBench** (arXiv 2605.08112): +49% decision-compliance with curated product/decision context — the strongest quantitative support for keeping a decision layer.
- **Chroma "context rot"**: all 18 tested frontier models degrade with input length; distractors compound — the argument against relocating L2 into L1.
- **Hooks/prose A/B** (blakecrosley.com; the hooks Substack): prose value-statements produced no measurable behavior change; exact commands with exit-code checks and deterministic hooks did. "Instructions without verification commands are suggestions, not rules."
- **Anthropic Skills / context-engineering guidance**: progressive disclosure (≈80–100-token metadata always loaded, body on trigger) is the field's reference architecture — but the minimalist's caveat is correct: Skills' level-2 loads are *deterministically triggered*; Joycraft's Context Map has no trigger contract. It is hopeful disclosure, not progressive disclosure.
- **Cursor semsearch**: Cursor did not abandon embeddings; it doubled down, with largest gains on large codebases — a standing challenge to the brief's no-retrieval non-goal at monorepo scale.
- **ThoughtWorks "agent instruction bloat" / six configuration smells** (arXiv 2606.15828): the failure mode of the kill-L2 remedy (everything into L1) is named and catalogued.

**Vibes / unconfirmed:**
- **The Theo Browne 26/45-never-read, 3:1 audit** — the brief's origin exhibit — could not be sourced by the research agents, and it targeted hidden per-machine auto-memory, not an in-repo reviewed layer. The defender formally abandoned it; the brief (line 43) should stop leaning on it too.
- "Cursor abandoned code-traversal systems" (brief's non-goals rationale, line 169–170) is contradicted by Cursor's own 2026 blog. The non-goal may still be right for Joycraft's tier; its cited evidence is wrong.
- Practitioner line-count targets (60 lines, 150 lines, 2.5k tokens) are converged folklore, not measured thresholds.

## Reconciliation

The three claims reconcile — but only after each is narrowed, and one residue genuinely does not fit.

- **"Code is truth"** is true for code-shape knowledge and false for intent. The brief's own claims table (line 42) already says this: the layer must hold *only what code cannot say* — rationale, rejected alternatives, off-repo topology. Applied honestly, this shrinks L2's charter well below its current five-doc surface.
- **The 200-line budget** is not in tension with the pointer layer; it is its pricing mechanism — the cap that keeps a probabilistic read cheap enough to be worth risking. But a budget enforced as prose in over-budget skills is self-refuting; it must become a CI check (controls-advocate, uncontested).
- **Context pollution** is the reason the reconciliation *requires* a middle tier: it forbids promoting everything to L1 (Chroma, ThoughtWorks), while read-decay forbids demoting must-read content to L2. The two constraints jointly define L2's legitimate contents: **situationally-relevant, recoverable-miss, non-checkable, non-code-expressible reference.**

**The honest unreconciled residue:** content that is situational *and* must-read — the dangerous assumption that bites rarely but catastrophically — has no good home in this architecture. L1 rots it into noise; L2 misses it when it matters; most instances are not check-shaped. The panel's only answer is triage (convert the checkable subset, promote the worst of the rest, accept documented risk on the remainder), which is a management strategy, not a reconciliation. The design should say so out loud rather than let the dangerous-assumptions filename imply a guarantee the tier cannot deliver.

## Implications for D5 (directional content placement) and D6 (architecture tree)

**D5 — directional content goes to L1: adopt Q3 Option A** (one generated `## Product Identity` section with Values/Glossary/Taste subsections, appended via the existing header-regex guard). Unanimous on placement. Two panel-imposed conditions:
1. **Zero-sum admission** (prosecutor, minimalist, controls-advocate): every directional line added to L1 names the line it displaces — ideally an ALWAYS/NEVER prose rule converted to a deny pattern via harden. L1's budget is the forcing function; directional content must not become the new bloat vector.
2. **Behavioral check before broad rollout** (empiricist): value-prose has A/B evidence of changing nothing. Pick 2–3 concrete behaviors the section should change, compare with/without on Joycraft's own sessions, and ship small and dated with a pre-committed review at the next optimize run.

**D6 — architecture tree: adopt Q4 Option A, then go one step past it.** Slim the generated section to folders + one-line descriptions — and make it check-shaped: regenerated from the real filesystem at init/upgrade and drift-diffed in CI or by tune, so a stale map fails a check instead of misleading an agent (controls-advocate + empiricist, no dissent). The scale-skeptic's amendment is accepted as a documentation duty: name the growth path explicitly — past multi-team scale the root map gives way to nested per-directory instruction files via joycraft-collaborative-setup, not a bigger tree. Joycraft's own 40-line tree in AGENTS.md is the first candidate for the trim.

## Pre-committed measurements

Adopted from the empiricist, amended by the prosecutor and scale-skeptic. Committed now, before data exists, so numbers decide instead of being rationalized:

1. **Stratify or don't bother.** WS1 tags every read as *mandated* (the active skill's own text opens the doc) or *voluntary* (agent followed a pointer mid-task). Only voluntary reads count toward the L2 hypothesis. This is a hard design requirement on the scanner, not a nice-to-have.
2. **Per-doc RETIRE rule.** After 30 sessions or 60 days, any `docs/context/` doc with zero voluntary reads becomes a RETIRE candidate with VERIFIED evidence in optimize's disposition table — with an explicit **insurance exemption**: troubleshooting-class docs are scored on reads-during-incident-shaped-sessions, since near-zero baseline reads is their expected healthy behavior.
3. **Tier-level kill threshold.** If aggregate voluntary reads across `docs/context/*.md` (decision log excluded — it has already earned survival) fall below ~1 per 10 sessions at the 30-session mark, the shrink-to-near-zero verdict wins: the four docs collapse into decision-log rows, L1 lines, or deletion, and the scanner's scope shrinks to the decision log.
4. **Tier-level survival threshold.** Any doc voluntarily read in >20% of feature-shaped sessions survives outright; the Reaper prunes the rest doc-by-doc under rule 2.
5. **D1 validation.** If more than half of 7-day staleness flags fire on discoveries subsequently read, the threshold was fiat-wrong and moves (the decision-log's own revisit clause already anticipates this).
6. **Hard sunset, not a ventilator** (prosecutor's condition): if 60 days pass without the thresholds resolving — noise, underpowered counts, degraded Codex data — the default at the next gate is shrink, not extend-the-study. Measurement must not become the mechanism by which the tier evades judgment indefinitely.
7. **Team-scale amendment** (scale-skeptic): before Joycraft recommends this telemetry to multi-contributor projects, the machine-local design gains merged aggregate counts (per-user counters combined at optimize time, never transcripts) — otherwise every teammate's optimize run sees 1/N of reads and RETIRE evidence is systematically biased toward kill.
8. **What telemetry cannot decide, the panel decided today:** D5 and D6 above (L1 emits no read events), the decision log's survival (settled on in-repo evidence), and harden-first routing (settled on the hierarchy). Read counts measure attention, not value — a clean pro-L2 read rate ends the *pollution* argument, not the *outcome* argument; only an ETH-style with/without comparison ever could.

**Bottom line:** L2 survives — smaller, harder-gated, and metered. Its charter narrows to what code cannot say and a check cannot enforce; harden-first is the admission gate on every write; the decision log is its anchor tenant; the other four docs are on a 30-session probation with pre-committed eviction rules; and the always-injected file gets the directional content plus a machine-verified folder map, nothing more.