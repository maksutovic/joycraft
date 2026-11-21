---
id: 5
status: todo
---
# Outcome

Before any 0.7 code is deleted, the live migration path has its own tests that do not import 0.7 source: the `legacy-guard` fixture comes from tarball bytes, `v1-install` asserts `CLAUDE.md` bytes, and fixtures cover 0.7.0 and a mixed-version install. `src/` is untouched in these commits.
