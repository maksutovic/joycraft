# Intent inbox

An intent is a short note that describes a need before anyone commits to
building it: a customer bug, a product idea, a ticket from another system, or
an alert. Put intents here, one file per intent. Nothing needs to decide on a
feature name first.

- One file per intent: `docs/intent/YYYY-MM-DD-<short-name>.md`.
- Use the shape in `docs/templates/INTENT_TEMPLATE.md`: Author, Status,
  `source`, Problem, Proposed outcome, Affected users and systems,
  Constraints, Open questions.
- A new intent starts with `Status: untriaged`. Joycraft skills update that
  line when they triage or consume the intent. The file stays here afterwards.
- `source:` records where the intent came from, for example `human`,
  `interview`, `linear:<id>`, or `alert:<name>`. It is free text.

## How intents map to Joycraft artifacts

Anthropic's AI-native development playbook names a chain of artifacts. Joycraft
already has most of them under its own names. Nothing is renamed. Use the
Joycraft names below.

| Playbook term | Joycraft artifact | Where it lives |
|---------------|-------------------|----------------|
| intent | intent | `docs/intent/<name>.md` |
| spec | brief | `docs/features/<slug>/brief.md` |
| plan | design + atomic specs | `docs/features/<slug>/design.md` and `docs/features/<slug>/specs/` |

An intent becomes a brief through `/joycraft-new-feature`, or a bugfix spec
through `/joycraft-bugfix`. The brief, design, and specs keep their current
names and folders.
