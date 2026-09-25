# Agentic OS V2 — what it is and what transfers to a Joycraft frontend

> Date 2026-09-24. Source: local clone at the maintainer's machine of ctskool/agentic-os-starter-v2, plugin 0.3.64, HUD 2.0.0-preview.28. Written for: the maintainer. Status: digest only. No decision.

## Read this first

Agentic OS V2 has three layers. A dashboard layer shows status and lets a person start work. A vault memory layer stores state as plain markdown, JSON, and CSV files on disk. A skill backbone layer discovers skills, builds command lines, and runs them. The dashboard has two front doors. One is an Obsidian plugin cockpit that lives inside the vault. The other is Jarvis, a Next.js web app called the HUD. Both front doors talk to one local bridge process on port 3219. The bridge runs work two ways. A single-shot headless run pipes a prompt into a CLI process and waits for one JSON result. An interactive run opens a real terminal with node-pty and stays open for a back-and-forth conversation. The frontend report's verdict is direct. The bridge, the skill buttons, the work drawer, and the report and artifact viewer do not depend on Obsidian. Every dashboard panel reads one fixed vault file or folder name. Those panels do not move to a new project shape without a rewrite.

## Architecture

```
You (talk or click)
  +-> Obsidian plugin (inside the vault: orb + dashboard + terminal tabs)
  +-> Jarvis HUD (web app in the browser: same buttons)
         |
         v
      THE BRIDGE (one process, both apps send every request here)
         |
         v
      Runs a headless CLI call, or opens an interactive terminal
         |
         v
      THE VAULT (shared memory: plain markdown, daily notes, reports)
```

The bridge is one Node process, `obsidian-v2/runner/bridge.mjs`, started by a service supervisor that restarts it after a crash. Five ports matter.

| Port | Service | Purpose |
|---|---|---|
| 3217 | Jarvis HUD | the Next.js web dashboard. |
| 3218 | preview | a static preview server for dashboard-skill tests. |
| 3219 | bridge | the API server for all agent dispatch, terminals, and artifacts. |
| 3220 | speech | local speech-to-text and text-to-speech service. |
| 3221 | supervisor | the recovery and singleton-lock service. |

The bridge binds only to `127.0.0.1` and checks the request `Host` header and a small allow-list of origins. On boot it writes a random 32-byte token to a local file with restricted permissions. Only mutating requests need the token in an `X-V2-Token` header. The browser fetches its copy of the token from a same-origin endpoint and never reads the token file directly. The bridge exposes 45 routes in one file, with no router library. Real-time updates use two patterns and no WebSocket: server-sent events for voice and announcement messages, and interval polling with a cursor for terminal output and service status.

## How a button becomes an agent run

A headless run pipes the prompt over stdin and waits for one process exit. The exact commands, trimmed:

```
codex exec -c sandbox_workspace_write.network_access=true -c approval_policy="never" \
  -c web_search="live" --ephemeral --skip-git-repo-check --sandbox workspace-write \
  --model <model> --json --color never --output-last-message <log>.final.md \
  --output-schema <projectRoot>/runner/result-schema.json \
  -c mcp_servers.agentic_vault.command="<node>" \
  -c mcp_servers.agentic_vault.args=["<projectRoot>/runner/vault-mcp.mjs"] -
```

```
claude --print --model <model> --output-format json --no-session-persistence \
  --mcp-config '{"mcpServers":{"agentic_vault":{...}}}' \
  --json-schema <projectRoot>/runner/result-schema.json \
  --permission-mode acceptEdits \
  --allowedTools "Read,Glob,Grep,WebSearch,WebFetch,mcp__agentic_vault__*,..."
```

| Flag | Purpose |
|---|---|
| `exec` / `--print` | run once and exit, no interactive session. |
| `--sandbox workspace-write` / `--permission-mode acceptEdits` | auto-approve actions, but only inside a sandbox. |
| `-c approval_policy="never"` | Codex-side auto-approval, paired with the sandbox flag above. |
| `--json` / `--output-format json` | machine-readable result, not free text. |
| `--output-schema` / `--json-schema` | force the result to match `result-schema.json`. |
| `--output-last-message <file>` | Codex writes its final answer to a file, not stdout. |
| `-c mcp_servers.agentic_vault.*` / `--mcp-config` | wire in the read-only vault MCP server. |
| `--allowedTools` | Claude's exact tool and connector allow-list for this run. |
| `--ephemeral` / `--no-session-persistence` | skip saving a resumable session for this run. |

No run uses a full permission bypass. Codex pairs `approval_policy="never"` with a `workspace-write` sandbox. Claude uses `acceptEdits`, a narrower mode than a full bypass.

