This environment's `grep` shadow (`ugrep`) unreliably matches `\b` word-boundary escapes when the pattern is read from `deny-patterns.txt` into a shell variable via `while read`, even though the identical pattern typed literally matches fine — the safe boundary form is `(main|master)($|\s)`, not `\b(main|master)\b`.

See `.claude/hooks/joycraft/deny-patterns.txt` and `docs/features/2026-07-21-living-harness/specs/create-harden-skill.md`.
