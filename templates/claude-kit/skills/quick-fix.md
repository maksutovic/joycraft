---
name: quick-fix
description: Lightweight workflow for small bug fixes and minor changes (under 3 files)
---

# Quick Fix (Lightweight Spec)

For small changes that don't warrant a full design spec. Use when:
- Touching 1-3 files
- The fix is obvious (not exploratory)
- No data model or architectural changes

## Process

1. **State the problem** in 1-2 sentences
2. **List affected files** and what changes in each
3. **State what's NOT in scope** (prevent scope creep)
4. **Make the fix**
5. **Verify:**
   - [ ] The specific bug is fixed / change works
   - [ ] No regressions in surrounding code
   - [ ] Type-check passes
   - [ ] Lint passes
6. **Commit** with descriptive message

Do NOT use this workflow if you discover the change is larger than expected. Stop and switch to `/new-feature` instead.
