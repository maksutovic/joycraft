# Project knowledge stays current

The context map in `AGENTS.md` (or the project's own map) is the index of project
memory. Each row points to one home for one kind of knowledge and says when to
read it. An agent that starts fresh, after a compaction or in a new session,
reads the homes as the current state of the project. It must never have to replay
a chain of past decisions to learn how things are today.

## The rule

- **One home per fact.** Other pages link to it; they do not copy it.
- **Homes state what is true now.** When a fact changes, rewrite the statement in
  place. Do not add a dated addendum, a "superseded by" or "previously" note,
  struck-through text, or a footnote that corrects a stale table.
- **Why goes to the decision log.** The reason and the rejected options go in an
  entry in the decision log (default `docs/context/decision-log.md`). A changed
  decision gets a new entry that names the choice it replaces. The live home
  carries only the current statement.
- **History stays out of live homes.** The old value of a changed fact lives in
  its decision-log entry and in Git. Finished features go to the archive at
  session end (`archive.md`); they stay there for regression checks and are never
  read as current truth.
- **Check before you restore.** Do not copy a statement from the archive or from
  an old decision-log entry back into a live home until you have checked it
  against the code.
- Record what the work established or observed. Keep proposals and guesses out.

## Routing a fact at session end

A reusable fact is one a later session needs and cannot cheaply get from the
code. Use the home the map already names for that kind. Use the default only when
the map has no home for it.

| Fact | Home |
|---|---|
| What the project is (purpose, users, owners, constraints), and the areas setup has not mapped yet | `docs/context/project.md` (from `.joycraft/templates/project-context.md`) |
| Navigation across code boundaries (where a flow lives) | A focused reference page linked by the map, e.g. `docs/context/architecture.md` |
| Decision | Current choice in the home that owns that area; reason and rejected options in the decision log |
| Trap (something that misleads or breaks, and how to avoid it) | The project's troubleshooting or gotchas page, default `docs/context/traps.md` |
| Reference (where something lives, how to run or look it up) | A focused reference page linked by the map |
| Production fact (deploy, environments, data, external services) | The production page, default `docs/context/production.md` |
| Feature intent and product choices for live work | The feature brief; do not copy them into a context home |

For each fact:

1. Find its home through the map. If the home already states it, rewrite that
   statement in place.
2. If no home holds that kind of fact, create the page with the fact and add a
   map row with a "read when". Do not create empty pages.
3. If a change widens or narrows what a home covers, edit its row so the "read
   when" stays true.

Then check that every page you created or edited is reachable from the map, that
no link points into `docs/features/` or `docs/archive/`, and that no live home
holds a dated addendum or "superseded" note (`node .joycraft/runtime/cleanup.mjs`
reports unmapped pages and broken or working-material links).

A session with nothing reusable changes no context file.
