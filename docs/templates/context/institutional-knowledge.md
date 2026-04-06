# Institutional Knowledge

> Unwritten rules, team conventions, and organizational context that AI agents can't derive from code.
> This is the knowledge that takes a new developer months to absorb.
> Update when you catch yourself saying "oh, you didn't know about that?"

## Team Conventions

_Things everyone on the team knows but nobody wrote down._

- _Example: "We never deploy on Fridays"_
- _Example: "The CEO reviews all UI changes before they ship"_
- _Example: "PR titles must reference the Jira ticket number"_

## Organizational Constraints

_Business rules, compliance requirements, or political realities that affect technical decisions._

- _Example: "Legal requires all user data to be stored in EU regions"_
- _Example: "The payments team owns the billing schema — never modify without their approval"_
- _Example: "We have an informal agreement with Vendor X about API rate limits"_

## Historical Context

_Why things are the way they are — especially when it looks wrong._

- _Example: "The auth module uses an old pattern because it predates our TypeScript migration — don't refactor without a spec"_
- _Example: "The caching layer has a 5-second TTL because we had a consistency bug in 2025 — increasing it requires careful testing"_

## People & Ownership

_Who owns what, who to ask, who cares about what._

- _Example: "Alice owns the payment pipeline — all changes need her review"_
- _Example: "The data team is sensitive about query performance on the analytics tables"_
