# How It Works with AI Agents

> [Back to README](../../README.md)

Joycraft works with both Claude Code and OpenAI Codex, providing the same structured workflows adapted for each platform.

**Claude Code** reads `CLAUDE.md` automatically and discovers skills in `.claude/skills/`. The behavioral boundaries guide every action. The skills provide structured workflows accessible via `/slash-commands`.

**Codex** reads `AGENTS.md`, which provides the same boundaries and commands in a concise format optimized for smaller context windows.

Both agents get the same guardrails and the same development workflow. Joycraft doesn't write your project code. It builds the *system* that makes AI-assisted development reliable.

## Team Sharing

Skills live in `.claude/skills/` which is **not** gitignored by default. Commit it so your whole team gets the workflow:

```bash
git add .claude/skills/ docs/
git commit -m "add: Joycraft harness"
```

Joycraft also installs a session-start hook that checks for updates. If your templates are outdated, you'll see a one-line nudge when Claude Code starts.

## Canonical skills format

All skills live in `src/skills/joycraft-<name>.md` as single-source canonical files. At build time, `scripts/generate-bundled-files.mjs` reads each canonical file and emits per-harness variants into `src/claude-skills/`, `src/codex-skills/`, and `src/pi-skills/`. The transform itself is the pure function `applyTemplate(source, harness)` in `scripts/lib/skill-template.mjs` — testable in isolation, no I/O.

### Three primitives

The canonical format uses exactly three primitives. Don't invent new ones — extend only via a design discussion.

1. **Variable substitution.** `{{var}}` is replaced from a per-harness lookup. The fixed 4-variable set:

   | Variable | claude | codex | pi |
   |---|---|---|---|
   | `{{skill_prefix}}` | `/joycraft-` | `$joycraft-` | `/skill:joycraft-` |
   | `{{clear}}` | `/clear` | `run `/clear` in the CLI, or press Cmd+N (Ctrl+N on Windows/Linux) for a new thread in the desktop/IDE app` | `/new` |
   | `{{skills_dir}}` | `.claude/skills` | `.agents/skills` | `.pi/skills` |
   | `{{boundary_file}}` | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |

   The generator throws `Error("unknown template variable: {{x}} in <file>")` on any unrecognized variable — typos surface at build time, not in CI. Substitution applies in both frontmatter and body, so `description:` lines can reference `{{boundary_file}}` etc.

   The codex `{{clear}}` expansion is a long multi-surface sentence on purpose — `/clear` works in the Codex CLI but does **not** exist in the Codex desktop app or IDE extension (verified 2026-06-14). A single short token would silently fail the majority of Codex users. See `docs/features/2026-06-11-single-source-skills/brief.md` Hard Constraints for the rationale.

   The variable lookup is defined in `scripts/lib/skill-template.mjs`. The table above must stay in sync with that file — if the lookup changes, regenerate this table.

2. **Conditional blocks.** `<!-- harness:NAME -->...<!-- /harness -->` where NAME is `claude`, `codex`, `pi`, or a pipe-list like `claude|codex`. The block (delimiters included) is kept iff the current harness is in NAME; otherwise it's stripped. When the open/close tags sit on their own line, the surrounding newlines are consumed so stripped blocks leave no blank-line residue.

   Currently used in 4 skills: `joycraft-research`, `joycraft-verify`, `joycraft-lockdown`, `joycraft-implement-feature`. Don't add new blocks without a design decision — most cross-harness differences should be folded into the canonical at full claude fullness, with codex/pi inheriting the longer content.

3. **Per-harness frontmatter stripping.** The generator drops the `instructions:` field from codex and pi frontmatter (claude keeps it). Other frontmatter fields are preserved as-is, in the original key order.

### Cat D canonical form (boundary file)

The "boundary file" — the top-level instruction file each harness reads — differs by harness: `CLAUDE.md` for claude, `AGENTS.md` for codex, `AGENTS.md` for pi (Pi reads `AGENTS.md` with `CLAUDE.md` as a fallback alias; canonical Pi form matches Codex). Canonical skills always reference it via `{{boundary_file}}`, never by hard-coding `CLAUDE.md` or `AGENTS.md`. The substitution does the right thing per harness.

### Edit canonical, not the per-harness dirs

The three `src/{claude,codex,pi}-skills/` dirs are **generated artifacts**. Editing them directly is a dead-end — the next `pnpm build` will overwrite your changes from `src/skills/`. The generated dirs stay committed so PR diffs show canonical + all three outputs (reviewers see per-harness deltas at merge time), but the source of truth is always `src/skills/`.

After editing any file in `src/skills/`, run `pnpm build` — it regenerates the per-harness dirs *and* `src/bundled-files.ts`. Commit all three together (per the bundle-regen-per-commit discipline in `docs/discoveries/2026-06-11-bundle-regen-per-commit.md`).
