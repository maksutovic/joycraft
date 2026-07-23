# Confidence Anchors

> A shared scale for how sure an authoring skill is about a claim it just made — self-scored at write time, audited later.

## The Anchors

| Score | Meaning |
|-------|---------|
| 100 | Verified directly — read the code/config/output yourself and confirmed it |
| 75 | Strong indirect evidence — a doc, test, or prior decision says so, but you didn't check the live artifact |
| 50 | Plausible inference — consistent with what you know, but no direct or documented evidence |
| 25 | Guess with a reason — a hunch grounded in partial context, not a claim you'd defend |
| 0 | Unknown — no basis, placeholder pending research |

## Load-Bearing

A claim is **load-bearing** if downstream work would need to change should the claim turn out false — it constrains an implementation choice, gates a decision, or another spec depends on it being true. A claim that's merely descriptive color (background, motivation, "why this matters") is not load-bearing even at low confidence.

## The Block Rule

**Load-bearing AND ≤50 blocks propagation.** A claim scored 50 or below that is also load-bearing may not pass into a spec, decision, or implementation step as-is. It must either be deepened (do the verification that would raise its score) or surfaced as a dossier question (`joycraft-decide`) so a human resolves it explicitly. Claims that are load-bearing but scored 75+ propagate normally; claims scored ≤50 but not load-bearing (color, rationale, examples) also propagate — the rule only fires on the intersection of both conditions.
