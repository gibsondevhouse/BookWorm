---
name: "BookWorm Doc Sync"
description: "Sync BookWorm planning and project docs after implementation changes so trackers, phase docs, and related documentation reflect what the repo actually contains."
argument-hint: "What completed slice, files, or documentation scope should be synchronized?"
agent: "BookWorm Phase Architect"
tools: [read, search, edit]
---
Review the completed implementation work against the current BookWorm documentation and synchronize the relevant docs with repository reality.

Requirements:
- Read the relevant code, tests, and existing documentation before editing.
- Update only the planning and project docs that are materially affected by the completed slice.
- Keep tracker, phase, and stage status grounded in what is actually implemented and validated.
- If the completed work changes project understanding or usage, update broader project docs when necessary.
- If documentation and code disagree, resolve the mismatch in favor of repository evidence and call it out.
- Keep edits focused on materially affected docs instead of broad narrative rewrites.

Output:
- State which documentation was updated.
- Summarize the implementation evidence used.
- Note any contradictions that were resolved or remain open.
- End with the next doc or planning follow-up if one is still needed.