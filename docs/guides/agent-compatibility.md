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
