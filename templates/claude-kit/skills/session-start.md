---
name: session-start
description: Bootstrap a new session — load latest context, identify current work, set boundaries
---

# Session Bootstrap

At the start of this session:

1. **Load context:** Read the most recent file in `docs/claude-sessions/` to understand where we left off.

2. **Check for active plans:** Look in `docs/superpowers/plans/` and `docs/plans/` for any in-progress implementation plans. If one exists with incomplete tasks, summarize what's done and what's next.

3. **Report to user:**
   ```
   Last session: [date] — [summary from session note]
   Active plan: [plan name] — [X of Y tasks complete]
   Next task: [task name and one-line description]
   Ready to continue, or do you have something different in mind?
   ```

4. If no active plan exists, ask what the user wants to work on today.
