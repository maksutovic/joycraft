---
id: 2
status: done
---
# Outcome

No shipped skill or reference points to a file that is not shipped, or
describes a part that is not shipped. Brief:
[dead-references goal](../brief.md#goals). Ruling `dead-reference-scope`
(2026-11-15, [talk review](../../2026-11-15-talk-review-tan-holmes/brief.md)):
"seven-and-text".

## acceptance

- The seven dead paths are gone. Check: no shipped skill, agent file or
  reference names `hooks-runtime.md`, `hooks-install.md`, `hooks-claude.md`,
  `routing.md`, `.joycraft/runtime/hooks/judge.mjs`,
  `.joycraft/runtime/hooks/metrics.mjs` or `.joycraft/runtime/hooks/cli.mjs`,
  and `scripts/export.mjs` no longer imports an absent `./install-hooks.mjs`
  (`[AC:no-dead-references]`, link test below).
- A test guards it. Check: `tests/payload-links.test.mjs` walks every shipped
  `SKILL.md`, agent file and reference; each relative Markdown link and each
  named `.joycraft/references/**/*.md` or `.joycraft/runtime/**/*.mjs` path, at
  any depth, exists in the bundle. Run against the `field-18` bundle it fails
  and lists the seven files; run against this change it passes
  (`[AC:link-test-fails-on-field-18]`).
- The text about parts that are not shipped is gone. Check: in the exported
  bundle these passages are removed, or cut to one sentence that says what the
  shipped command returns:
  - `joycraft-entry/SKILL.md`: native hook routing advice, hook status and
    blocked edits, the routing adapter, hook installation.
  - `references/context.md`: Jev scoring, batches, `hooks-config.json`, the
    Keychain credential and provider fallback. What stays: results come in
    local-search order and each is marked unranked with `ranker-not-installed`.
  - `references/dispatch.md`: the section "Bind the hook source view" and its
    contents entry. What stays: startup returns `hooks.reason:
    "hooks-not-installed"` and `ready: true`.
  - `references/retro.md`: the hook metrics command, "hook receipts", "Jev
    calls" and the evidence-collector pointer.
  - `joycraft-verify/SKILL.md` and `joycraft-testing/SKILL.md`: hook rule and
    test-gap findings, classifier score, clean hook receipt, post-edit hook
    findings.
  - `joycraft-implement/SKILL.md` and `joycraft-verify/SKILL.md`:
    "hooks-disabled/manual" and "unenforced" startup results.
  - `references/architecture.md` and `references/setup.md`: global Jev
    constraints, hook rule paths, hook activation.
  - `joycraft-session-end/SKILL.md`: the Claude `SessionEnd` paragraph, only if
    no shipped installer registers that hook (check first).
  `tests/payload-terms.test.mjs` fails when a shipped skill, agent file or
  reference contains `Jev`, `hooks-config.json`, `hook receipt`, `classifier`,
  `routing advice`, `hookSourceView` or `hooks-disabled`. An allowlist entry
  carries its reason. Allowed from the start: `hooks.afterArchive`
  (settings), the Claude `WorktreeCreate` hook (worktrees) and the Stop hook in
  the new gates reference (`[AC:no-unshipped-text]`).
- The payload text gets shorter. Check: the word count of the shipped skills,
  agent files and references, without the new `gates.md`, is below the
  `field-18` count of 30,434 (`[AC:payload-shorter]`).
- Shipped behavior does not change. Check: `dispatch-start.mjs` and
  `context/cli.mjs` and their existing tests are unchanged by this spec
  (`[AC:runtime-untouched]`).

## Not covered

Links to URLs. Paths inside code fences that are examples for the user's
project (`docs/context/...`). The optional loading code in the runtime
(`hookRuntime()` in `dispatch-start.mjs`, the `rank-model.mjs` import in
`context/index.mjs`, `hooks-config.json` in `context/cli.mjs` and
`scripts/export.mjs`): it stays, because the prototype may still use it.

## Implementation and verification scope

Implemented in joycraft-prototype. Discovery first: the prototype may keep the
hook and ranker parts in its own tree. The change applies to what the field
export emits, and both tests run over the exported bundle. If the prototype
keeps a passage, strip or swap it at export. Files: the skills and references
named above, `scripts/export.mjs`, `tests/payload-links.test.mjs`,
`tests/payload-terms.test.mjs`. Spec 3 adds the new gates reference; this spec
only removes. Sources for the scope: Ben Holmes, "Your AI Agent Is Hiding Its
Mistakes From You" (7:52–8:56); digest
`docs/research/2026-11-15-tan-holmes-talks-digest.md`.
