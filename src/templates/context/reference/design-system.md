# Design System

> The visual language: tokens, scales, components, and the rules for using them.
> A long-form reference doc. Replace the italic examples below with your real system.

## Design Tokens

The named primitives everything else builds on — spacing, radius, elevation, motion.

| Token | Value | Used For |
|-------|-------|----------|
| _Example: space-2_ | _8px_ | _Default gap between related elements_ |
| _Example: radius-md_ | _6px_ | _Cards, buttons, inputs_ |

## Color Scale

_Example: We use a 9-step neutral ramp (`gray-50` → `gray-900`) plus semantic roles —_
_`primary`, `success`, `danger`, `warning`. Brand color is `#3B5BDB`; never hard-code hex_
_values in components, reference the token._

## Type Scale

_Example: A modular scale at ratio 1.25. `text-sm` 14px / `text-base` 16px / `text-lg` 20px._
_Headings use the display family; body uses the system font stack._

## Components

The shared components and the props/variants they expose.

| Component | Variants | Notes |
|-----------|----------|-------|
| _Example: Button_ | _primary, secondary, ghost_ | _Never restyle inline; add a variant instead_ |

## Usage Rules

- _Example: Compose from tokens — no magic numbers in feature code._
- _Example: New colors go through design review before entering the scale._
