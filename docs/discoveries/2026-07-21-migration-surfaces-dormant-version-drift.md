Migrating `.claude/.joycraft/state.json` to `docs/.joycraft/state.json` (create-harness-config) makes `tests/version-sync.test.ts` newly *active* — it was silently skipping (file absent at `STATE_PATH`) and now fails on stale `version: 0.6.10` vs `package.json`'s `0.6.20`, since the spec's own criterion required preserving the pre-move value byte-meaningfully.

Left as-is: this is a gitignored, machine-owned file that a real `joycraft upgrade` run refreshes; fabricating a version bump here would violate the spec's "State content preserved" acceptance test.
