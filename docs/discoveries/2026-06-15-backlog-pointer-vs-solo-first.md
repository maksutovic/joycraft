# Backlog scaffolding reframed the "solo-first lazy-create" rule

The brief framed Task #4 (`docs/backlog/`) as fixing a dangling pointer, but the
generated CLAUDE.md/AGENTS.md didn't reference `docs/backlog/` at all — only the
CONTRIBUTING template and skills did, and those skills lazy-create the dir on
confirmed use. init.ts was deliberately solo-first (creates only `docs/context/`)
with a test asserting `docs/` contains exactly `['context','templates']`.

**Resolution (user call):** the generated harness files *should* point at
`docs/backlog/` — capturing deferred work mid-sprint is core to Joycraft — so the
fix is two-sided: add the pointer to both generators AND scaffold the dir (with a
README stub). The solo-first test was updated to expect `backlog/` up front. So
`docs/backlog/` is now the second always-created docs subdir, by design, not an
exception.
