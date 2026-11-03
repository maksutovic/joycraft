---
id: 11
status: todo
---
# 1.1.2 ships with docs that match

Goal: [release](../brief.md#release), decision `release` = 1.1.2.

## acceptance

- `package.json` `version`, `joycraft.release`, `joycraft.summary` and
  `src/joycraft-release.json` `releaseVersion` all say 1.1.2. Check:
  `tests/release-*.test.ts` pass.
- CHANGELOG `## 1.1.2` says: after install the agent interviews and builds the
  context map; nothing is written before the user's yes; init/update/doctor
  report an unwired project; cleanup uses doc-cleanup's method (credit aka-luan
  and David Moshal); the update prompt; the decision page fixes. Check:
  `scripts/check-docs-sync.mjs` passes and the section names each.
- README: the install prompt's step 3 asks for the interview and the map; the
  context-map section matches `knowledge.md`; Acknowledgments credit doc-cleanup.
  `docs/prompts.md` matches. Check: review on a rendered page.
- Live: Claude Code and Codex each install 1.1.2 from the packed tarball into
  `fixtures/setup/existing-docs` with the README prompt; afterwards `wiring.mjs`
  exits 0 and the update check runs at the start of the next session. Check:
  release-verification log for both hosts.

## Implementation and verification scope

`package.json`, `src/joycraft-release.json`, `CHANGELOG.md`, `README.md`,
`docs/prompts.md`, release tests. Depends on 10.
