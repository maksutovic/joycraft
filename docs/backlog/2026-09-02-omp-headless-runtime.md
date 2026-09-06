---
status: backlog
owner: Maximilian Maksutovic
created: 2026-09-02
source: docs/features/2026-09-02-omp-support/brief.md
---

# Port the Pi headless runtime to omp

**What:** Give omp the same isolated-mode pipeline Pi has: `joycraft-implement-loop` and its sibling scripts, the `joycraft-pipeline` extension, and the researcher and verifier task agents, installed under `.omp/`.

**Why deferred:** The omp support feature (D1) ships the install surface only. Pi's runtime spec shipped against a fictional SDK and needed two post-mortem specs. The port earns its own verification pass against the real omp API.

## Porting notes gathered 2026-09-02 from omp v18.1.5 bundled docs (`omp read omp://...`)

- omp does not read `.pi/scripts`, `.pi/extensions`, or `.pi/agents`. Native roots are `<cwd>/.omp/extensions/*.ts|.js`, `<cwd>/.omp/agents/*.md`, and `<cwd>/.omp/hooks/pre/*.ts`. Discovery is cwd-only for extensions and one level deep.
- Extension port: rename the import scope `@mariozechner/pi-coding-agent` to `@oh-my-pi/pi-coding-agent`. Signature stays `export default function (pi: ExtensionAPI) {}`. `pkg.omp` manifest field is preferred over `pkg.pi`. Legacy `DefaultResourceLoader`, `DefaultPackageManager`, and `SettingsManager` imports are compatibility shims, not the native path (`porting-from-pi-mono.md`, `extensions.md`).
- Task agents: `.omp/agents/*.md` with frontmatter `name`, `description`, `model` (role alias such as `@review` allowed), plus `autoloadSkills` to inject skills. `.claude/agents` and `.codex/agents` are deliberately skipped by omp (`task-agent-discovery.md`).
- Headless flags for the loop script: `omp -p "<prompt>"` (stdin also read as the prompt), `--mode json` for a structured event stream, `--auto-approve` or `--approval-mode yolo`, `--max-time 10m`, `--no-session`, `--model <fuzzy|@role>`, `--thinking <level>`, `--config <overlay.yml>`, `--no-extensions`, `--skills <glob>`, `--append-system-prompt`.
- Model roles live in `config.yml` as `modelRoles: {default, smol, slow, plan, advisor}`. The Execution Profile row for omp can name a role instead of a model.
- Skills are exposed to the model as `skill://<name>` and `skill://<name>/<relative-path>`, so a runtime prompt can point at `skill://joycraft-implement` instead of a file path.
- `omp worktree add|list|clear` exists and can replace the git worktree handling in the Pi scripts.
- `omp agents unpack --project` exports the bundled task agents into `.omp/agents` and is a useful reference for the frontmatter contract.

## Acceptance sketch

- `.omp/scripts/joycraft/joycraft-implement-loop` runs a spec queue as one fresh `omp -p` process per spec, fail-fast, session-end once.
- `.omp/extensions/joycraft-pipeline.ts` loads without a warning under `omp --no-session -p "noop"`.
- `tests/omp-extension.test.ts` and `tests/omp-scripts-queue.test.ts` mirror the Pi suite.
