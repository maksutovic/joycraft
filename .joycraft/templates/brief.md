---
feature: example-feature
decisions: [
  {"id":"presentation","status":"open","question":"Which presentation fits your task?","answer":null,"context":"The collection page lists 200 items. Today it shows plain rows, and users ask for pictures.","options":[{"value":"rows","label":"Compact rows","description":"Keep the list and add a small picture to each row.","example":"About 20 items show without scrolling.","tradeoff":"Pictures are too small to compare."},{"value":"cards","label":"Visual cards","recommended":true,"description":"Show each item as a card with a large picture.","example":"About 8 items show without scrolling.","tradeoff":"More scrolling to find one item."}],"recommendation":"Users asked for pictures, and cards show them best.","affected":["collection-presentation"]}
]
---
# Feature intent

Replace this example with the user's full request, retaining repairs and new
behavior together. Link existing briefs when they already own part of the scope.

## Context and authorization

Link relevant existing decisions/facts and record the authorization already given.
Keep assumptions explicit. Remove the example decision when no choice is needed.

## Goals

- Describe each requested outcome with a stable heading below, and give each a
  **Done when** line: example inputs or states with their expected results. For
  a rule over open-ended input, also name the check set, which error costs more,
  and the pass threshold.

## Agent work and pending choices

Name understood work that can continue and the decision IDs blocking other work.

## collection-presentation

After the choice is saved above, describe its requirement here and reference the
decision ID. This heading is the stable source for an affected queue criterion.

## Scope and limits

Record relevant exclusions without replacing the user's goals.
