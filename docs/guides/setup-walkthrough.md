# Setup Walkthrough

> [Back to README](../../README.md)

The steps a new user actually runs, in order, from an empty terminal to a first
feature. Nothing here is optional-but-hidden — this is the whole path.

## 1. Install the CLI

```bash
npm install -g joycraft
```

You can skip the global install and use `npx joycraft` everywhere instead; the
commands below work either way.

## 2. Go to your project root

```bash
cd /path/to/your/project
```

Joycraft scaffolds relative to the directory you run it in. Run it at the repo
root, not inside a subpackage.

## 3. Initialize

```bash
npx joycraft init
```

`init` asks two questions and then writes files:

1. **Which harnesses?** — `claude`, `codex`, `pi`, `copilot`, any combination,
   or `all`. Only the harnesses you pick get installed; the others leave no
   footprint. See [Platform support](platform-support.md).
2. **Shared or private git tracking?** — whether the harness directories are
   committed or gitignored. See [Git tracking](git-tracking.md).

Then it detects your stack and creates `AGENTS.md`, `CLAUDE.md`, the skills for
your chosen harnesses, `docs/context/`, and the templates. It only creates
*missing* files — an existing `CLAUDE.md` is never regenerated without
`--force`.

Non-interactive runs (CI, piped input, no TTY) install every available harness
so existing scripts keep working.

## 4. Open your AI tool and tune the harness

Inside Claude Code (or Codex / Pi / Copilot), run:

```
/joycraft-tune
```

This scores seven dimensions of your harness, runs a 2–3 minute risk interview
to generate safety boundaries, and asks you to pick a git autonomy level. It is
the step that turns generic scaffolding into boundaries that fit *your* project.
See [Tuning](tuning.md).

## 5. Fill in the context layer (optional but high-leverage)

```
/joycraft-gather-context
```

Populates `docs/context/` — production map, dangerous assumptions, decision log,
institutional knowledge, troubleshooting. Every later skill reads from here, so
the more of it is true, the less each agent has to re-derive.

## 6. Build something

```
/joycraft-new-feature
```

Interview → Feature Brief → atomic specs. If you only want to think out loud
first, start with `/joycraft-interview`. If the feature touches code you don't
fully understand, run `/joycraft-research` and `/joycraft-design` between the
brief and decomposition. See [The interview](interview-workflow.md) and
[Research and design](research-and-design.md).

## 7. Implement

```
/joycraft-implement docs/features/<slug>/
```

Reads the next ready spec, writes failing tests, implements until green, wraps
up, and continues the queue. To run a whole feature from one command, use
`/joycraft-implement-feature docs/features/<slug>/`. See
[Test-first development](test-first-development.md).

## 8. Finish the session

```
/joycraft-session-end
```

Consolidates discoveries, runs validation, graduates specs, writes a ledger row,
and — subject to the git autonomy level you chose in step 4 — pushes and opens a
PR.

## 9. Keep it current

```bash
npx joycraft upgrade
```

Refreshes the skills and templates you installed without clobbering your
customizations. See [Upgrading](upgrading.md).

## Where things live afterwards

| Path | What it holds |
|------|---------------|
| `AGENTS.md` / `CLAUDE.md` | Behavioral boundaries and project instructions |
| `.claude/skills/`, `.agents/skills/`, `.pi/skills/`, `.github/skills/` | The installed skills for your chosen harnesses |
| `docs/context/` | Durable project knowledge every skill reads |
| `docs/features/<slug>/` | Briefs, research, design, and specs per feature |
| `docs/discoveries/` | Session surprises worth remembering |
| `docs/templates/` | Spec, brief, and workflow templates |
| `docs/.joycraft/state.json` | Hidden upgrade state (gitignored) |
