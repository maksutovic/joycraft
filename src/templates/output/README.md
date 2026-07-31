# Custom Output Templates

Drop your own document template in this folder and Joycraft's gate skills will
follow its section structure instead of their built-in one. This is how a team
with an existing PRD format gets Joycraft's output to slot into their process
without reformatting by hand.

Empty folder? Nothing changes — the bundled structures apply exactly as before.

## How matching works

A template applies to a gate when its **filename** matches the artifact that
gate produces. Matching is an exact filename match — no fuzzy matching, no
extension guessing. A file whose name matches nothing is ignored.

| File you add | Shapes the output of |
|--------------|----------------------|
| `brief.md` | `/joycraft-interview` draft briefs and `/joycraft-new-feature` feature briefs |
| `design.md` | `/joycraft-design` design documents |
| `bugfix.md` | `/joycraft-bugfix` bug fix specs |
| `prd.md` | Feature briefs, when you'd rather call them PRDs — used in place of `brief.md` |

## What a template may contain

Write it as ordinary markdown: headings, prose describing what belongs under
each heading, tables, placeholder text. Joycraft reads it as **structure to
mirror**, not as content to copy — your headings and their order carry over,
and the gate fills them with the actual material from your session.

A few things hold regardless of what your template says:

- **Frontmatter is always written.** Joycraft's YAML frontmatter (`status`,
  `owner`, `created`, and friends) goes on every artifact whether your template
  mentions it or not — downstream skills parse it.
- **Machine-required sections are appended.** If your template omits a section
  Joycraft needs (decisions, open questions), the gate adds it after your
  structure rather than dropping it.
- **Template content is never executed.** Scripts, commands, or paths inside
  your template are treated as text. Absolute paths copied verbatim into your
  output are yours to maintain.

## The HTML render

Every gate writes markdown first — that stays the canonical artifact — and then
renders an HTML companion from it. Your custom sections ride inside the render's
existing slot regions; the surrounding page skeleton, its classes, and its CSS
are fixed. You're shaping the content, not the page.

## Changing a template later

Templates take effect at the next gate run. Documents already written stay as
they are — Joycraft won't retroactively reshape a brief you've already reviewed.
