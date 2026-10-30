# Decision artifacts

Use an artifact when a few current brief decisions need a compact editable
review surface, an editorial comparison of existing screenshots, or a review
summary. It renders a selected view of the brief; the brief and queue remain
the source of truth. Do not use one for a routine native question, a product UI
slice whose real interaction must be explored, or a long questionnaire.

The renderer is deterministic. Agents author a short view-data file, such as
[`templates/artifact.json`](../templates/artifact.json), and link existing
brief decisions, comparison images, and review reports. They do not write
artifact CSS, JavaScript, or a second copy of the brief. Keep questions useful:
one material choice can be enough. Use the existing product UI slice for a
choice that depends on trying the actual product behavior.

## Decisions and view data

A brief decision keeps its existing `id`, `status`, `question`, `answer`,
`options`, and `affected` fields. Artifact views also support an optional
`description` on an option and `requiresNote: true` when that option needs a
short explanation. The canonical answer remains the declared option `value`,
including a `custom` value. Store the human's exact words separately as that
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
`artifacts.theme`. Add one link to the existing context map for the preference
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
