# Intent: Reimagine Joycraft as a dynamic, gate-driven harness that adapts itself per project and per user

Author: Maximilian Maksutovic
Status: untriaged
source: interview

## Problem

Joycraft was built to keep weaker models on task. Frontier models (Fable 5.1, Opus 5.5, GPT-6 Astra and Luna) have outgrown the step-by-step process prose that makes up most of its 22 static skills. The maintenance surface decays on the maintainer's release cadence: five per-harness skill copies, a folder map that is never regenerated after first install, and a hand-written profile doc per model while Anthropic ships a new guide about every three weeks. Users, including about fifteen daily-driver colleagues, forget which of the many slash commands to run, and all 22 skills compete for auto-invocation. Ten skills hand off through the human with "clear the session, paste this briefing," so the human is the glue between steps rather than the bookends. In recent sessions the implement loop produced hours of unshippable slop, which is the gap Shopify's Helix closes with blocking gates.

## Proposed outcome

- One entry skill plus a small visible core routes the human through the whole lifecycle. The old names still work through shims.
- The CLI answers "what exists and what is next" so skills stop handing off through the human.
- Process prose becomes checks and blocking hooks. When the implement loop finishes, the human can trust the result is shippable.
- The harness may propose project-specific skills, hooks, and scripts, but nothing generated activates until an eval or the human accepts it, and generated files live in their own namespace with provenance.
- Model guidance arrives by fetch or by update, never by hand-written per-model docs. An audit removes instructions a vendor now says to drop.
- Jev (TypeSafe) routes prompts to skills, files, context-map pointers, and tool calls for anyone who brings a key, and degrades to today's behavior when unreachable.
- The design bookend front-loads quality: panels while exploring, checkpoint artifacts once the idea is clear, diagrams and prototypes before specs, and an architecture-defense session where the agent defends its design with code and the human's corrections become the enforceable record.
- Setup captures the user's technical background and forks the abstraction level, so novices and practitioners walk the same path at different altitudes.
- The invariant across every project stays fixed: the gates and lifecycle, the artifacts, Simplified Technical English, and the TDD loop that replaces vibe coding.

## Affected users and systems

Every Joycraft user on Claude Code, Codex, Pi, Copilot, and omp. Order of service, confirmed 2026-09-24: the maintainer first as the super-user, then the roughly fifteen colleagues who use Joycraft daily, on one path. Output of this exploration, confirmed: intent and evidence pack committed, no draft brief; panel findings delivered as an in-depth HTML artifact with a Markdown copy. All 22 skills in `src/skills/`, the generator and sync scripts, the update machinery and its ownership kinds, the folder map, the model profile, the CLI, the templates, the intent inbox, the checkpoint pages, and the docs-sync gate. The parked Opus 5.5 prompting feature on `feature/opus-5-5-prompting`.

## Constraints

- Nothing generated activates without an acceptance gate. Every study where generation helped had one.
- Generated artifacts never use the `joycraft-` prefix and get their own ownership kind in the manifest.
- Jev is bring-your-own-key. TypeSafe's terms forbid shared credentials. Every Jev-backed hook fails open to today's behavior.
- Keep the zero-runtime-dependency CLI. Hosted services stay optional.
- The Opus 5.5 feature stays parked and unstamped until the panel rules; its uncommitted `docs/.joycraft/manifest.json` edit is never staged.
- Two adversarial panels run first, one on Claude with Fable at high effort and one on Codex with GPT-6 Astra at ultra, and both report before any spec is written.

## Open questions

- P0–P11 in `docs/research/2026-09-24-dynamic-joycraft-evidence.md` section 9, each to be kept, flipped, or qualified by the panels.
- Can Stop hooks block in current Claude Code? The hooks page says no; prompt-type Stop hooks and `/goal` exist. Needs a direct check before any Stop-gate design.
- Is a self-declared technical background reliable, or should the harness infer level from behavior?
- What re-checks human-corrected architecture decisions as the code drifts?
