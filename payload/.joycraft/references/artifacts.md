# Decision artifacts

Record every choice the user must make between options as a brief decision,
then ask it in the user's [question style](#asking-questions): on this page or
in chat. Also use a page for an editorial comparison of existing screenshots or
a review summary. A page renders a selected view of the brief; the brief and
queue remain the source of truth. Do not use one for a routine native question,
a product UI slice whose real interaction must be explored, or a long
questionnaire.

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
one material choice can be enough. Use the existing product UI slice for a
choice that depends on trying the actual product behavior.

## Showing a page

Every page a person must read or answer (a decision artifact, a setup diff, a
review) is shown where they are working, and you always say its path:

1. **The host has a viewer.** When your tools include one (the Claude Code
   desktop app's browser pane or artifact tool, an editor preview), open the
   page there. Do not hand it to the system browser.
2. **A person at a terminal, no viewer.** Open it in the system browser (`open`,
   `xdg-open` or `start`).
3. **No person watching.** In a non-interactive run (`claude -p`, `codex exec`,
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
person can add or change the note and save again without reopening. Changing
the chosen answer still needs a reopen. Store the human's exact words separately as that
decision's note; never replace the canonical answer with free-form text.

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
queue status. Small editorial assets are appropriate for decision context,
screenshot comparisons, and review summaries. Keep their content in the
referenced files rather than copying it into view data.

## Theme

Artifacts support `light` and `dark` themes. For each render, the CLI `--theme`
choice wins over the view's optional `theme`, then `.joycraft/preferences.json` at
`artifacts.theme`; the fallback is `light`. Use `--theme` for one render without
changing the project preference. A request to use dark or light from now on is a
per-project preference, set with:

```sh
node .joycraft/runtime/artifacts/cli.mjs theme --set dark
```

That command preserves other project preferences and changes only
`artifacts.theme`.

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
colors. Colors are cosmetic like the theme. Add one link to the existing context map for the preference
file when recording a durable preference, if it is not already linked; do not
copy the selected value into the map. Theme is cosmetic: it does not change
brief answers, source or view binding, or Claude answer storage.

The renderer binds the resulting model to `source.path`, the current brief
`source.revision`, and `source.viewRevision`. The view revision hashes the
theme-independent view data together with every selected image and review-report
byte. Local save and import check both revisions, so a changed screenshot,
report, or selected view requires a refresh alongside a changed brief. The
resulting model supplies
selected brief decisions as questions, embedded image `src` data, and derived
review results. Its response transport is separate from those canonical
decisions: responses are drafts until the local save succeeds or a previewed
import is explicitly applied. A runtime may identify its storage as brief,
Claude, or memory; only brief persistence changes repository state.

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

`serve` saves an accepted local answer directly to the current brief. The UI
keeps per-question Save and Save all actions, shows saved state only after a
successful write, and allows optional notes where required. It validates the
source path and revision, decision IDs, and option values before saving.

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

Native Claude's currently observed `window.claude.use('db')` bridge can store
scoped answer transport when that capability is present, but it is not a public
SDK contract and may change. Claude transport uses a separate document for each
decision, so answers to different questions do not overwrite each other. Two
writers for the same decision are last-write-wins in that transport; importing
still refuses to replace an already clarified canonical answer, except for an
exact replay. Capability absence, sign-out, or unsupported hosts must leave the
form usable with copy/download export and a visible memory-only state. Never
claim an answer is cloud-saved, repository-synced, or persisted until the
relevant observed write succeeds. Cloud storage never autosyncs the repository.

Reload the source before affected implementation. A saved answer informs work
only within the existing authorization and does not mark specifications done.