The interactive path spawns a real PTY with `node-pty` instead of a pipe. Codex takes `codex [resume <sessionId>] -C <vaultRoot> -m <model> --no-alt-screen -c notify=[...]`. Claude takes `claude --model <model> --settings '{"hooks":{"SessionStart":[...],"Stop":[...],...}}' [--resume <sessionId> | --session-id <taskId>]`. Claude passes five lifecycle hooks as one settings JSON object, all pointed at one script. Codex instead gets one `notify=` callback pointed at the same script.

The worker model for a full run is whatever the person picked in the HUD's provider and model list, set in `obsidian-v2/shared/contract.mjs`. The fast classification pass used for voice intent is pinned per provider and is not a user choice: Haiku for Claude, a small named Codex model for Codex.

Every full run must return one JSON shape, `{status, summary, markdown}`, checked against `result-schema.json` on the server side. For artifacts, the worker's prompt tells it to write a local file. The prompt then tells it to run a small helper script that files a claim naming that file's path. The bridge watches for that claim, checks the file, and serves its bytes through one locked-down endpoint that the viewer proxies. The worker never gets to serve the file itself.

## The frontend

The Jarvis HUD screenshot shows a fullscreen dark stage with no panel boxes, where text floats over an animated 3D shape. A left rail shows vitals, top priorities, and recent documents, and a right rail shows quick-launch skill buttons and a voice card. A bottom bar shows the running model's name, an open-terminal count, and a transcript button.

The Obsidian cockpit screenshot shows a bounded card inside an Obsidian pane, not a fullscreen stage. It shows the same kind of data as the HUD. The card holds a usage gauge, four metric tiles, five workflow buttons, a schedule and task list, and a feed of finished runs.

`DESIGN.md` sets firm rules. The theme is a warm near-black background, never pure black. One color spectrum carries the whole surface, with one second color kept only for a listening state. Two type families cover labels and hero numbers, with no boxes anywhere, only hairline separators. Layout is fixed rails around an empty center. Motion is one boot reveal that runs once, plus short state changes, collapsed entirely once the person's system asks for less motion.

| Component | Reads | Obsidian-bound | Voice-bound | Standalone. |
|---|---|---|---|---|
| `CommandDeck` | the skill and workflow catalog | Partly | No | Yes. |
| `AgentWorkDrawer` | the work feed and a live terminal | No | Partly | Yes, most reusable. |
| `TerminalTabs` | tab state passed in as props | No | No | Yes. |
| `ProviderUsage` | a usage gauge endpoint | No | No | Yes. |
| `DashboardCustomizer` | the skill catalog store | No | No | Yes. |
| `SkillBrowser` | the skill catalog store | No | No | Yes. |
| `ReportOverlay` | a vault markdown file by path | Yes, one disabled link | No | Yes, drop that link. |
| `ArtifactOverlay` | one artifact by id | No | Delivered by voice | Yes. |
| `Vitals` | a metrics CSV file | Yes | No | Only with a new metrics source. |
| `Priorities` / `Schedule` | the daily-note file's fixed headings | Yes | No | No. |
| `Wire` / `Objective` | YouTube and creator metrics | Yes | No | No. |
| `AudioIO` | the voice client | No | Yes | No. |

Skill buttons come from two sources merged into one list. Fixed workflows sit hardcoded in one file. Installed skills turn up by a walk of a small set of known folders. For Claude, that means `~/.claude/skills` and a matching folder inside the vault. For Codex, it means `~/.codex/skills`, `~/.agents/skills`, and their vault equivalents. The scan reads each found `SKILL.md` file's frontmatter with a YAML parser to get a name and a description. It never runs anything during the scan itself. The merged selection lives in one JSON file per vault, capped at ten buttons. Each skill carries a content hash, so an edited file needs approval again.

The work drawer tracks each task through states: starting, working, needs input, ready, editing, stopping, stopped, or error. A task with a live process, or any state other than stopped or error, counts as open and gets a tab. A stopped task moves to a history list and expires after seven days unless the person pins it. A closed task with a saved session id gets a Resume button. A closed task that never got to save gets a Recover option that copies its last draft into a fresh start.

## What transfers to a Joycraft frontend

| Idea | Where it lives in the starter | Effort to reuse | Note. |
|---|---|---|---|
| State-driven status shown cheaply | `HUD.tsx`. One mode value drives the whole page | Low | Copy the idea, skip the 3D rendering. |
| Work drawer as a session manager | `AgentWorkDrawer.tsx`, `work.ts`. | Medium | Maps well onto a list of running or finished spec sessions. |
| Callout reveal-and-morph pattern | `HUD.tsx` callout logic | Medium | A finished-task card that stays in place instead of a toast. |
| Bounded, hash-verified skill buttons | `dashboard.mjs`, `DashboardCustomizer.tsx` | Low | Folder scan plus one revisioned JSON file, already solved. |
| Narrow, safe report and artifact viewer | `ReportOverlay.tsx`, `artifact-proxy.ts` | Low | A markdown-subset renderer plus a same-origin file proxy. |
| A written design contract first | `jarvis-v2/DESIGN.md` | Low | The habit matters more than this project's exact palette. |
| Per-boot auth token | `bridge-auth.mjs`, `shared/bridge-auth.ts` | Low | A clean pattern for a frontend talking to a sibling local service. |
| Pure command-builder functions | `adapters.mjs`, `terminals.mjs` | Low | Keeps `spawn()` thin and lets the CLI-building logic get tested alone. |
| Ownership-proof stop logic | `services.mjs` | Medium | Before killing a shared-port process, make it prove it is this install's own. |

