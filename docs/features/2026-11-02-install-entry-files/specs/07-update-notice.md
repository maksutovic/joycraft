---
id: 7
status: in-review
---
# The update prompt names the right kind of jump and every release

Goal: [update-notice](../brief.md#update-notice). Built in joycraft-prototype, branch `field/1.1.2` (from `field/1.2-custom-answer`).

## acceptance

- `updateKind`: same major and minor → `patch`; same major, higher minor →
  `minor`; higher major → `migration`. Check: `tests/update-check.test.mjs`
  1.0.0→1.1.1 `minor`, 1.1.0→1.1.1 `patch`, 1.1.1→2.0.0 `migration`.
- The message names each release between installed and latest with its summary
  (from the registry's version metadata `joycraft.summary`), at most five, then
  "and N more", and links the CHANGELOG. Check: same test with a stubbed
  packument holding 1.0.1, 1.1.0, 1.1.1.
- `auto-safe` applies only `patch` with `autoSafeEligible`. Check: same test,
  `minor` with eligible → `ask`.
- The registry request stays one request, under two seconds, no project data;
  fetch is stubbed in tests. Check: test asserts one call and the URL.
- Unchanged: snooze, off, pin, unpin. Check: existing tests pass.

## Implementation and verification scope

`.joycraft/runtime/update-check.mjs`, `.joycraft/references/update.md`,
`tests/update-check.test.mjs`. Data source (measured 2026-11-02): the full package document
`https://registry.npmjs.org/joycraft`, 25 KB gzipped, is the only single request
with `joycraft.summary` per version; the abbreviated document has no `joycraft`
field. A real check took about 1.35 s, inside the 2 s deadline.
