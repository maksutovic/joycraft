# Decision artifacts

The artifact engine builds every page that shows a person a document, a
question or a decision. Never write your own HTML page for one, also when
there are many questions. Record every choice the user must make between
options as a brief decision, then ask it in the user's
[question style](#asking-questions): on a page or in chat. The engine also
renders a Markdown [document](#showing-a-page), a comparison of existing
screenshots and a review summary. The brief and queue remain the source of
truth. Do not use a page for a routine native question. A product UI slice
whose real interaction must be explored stays in `joycraft-ui-slice`.

## Asking questions

Do not assume the user remembers what you remember. Before you ask, run:

```sh
node .joycraft/runtime/artifacts/cli.mjs questions --brief docs/features/<slug>/brief.md
```

It prints `pacing`, `surface` and where each came from. With `unset: true`, the
project has no recorded style yet: ask for it as [setup](setup.md) step 2 says,
then continue.

- **Pacing `one-at-a-time`.** Ask one decision. After the answer, tell the user
  what it changes and ask if that is correct, and stop there: do not put the
  next decision in the same message. Ask the next decision after the user
  replies. Ask first the decision that the others depend on.
- **Pacing `page`.** Show the open decisions together. After the save, say in
  one line per answer what it changes.
- **Surface `artifact`.** Serve the page for the decisions you ask now (the
  view's `decisionIds`). Discuss the answers in chat.
- **Surface `chat`.** Write the question as prose with numbered options, in the
  order below. Save each answer to its brief decision with the user's exact
  words as the note. The brief stays the only record of the answer.

The user can change the style for one feature ("ask me one at a time here"):
`questions --brief <brief> --set pacing=one-at-a-time`. That writes a
`question-style:` line in that brief only. `--clear` removes it. A request to
change it for every feature is `questions --set ...` without `--brief`.

**Order for a consequential choice** (one that changes scope, cost or what is
built):

1. Context: what you are doing, the current state, and why you are blocked.
2. The question: one sentence, one decision.
3. Two to four options. Each has a short explanation, a concrete example of the
   result, and the main trade-off.
4. Your recommendation: the option and the reason.

On the page, put these in `context` (and `why`), `question`, each option's
`description`, `example` and `tradeoff`, and `recommended: true` on one option
with the reason in `recommendation`. A small choice can be shorter, but still
give the context the user needs to answer it.
An option that adds a time limit or a result cache is offered only
after a measurement: its `example` gives the measured time, load or repeat count.

**Words.** Write questions in
[ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/): one
meaning for each word, active voice, short sentences, one idea in each sentence.
Use the project's terms from `GLOSSARY.md`, or the glossary that `GLOSSARY-MAP.md`
names, when the project has one. When the user says a question is not clear
("wait, what?"), do not repeat it. Write it again with the context that was
missing. This follows `wait-what` in
[mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/wait-what).

The renderer is deterministic. Agents author a short view-data file, such as
[`templates/artifact.json`](../templates/artifact.json), and link existing
brief decisions, comparison images, and review reports. They do not write
artifact CSS, JavaScript, or a second copy of the brief. Keep questions useful:
one material choice can be enough.

## Showing a page

Render Markdown with `--doc`. A document that has questions goes on one page
with its brief, documents first: `serve --brief <brief> --doc <file.md>`.
Never show a document and its questions on two pages. A fenced `diff` block
shows added and removed lines in color. A Markdown image embeds its project
file (PNG, JPEG, WebP or GIF). A fenced `mermaid` block draws a diagram, also
in a decision's `details`; offline, the page shows its source. Raw HTML shows
as text.

Show each page where the person works, and always say its path or link.
`node .joycraft/runtime/artifacts/cli.mjs pages` prints where pages go;
`pages --set claude|local` records the person's choice.

1. **Claude with an artifact tool, `pages` is `claude` (default).** Run `build`
   with `--mode claude` and `--out .joycraft/local/artifacts/<name>.html`,
   publish that file with the artifact tool, and give the link. A page with
   decisions declares the `db` and `user` capabilities. After the person
   answers, list the `decisions` collection under `joycraft-artifacts/` with
   the artifact data tool and import the documents' data as one JSON array.
2. **Another viewer** (a browser pane, an editor preview): `serve` and open the
   page there, not in the system browser.
3. **A person at a terminal, no viewer.** Open it in the system browser (`open`,
   `xdg-open` or `start`).
4. **No person watching.** In a non-interactive run (`claude -p`, `codex exec`,
   CI), open nothing; print the path. Signals: `CLAUDE_CODE_SESSION_ATTENDED=0`,
   `CODEX_CI=1`, `CI` set, or no terminal. These beat `CLAUDE_CODE_ENTRYPOINT`,
   which a nested run inherits from the app that started it.

## Decisions and view data

A brief decision keeps its existing `id`, `status`, `question`, `answer`,
`options`, and `affected` fields. A decision can also have `context` and `why`
(shown before the options), `details` (under "More detail") and
`recommendation` (the reason for the recommended option). An option can have
`description`, `example`, `tradeoff`, `recommended: true` (one option at most;
not `custom`) and `requiresNote: true` when that option needs a short
explanation. All of these are optional, and the page lists the recommended
option first. Every question also offers "Something else" (value `custom`,
note required), so the person can always answer in their own words; do not
declare it unless you want different wording. The canonical answer remains an
option `value`, including `custom`. A saved answer keeps its note box: the
person can change the note and save again. To change a saved answer, the
person uses **Change answer** on a served page; an import never replaces one.
Store the human's exact words as that decision's note; never replace the
canonical answer with free-form text.

The view data has this shape:

```json
{
  "schemaVersion": 1,
  "artifactId": "feature-review",
  "title": "Feature review",
  "summary": "Optional context for the reviewer.",
  "decisionIds": ["presentation"],
  "comparisons": [{
    "title": "Current and proposed",
    "decisionId": "presentation",
    "images": [{
      "path": "docs/features/example/screens/current.png",
      "label": "Current",
      "alt": "Current collection screen",
      "caption": "The existing compact list."
    }]
  }],
  "reviews": [{
    "path": "docs/features/example/specs/review-1.report.json",
    "title": "Independent review"
  }]
}
```

All paths are exact, existing project-relative files. Image bytes are embedded
in the rendered artifact. A review card derives its declared verdict and labels
it as recorded and unvalidated; it neither supplies verification nor changes a
queue status.

## Theme

Artifacts support `light` and `dark` themes. For each render, the CLI `--theme`
choice wins over the view's optional `theme`, then `.joycraft/preferences.json` at
`artifacts.theme`; the fallback is `light`. A request to use dark or light from now on is a
per-project preference, set with:

```sh
node .joycraft/runtime/artifacts/cli.mjs theme --set dark
```

## Colors

A project can replace the kit's colors, for example with its design system. Read
the project's existing color tokens (CSS variables, Tailwind theme, design-token
files) or take the user's colors, and map them to the kit's names in a JSON file:

```json
{
  "light": { "accent": "#0b5d3b", "accent-hover": "#084a2f" },
  "dark": { "accent": "#9fe0bf" }
}
```

The names are `canvas`, `paper`, `surface`, `ink`, `muted`, `line`,
`control-line`, `accent`, `accent-hover`, `accent-text`, `accent-soft`, `focus`,
`error`, `error-bg`, `caution` and `input`. Values are `#rrggbb`. Set only the
colors you change; the rest keep the kit's values. Then record them:

```sh
node .joycraft/runtime/artifacts/cli.mjs colors --set <colors.json>
node .joycraft/runtime/artifacts/cli.mjs colors --reset
```

`--set` refuses a palette whose text or controls would be hard to read and names
each failing pair; adjust those colors and try again. `--reset` restores the kit
colors. Add one link to the existing context map for the preference
file when recording a durable preference, if it is not already linked; do not
copy the selected value into the map. Theme and colors are cosmetic: they do
not change brief answers, source or view binding, or Claude answer storage.

The renderer binds the resulting model to `source.path`, the current brief
`source.revision`, and `source.viewRevision`. The view revision hashes the
theme-independent view data together with every selected image and review-report
byte. Local save and import check both revisions, so a changed screenshot,
report, or selected view requires a refresh alongside a changed brief. A
`--doc` document is outside both revisions. The response transport is separate
from the canonical decisions: responses are drafts until the local save succeeds or a previewed
import is explicitly applied. Only brief persistence changes repository state.

## Render and save

The shared command accepts the brief and, optionally, a selected view:

```sh
node .joycraft/runtime/artifacts/cli.mjs serve \
  --brief docs/features/<slug>/brief.md \
  [--view docs/features/<slug>/artifact.json] [--theme light|dark]

node .joycraft/runtime/artifacts/cli.mjs build \
  --brief docs/features/<slug>/brief.md \
  [--view docs/features/<slug>/artifact.json] \
  --out .joycraft/local/artifacts/<slug>.html \
  --mode claude|portable [--theme light|dark]
```

`serve` saves an accepted local answer directly to the current brief. It
validates the source path and revision, decision IDs, and option values before
saving.

`build` creates a self-contained HTML file suitable for a native Claude cloud
artifact (`--mode claude`) or a portable download (`--mode portable`). It does
not create, publish, share, or update a cloud artifact. It refuses to overwrite
an existing output, so choose a fresh filename for another build. Keep generated
files in the project-local artifact home; they are render outputs, not brief
authority.

For a detached artifact, export the responses and import them deliberately:

```sh
node .joycraft/runtime/artifacts/cli.mjs import \
  --brief docs/features/<slug>/brief.md \
  [--view docs/features/<slug>/artifact.json] \
  --responses responses.json

node .joycraft/runtime/artifacts/cli.mjs import \
  --brief docs/features/<slug>/brief.md \
  [--view docs/features/<slug>/artifact.json] \
  --responses responses.json --apply
```

The first command is a read-only preview. `--apply` is the explicit write. An
import needs host-observed human answers and verifies the current brief path,
revision, selected decision IDs, and declared option values before it persists
them. Preserve supplied notes verbatim. Bring cloud answers back through an
authorized host tool or exported JSON; do not invent a provider endpoint.

Claude storage keeps one document per decision; import takes the list. Without
storage (signed out, another host), the page keeps answers in memory and offers
copy or download. Never claim an answer is saved until the observed write
succeeds; Claude storage never updates the brief by itself.

Reload the source before affected implementation. A saved answer informs work
only within the existing authorization and does not mark specifications done.
