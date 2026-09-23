# Intent: <one-line summary of the need>

<!--
Save a copy as docs/intent/YYYY-MM-DD-<short-name>.md and fill it in.
An intent records what is needed and why, before anyone picks a feature slug.
It is not a brief and not a spec. Keep it short: a few lines per section is enough.
-->

Author: <your name, or the system that filed this>
Status: untriaged
source: human

<!--
Author: who wrote the intent. A person, a team, or an agent.

Status: starts as `untriaged`. Joycraft skills overwrite this line in place when
they triage or consume the intent. Do not delete the intent file afterwards.

source: where the intent came from. Free text. Common values:
  - human          written by hand
  - interview      written by the joycraft-interview skill
  - linear:<id>    filed from a Linear issue, for example linear:ENG-123
  - alert:<name>   filed from a monitoring alert, for example alert:checkout-5xx
  - <system>:<id>  any other system, for example zendesk:48213
There is no schema and no validator for this field. Any value is accepted, and a
new <system>:<id> needs no code change.
-->

## Problem

<What is wrong or missing today? Who notices, and how? Describe the problem, not the fix.>

## Proposed outcome

<What is true when this is done? Describe observable results, not implementation.>

## Affected users and systems

<Which people, teams, services, or parts of the codebase does this touch?>

## Constraints

<Deadlines, budgets, compatibility rules, or anything that must not change.>

## Open questions

<What is still unknown? List each question on its own line.>
