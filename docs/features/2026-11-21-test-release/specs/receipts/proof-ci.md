# Spec 26 bullet 1: a real test through the payload runtime

Revision: `6163e655888d72d9cf10c5c764092506f3881770`, clean tree, 2026-11-21.

- `node payload/.joycraft/runtime/evidence.mjs run --receipt docs/features/2026-11-21-test-release/specs/receipts/proof-ci.log -- pnpm test tests/runtime-config-tests.test.ts`
  exited 0. Receipt `proof-ci.log`, sha256 `7729a8f810755f99314fcdd5129ecb4895f66f58af5ec57fd7cb5f7794bd8b26`.
- Footer: `exitCode: 0`, `cores: 14`, `loaded: false`, `wallMs: 1382`, `load: [2.84, 2.84]`.
- Both markers: `proof-markers.log` runs `node -e` through the same runtime and prints `CI=1 JOYCRAFT_EVIDENCE=1`
  (that run was on a dirty tree, because `proof-ci.log` was already written).

Limit: one machine (14 cores, not loaded). The field project's `local-run.mjs` change under `JOYCRAFT_EVIDENCE` is deferred.
