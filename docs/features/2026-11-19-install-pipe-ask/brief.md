---
feature: install-pipe-ask
status: specified
---
# Install pipes ask the person; they are not blocked

## Problem

On 2026-11-19 a field project ran Sentry's agent handoff. Sentry documents
one command: `curl -fsSL https://cli.sentry.dev/install | SENTRY_HANDOFF=<code> bash`.
The 0.7 safeguard blocked it (deny pattern `curl.*\|.*sh`, exit 2). The
owner had pasted the link and asked for the install. The agent could only
download the script to a file and run the file, which the guard does not
catch. The one-time code expired while the agent asked for permission.

Many vendors now hand off to agents this way: a link, a short-lived code and
a `curl | sh` installer. When the user asks for that install, Joycraft must
not stop it.

## What is true today

- 1.x ships no shell guard. The 0.7 guard (`src/safeguard.ts` in this repo)
  wrote `.claude/hooks/joycraft/block-dangerous.sh` and `deny-patterns.txt`.
- 1.x keeps that guard and runs it: `scripts/hook-paths.mjs` rewrites its
  path, and `retire-stable` leaves it in place as a user file. Nothing in 1.x
  updates its script or its list.
- The script exits 2 on every match. The person has no way to approve it,
  and the agent cannot change the result.
- Its message says "Edit deny-patterns.txt". Project docs say never edit the
  guard or work around it. An agent cannot obey both.
- Text matching is easy to get around: download then run, `bash <(curl …)`,
  `curl -o f && sh f`. The guard stops accidents. It is not a security
  boundary.

## Decision

- A command that pipes `curl` or `wget` into a shell asks the person. It is
  not blocked. The prompt names the host the script comes from. One click
  lets the install run while the code is still valid.
- Destructive patterns (`rm -rf /`, force-push, `reset --hard`, `DROP`,
  `TRUNCATE`, `chmod 777`) still block with exit 2.
- No allow list and no per-vendor rules (owner rule "design for the 99%": the agent
  judges, the person says yes or no). The person's yes in the prompt is the
  approval.
- Where a harness cannot show a prompt, the block message tells the agent to
  show the person the command and the host and ask them to run it. It never
  tells the agent to edit the list.
- The guard is documented as a guard against accidents, not a security
  boundary.
- 1.x adopts the stock 0.7 guard on update: it replaces script bytes it
  recognizes from a 0.7 release with the 1.x script. A changed script stays
  as it is, and update reports one line about it.

## Not in scope

- Pinning an installer by checksum, or fetching the script to show its size.
- Cross-harness deny lists for projects that never ran 0.7 harden
  (`docs/backlog/2026-09-02-cross-harness-deny-patterns.md`).
- The local allow list in the field project that hit this. It can be removed
  there by hand after it updates.

