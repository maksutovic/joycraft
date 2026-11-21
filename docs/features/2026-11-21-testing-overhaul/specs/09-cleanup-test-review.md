---
id: 9
status: in-review
---
# Outcome

`joycraft-cleanup` offers an opt-in test review (decision `cleanup-tests`, owner note: "cleaning up tests is part of the broader clean-up skill, HOWEVER it is opt-in — we ask them if they want us to review the tests infrastructure and make recommendations/implement the latest agentic coding best practices"). On a person's cleanup run, after the doc pass, cleanup asks once. On yes it reviews the test setup against `references/testing-review.md`: tests of code that no longer ships, one-time tests, prose change-detectors, the slowest files, duplicate CI runs, the tier commands in `AGENTS.md`, flaky tests. It recommends, and changes only what the person approves; each test deletion is its own commit. Unattended cleanup never asks, edits or deletes a test.
