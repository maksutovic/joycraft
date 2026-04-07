# Discoveries — bundled-files.ts Template Literal Escaping

**Date:** 2026-04-06
**Spec:** `docs/specs/token-discipline/build-optimize-skill.md`

## Edit tool backtick escaping in template literals
**Expected:** Using the Edit tool to insert new entries into bundled-files.ts template literal strings would produce valid TypeScript.
**Actual:** The Edit tool's old_string/new_string handling treats `\`` literally — when inserting template literal delimiters (opening/closing backticks), they must be plain `` ` `` characters, not `\``. Triple-escaped backticks (`\\\``) inside content also need to be just `\`` (escaped for the template literal). This caused a build-breaking syntax error that required a second pass to fix.
**Impact:** When adding new skill entries to bundled-files.ts, be careful with backtick escaping. The template literal delimiter is a plain backtick, and code spans inside the content use `\``. Never use `\\\`` — that's double-escaping.
