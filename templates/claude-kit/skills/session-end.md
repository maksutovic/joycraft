---
name: session-end
description: Wrap up a session — create session note, update plan status, commit
---

# Session Wrap-Up

Before ending this session:

1. **Create session note** at `docs/claude-sessions/YYYY-MM-DD-[topic].md` with:
   - **Objective:** What we set out to do
   - **What happened:** Key decisions made, problems encountered, solutions found
   - **Files changed:** Table of files created/modified/deleted
   - **Testing:** What was verified and how
   - **Next steps:** What should happen in the next session

2. **Update plan status** if working from an implementation plan — check off completed tasks.

3. **Run validation:**
   - Type-check: `[use project-specific command from CLAUDE.md]`
   - Lint: `[use project-specific command from CLAUDE.md]`
   - Confirm build is not broken

4. **Commit** all changes including the session note.

5. **Report to user:**
   ```
   Session complete.
   - Tasks completed: [list]
   - Session note: docs/claude-sessions/[filename]
   - Build status: [passing/failing]
   - Next up: [what the next session should tackle]
   ```
