---
id: 5
status: done
---
# Manifests and lockfiles under the docs root need the gate again, and delivery.md lists the record extensions

Parent: [brief](../brief.md), section `delivery`. Source: [1.9.0 review follow-ups](../../../backlog/2026-11-21-1-9-0-review-followups.md), Owner decisions (test-release/27/f13) and Text and skills (test-release/31/f3). Decision quoted by ID: `se-docs-root-manifests` = `gate-them` ("package.json, tsconfig*.json and lockfiles never count as records").

## acceptance

- Manifests are code [`se-docs-root-manifests` = `gate-them`]: in `docsOnlySince`, a changed path under the docs root whose file name is `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `bun.lockb`, `deno.lock` or matches `tsconfig*.json` is never a record, in the feature and archive folders too, so an old receipt is stale and the push needs a fresh gate. Another `.json` under the docs root (`docs/site/data.json`) and a record in a feature folder still keep the old receipt. Check: `tests/runtime-wave-gate.test.ts` `[AC:spec-5-1]`: a receipt on an ancestor of HEAD is refused as stale (`gate-receipt-stale`) after a change to `docs/site/package.json`, `docs/site/tsconfig.build.json` or `docs/features/f/pnpm-lock.yaml`, and kept after a change to `docs/site/data.json`.
- The doc comment above `docsOnlySince` names the same exception. Check: the same file `[AC:spec-5-2]` reads `payload/.joycraft/runtime/delivery.mjs` and finds "package.json" and "lockfile" in that comment.
- Text [test-release/31/f3]: the `delivery.md` Clean-tree sentence on old receipts lists the record extensions (`.md .json .log .txt .diff .patch .yaml .yml`), says `package.json`, `tsconfig*.json` and lockfiles are never records, and says to save a probe script kept as a receipt with a `.txt` suffix (`probe.mjs.txt`) so it stays a record. Check: `tests/text-wave-gate.test.ts` `[AC:spec-5-3]` finds ".patch", "lockfile" and ".mjs.txt" in the Clean-tree item.
- Words: every-spec words do not change; on-demand words stay inside the cap. Check: the word-cap test in `tests/payload-guard.test.ts` passes and the printed every-spec count equals the count before this spec `[AC:spec-5-4]`.

## Test changes

- `tests/runtime-wave-gate.test.ts` class 1: acceptance bullets 1 and 2 add the manifest cases and the comment check.
- `tests/text-wave-gate.test.ts` class 1: acceptance bullet 3 adds the Clean-tree text check.

## Not covered

Anything in the brief's Scope and limits. Specs other than this one.

- Other build manifests (`Cargo.toml`, `pyproject.toml`) are not records today (their extensions are not in the list), so they already need the gate.
- The reviewer's every-spec text (`joycraft-verify`, the reviewer agent) does not change; the probe rule lives in `delivery.md`.

## Implementation and verification scope

- Edit payload/ only, then `node scripts/pin-payload.mjs`; run the recorded gate once, before review.
- Files: `payload/.joycraft/runtime/delivery.mjs` (`docsOnlySince` and its comment), `payload/.joycraft/references/delivery.md`, `tests/runtime-wave-gate.test.ts`, `tests/text-wave-gate.test.ts`.
- Tests: `tests/runtime-wave-gate.test.ts`, `tests/text-wave-gate.test.ts`, `tests/payload-guard.test.ts`. Tag each new test `[AC:spec-5-<n>]`.