## What does not transfer

- **The Obsidian plugin** needs a real TTY that only Obsidian provides. Its native terminal path hands a launch ticket to Obsidian's own Terminal plugin to get one.
- **The voice stack** makes up most of the codebase's line count. Speech-to-text, text-to-speech, and the multi-tier voice router answer a product question a plain web tool does not ask.
- **The daily-note schema** locks several panels to one frozen set of markdown headings. Those panels carry no meaning outside that one note format.
- **Social metric cards** serve one specific audience. YouTube, Instagram, and TikTok tiles, plus eight creator-vertical cards in the Obsidian cockpit, all target a content creator, not a developer.
- **The hardwired read layer** is not a generic interface. `vault.ts` is a direct filesystem reader tied to fixed folder and file names, so a new project shape cannot plug into it.
- **YouTube research tools** have no place in a specs-and-decisions tool. Two of the five vault MCP tools only serve the creator vertical.

## Engineering assessment

The bridge report calls five things well designed:
- The per-boot auth token bootstrap.
- Pure command-builder functions that keep `spawn()` testable.
- The ownership-proof check before killing a shared-port process.
- An append-only tombstone log that stops a retired task id from ever coming back.
- One strict JSON result shape, enforced for every headless run regardless of provider.

The bridge report calls five things overbuilt or fragile for a rebuild:
- The whole voice subsystem.
- The voice router's mix of rules, a model call, and a large inline prompt string.
- Full ANSI terminal emulation with `node-pty`, just to let a person type into a raw CLI from a browser.
- The second, Obsidian-only native-terminal path, with its own socket protocol.
- A hand-rolled MCP server and a hand-rolled HTTP router, in place of an official library.

The frontend report names what feels good:
- One state value drives the whole page's visual agreement.
- A finished-task card morphs in place instead of popping a toast.
- A written design-token contract gets fixed before building starts.
- Real accessibility work shows up, such as focus-return dialogs and `aria-live` regions.
- Careful keystroke queuing means a stop request can never race ahead of unsent input.

It also names what reads as a gimmick:
- The 3D centerpieces are decoration, by the design doc's own admission.
- Four full alternate versions of that centerpiece sit as dead code.
- Demo query-parameter modes suggest some of the "live" dashboard exists to look good in a recording.

Stack facts: Next.js 15.3.2 on the App Router, React and react-dom 19.1.0, six runtime packages for the whole HUD app. The bridge's own runner code totals 7,599 lines. That figure grows to about 12,787 lines once shared code and the frontend's API and library layers join the count. The repository carries 163 test files. Both packages run them through Node's and `tsx`'s built-in test runners, with no separate test framework.

## Sources

- `obsidian-v2/runner/bridge.mjs:43,85,95,110,93-296` — bridge boot, origin checks, and the route if-chain.
- `obsidian-v2/runner/bridge-auth.mjs:6,14-18,23-30` — token creation and verification.
- `obsidian-v2/shared/bridge-auth.ts:5-18,20-29` — browser-side token fetch and retry.
- `obsidian-v2/scripts/aos/services.mjs:12,27-33` — the port table and the declarative service list.
- `obsidian-v2/runner/adapters.mjs:11-16,43-72` — headless command building and the 2026-09-21 connector-scope decision.
- `obsidian-v2/runner/terminals.mjs:44-66,269-294` — interactive PTY command building and output polling.
- `obsidian-v2/runner/result-schema.json` — the enforced result shape.
- `obsidian-v2/runner/artifact-instructions.mjs:3-11`, `artifact-result.mjs` — artifact handoff instructions and the claim helper.
- `obsidian-v2/shared/contract.mjs:3-4,104` — model catalog and voice-fast model pins.
- `obsidian-v2/runner/dashboard.mjs:44-50,91-92,130-153,159-177,190-205` — skill discovery, hashing, and the revisioned JSON file.
- `jarvis-v2/DESIGN.md` — the design token contract.
- `jarvis-v2/components/HUD.tsx:1063-1072,987-1046` — the mode enum and the callout morph.
- `jarvis-v2/components/AgentWorkDrawer.tsx:15-46,181-183` — work states, polling, Resume and Recover.
- `jarvis-v2/lib/vault.ts:124-694,587` — the fixed vault read layer and its one path allow-list.
- `docs/assets/architecture.mmd` — the source diagram.
