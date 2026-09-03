# How It Works with AI Agents

> [Back to README](../../README.md)

Joycraft works with five harnesses — Claude Code, OpenAI Codex, Pi, GitHub Copilot, and omp — providing the same structured workflows adapted for each platform. For the per-harness install paths and invocation forms, see [platform-support.md](platform-support.md).

**Claude Code** reads `CLAUDE.md` automatically and discovers skills in `.claude/skills/`. The behavioral boundaries guide every action. The skills provide structured workflows accessible via `/slash-commands`.

**Codex**, **Pi**, **Copilot**, and **omp** read `AGENTS.md`, which provides the same boundaries and commands in a concise format optimized for smaller context windows. In a multi-harness install `CLAUDE.md` becomes an `@AGENTS.md` pointer so both files stay in sync.

Every agent gets the same guardrails and the same development workflow. Joycraft doesn't write your project code. It builds the *system* that makes AI-assisted development reliable.

## Team Sharing

Skills live in your harness's skills dir (`.claude/skills/`, `.agents/skills/`, `.pi/skills/`, `.github/skills/`, or `.omp/skills/`), which is **not** gitignored by default. Commit it so your whole team gets the workflow:

```bash
git add .claude/skills/ docs/    # or the dir your harness uses
git commit -m "add: Joycraft harness"
```

The `private` gitignore profile is the opposite choice — it ignores the harness dirs so they never enter the repo, and teammates run `npx joycraft@latest init` after cloning to regenerate them locally.

Joycraft also installs a session-start hook that checks for updates. If your templates are outdated, you'll see a one-line nudge when Claude Code starts.

## Canonical skills format

All skills live in `src/skills/joycraft-<name>.md` as single-source canonical files. At build time, `scripts/generate-bundled-files.mjs` reads each canonical file and emits per-harness variants into `src/claude-skills/`, `src/codex-skills/`, `src/pi-skills/`, `src/copilot-skills/`, and `src/omp-skills/`. The transform itself is the pure function `applyTemplate(source, harness)` in `scripts/lib/skill-template.mjs` — testable in isolation, no I/O.

### Three primitives

The canonical format uses exactly three primitives. Don't invent new ones — extend only via a design discussion.

1. **Variable substitution.** `{{var}}` is replaced from a per-harness lookup. The fixed 4-variable set:

   | Variable | claude | codex | pi | copilot | omp |
   |---|---|---|---|---|---|
   | `{{skill_prefix}}` | `/joycraft-` | `$joycraft-` | `/skill:joycraft-` | `/joycraft-` | `/skill:joycraft-` |
   | `{{clear}}` | `/clear` | (long multi-surface sentence — see below) | `/new` | `/clear` | `/new` |
   | `{{skills_dir}}` | `.claude/skills` | `.agents/skills` | `.pi/skills` | `.github/skills` | `.omp/skills` |
   | `{{boundary_file}}` | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` |

   omp's row is identical to pi's except `skills_dir` — omp is a Pi fork sharing
   `/skill:` invocation and `/new`, with its own config dir. The two rows are kept
   independent rather than aliased, because their harness-block membership diverges:
   omp does not read `.pi/`.

   The generator throws `Error("unknown template variable: {{x}} in <file>")` on any unrecognized variable — typos surface at build time, not in CI. Substitution applies in both frontmatter and body, so `description:` lines can reference `{{boundary_file}}` etc.

   The codex `{{clear}}` expansion is a long multi-surface sentence on purpose — `/clear` works in the Codex CLI but does **not** exist in the Codex desktop app or IDE extension (verified 2026-06-14). A single short token would silently fail the majority of Codex users. See `docs/features/2026-06-11-single-source-skills/brief.md` Hard Constraints for the rationale.

   The variable lookup is defined in `scripts/lib/skill-template.mjs`. The table above must stay in sync with that file — if the lookup changes, regenerate this table.

2. **Conditional blocks.** `<!-- harness:NAME -->...<!-- /harness -->` where NAME is `claude`, `codex`, `pi`, `copilot`, `omp`, or a pipe-list like `claude|codex`. The block (delimiters included) is kept iff the current harness is in NAME; otherwise it's stripped. When the open/close tags sit on their own line, the surrounding newlines are consumed so stripped blocks leave no blank-line residue.

   **Blocks are allow-lists.** A harness not named in the selector gets the block
   stripped. So adding a harness to `HARNESSES` without auditing every existing
   block ships variants that are silently missing content — with a green suite.
   That audit is real work: the omp addition needed a dedicated spec for it.

   **Blocks do not nest.** The parser matches an open tag to the *first* close tag
   after it, with no depth counter, so a nested block leaks its content into
   harnesses meant to exclude it and emits raw comment markup into shipped files —
   silently, in every variant. Flatten into siblings instead. See
   `docs/discoveries/2026-09-03-harness-blocks-do-not-nest.md`.

   Sibling selectors must be mutually exclusive for a given harness; the transform
   does not dedupe, so two matching blocks render the text twice.

   Used across all 22 skills (74 blocks as of 2026-09-03). Don't add new blocks without a design decision — most cross-harness differences should be folded into the canonical at full claude fullness, with the other harnesses inheriting the longer content.

3. **Per-harness frontmatter stripping.** The generator drops the `instructions:` field from every non-claude harness's frontmatter (claude keeps it). Other frontmatter fields are preserved as-is, in the original key order.

### Cat D canonical form (boundary file)

The "boundary file" — the top-level instruction file each harness reads — differs by harness: `CLAUDE.md` for claude, and `AGENTS.md` for codex, pi, copilot, and omp. (Pi reads `AGENTS.md` with `CLAUDE.md` as a fallback alias; omp reads both, expanding `@` imports. Canonical Pi and omp form matches Codex.) Canonical skills always reference it via `{{boundary_file}}`, never by hard-coding `CLAUDE.md` or `AGENTS.md`. The substitution does the right thing per harness.

### Edit canonical, not the per-harness dirs

The five `src/{claude,codex,pi,copilot,omp}-skills/` dirs are **generated artifacts**. Editing them directly is a dead-end — the next `pnpm build` will overwrite your changes from `src/skills/`. The generated dirs stay committed so PR diffs show canonical + all five outputs (reviewers see per-harness deltas at merge time), but the source of truth is always `src/skills/`.

After editing any file in `src/skills/`, run `pnpm build` — it regenerates the per-harness dirs *and* `src/bundled-files.ts` — then `pnpm sync-skills` to refresh this repo's own installed trees (`.claude/skills`, `.agents/skills`, `.pi/skills`, `.github/skills`, `.omp/skills`). Commit canonical, generated, and installed together (per the bundle-regen-per-commit discipline in `docs/discoveries/2026-06-11-bundle-regen-per-commit.md`).
