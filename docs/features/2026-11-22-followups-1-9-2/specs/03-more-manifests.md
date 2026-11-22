---
id: 3
status: in-review
---
# jsconfig, deno.json and pnpm-workspace.yaml need the gate again under the docs root

Parent: [brief](../brief.md), section `delivery`. Decision quoted by ID: `se-docs-root-manifests` = `gate-them` (1.9.1 brief). Source: 1.9.1 review follow-ups, spec 5.

## acceptance

- More manifests: `jsconfig*.json`, `deno.json`, `deno.jsonc` and `pnpm-workspace.yaml` (any case, as the existing rule) are manifests, never records, anywhere under the docs root, feature and archive folders included. A push whose only change since the receipt's revision is `docs/site/deno.json` or `docs/features/x/pnpm-workspace.yaml` is refused as needing the gate; `docs/notes.json` still reuses the receipt. Check: `tests/runtime-wave-gate.test.ts` `[AC:spec-3-1]`.
- Text: the `docsOnlySince` doc comment and `delivery.md`'s clean-tree bullet name the new manifests and say the manifest rule holds anywhere under the docs root. `delivery.md`'s words do not grow. Check: `tests/text-wave-gate.test.ts` `[AC:spec-3-2]` and `tests/payload-guard.test.ts` pass.

## Test changes

- `tests/runtime-wave-gate.test.ts` class 1: acceptance bullet 1 adds the new manifest cases.
- `tests/text-wave-gate.test.ts` class 1: acceptance bullet 2 asserts the new names and the anywhere-under-the-docs-root wording.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/delivery.mjs` (`manifest`, the `docsOnlySince` comment), `payload/.joycraft/references/delivery.md`, and the two test files above.
- Tests: `tests/runtime-wave-gate.test.ts`, `tests/text-wave-gate.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-3-<n>]`.
