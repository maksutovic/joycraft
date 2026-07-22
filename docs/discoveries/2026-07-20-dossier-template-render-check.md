---
status: todo
owner: Maximilian Maksutovic
created: 2026-07-20
feature: 2026-07-20-decision-dossier
---

# Discoveries — HTML template verification needs a real browser

**Date:** 2026-07-20
**Spec:** docs/features/2026-07-20-decision-dossier/specs/add-dossier-template.md

## Lenient parsers certify broken HTML

**Expected:** Validating the dossier template with Python's `html.parser` plus an `open` spot-check would catch any structural breakage before commit.
**Actual:** A literal `<!-- SLOT:… -->` example *inside* the template's contract comment terminated that comment at the inner `-->` (browsers end comments at the first `-->`; `--` inside a comment is invalid), dumping guidance prose into the page body and hijacking `<style>` parsing — zero CSS applied. A missing `<meta charset="utf-8">` added UTF-8 mojibake over `file://`. `html.parser` accepted all of it; the breakage was only caught because the human saw the opened page, and only diagnosed mechanically by headless Chrome (`--dump-dom` + computed-style probe).
**Impact:** Any skill or test that verifies generated/template HTML must render it in a real browser engine (headless Chrome dump-DOM + computed-style assertion), never a lenient parser. Two standing rules for authored HTML: no `--` sequences inside HTML comments (use a single dash or an em dash), and `<meta charset="utf-8">` first in every file meant to open via `file://`.
