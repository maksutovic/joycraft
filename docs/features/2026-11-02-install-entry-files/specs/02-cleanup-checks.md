---
id: 2
status: done
---
# Cleanup finds dead pointers, unmapped pages and a long AGENTS.md

Goal: [doc-audit](../brief.md#doc-audit), decision `trim` ("report, propose
moves, apply on the user's yes"). Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`).

## acceptance

Three new checks in `cleanup.mjs`, each with `check`, `path`, `line` when known,
`detail` and `fix`:
- `missing-path`: a backticked project path in AGENTS.md, CLAUDE.md or a context
  page that does not exist. Skipped: globs (`*`), placeholders (`<slug>`,
  `[slug]`), URLs, fenced code. Check: `tests/runtime/cleanup.test.mjs` fixture
  with `` `docs/context/reference/` `` reports it; `` `docs/features/<slug>/` ``
  and `` `src/**` `` do not.
- `unmapped`: a context page that no entry file links or names, even when
  another context page mentions it. Check: fixture where only
  `decision-log.md` mentions `shipped.md` reports `shipped.md`.
- `entry-size`: AGENTS.md or CLAUDE.md over the word budget (default 1,000;
  `cleanup.entryWords` in `joycraft.yaml`). Check: a 1,200-word fixture reports
  it; with `entryWords: 1500` it does not.
- Regression: run against a copy of this repo's AGENTS.md from before PR #87
  (`git show 6c7781a:AGENTS.md`, saved as a fixture) reports the
  `docs/context/reference/` pointer, `shipped.md`, `anchors.md` and the size.
  Check: same test file, "pre-#87 AGENTS.md".
- `orphan` still behaves as before. Check: existing cleanup tests pass.

## Implementation and verification scope

`.joycraft/runtime/cleanup.mjs`, `.joycraft/runtime/config.mjs` (new key),
`.joycraft/references/cleanup.md` (table rows), `.joycraft/templates/joycraft.yaml`
(commented key), `tests/runtime/cleanup.test.mjs`, `fixtures/cleanup/`.
