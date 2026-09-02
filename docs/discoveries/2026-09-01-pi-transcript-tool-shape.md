Pi transcripts use `toolCall` blocks with `arguments.path` (tools named lowercase `read`/`write`/`edit`) — not Claude's `tool_use`/`input.file_path` shape the spec implied for both harnesses.
Pi also has a `batch_read` tool whose `arguments.o[].p` entries each mean one read, so a single line can yield several FileOps; the scanner fans it out rather than counting it once.
