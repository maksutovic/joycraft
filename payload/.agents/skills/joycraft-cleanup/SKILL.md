---
name: joycraft-cleanup
description: Find stale or unreachable project knowledge (finished features left in the working folder, context pages that link to working material, broken or orphaned pages, pages whose code changed, leftover worktrees) and fix what the user approves.
compatibility: Requires Node.js 22+ and the installed .joycraft runtime. Git improves the code-drift and worktree checks.
---

# Joycraft Cleanup

Use when the user asks to clean up docs, remove stale material or check that
project knowledge is current, and at session end when `status.mjs` or the
archive step leaves loose ends. It keeps the context home trustworthy; it does
not change product decisions.

Run the report from the project root:

```sh
node .joycraft/runtime/cleanup.mjs
```

Exit 0 means no findings; exit 2 means findings. The script reads
`joycraft.yaml` for `paths` and the `cleanup.impact` map (code globs → context
pages) and never edits a file. Read `.joycraft/references/cleanup.md` for each
check and its usual fix.

Then, for each finding:

1. Read the files it names before proposing anything. For `impact-drift`,
   read the listed commits' changes and the page; the page may still be true.
2. Propose one concrete fix per finding: the exact link, page, section or
   command. Group findings by fix, not by check.
3. Show the proposals to the user as a rendered page (the decision artifact for
   choices, or an HTML page), never only as Markdown in chat. Ask once.
4. Apply only what the user approves. Move durable facts into the context home
   before an archive. Archive only through the session-end archive path. Remove
   an unknown worktree only after checking it for unmerged work and with the
   user's approval.
5. Run the report again and give the remaining findings with their reasons.

Never delete a context page to clear a finding; merge or redirect it. Do not
invent facts to refresh a stale page: when the code does not settle it, record
the question in the owning brief.
