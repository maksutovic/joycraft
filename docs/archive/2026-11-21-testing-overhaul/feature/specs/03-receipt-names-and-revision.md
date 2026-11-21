---
id: 3
status: done
---
# Outcome

`evidence.mjs run` refuses raw receipts named `.json` or `.jsonl` (exit 2, message says use `.log`), and its printed result carries `revision`: the HEAD commit and a dirty flag (decision `receipt-depth` = field). Usage text shows `<path>.log`.

## acceptance

- `--receipt docs/features/x/receipts/a.json` exits 2 and writes nothing.
- A normal run prints `revision.commit` (40 hex chars or null outside Git) and `revision.dirty` (boolean).
