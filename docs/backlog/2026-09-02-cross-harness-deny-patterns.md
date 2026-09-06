---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-02
source: docs/features/2026-09-02-omp-support/brief.md
---

# Cross-harness deny patterns in harden and lockdown

**What:** `src/safeguard.ts` writes deny patterns only for Claude Code: `.claude/hooks/joycraft/block-dangerous.sh` wired through `.claude/settings.json`. Codex, Pi, Copilot, and omp get prose boundaries only. Extend harden and lockdown so that each selected harness gets a machine-checked equivalent.

**Why deferred:** The omp support feature (D3) chose not to add an omp-only branch, because the gap is the same for three other harnesses and a per-harness safeguard model is its own design question.

## Known target formats

- **omp** (v18.1.5 docs, `settings.md`): `.omp/config.yml` with `tools.approvalMode: always-ask|write|yolo`, `tools.approval.<tool>: allow|prompt|deny`, and ordered `bash.patterns` entries `{ match: "rm -rf *", approval: deny }`. `deny` and `prompt` rules match any segment of a compound command; `allow` must match the whole command. `bash.patterns` does not cover the `eval` tool, so a deny needs `tools.approval.eval: deny` as well. Arrays are replaced, not merged, by higher-precedence layers, so a project file must carry the full list.
- **Codex:** `.codex/config.toml` sandbox and approval settings. Format to confirm at design time.
- **Pi:** hook file under `.pi/extensions/` that returns `{ block: true }` from a `tool_call` handler. Format to confirm at design time.
- **Copilot:** no known project-level deny mechanism. Confirm at design time.

## Open design questions for the future brief

1. One shared deny list rendered per harness, or per-harness lists?
2. Does `harden` write project settings files that users also hand-edit (the `.omp/config.yml` array-replacement rule makes partial writes destructive)?
3. Which harness gets the `eval` and Python REPL escape hatches closed?
