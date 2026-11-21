---
id: 4
status: in-review
---
# Outcome

The delivery lock records the holder's PID and host, and a later push takes the lock only when that holder is dead. A live holder is refused, as today. `delivery.md` text stays the same length.

## acceptance

- A lock whose recorded PID is not running on this host is taken, and the push continues.
- A lock held by a live PID is refused.
