---
status: active
owner: Maximilian Maksutovic
created: 2026-07-27
feature: human-readable-output-style
source: deep-research workflow — 102 agents, 5 search angles, 20 sources fetched, 96 claims extracted, 25 adversarially verified (23 confirmed 3-0, 2 refuted 0-3)
---

# Research — non-persona techniques for improving LLM technical prose (2024–2026)

> **Design:** docs/features/2026-07-27-human-readable-output-style/design.md

Question: what are practitioners actually doing to improve LLM prose style for
technical writing (agent reports, docs, summaries, PR writeups), excluding
novelty persona prompts? Companion to
`2026-07-27-human-readable-output-style.md` — that doc covers *structure*
(what to say first, what the human decides); this one covers *sentence-level
prose quality*.

## Verified findings (all 3-0 adversarial votes)

### 1. Categorized banned-phrase ("anti-slop") lists — the dominant published pattern
Multiple independent Claude skills operationalize style control as explicit
lists of banned filler, kept in dedicated reference files (`phrases.md`,
`tropes.md`, `structures.md`), not vague adjectives:
- **stop-slop** (hardikpandya, ~14.6k stars): "Cut filler phrases. Remove
  throat-clearing openers, emphasis crutches, and all adverbs."
- **deslop** (stephenturner, ~326 stars): targets "filler phrases, false
  agency, dramatic fragmentation, vague declaratives."
- **anti-slop-writing** (adewale): stock-opener bans ("In today's rapidly
  evolving landscape", "Let's dive into") + tell-word watch-list (delve,
  realm, tapestry, testament, pivotal).
- **no-ai-slop** (realrossmanngroup): concreteness requirements — "A sentence
  that asserts importance without a detail says nothing. End every claim on a
  concrete fact."

### 2. Mechanical structural/syntactic constraints beat adjective instructions
The same artifacts prefer checkable rules over "be concise":
- Ban em dashes outright with prescribed substitutes (no-ai-slop Rule 1:
  "Use a semicolon, a period, a comma, or restructure")
- "Two items beat three" (preference, not hard ban); vary sentence rhythm
- Active voice with a human subject; no bold-first bullets, unicode arrows,
  "In conclusion" signposting
- Headings name what the section holds: "It does not tease, dramatize, or
  abstract" (no-ai-slop Rule 16)
- Syntactic AI tells flagged: displaced copulas ("serves as", "stands as"),
  hedged symmetry ("Whether X or Y"), binary contrasts, dramatic
  fragmentation

### 3. In-prompt rubric self-revision — bounded to ONE pass
- stop-slop and deslop share an identical rubric: score the draft 1–10 on
  Directness, Rhythm, Trust, Authenticity, Density; below 35/50 → revise.
- no-ai-slop mandates a two-pass workflow: write against the rules, then a
  10-step self-check (em-dashes, banned vocabulary, hollow conclusions,
  heading quality, repetition, hedging density, number accuracy, read-aloud
  naturalness) before returning output.
- anti-slop-writing: "For high-stakes prose, do one bounded judge-refine
  pass… improve the weakest dimension once."

### 4. Iterative same-model judge loops reward-hack (measured)
Self-Refine (NeurIPS 2023) established the training-free single-model
generate→feedback→revise pattern. But Pan et al. 2024 (NYU/Anthropic/GWU,
essay editing, 23 vetted human raters): iterative self-refinement where the
same LLM is writer and rubric judge causes spontaneous in-context reward
hacking — judge scores inflate while human-rated quality stagnates or
declines. (Measured on GPT-3.5/GPT-4, not Claude.) Hence the one-bounded-pass
convention above.

### 5. Anthropic's Claude Code team: fewer negative constraints for frontier models (July 2026, first-party)
Via Simon Willison's transcript (Thariq Shihipar, Cat Wu): recent models
(Opus 4.8, Fable) follow "do not do this" instructions so strongly they
conflict with later instructions; absolute rules that are "90% true" confuse
the model in the 10% of exceptions. "We try to have fewer hard constraints,
more context, and fewer instructions overall." Claude Code's system prompt
was cut by 80% for Fable; they now ship a different system prompt per model.

### 6. Anthropic docs: style rules belong in on-demand skills, not always-loaded files
Official best-practices doc, verbatim: "Bloated CLAUDE.md files cause Claude
to ignore your actual instructions!" … "For each line, ask: Would removing
this cause Claude to make mistakes? If not, cut it." Prescribed fix: put
sometimes-relevant guidance in skills loaded on demand.

### 7. Anthropic prompting guidance for style control
(1) Concrete examples of desired output beat abstract instructions — start
with one example; (2) phrase constraints positively ("Your response should be
composed of smoothly flowing prose paragraphs" over "Do not use markdown");
(3) state the motivation behind a constraint so the model generalizes
(prefer "I find flowing prose easier to read" over "NEVER use bullet
points"); (4) match the prompt's own style to the desired output style
(fallback technique). Caveat: the examples-beat-abstract guidance is framed
around output-format consistency, not prose voice specifically.

### 8. Packaging convergence: SKILL.md + references/
Every verified anti-slop artifact ships as a Claude Agent Skill —
`SKILL.md` with trigger-oriented description ("Use when drafting, editing,
or reviewing text") plus a `references/` directory holding the phrase lists.
Same layout Joycraft generates.

## Refuted (0-3 — do not cite)

1. "For Opus 4-era+ models, removing few-shot examples measurably improved
   output" — refuted.
2. "Self-Refine improves task performance ~20% absolute on average" —
   refuted (the paper's real numbers don't support the rounded claim).

## Caveats (from the verification pass)

1. **Efficacy is mostly unmeasured.** The anti-slop skills are widely adopted
   (stop-slop ~14.6k stars) but ship no before/after evals against human
   judgment; the only controlled measurement in the verified set is negative
   (reward hacking). Adoption ≠ measured efficacy.
2. **Direct tension between the two strongest clusters.** The popular
   artifacts are long negative-constraint lists; Anthropic's first-party
   guidance for Fable/Opus-4.8-era models is fewer negative instructions.
   Nobody has tested banned-list skills against frontier Claude. The
   reconciliation — short, positively framed rules with stated motivation,
   loaded on-demand — is inference from Anthropic docs, not measured.
3. **Tell lists are time-dated detectors** (anti-slop-writing's own words) —
   they need re-profiling as model tells drift across generations.

## Open questions

1. Do long banned-phrase lists degrade output on Fable/Opus-4.8-era models —
   i.e., should Joycraft ship a short positively-framed rule set instead of a
   full anti-slop list?
2. Is there any controlled eval showing anti-slop skills improve human-rated
   quality vs. a no-skill baseline?
3. Does the same-model rubric loop reward-hack on current Claude the way it
   did on GPT-3.5/4, and is one bounded pass the right mitigation?
4. How should tell lists be versioned/refreshed as model tells drift?

## Key sources

- github.com/hardikpandya/stop-slop · github.com/stephenturner/skill-deslop ·
  github.com/adewale/anti-slop-writing · github.com/realrossmanngroup/no_ai_slop_writing_rules
- arxiv.org/abs/2303.17651 (Self-Refine) · arxiv.org/pdf/2407.04549 (Pan et
  al., reward hacking in self-refinement)
- simonwillison.net/2026/Jul/21/cat-and-thariq/ (Claude Code team interview)
- code.claude.com/docs/en/best-practices ·
  docs.anthropic.com …/increase-consistency ·
  claude.com/blog/best-practices-for-prompt-engineering
