---
status: superseded
superseded_by: docs/features/2026-07-29-succinct-gates/brief.md
owner: Maximilian Maksutovic
created: 2026-07-27
source: docs/features/2026-07-27-human-readable-output-style/design.md
---

# Auto-open review artifacts — bring the human's attention to the doc

## The gap

When a skill writes a markdown artifact and asks for human review, the human is
in a CLI. Getting eyes on the doc means: read the path out of the transcript,
switch to an editor or pager, open it, scroll, come back, type approval. That
friction sits directly on the review bookend — the one moment the whole
design-before-specs pause exists to protect.

The HTML dossier already solves this and the contrast is the point: it *appears*
in the browser, unprompted.

## Existing precedent — reuse it, don't reinvent

`src/skills/joycraft-decide.md` Step 4 ("Render and open the dossier") is the
model, and it is fully specified:

1. Read `docs/templates/DECISION_DOSSIER_TEMPLATE.html`, fill ONLY the
   `<!-- SLOT:name — … -->` regions; structure, class names, CSS, and theme
   script stay **byte-identical** — never generate freeform HTML.
2. Write to `docs/features/<slug>/dossier.html` (path is linguist-generated so
   PRs collapse it).
3. "Open it before asking anything: `open <path>` on darwin, `xdg-open <path>`
   otherwise. If both fail, print the absolute path and continue."
4. Offer — don't push — an optional hosted artifact for a shareable link.

Note the graceful degradation in step 3 and the offer-don't-push in step 4.
Both must carry over.

Also relevant: `docs/discoveries/2026-07-20-dossier-template-render-check.md`
records how this template broke — a literal `<!-- SLOT:… -->` example *inside*
a contract comment terminated the comment at the inner `-->`, dumping guidance
prose into the page body and killing all CSS; a missing `<meta charset>` added
mojibake over `file://`. Any new template must be verified by actually opening
it, and mechanically (headless Chrome `--dump-dom` + computed-style probe), not
just parsed.

## Desired behavior

Skills that produce a human-review artifact render an openable version and open
it automatically before asking for approval. At minimum: `joycraft-design`
(design.md). Candidates: `joycraft-research`, `joycraft-new-feature` (brief),
`joycraft-tune` (assessment), `joycraft-optimize` (overhead report).

## Open design questions for this item

- **Render markdown → HTML, or open the .md directly?** Opening `design.md`
  with `open` hands it to whatever the OS associates with `.md` — often an
  editor, sometimes nothing. An HTML render is predictable and themeable but
  needs a template and a markdown→HTML step with no new runtime dependency
  (AGENTS.md: "Add runtime dependencies that aren't strictly necessary" is a
  NEVER). Is there a dependency-free path, or does the agent hand-fill an HTML
  template as decide already does?
- **Which artifacts qualify?** Auto-opening every doc trains the human to
  ignore it. Probably only artifacts at an approval bookend.
- **Is the rendered HTML committed** (like dossier.html, linguist-collapsed) or
  gitignored as a transient view?
- **Headless/CI behavior** — `open` must be a no-op, not a failure, when there
  is no display. Matters for the Pi isolated-mode and any headless driver.
- **Does this interact with the output-style feature?** An HTML render is a
  human channel; the same two-tier contract applies.

## Why it matters

This is the same thesis as the parent feature: the human channel is scarce and
should carry decisions, not acknowledgments. An artifact the human doesn't
actually open is a review bookend in name only.
