# Spec Status Lifecycle

> **The canonical definition of spec status.** Every status consumer — the queue JSON, spec frontmatter, the `joycraft-next-spec` / `joycraft-mark-done` / `joycraft-spec-status` scripts, and the `joycraft-spec-done` / `joycraft-session-end` skills — conforms to this doc. If code and this doc disagree, the code is wrong.

A spec moves through exactly **three** states: `todo → in-review → done`. No others.

## States

| State | Glyph | Meaning | Transitioned into by |
|-------|-------|---------|----------------------|
| `todo` | `[ ]` | Not started. The next spec the loop will serve. | `joycraft-decompose` (on creation) |
| `in-review` | `[~]` | Agent finished + committed; nothing has verified it yet. | `joycraft-spec-done` (after implement's TDD passes) |
| `done` | `[✓]` | Verified — the work is accepted. | `joycraft-session-end` (graduates the feature's specs) |

`joycraft-spec-status` renders these glyphs: `[ ]` todo, `[~]` in-review, `[✓]` done.

## State machine

```
todo ──[spec-done]──> in-review ──[verify / session-end]──> done
```

`in-review` is the seam the quality gate needs: a place to say "done-but-unverified." Until `verify-in-loop` ships, `joycraft-session-end` graduates `in-review → done` directly; once it does, an independent verify performs the transition.

## Migration mapping (old vocabulary → new)

The pre-unification vocabulary mixed four words across the queue JSON and frontmatter. The one-time migration maps them as:

| Old | New |
|-----|-----|
| `active` | `todo` |
| `backlog` | `todo` |
| `complete` | `done` |
| `shipped` | `done` |

## Invariants

1. **One vocabulary.** The queue JSON `status` and the spec frontmatter `status` always use the **same three words**. Changing one without the other is the desync bug this lifecycle exists to kill.
2. **The agent never self-certifies.** Nothing the implementing agent runs may transition a spec to `done`. `spec-done` only reaches `in-review`; `done` is reached by `session-end` (and, later, independent verify) — never by the agent declaring its own work verified.

## "Merged" is not a status

A merged PR is a **git fact**, not a tracked spec status. `done` means "verified," not "merged." A spec is `done` while its PR is still open; the merge happens downstream and is read from git, never written back as a spec status. (This is why old `shipped → done`: shipped conflated the two.)

## Why these three (and not four)

`todo → in-review → done` is the canonical engineering idiom — GitHub Projects, Jira, Linear, and Kanban all use this exact three-column shape. It is **prior art, not invented**. A fourth state was considered: `implemented` and `verified` were rejected because no major tool tracks them as distinct columns (they collapse into `in-review` and `done` respectively), and a fourth word is one more thing for the two systems to drift on.
