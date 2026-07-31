---
name: joycraft-harden
<!-- harness:claude -->
entry: agent
<!-- /harness -->
description: Invoked by tune, optimize, or session-end to convert eligible boundary prose into machine-checked deny patterns — not a user entry point.
instructions: 11
---

# Harden (Prose Boundaries → Machine Checks)

You are converting eligible ALWAYS/ASK FIRST/NEVER boundary prose into machine-checked
form. Prose is a rule the model merely hopes to follow; a deny pattern or hook enforces it.
Harden is convert-what-exists — it never interviews from scratch (that's `joycraft-lockdown`).

## Step 1: Read the current state

Read the project's boundary file ({{boundary_file}}, or wherever the ALWAYS/ASK FIRST/NEVER
rules live), `.claude/settings.json` `permissions.deny`, and
`.claude/hooks/joycraft/deny-patterns.txt`. These are the **only two enforcement surfaces**
you target. Both are installed by Joycraft's safeguard machinery (`npx joycraft@latest init`) —
you append to the files it produces, you never rewrite the hook script itself, and you
never add a new hook framework.

<!-- harness:codex|pi -->
**Note:** the enforcement surfaces live on the Claude Code side (`.claude/`). If this
project has no `.claude/` install, harden can still classify rules and stamp provenance,
but there is no machine-check surface to write to — say so and stop after Step 2.
<!-- /harness -->

## Step 2: Classify each ALWAYS/ASK FIRST/NEVER rule

For every rule, decide **eligible** or **ineligible**:

- **Eligible** — the rule can be stated as a command regex or file-path pattern with
  near-zero false positives (e.g. "never push to main/master" → an anchored `git push`
  regex).
- **Ineligible** — the rule is semantic/judgment-dependent (e.g. "keep dependencies
  minimal", "changes affect all users"). Leave it as prose and label it ineligible in
  your run summary. When in doubt, ineligible — judgment stays with the model.

**Semantic downgrade guard:** ASK FIRST rules are not NEVER rules. Converting an ASK FIRST
rule into a hard deny silently removes the "ask" step. If you propose converting an ASK
FIRST rule to a deny pattern, flag the downgrade explicitly in the proposal — don't let it
pass as a routine conversion.

**Anchoring:** a regex that would false-positive a legitimate command (e.g. blocking
`git push origin main` also blocking `git push origin main-docs`) is not safely
expressible — anchor with word boundaries (`\bmain\b`, `\bmaster\b`) or reclassify
ineligible.

**Already covered:** if a rule already matches an existing deny pattern, label it
`verified` and just stamp provenance if the boundary-file line is missing it — don't
duplicate the pattern.

## Step 3: Propose exact diffs — PROTOCOL

Show the exact diff for each eligible rule before touching anything:

- The literal line(s) added to `.claude/hooks/joycraft/deny-patterns.txt`.
- The literal string(s) added to `.claude/settings.json` `permissions.deny` (create the
  array if absent; never disturb `permissions.allow` or the `hooks` config).

## Step 4: Apply only on explicit human approval — PROTOCOL, never auto-apply

Do not write to `deny-patterns.txt` or `settings.json` until the human has explicitly
approved the diff shown in Step 3. If the human rejects a proposed conversion, the rule
stays prose — record the rejection in the harden run summary and move on; do not re-propose
it in the same run.

## Step 5: Stamp inline provenance — PROTOCOL

For every rule you convert (or verify as already covered), stamp its {{boundary_file}} line with
an inline HTML comment, exactly this format:

```
<!-- origin: <failure|source> <date>, probation: <model> -->
```

`<failure|source>` is either the failure that motivated the rule or the source that
established it (a decision, a brief, an incident). `<date>` is the stamp date. `<model>`
is the current model name — this is what later goes on probation when the model changes.
The comment is inline on the rule's own line, invisible in rendered Markdown — no sidecar
table.

## Step 6: Report

Summarize: rules converted (with the diff applied), rules verified (already covered, now
provenance-stamped), rules left ineligible (with why), and any rejections.

## Constraints

- Target only `permissions.deny` and `deny-patterns.txt` — never the hook script
  itself, never `docs/templates/`, never a new hook framework.
- Never auto-apply. Every write to `settings.json` or `deny-patterns.txt` requires the
  Step 4 approval gate.
- Leave ineligible rules as prose, labeled ineligible.
- Never silently convert ASK FIRST into a hard deny — flag the downgrade.
- Probation review (a rule's `probation:` model no longer matches the current model) is
  surfaced by `joycraft-tune`, not decided here — harden never auto-retires a rule.
