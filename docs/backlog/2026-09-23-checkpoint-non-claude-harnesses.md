---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-23
source: docs/templates/reference/interactive-checkpoint.md
---

# Interactive checkpoint for non-Claude harnesses

Bring the db-backed checkpoint page to Codex, Pi, omp, and Copilot, and give Claude a fallback when the Artifact tool is absent. A three-agent panel explored this on 2026-09-23; two of three converged on the same design.

**Recommended design (panel A and C):** `joycraft checkpoint open <html>` starts a detached node `http` server on a random localhost port with a one-time token in the URL, opens the browser, and exits. Answers persist to a gitignored file under `docs/.joycraft/`. `joycraft checkpoint read` prints the same `decisions:` YAML the artifact path produces. The page runtime stays byte-identical: it reaches its store only through the `db` handle from `window.claude.use`, so the server injects a fetch-backed stand-in with the same narrow surface (`collection().doc().set/delete`, `onSnapshot`, `doc().get/set`). Zero runtime deps, no per-harness registration, skill text only. Not a single blocking command: agent shell tools time out near ten minutes.

**Universal fallback first (panel B):** harden paste-back and add localStorage resume, about 45 runtime lines. Fixes two defects in the shipped template: Submit does nothing without a store, and the output YAML carries option labels instead of keys, drops the assignee, and has no start or end markers, so a pasted block cannot be parsed reliably. Read-back rule: parse the last block between the markers; a missing end marker means truncated.

**Rejected:** MCP as the base transport (Pi has no MCP; Codex, Copilot, and omp would each need a new config patcher in the installer). Viable later as a thin wrapper over the server. `<a download>` of an answers file (lands outside the project). File System Access autosave is a Chromium-only add-on, not a base.

**Why deferred:** a new CLI command with a process lifecycle and tests against a live port is its own feature and deserves a brief and specs, not an inline build on PR #78.

**Start point:** ship the paste-back fixes as one small commit, then `joycraft-new-feature` for the server. Unverified: omp's MCP support; phone-on-LAN needs an opt-in flag and the token.

**Related:** docs/templates/CHECKPOINT_TEMPLATE.html, docs/templates/reference/interactive-checkpoint.md, PR #78.
